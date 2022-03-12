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
     */
    this.actor = actor;

    /**
     * Step configuration information.
     * @type {object}
     */
    this.config = config;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/advancement-step.html",
      title: null,
      popOut: false,
      confirmClose: true,
      reverse: false,
      shouldRender: true
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get id() {
    return `actor-advancement-step-${this.appId}`;
  }

  /* -------------------------------------------- */

  /**
   * The main item associated with this step if available.
   * @type {Item5e|null}
   */
  get item() {
    return this.actor.items.get(this.config.item.id) ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Should this step be rendered or applied automatically?
   * @type {boolean}
   */
  get shouldRender() {
    return this.options.shouldRender;
  }

  /* -------------------------------------------- */

  /**
   * Advancement flows in this step in the order they should be applied.
   * @type {AdvancementFlow[]}
   */
  get flows() {
    return [];
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), { appId: this.id });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _render(force, options) {
    await super._render(force, options);

    // Render flows within the step
    return Promise.all(this.flows.map(f => {
      f._element = null;
      return f._render(force, options);
    }));
  }

  /* -------------------------------------------- */

  /**
   * Returns all advancements on an item for a specific level in the proper order.
   * @param {Item5e} item      Item that has advancement.
   * @param {number} level     Level in question.
   * @returns {Advancement[]}  Relevant advancement objects.
   * @protected
   */
  advancementsForLevel(item, level) {
    const advancements = Object.values(item.advancement).filter(a => a.levels.includes(level));
    return advancements.sort((a, b) => a.sortingValueForLevel(level).localeCompare(b.sortingValueForLevel(level)));
  }

  /* -------------------------------------------- */

  /**
   * Apply changes for this step to the actor.
   * @returns {Promise}  Fulfills once the changes have completed.
   */
  async applyChanges() {
    // Prepare updates to apply
    const updates = this.prepareUpdates({ reverse: this.options.reverse });

    // Apply changes to actor clone
    const itemsAdded = await this.constructor.applyUpdates(this.actor, updates);

    // Update clone actor advancement choices and ensure advancement flows have access to that data
    this.constructor.updateAdvancementData({ flows: this.flows, itemsAdded, reverse: this.options.reverse });
    return this.actor.prepareData();
  }

  /* -------------------------------------------- */

  /**
   * Remove changes made by this step from the actor.
   * @returns {Promise}  Fulfills once the changes have completed.
   */
  async undoChanges() {
    // Prepare updates that need to be removed
    const updates = this.prepareUpdates({ reverse: !this.options.reverse });

    // Revert actor clone to earlier state
    return this.constructor.applyUpdates(this.actor, updates);
  }

  /* -------------------------------------------- */

  /**
   * Perform any cleanup operations necessary before the advancement prompt completes.
   */
  async cleanup() { }

  /* -------------------------------------------- */

  /**
   * Prepare the actor and item updates that all of the advancements within this step should apply.
   * @param {object} [config={}]
   * @param {boolean} [config.reverse=false]  Prepare updates to undo these advancements.
   * @returns {object}                        Updates that will be applied from all the flows.
   */
  prepareUpdates({ reverse=false }={}) {
    if ( this.options.reverse ) reverse = !reverse;
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
    this._updateActor(actor, foundry.utils.deepClone(updates.actor));

    // Add new items to actor
    newItems = (await newItems).map(item => {
      const data = item.toObject();
      foundry.utils.mergeObject(data, {
        _id: foundry.utils.randomID(),
        "flags.dnd5e.sourceId": item.uuid,
        "flags.dnd5e.advancementOrigin": updates.item.add[item.uuid]
      });
      return data;
    });
    const itemsAdded = this._createEmbeddedItems(actor, newItems);

    // Remove items from actor
    this._deleteEmbeddedItems(actor, updates.item.remove.filter(id => actor.items.has(id)));

    return itemsAdded;
  }

  /* -------------------------------------------- */

  /**
   * Update stored advancement data for the provided flows.
   * @param {object} config
   * @param {AdvancementFlow[]} config.flows   Flows to update.
   * @param {Item5e[]} [config.itemsAdded=[]]  New items that have been created.
   * @param {boolean} [config.reverse=false]   Whether the advancement value changes should be undone.
   * @returns {Promise<Item5e[]>}              Items that have had their advancement data updated.
   */
  static updateAdvancementData({ flows, itemsAdded=[], reverse=false }) {
    for ( const flow of flows ) {
      const update = reverse ? flow.reverseUpdate() : flow.finalizeUpdate(flow.initialUpdate, itemsAdded);
      if ( foundry.utils.isObjectEmpty(update) ) continue;
      flow.advancement.updateSource({ value: update });
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply data updates to the actor clone. **Does not perform database changes.**
   * @param {Actor5e} actor       Clone to which to apply updates.
   * @param {object} updates      Object of updates to apply.
   * @returns {Promise<Actor5e>}  Actor with updates applied.
   * @protected
   */
  static _updateActor(actor, updates) {
    actor.data.update(updates);
    actor.prepareData();
    return actor;
  }

  /* -------------------------------------------- */

  /**
   * Create embedded items on the actor clone. **Does not perform database changes.**
   * @param {Actor5e} actor        Clone on which to create items.
   * @param {object[]} items       An array of data objects used to create multiple documents.
   * @param {object} [options={}]
   * @param {boolean} [options.skipAdvancement=false]  Do not create new advancements steps for the created items.
   * @returns {Promise<Item5e[]>}  An array of created Item instances.
   * @protected
   */
  static _createEmbeddedItems(actor, items, { skipAdvancement=false }={}) {
    const documents = items.map(i => new Item.implementation(i, { parent: actor }));
    actor.data.items = actor.data._source.items;
    documents.forEach(d => actor.data._source.items.push(d.toObject()));
    actor.prepareData();

    if ( !skipAdvancement ) {
      // TODO: Trigger any additional advancement steps for added items
    }

    return documents;
  }

  /* -------------------------------------------- */

  /**
   * Delete embedded items on the actor clone. **Does not perform database changes.**
   * @param {Actor5e} actor        Clone from which to delete items.
   * @param {object[]} ids         An array of string ids for each Document to be deleted.
   * @param {object} [options={}]
   * @param {boolean} [options.skipAdvancement=false]  Do not create new advancements steps for the deleted items.
   * @returns {Promise<Item5e[]>}  An array of deleted Item instances.
   * @protected
   */
  static _deleteEmbeddedItems(actor, ids, { skipAdvancement=false }={}) {
    const documents = [];
    for ( const id of ids ) {
      const item = actor.items.get(id);
      if ( !item ) continue;
      documents.push(item);
      actor.items.delete(id);
    }
    actor.prepareData();

    if ( !skipAdvancement ) {
      // TODO: Trigger any additional advancement steps for deleted items
    }

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

  get shouldRender() {
    return this.flows.length > 0;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get flows() {
    this._flows ??= this.advancementsForLevel(this.item, this.config.classLevel).map(a => {
      return new a.constructor.flowApp(this.item, a.id, this.config.classLevel);
    });
    return this._flows;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), {
      sections: [{
        level: this.config.level,
        header: this.item.name,
        subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: this.config.classLevel }),
        advancements: this.flows.map(f => f.id)
      }]
    });
  }

}


