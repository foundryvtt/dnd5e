/*

{ type: "levelIncreased", item: Item5e, level: number, classLevel: number }
{ type: "levelDecreased", item: Item5e, level: number, classLevel: number }
{ type: "itemAdded", item: Item5e }
{ type: "itemRemoved", item: Item5e }
{ type: "modifyChoices", item: Item5e, level: number }

*/

/**
 * Represents data about a change is character and class level for an actor.
 *
 * @typedef {object} LevelChangeData
 * @property {Item5e|null} item  Class item that was added or changed.
 * @property {{ initial: number, final: number }} character  Overall character level changes.
 * @property {{ initial: number, final: number }} class      Changes to the class's level.
 */

export class AdvancementManager extends FormApplication {

  constructor(actor, steps=[], options={}) {
    super(actor, options);

    /**
     * 
     */
    this.steps = steps;

    /**
     * Step being currently displayed.
     * @type {number|null}
     */
    this.stepIndex = steps.length ? 0 : null;

    /**
     * Cache of advancement flows.
     * @type {object}
     */
    this.flows = {};
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "flow"],
      template: "systems/dnd5e/templates/advancement/advancement-manager.html",
      width: 460,
      height: "auto",
      title: "Advancement Manager" // TODO: This should be responsive, aka "Level Up Character", "Add Item", "Edit Advancement"
    });
  }

  /* -------------------------------------------- */

  /**
   * Actor upon which this advancement is being performed.
   * @type {Actor5e}
   */
  get actor() {
    return this.object;
  }

  /* -------------------------------------------- */

  /**
   * Get the step that is currently in progress. Will be undefined if no step is in progress.
   * @type {AdvancementStep}
   */
  get step() {
    if ( this.stepIndex === null ) return;
    return this.steps[this.stepIndex];
  }

  /* -------------------------------------------- */
  /*  Advancement Actions                         */
  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a class is added or level is changed.
   * @param {LevelChangeData} data  Information on the class and level changes.
   */
  levelChanged(data) {
    let levelDelta = data.character.final - data.character.initial;
    let offset = 1;

    // TODO: Simplify all this
    // Level increased
    if ( levelDelta > 0 ) {
      while ( levelDelta > 0 ) {
        this._addStep({
          type: "levelIncreased", item: data.item,
          level: data.character.initial + offset,
          classLevel: data.class.initial + offset
        });
        offset += 1;
        levelDelta -= 1;
      }
    }

    // Level decreased
    else if ( levelDelta < 0 ) {
      while ( levelDelta < 0 ) {
        this._addStep({
          type: "levelDecreased", item: data.item,
          level: data.character.initial - offset,
          classLevel: data.class.initial - offset
        });
        offset += 1;
        levelDelta += 1;
      }
    }

    // Level didn't change
    else {
      throw new Error("Level did not change within level change advancement.")
    }
  }

  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a non-class item is added.
   * @param {Item5e} item    Item that was added.
   */
  itemAdded(item) {
    this._addStep({ type: "itemAdded", item });
  }

  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a non-class item is removed.
   * @param {Item5e} item    Item that was removed.
   */
  itemRemoved(item) {
    this._addStep({ type: "itemRemoved", item });
  }

  /* -------------------------------------------- */

  /**
   * Modify the choices made on an item at the specified level.
   * @param {Item5e} item   Item to modify.
   * @param {number} level  Level at which the changes should be made.
   */
  modifyChoices(item, level) {
    this._addStep({ type: "modifyChoices", item, level });
  }

  /* -------------------------------------------- */

  /**
   * Add an advancement step and re-render the app using debounce.
   * @param {AdvancementStep} step  Step to add.
   * @private
   */
  _addStep(step) {
    const newIndex = this.steps.push(new AdvancementStep(this.actor, step)) - 1;
    if ( this.stepIndex === null ) this.stepIndex = newIndex;
    this.render(true);
    // TODO: Re-render using a debounce to avoid multiple renders if several steps are added in a row.
  }

  /* -------------------------------------------- */
  /*  Form Rendering                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const data = {};

    if ( !this.step ) return data;
    await this.step.getData(data);

    return data;
  }

  /* -------------------------------------------- */

  /**
   * Returns all advancements on an item for a specific level.
   * @param {Item5e} item      Item that has advancement.
   * @param {number} level     Level in question.
   * @returns {Advancement[]}  Relevant advancement objects.
   */
  _advancementsForLevel(item, level) {
    return Object.values(item.advancement).filter(a => {
      const levels = a.levels;
      return levels.includes(level);
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    this.step?.activateListeners(html);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async close(options={}) {
    // TODO: Add confirmation dialog informing players that no changes have been made
    this.actor._advancement = null;
    await super.close(options);
  }

  /* -------------------------------------------- */

  async _updateObject(event, formData) {
    if ( !this.step ) return;
    const data = foundry.utils.expandObject(formData);
    this.step.prepareUpdates(data);
    await this.step.applyUpdates(this.actor);
  }

}


class AdvancementStep {

  constructor(actor, config) {
    /**
     *
     */
    this.actor = actor;

    /**
     * Step configuration
     */
    this.config = config;

    /**
     *
     */
    this.flows = [];

    /**
     * 
     */
    this.actorUpdates = {};

    /**
     *
     */
    this.itemUpdates = { add: [], remove: [] };
  }

  /* -------------------------------------------- */

  /**
   * Should this step be rendered or applied automatically?
   * @type {boolean}
   */
  static shouldRender = true;

  /* -------------------------------------------- */

  /**
   *
   */
  async getData(data) {
    const level = this.config.classLevel ?? this.config.level ?? this.actor.data.data.details.level;
    data.header = this.config.item.name;
    data.subheader = `Level ${level}`; // TODO: Localize

    // TODO: Handle other items with advancements during level change steps
    data.advancements = await Promise.all(this._advancementsForLevel(this.config.item, level).map(async (a) => {
      this.flows[a.id] ??= new a.constructor.flowApp(a, { level });
      return {
        id: a.id,
        type: a.constructor.typeName,
        data: await this.flows[a.id].getData(),
        template: this.flows[a.id].options.template,
        title: this.flows[a.id].title,
        order: a.sortingValueForLevel(level)
      };
    }));
    data.advancements.sort((a, b) => a.order.localeCompare(b.order));
  }
  
  /* -------------------------------------------- */

  /**
   * Returns all advancements on an item for a specific level.
   * @param {Item5e} item      Item that has advancement.
   * @param {number} level     Level in question.
   * @returns {Advancement[]}  Relevant advancement objects.
   */
  _advancementsForLevel(item, level) {
    return Object.values(item.advancement).filter(a => {
      const levels = a.levels;
      return levels.includes(level);
    });
  }

  /* -------------------------------------------- */

  activateListeners(html) {
    html[0].querySelectorAll("section[data-id]").forEach(section => {
      this.flows[section.dataset.id]?.activateListeners($(section));
    });
  }

  /* -------------------------------------------- */

  /**
   * 
   */
  prepareUpdates(data) {
    // Loop through each advancement gathering their actor changes and items to add
    for ( const [id, flow] of Object.entries(this.flows) ) {
      const level = flow.advancement.parent.type === "class" ? this.config.classLevel : this.config.level;
      flow.initialUpdate = flow.prepareUpdate(foundry.utils.flattenObject(data[id] ?? {}));
      Object.assign(this.actorUpdates, flow.advancement.propertyUpdates(level, flow.initialUpdate));
      const { add, remove } = flow.advancement.itemUpdates(level, flow.initialUpdate);
      this.itemUpdates.add.push(...add);
      this.itemUpdates.remove.push(...remove);
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
    await actor.update(this.actorUpdates);

    // Add new items to actor
    newItems = (await newItems).map(item => {
      const data = item.toObject();
      foundry.utils.mergeObject(data, {
        "flags.dnd5e.sourceId": item.uuid,
        // "flags.dnd5e.advancementOrigin": `${originalItem.id}.${advancement.id}` // TODO: Make this work
      });
      return data;
    });
    const itemsAdded = await actor.createEmbeddedDocuments("Item", newItems);

    // Remove items from actor
    await actor.deleteEmbeddedDocuments("Item", this.itemUpdates.remove.filter(id => actor.items.has(id)));

    // Finalize value updates to advancement with IDs of added items
    let embeddedUpdates = {};
    for ( const [id, flow] of Object.entries(this.flows) ) {
      const update = flow.finalizeUpdate(flow.initialUpdate, itemsAdded);
      if ( foundry.utils.isObjectEmpty(update) ) continue;
      const itemId = flow.advancement.parent.id;
      if ( !embeddedUpdates[itemId] ) {
        embeddedUpdates[itemId] = foundry.utils.deepClone(flow.advancement.parent.data.data.advancement);
      }
      const idx = embeddedUpdates[itemId].findIndex(a => a._id === id);
      if ( idx === -1 ) continue;
      foundry.utils.mergeObject(embeddedUpdates[itemId][idx], { value: update });
    }
    
    // Update all advancements with new values
    embeddedUpdates = Object.entries(embeddedUpdates).map(([id, updates]) => {
      return { _id: id, "data.advancement": updates };
    });
    await actor.updateEmbeddedDocuments("Item", embeddedUpdates);
  }

}
