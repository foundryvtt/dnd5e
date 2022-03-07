/**
 * Step in the advancement process that will be displayed on its individual page.
 *
 * @property {Actor5e} actor  Actor to which this step's changes will be applied.
 * @property {object} config  Configuration information specific to each step type.
 */
class AdvancementStep {

  constructor(actor, config) {
    /**
     * Actor that will be used when calculating changes.
     * @type {Actor5e}
     */
    this.actor = actor;

    /**
     * Step configuration information.
     * @type {object}
     */
    this.config = config;

    /**
     * Advancement flows that make up this step grouped by level.
     * @type {object<number, AdvancementFlow[]>}
     */
    this.flows = {};

    /**
     * Updates that will be applied to the actor's properties. Will be provided to `Actor#update`.
     * @type {object}
     */
    this.actorUpdates = {};

    /**
     * Items that will be added or removed from the actor.
     */
    this.itemUpdates = { add: [], remove: [] };
  }

  /* -------------------------------------------- */

  /**
   * Title to be displayed for this step.
   * @type {string}
   */
  get title() { }

  /* -------------------------------------------- */

  /**
   * Should this step be rendered or applied automatically?
   * @type {boolean}
   */
  static shouldRender = true;

  /* -------------------------------------------- */

  /**
   * Get the data that will be passed to the advancement manager template when rendering this step.
   * @param {object} data  Existing data from AdvancementManager. *Will be mutated.*
   */
  async getData(data) { }

  /* -------------------------------------------- */

  /**
   * Get a flow object for a specific level.
   * @param {Advancement} advancement  Advancement from which to create the flow.
   * @param {number} level             Character level used when creating and referencing the flow.
   * @param {number} [classLevel]      Class level used when creating the flow.
   * @returns {AdvancementFlow}        The flow.
   * @protected
   */
  getFlow(advancement, level, classLevel) {
    this.flows[level] ??= {};
    this.flows[level][advancement.id] ??= new advancement.constructor.flowApp(advancement, classLevel ?? level);
    return this.flows[level][advancement.id];
  }

  /* -------------------------------------------- */

  /**
   * Get data needed to display an advancement in the step.
   * @param {AdvancementFlow} flow  Relevant advancement flow object.
   * @returns {object}              Display data for template rendering.
   * @protected
   */
  async getAdvancementFlowData(flow) {
    return {
      id: flow.advancement.id,
      type: flow.advancement.constructor.typeName,
      data: await flow.getData(),
      template: flow.constructor.template,
      title: flow.title,
      order: flow.sortingValue
    };
  }

  /* -------------------------------------------- */