/**
 * Handles unapplying changes for a class and other items when level is decreased by one.
 * @extends {AdvancementStep}
 */
export class LevelDecreasedStep extends AdvancementStep {

  constructor(...args) {
    super(...args);

    // If class item has already been deleted on actor, add it back temporarily
    if ( !this.actor.items.get(this.config.item.id) ) {
      this._tempClass = true;
      this.constructor._createEmbeddedItems(this.actor, [this.config.item.toObject()], { skipAdvancement: true });
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      reverse: true,
      shouldRender: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get flows() {
    this._flows ??= this.advancementsForLevel(this.item, this.config.classLevel).map(a => {
      return new a.constructor.flowApp(this.item, a.id, this.config.classLevel);
    });
    return this._flows;
  }

  /* -------------------------------------------- */

  /**
   * Remove the class item from the actor.
   */
  cleanup() {
    if ( this._tempClass ) {
      this.constructor._deleteEmbeddedItems(this.actor, [this.config.item.id], { skipAdvancement: true });
    }
  }

}


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
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize("DND5E.AdvancementPromptModifyChoicesTitle"),
      confirmClose: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get flows() {
    this._flows ??= this.advancementsForLevel(this.item, this.config.level).map(a => {
      return new a.constructor.flowApp(this.item, a.id, this.config.level);
    });
    return this._flows;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), {
      sections: [{
        level: this.config.level,
        header: this.item.name,
        subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: this.config.level }),
        advancements: this.flows.map(f => f.id)
      }]
    });
  }

}
