/**
 * Represents data about a change is character and class level for an actor.
 *
 * @typedef {object} LevelChangeData
 * @property {Item5e|null} item  Class item that was added or changed.
 * @property {{ initial: number, final: number }} character  Overall character level changes.
 * @property {{ initial: number, final: number }} class      Changes to the class's level.
 */

/**
 * Application for controlling the advancement workflow and displaying the interface.
 * @extends FormApplication
 */
export class AdvancementManager extends FormApplication {

  constructor(actor, steps=[], options={}) {
    super(actor, options);

    /**
     * A clone of the original actor to which the changes can be applied during the advancement process.
     * @type {Actor5e}
     */
    this.clone = actor.clone();

    /**
     * Individual steps that will be applied in order.
     * @type {AdvancementStep}
     */
    this.steps = steps;

    /**
     * Step being currently displayed.
     * @type {number|null}
     * @private
     */
    this._stepIndex = steps.length ? 0 : null;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "flow"],
      template: "systems/dnd5e/templates/advancement/advancement-manager.html",
      width: 460,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return this.step?.title ?? "Advancement Manager"; // TODO: Localize
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
    if ( this._stepIndex === null ) return;
    return this.steps[this._stepIndex];
  }

  /* -------------------------------------------- */

  /**
   * Get the step before the current one.
   * @type {AdvancementStep}
   */
  get previousStep() {
    if ( this._stepIndex === null ) return;
    return this.steps[this._stepIndex - 1];
  }

  /* -------------------------------------------- */

  /**
   * Get the step after the current one.
   * @type {AdvancementStep}
   */
  get nextStep() {
    if ( this._stepIndex === null ) return;
    return this.steps[this._stepIndex + 1];
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
        this._addStep(new LevelIncreasedStep(this.actor, {
          item: data.item,
          level: data.character.initial + offset,
          classLevel: data.class.initial + offset
        }));
        offset += 1;
        levelDelta -= 1;
      }
    }

    // Level decreased
    else if ( levelDelta < 0 ) {
      while ( levelDelta < 0 ) {
        this._addStep(new LevelDecreasedStep(this.actor, {
          item: data.item,
          level: data.character.initial - offset,
          classLevel: data.class.initial - offset
        }));
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
    this._addStep(new ItemAddedStep(this.actor, { item }));
  }

  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a non-class item is removed.
   * @param {Item5e} item    Item that was removed.
   */
  itemRemoved(item) {
    this._addStep(new ItemRemovedStep(this.actor, { item }));
  }

  /* -------------------------------------------- */

  /**
   * Modify the choices made on an item at the specified level.
   * @param {Item5e} item   Item to modify.
   * @param {number} level  Level at which the changes should be made.
   */
  modifyChoices(item, level) {
    this._addStep(new ModifyChoicesStep(this.actor, { item, level }));
  }

  /* -------------------------------------------- */

  /**
   * Add an advancement step and re-render the app using debounce.
   * @param {AdvancementStep} step  Step to add.
   * @private
   */
  _addStep(step) {
    const newIndex = this.steps.push(step) - 1;
    if ( this._stepIndex === null ) this._stepIndex = newIndex;
    this.render(true);
    // TODO: Re-render using a debounce to avoid multiple renders if several steps are added in a row.
    // TODO: Skip rendering if AdvancementStep#shouldRender is false
  }

  /* -------------------------------------------- */
  /*  Form Rendering                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const data = {};
    if ( this.previousStep ) data.previousStep = true;

    if ( !this.step ) return data;
    await this.step.getData(data);

    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("button[name='previous']")?.click(this.reverseStep.bind(this));
    html.find("button[name='next']").click(this.advanceStep.bind(this));
    this.step?.activateListeners(html);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async close(options={}) {
    if ( !options.skipConfirmation ) {
      // TODO: Add confirmation dialog informing players that no changes have been made
    }
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

  /* -------------------------------------------- */
  /*  Process                                     */
  /* -------------------------------------------- */

  /**
   * Advance to the next step in the workflow.
   * @returns {Promise}
   */
  async advanceStep() {
    // TODO: Add protection from double submission, maybe just use FormApplication#_onSubmit

    // Prepare changes from current step
    const formData = this._getSubmitData();
    this.step.prepareUpdates(foundry.utils.expandObject(formData), this.clone);

    // Apply changes to actor clone
    await this.step.applyUpdates(this.clone);

    // Check to see if this is the final step, if so, head over to complete
    if ( !this.nextStep ) return this.complete();

    // Increase step number and re-render
    this._stepIndex += 1;
    this.render();
    // TODO: If you had previously selected choices at this step, and then went back,
    //       ensure the form reflects your previous choices
  }

  /* -------------------------------------------- */

  /**
   * Return to a previous step in the workflow.
   * @returns {Promise}
   */
  async reverseStep() {
    if ( !this.previousStep ) return;

    // TODO: Save choices on current form?

    // Prepare updates that need to be removed
    this.previousStep.prepareUpdates({}, this.clone, { reverse: true });

    // Revert actor clone to earlier state
    await this.previousStep.applyUpdates(this.clone);

    // Decrease step number and re-render
    this._stepIndex -= 1;
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Apply changes to actual actor after all choices have been made.
   * @returns {Promise}
   */
  async complete() {
    // Iterate over each step apply changes to actual actor
    this.steps.forEach(s => s.applyUpdates(this.actor));
    // TODO: This currently shows multiple visible changes, find a way to reduce that (single update or render=false)

    // Close manager & remove from actor
    await this.close({ skipConfirmation: true });
  }

}


/**
 *
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
     * Advancement flows that make up this step.
     * @type {AdvancementFlow[]}
     */
    this.flows = [];

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

  /**
   * Activate event listeners on each individual flow within this step.
   * @param {jQuery} html  HTML of the AdvancementManager application.
   */
  activateListeners(html) {
    html[0].querySelectorAll("section[data-id]").forEach(section => {
      this.flows[section.dataset.id]?.activateListeners($(section));
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare the actor and item updates that all of the advancements within this step should apply.
   * @param {Actor5e} actor                    Actor to base the changes upon.
   * @param {object} data                      Object containing form data with individual advancement data grouped by ID.
   * @param {object} [options={}]              
   * @param {boolean} [options.reverse=false]  Prepare updates to undo these advancements.
   */
  prepareUpdates(actor, data, { reverse=false }={}) {
    // Loop through each advancement gathering their actor changes and items to add
    for ( const [id, flow] of Object.entries(this.flows) ) {
      if ( actor ) flow.advancement.actor = actor;
      const level = flow.advancement.parent.type === "class" ? this.config.classLevel : this.config.level;
      flow.initialUpdate = flow.prepareUpdate(foundry.utils.flattenObject(data[id] ?? {}));
      Object.assign(this.actorUpdates, flow.advancement.propertyUpdates(level, flow.initialUpdate, { reverse }));
      const { add, remove } = flow.advancement.itemUpdates(level, flow.initialUpdate, { reverse });
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
      if ( !item ) continue;
      documents.push(item);

      const updates = foundry.utils.deepClone(data);
      delete updates._id;
      foundry.utils.mergeObject(item.data._source, updates);
    }
    // TODO: I'm not sure this entirely works

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
      if ( !item ) continue;
      documents.push(item);
      actor.items.delete(id);
    }

    actor.prepareData();
    return documents;
  }

}


/**
 *
 * @extends AdvancementStep
 */
class LevelIncreasedStep extends AdvancementStep {

  get title() {
    return "Level Up Character"; // TODO: Localize
  }

}


/**
 *
 * @extends AdvancementStep
 */
class LevelDecreasedStep extends AdvancementStep {

  /** @inheritdoc */
  static shouldRender = false;

}


/**
 *
 * @extends AdvancementStep
 */
class ItemAddedStep extends AdvancementStep {
  // TODO: Implement later
}


/**
 *
 * @extends AdvancementStep
 */
class ItemRemovedStep extends AdvancementStep {

    /** @inheritdoc */
    static shouldRender = false;

}


/**
 *
 * @extends AdvancementStep
 */
class ModifyChoicesStep extends AdvancementStep {
  
  get title() {
    return "Modify Choices"; // TODO: Localize
  }

}
