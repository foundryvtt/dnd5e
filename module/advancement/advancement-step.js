/**
 * Step in the advancement process that will be displayed on its individual page.
 *
 * @property {Actor5e} actor   Actor to which this step's changes will be applied.
 * @property {object} config   Configuration information specific to each step type.
 * @property {object} options  Options passed through to Application.
 * @extends {Application}
 */
export class AdvancementStep extends Application {

  constructor(actor, config, options) {
    super(options);

    /**
     * Actor that will be used when calculating changes.
     * @type {Actor5e}
     * @private
     */
    this._actor = actor;

    /**
     * Step configuration information.
     * @type {object}
     */
    this.config = config;

    /**
     * Data for each section displayed. Only required property is `flows` containing an array of AdvancementFlows.
     * @type {object[]}
     */
    this.sections = this.prepareSections();
    this.sections.forEach(s => s.flows.sort((a, b) => a.sortingValue.localeCompare(b.sortingValue)));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/advancement-step.html",
      title: null,
      popOut: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get id() {
    return `actor-advancement-step-${this.appId}`;
  }

  /* -------------------------------------------- */

  /**
   * Actor used by this advancement step.
   * @type {Actor5e}
   */
  get actor() {
    return this._actor;
  }

  /* -------------------------------------------- */

  /**
   * Replace the stored actor with the one provided and update all flows accordingly.
   * @param {Actor5e} actor  Actor to set.
   */
  set actor(actor) {
    this._actor = actor;

    for ( const flow of this.flows ) {
      const advancement = actor.items.get(flow.advancement.parent.id)?.advancement[flow.advancement.id];
      if ( advancement ) flow.advancement = advancement;
      else flow.advancement.actor = actor;
    }
  }

  /* -------------------------------------------- */

  /**
   * Advancement flows in this step in the order they should be applied.
   * @type {AdvancementFlow[]}
   */
  get flows() {
    return this.sections.flatMap(s => s.flows);
  }

  /* -------------------------------------------- */

  /**
   * Build up the sections list on initial creation of this step.
   * @returns {object[]}
   */
  prepareSections() { return []; }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _render(force, options) {
    await super._render(force, options);

    // Render flows within the step
    return Promise.all(this.flows.map(f => {
      f._element = null;
      return f._render(true, options);
    }));
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
    return Object.values(item.advancement).filter(a => a.levels.includes(level));
  }

  /* -------------------------------------------- */

  /**
   * Apply changes for this step to the actor.
   * @returns {Promise}  Fulfills once the changes have completed.
   */
  async applyChanges() {
    // Prepare updates to apply
    const updates = this.prepareUpdates();

    // Apply changes to actor clone
    const itemsAdded = await this.constructor.applyUpdates(this.actor, updates);

    // Update clone actor advancement choices and ensure advancement flows have access to that data
    return this.constructor.updateAdvancementData({ actor: this.actor, flows: this.flows, itemsAdded });
  }

  /* -------------------------------------------- */

  /**
   * Remove changes made by this step from the actor.
   * @returns {Promise}  Fulfills once the changes have completed.
   */
  async undoChanges() {
    // Prepare updates that need to be removed
    const updates = this.prepareUpdates({ reverse: true });

    // Revert actor clone to earlier state
    await this.constructor.applyUpdates(this.actor, updates);

    // Revert changes to clone's advancement choices
    await this.constructor.updateAdvancementData({ actor: this.actor, flows: this.flows.reverse(), reverse: true });
  }

  /* -------------------------------------------- */

  /**
   * Prepare the actor and item updates that all of the advancements within this step should apply.
   * @param {object} [config={}]
   * @param {boolean} [config.reverse=false]  Prepare updates to undo these advancements.
   * @returns {object}                        Updates that will be applied from all the flows.
   */
  prepareUpdates({ reverse=false }={}) {
    return this.flows.reduce((updates, flow) => {
      // Prepare update data from the form
      flow.initialUpdate = reverse ? {} : flow.prepareUpdate(flow.form ? flow._getSubmitData() : {});
      const fetchData = { level: flow.level, updates: flow.initialUpdate, reverse };

      // Prepare property changes
      Object.assign(updates.actor, flow.advancement.propertyUpdates(fetchData));

      // Prepare added or removed items
      const { add, remove } = flow.advancement.itemUpdates(fetchData);
      add.forEach(uuid => updates.item.add[uuid] = `${flow.advancement.parent.id}.${flow.advancement.id}`);
      updates.item.remove.push(...remove);

      return updates;
    }, { actor: {}, item: { add: {}, remove: [] } });
  }

  /* -------------------------------------------- */

  /**
   * Apply stored updates to an actor, modifying properties and adding or removing items.
   * @param {Actor5e} actor        Actor upon which to perform the updates.
   * @param {object} updates       Updates to apply to actor and items.
   * @returns {Promise<Item5e[]>}  New items that have been created.
   */
  static async applyUpdates(actor, updates) {
    // Begin fetching data for new items
    let newItems = Promise.all(Object.keys(updates.item.add).map(fromUuid));

    // Apply property changes to actor
    await this._updateActor(actor, foundry.utils.deepClone(updates.actor));

    // Add new items to actor
    newItems = (await newItems).map(item => {
      const data = item.toObject();
      foundry.utils.mergeObject(data, {
        "flags.dnd5e.sourceId": item.uuid,
        "flags.dnd5e.advancementOrigin": updates.item.add[item.uuid]
      });
      return data;
    });
    const itemsAdded = await this._createEmbeddedItems(actor, newItems);

    // Remove items from actor
    await this._deleteEmbeddedItems(actor, updates.item.remove.filter(id => actor.items.has(id)));

    return itemsAdded;
  }

  /* -------------------------------------------- */

  /**
   * Update stored advancement data for the provided flows.
   * @param {object} config
   * @param {Actor5e} config.actor             Actor's whose advancements should be updated.
   * @param {AdvancementFlow[]} config.flows   Flows to update.
   * @param {Item5e[]} [config.itemsAdded=[]]  New items that have been created.
   * @param {boolean} [config.reverse=false]   Whether the advancement value changes should be undone.
   * @returns {Promise<Item5e[]>}              Items that have had their advancement data updated.
   */
  static async updateAdvancementData({ actor, flows, itemsAdded=[], reverse=false }) {
    let embeddedUpdates = {};
    for ( const flow of flows ) {
      const update = reverse ? flow.reverseUpdate() : flow.finalizeUpdate(flow.initialUpdate, itemsAdded);
      const item = actor.items.get(flow.advancement.parent.id);
      if ( foundry.utils.isObjectEmpty(update) || !item ) continue;

      embeddedUpdates[item.id] ??= foundry.utils.deepClone(item.data.data.advancement);
      const idx = embeddedUpdates[item.id].findIndex(a => a._id === flow.advancement.id);
      if ( idx < 0 ) continue;

      foundry.utils.mergeObject(embeddedUpdates[item.id][idx], { value: update });
    }

    // Update all advancements with new values
    embeddedUpdates = Object.entries(embeddedUpdates).map(([id, updates]) => {
      return { _id: id, "data.advancement": updates };
    });
    return await this._updateEmbeddedItems(actor, embeddedUpdates);
  }

  /* -------------------------------------------- */

  /**
   * Apply data updates to the actor clone. **Does not perform database changes.**
   * @param {Actor5e} actor       Clone to which to apply updates.
   * @param {object} updates      Object of updates to apply.
   * @returns {Promise<Actor5e>}  Actor with updates applied.
   * @protected
   */
  static async _updateActor(actor, updates) {
    actor.data.update(updates);
    actor.prepareData();
    return actor;
  }

  /* -------------------------------------------- */

  /**
   * Create embedded items on the actor clone. **Does not perform database changes.**
   * @param {Actor5e} actor        Clone on which to create items.
   * @param {object[]} items       An array of data objects used to create multiple documents.
   * @returns {Promise<Item5e[]>}  An array of created Item instances.
   * @protected
   */
  static async _createEmbeddedItems(actor, items) {
    const documents = await Promise.all(items.map(i => new Item.implementation(i, { parent: actor })));
    actor.data.items = actor.data._source.items;
    documents.forEach(d => actor.data._source.items.push(d.toObject()));
    actor.prepareData();

    // TODO: Trigger any additional advancement steps for added items

    return documents;
  }

  /* -------------------------------------------- */

  /**
   * Updated embedded items on the actor clone. **Does not perform database changes.**
   * @param {Actor5e} actor        Clone on which to update items.
   * @param {object[]} updates     An array of differential data objects.
   * @returns {Promise<Item5e[]>}  An array of updated Item instances.
   * @protected
   */
  static async _updateEmbeddedItems(actor, updates) {
    this._updateActor(actor, {items: updates});
    const ids = new Set(updates.map(u => u._id));
    return actor.items.filter(i => ids.has(i.id));
  }

  /* -------------------------------------------- */

  /**
   * Delete embedded items on the actor clone. **Does not perform database changes.**
   * @param {Actor5e} actor        Clone from which to delete items.
   * @param {object[]} ids         An array of string ids for each Document to be deleted.
   * @returns {Promise<Item5e[]>}  An array of deleted Item instances.
   * @protected
   */
  static async _deleteEmbeddedItems(actor, ids) {
    const documents = [];
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
    if ( this.config.classLevel > 1 ) return game.i18n.localize("DND5E.AdvancementPromptLevelIncreasedTitle");
    return game.i18n.localize("DND5E.AdvancementPromptLevelNewClassTitle");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareSections() {
    const sections = [{
      level: this.config.level,
      classLevel: this.config.classLevel,
      item: this.config.item,
      flows: this.advancementsForLevel(this.config.item, this.config.classLevel).map(a => {
        return new a.constructor.flowApp(a, this.config.classLevel);
      })
    }];
    return sections;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), {
      sections: this.sections.map(section => {
        return {
          level: section.level,
          header: section.item.name,
          subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: section.classLevel }),
          advancements: section.flows.map(f => f.getPlaceholderData())
        };
      })
    });
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
    return game.i18n.localize("DND5E.AdvancementPromptModifyChoicesTitle");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareSections() {
    const sections = [{
      level: this.config.level,
      item: this.config.item,
      flows: this.advancementsForLevel(this.config.item, this.config.level).map(a => {
        return new a.constructor.flowApp(a, this.config.level);
      })
    }];
    return sections;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), {
      sections: this.sections.map(section => {
        return {
          level: section.level,
          header: section.item.name,
          subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: section.level }),
          advancements: section.flows.map(f => f.getPlaceholderData())
        };
      })
    });
  }

}