  /**
   * Returns all advancements on an item for a specific level.
   * @param {Item5e} item      Item that has advancement.
   * @param {number} level     Level in question.
   * @returns {Advancement[]}  Relevant advancement objects.
   * @protected
   */
  advancementsForLevel(item, level) {
    return Object.values(item.advancement).filter(a => {
      const levels = a.levels;
      return levels.includes(level);
    });
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners on each individual flow within this step.
   * @param {jQuery} html  HTML of the AdvancementManager application.
   */
  activateListeners(html) {
    html[0].querySelectorAll("section[data-id]").forEach(section => {
      this.flows[section.dataset.level]?.[section.dataset.id]?.activateListeners($(section));
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare the actor and item updates that all of the advancements within this step should apply.
   * @param {object} [config]
   * @param {Actor5e} config.actor            Actor to base the changes upon.
   * @param {object} [config.data={}]         Object containing form data with individual advancement data grouped by ID.
   * @param {boolean} [config.reverse=false]  Prepare updates to undo these advancements.
   */
  prepareUpdates({ actor, data={}, reverse=false }) {
    for ( const [currentLevel, flows] of Object.entries(this.flows) ) {
      for ( const [id, flow] of Object.entries(flows) ) {
        // Swap advancement in flow with version from provided actor so it has access to the proper data
        if ( actor ) flow.advancement = actor.items.get(flow.advancement.parent.id).advancement[flow.advancement.id];

        // Prepare update data from the form
        const level = (flow.advancement.parent.type === "class" ? this.config.classLevel : null) ?? Number(currentLevel);
        flow.initialUpdate = flow.prepareUpdate(foundry.utils.flattenObject(data[id] ?? {}));
        const fetchData = { level, updates: flow.initialUpdate, reverse };

        // Prepare property changes
        Object.assign(this.actorUpdates, flow.advancement.propertyUpdates(fetchData));

        // Prepare added or removed items
        const { add, remove } = flow.advancement.itemUpdates(fetchData);
        this.itemUpdates.add.push(...add); // TODO: Keep added items associated with the advancement that provides them
        this.itemUpdates.remove.push(...remove);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply stored updates to an actor, modifying properties and adding or removing items.
   * @param {Actor5e} [actor]  Actor to perform the updates upon, if not provided the changes will be applied to the actor
   *                           provided during construction.
   */
  async applyUpdates(actor) {
    if ( !actor ) actor = this.actor;

    // Begin fetching data for new items
    let newItems = Promise.all(this.itemUpdates.add.map(fromUuid));

    // Apply property changes to actor
    await this.constructor._updateActor(actor, foundry.utils.deepClone(this.actorUpdates));

    // Add new items to actor
    newItems = (await newItems).map(item => {
      const data = item.toObject();
      foundry.utils.mergeObject(data, {
        "flags.dnd5e.sourceId": item.uuid,
        // "flags.dnd5e.advancementOrigin": `${originalItem.id}.${advancement.id}` // TODO: Make this work
      });
      return data;
    });
    const itemsAdded = await this.constructor._createEmbeddedItems(actor, newItems);

    // Remove items from actor
    await this.constructor._deleteEmbeddedItems(actor, this.itemUpdates.remove.filter(id => actor.items.has(id)));

    // Finalize value updates to advancement with IDs of added items
    let embeddedUpdates = {};
    for ( const [level, flows] of Object.entries(this.flows) ) {
      for ( const [id, flow] of Object.entries(flows) ) {
        const update = flow.finalizeUpdate(flow.initialUpdate, itemsAdded);
        if ( foundry.utils.isObjectEmpty(update) ) continue;
        const itemId = flow.advancement.parent.id;
        if ( !embeddedUpdates[itemId] ) {
          embeddedUpdates[itemId] = foundry.utils.deepClone(actor.items.get(itemId).data.data.advancement);
        }
        const idx = embeddedUpdates[itemId].findIndex(a => a._id === id);
        if ( idx === -1 ) continue;
        foundry.utils.mergeObject(embeddedUpdates[itemId][idx], { value: update });
      }
    }

    // Update all advancements with new values
    embeddedUpdates = Object.entries(embeddedUpdates).map(([id, updates]) => {
      return { _id: id, "data.advancement": updates };
    });
    await this.constructor._updateEmbeddedItems(actor, embeddedUpdates);
  }

  /* -------------------------------------------- */

  /**
   * Check whether the actor is a normal actor or a clone and apply the updates appropriately.
   * @param {Actor5e} actor                          Actor to which to apply updates.
   * @param {object} updates                         Object of updates to apply.
   * @param {DocumentModificationContext} [context]  Additional context which customizes the update workflow.
   * @returns {Promise<Actor5e>}                     Actor with updates applied.
   * @protected
   */
  static async _updateActor(actor, updates, context) {
    // Normal actor, apply updates as normal
    if ( actor.data._id ) return actor.update(updates, context);

    // Actor clone, apply updates directly to ActorData
    foundry.utils.mergeObject(actor.data._source, updates);

    actor.prepareData();
    return actor;
  }

  /* -------------------------------------------- */

  /**
   * Check whether the actor is a normal actor or a clone and create embedded items appropriately.
   * @param {Actor5e} actor                          Actor to which to create items.
   * @param {object[]} items                         An array of data objects used to create multiple documents.
   * @param {DocumentModificationContext} [context]  Additional context which customizes the creation workflow.
   * @returns {Promise<Item5e[]>}                    An array of created Item instances.
   * @protected
   */
  static async _createEmbeddedItems(actor, items, context) {
    if ( actor.id ) return actor.createEmbeddedDocuments("Item", items, context);

    // Create temporary documents
    const documents = await Promise.all(items.map(i => {
      return CONFIG.Item.documentClass.create(i, { parent: actor, temporary: true });
    }));

    // TODO: Trigger any additional advancement steps for added items

    actor.prepareData();
    return documents;
  }

  /* -------------------------------------------- */

  /**
   * Check whether the actor is a normal actor or a clone and update embedded items appropriately.
   * @param {Actor5e} actor                          Actor to which to update items.
   * @param {object[]} updates                       An array of differential data objects.
   * @param {DocumentModificationContext} [context]  Additional context which customizes the update workflow.
   * @returns {Promise<Item5e[]>}                    An array of updated Item instances.
   * @protected
   */
  static async _updateEmbeddedItems(actor, items, context) {
    if ( actor.id ) return actor.updateEmbeddedDocuments("Item", items, context);

    let documents = [];
    for ( const data of items ) {
      const item = actor.items.get(data._id);
      const itemIndex = actor.data._source.items.findIndex(i => i._id === data._id);
      if ( !item || (itemIndex === -1) ) continue;
      documents.push(item);

      const updates = foundry.utils.deepClone(data);
      delete updates._id;
      foundry.utils.mergeObject(actor.data._source.items[itemIndex], updates);
    }

    actor.prepareData();
    return documents;
  }

  /* -------------------------------------------- */

  /**
   * Check whether the actor is a normal actor or a clone and delete embedded items appropriately.
   * @param {Actor5e} actor                          Actor to which to delete items.
   * @param {object[]} ids                           An array of string ids for each Document to be deleted.
   * @param {DocumentModificationContext} [context]  Additional context which customizes the deletion workflow.
   * @returns {Promise<Item5e[]>}                    An array of deleted Item instances.
   * @protected
   */
  static async _deleteEmbeddedItems(actor, ids, context) {
    if ( actor.id ) return actor.deleteEmbeddedDocuments("Item", ids, context);

    let documents = [];
    for ( const id of ids ) {
      const item = actor.items.get(id);
      const itemIndex = actor.data._source.items.findIndex(i => i._id === id);
      if ( !item || (itemIndex === -1) ) continue;
      documents.push(item);
      actor.data._source.items.splice(itemIndex, 1);
    }

    actor.prepareData();
    return documents;
  }

}


/**
 * Handles presenting changes for a class and other items when level is increased by one.
 * @extends {AdvancementStep}
 */
export class LevelIncreasedStep extends AdvancementStep {

  /** @inheritdoc */
  get title() {
    if ( this.config.classLevel > 1 ) return game.i18n.localize("DND5E.AdvancementManagerLevelIncreasedTitle");
    return game.i18n.localize("DND5E.AdvancementManagerLevelNewClassTitle");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(data) {
    await super.getData(data);

    // const otherItems = this.actor.items.filter(i => {
    //   return (i.id !== this.config.item.id) && this.advancementsForLevel(i, this.config.level).length;
    // });
    // console.log(otherItems);

    data.sections = [{
      level: this.config.level,
      header: this.config.item.name,
      subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: this.config.classLevel }),
      advancements: await Promise.all(this.advancementsForLevel(this.config.item, this.config.classLevel).map(async (a) => {
        return await this.getAdvancementFlowData(this.getFlow(a, this.config.level, this.config.classLevel));
      }))
    }];

    // TODO: Fix this up for other items with advancements
    // for ( const item of otherItems ) {
    //   data.sections.push({
    //     level: this.config.level,
    //     header: item.name,
    //     advancements: await Promise.all(this.advancementsForLevel(item, this.config.level).map(async (a) => {
    //       return await this.getAdvancementFlowData(this.getFlow(a, this.config.level));
    //     }))
    //   });
    // }

    data.sections.forEach(s => s.advancements.sort((a, b) => a.order.localeCompare(b.order)));

    return data;
  }

}


/**
 * Handles unapplying changes for a class and other items when level is decreased by one.
 * @extends {AdvancementStep}
 */
export class LevelDecreasedStep extends AdvancementStep {

  /** @inheritdoc */
  static shouldRender = false;

}


/**
 * Handles adding a new item with advancement at the current character level.
 * @extends {AdvancementStep}
 */
export class ItemAddedStep extends AdvancementStep {

  // TODO: Implement later
//   /** @inheritdoc */
//   async getData(data) {
//     const currentLevel = this.actor.data.data.details.level;
//     data.header = this.config.item.name;
//     data.sections = [];
// 
//     // Iterate over each level leading up to current, adding a section for each level
//     let level = 0;
//     while ( level <= currentLevel ) {
//       const advancements = await Promise.all(this.advancementsForLevel(this.config.item, level).map(async (a) => {
//         return await this.getAdvancementFlowData(this.getFlow(a, level));
//       }));
//       if ( advancements.length ) {
//         advancements.sort((a, b) => a.order.localeCompare(b.order));
//         data.sections.push({ level, header: `Level ${level}`, advancements });
//       }
//       level += 1;
//     }
//   }

}


/**
 * Handles unapplying any advancement changes when a non-class item with advancement is removed.
 * @extends {AdvancementStep}
 */
export class ItemRemovedStep extends AdvancementStep {

    /** @inheritdoc */
    static shouldRender = false;

}


/**
 * Handles changing advancement choices for a single item at a specific level.
 * @extends {AdvancementStep}
 */
export class ModifyChoicesStep extends AdvancementStep {

  /** @inheritdoc */
  get title() {
    return game.i18n.localize("DND5E.AdvancementManagerModifyChoicesTitle");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(data) {
    data.sections = [{
      level: this.config.level,
      header: this.config.item.name,
      subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: this.config.level }),
      advancements: await Promise.all(this.advancementsForLevel(this.config.item, this.config.level).map(async (a) => {
        return await this.getAdvancementFlowData(this.getFlow(a, this.config.level));
      }))
    }];
    data.sections[0].advancements.sort((a, b) => a.order.localeCompare(b.order));
  }

}
