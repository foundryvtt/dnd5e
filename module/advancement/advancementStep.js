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
  get title() { return null; }

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
      const flow = this.flows[section.dataset.level]?.[section.dataset.id];
      if ( !flow ) return;
      flow.form = section;
      flow.activateListeners($(section));
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare the actor and item updates that all of the advancements within this step should apply.
   * @param {object} [config]
   * @param {Actor5e} config.actor            Actor to base the changes upon.
   * @param {object} [config.data={}]         Form data with individual advancement data grouped by ID.
   * @param {boolean} [config.reverse=false]  Prepare updates to undo these advancements.
   */
  prepareUpdates({ actor, data={}, reverse=false }) {
    for ( const [currentLevel, flows] of Object.entries(this.flows) ) {
      for ( const [id, flow] of Object.entries(flows) ) {
        // Swap advancement in flow with version from provided actor so it has access to the proper data
        const item = actor?.items.get(flow.advancement.parent.id);
        if ( item ) flow.advancement = item.advancement[flow.advancement.id];

        // Prepare update data from the form
        const level = (flow.advancement.parent.type === "class" ? this.config.classLevel : null) ?? Number(currentLevel);
        flow.initialUpdate = !reverse ? flow.prepareUpdate(foundry.utils.flattenObject(data[id] ?? {})) : {};
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
   * @param {Actor5e} [actor]  Actor to perform the updates upon. If empty then the changes will be applied to the
   *                           actor provided during construction.
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
        "flags.dnd5e.sourceId": item.uuid
        // TODO: Store ID of originating item and advancement for later reference
        // "flags.dnd5e.advancementOrigin": `${originalItem.id}.${advancement.id}`
      });
      return data;
    });
    const itemsAdded = await this.constructor._createEmbeddedItems(actor, newItems);

    // Remove items from actor
    await this.constructor._deleteEmbeddedItems(actor, this.itemUpdates.remove.filter(id => actor.items.has(id)));

    // Finalize value updates to advancement with IDs of added items
    let embeddedUpdates = {};
    for ( const [, flows] of Object.entries(this.flows) ) {
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
    actor.data.update(updates);
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
    actor.prepareData();

    // TODO: Trigger any additional advancement steps for added items

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
  static async _updateEmbeddedItems(actor, updates, context) {
    if ( actor.id ) return actor.updateEmbeddedDocuments("Item", updates, context);

    actor.data.update({"items": updates});
    actor.prepareData();

    const ids = new Set(updates.map(u => u._id));
    return actor.items.filter(i => ids.has(i.id));
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
      if ( !item ) continue;
      documents.push(item);
      actor.items.delete(id);
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
    const level = this.config.level;
    const classLevel = this.config.classLevel;

    data.sections = [{
      level,
      header: this.config.item.name,
      subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: classLevel }),
      advancements: await Promise.all(this.advancementsForLevel(this.config.item, classLevel).map(async a => {
        return await this.getAdvancementFlowData(this.getFlow(a, level, classLevel));
      }))
    }];

    data.sections.forEach(s => s.advancements.sort((a, b) => a.order.localeCompare(b.order)));

    return data;
  }

}


/**
 * Handles unapplying changes for a class and other items when level is decreased by one.
 * @extends {AdvancementStep}
 */
export class LevelDecreasedStep extends AdvancementStep { }


/**
 * Handles adding a new item with advancement at the current character level.
 * @extends {AdvancementStep}
 */
export class ItemAddedStep extends AdvancementStep { }


/**
 * Handles unapplying any advancement changes when a non-class item with advancement is removed.
 * @extends {AdvancementStep}
 */
export class ItemRemovedStep extends AdvancementStep { }


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
      advancements: await Promise.all(this.advancementsForLevel(this.config.item, this.config.level).map(async a => {
        return await this.getAdvancementFlowData(this.getFlow(a, this.config.level));
      }))
    }];
    data.sections[0].advancements.sort((a, b) => a.order.localeCompare(b.order));
  }

}
