import Advancement from "../../documents/advancement/advancement.mjs";

/**
 * Internal type used to manage each step within the advancement process.
 *
 * @typedef {object} AdvancementStep
 * @property {string} type                Step type from "forward", "reverse", "restore", or "delete".
 * @property {AdvancementFlow} [flow]     Flow object for the advancement being applied by this step.
 * @property {Item5e} [item]              For "delete" steps only, the item to be removed.
 * @property {object} [class]             Contains data on class if step was triggered by class level change.
 * @property {Item5e} [class.item]        Class item that caused this advancement step.
 * @property {number} [class.level]       Level the class should be during this step.
 * @property {boolean} [automatic=false]  Should the manager attempt to apply this step without user interaction?
 */

/**
 * Application for controlling the advancement workflow and displaying the interface.
 *
 * @param {Actor5e} actor        Actor on which this advancement is being performed.
 * @param {object} [options={}]  Additional application options.
 */
export default class AdvancementManager extends Application {
  constructor(actor, options={}) {
    super(options);

    /**
     * The original actor to which changes will be applied when the process is complete.
     * @type {Actor5e}
     */
    this.actor = actor;

    /**
     * A clone of the original actor to which the changes can be applied during the advancement process.
     * @type {Actor5e}
     */
    this.clone = actor.clone();

    /**
     * Individual steps that will be applied in order.
     * @type {object}
     */
    this.steps = [];

    /**
     * Step being currently displayed.
     * @type {number|null}
     * @private
     */
    this._stepIndex = null;

    /**
     * Is the prompt currently advancing through un-rendered steps?
     * @type {boolean}
     * @private
     */
    this._advancing = false;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "flow"],
      template: "systems/dnd5e/templates/advancement/advancement-manager.hbs",
      width: 460,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    const visibleSteps = this.steps.filter(s => !s.automatic);
    const visibleIndex = visibleSteps.indexOf(this.step);
    const step = visibleIndex < 0 ? "" : game.i18n.format("DND5E.AdvancementManagerSteps", {
      current: visibleIndex + 1,
      total: visibleSteps.length
    });
    return `${game.i18n.localize("DND5E.AdvancementManagerTitle")} ${step}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get id() {
    return `actor-${this.actor.id}-advancement`;
  }

  /* -------------------------------------------- */

  /**
   * Get the step that is currently in progress.
   * @type {object|null}
   */
  get step() {
    return this.steps[this._stepIndex] ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Get the step before the current one.
   * @type {object|null}
   */
  get previousStep() {
    return this.steps[this._stepIndex - 1] ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Get the step after the current one.
   * @type {object|null}
   */
  get nextStep() {
    const nextIndex = this._stepIndex === null ? 0 : this._stepIndex + 1;
    return this.steps[nextIndex] ?? null;
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Construct a manager for a newly added advancement from drag-drop.
   * @param {Actor5e} actor               Actor from which the advancement should be updated.
   * @param {string} itemId               ID of the item to which the advancements are being dropped.
   * @param {Advancement[]} advancements  Dropped advancements to add.
   * @param {object} options              Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forNewAdvancement(actor, itemId, advancements, options) {
    const manager = new this(actor, options);
    const clonedItem = manager.clone.items.get(itemId);
    if ( !clonedItem || !advancements.length ) return manager;

    const currentLevel = this.currentLevel(clonedItem, manager.clone);
    const minimumLevel = advancements.reduce((min, a) => Math.min(a.levels[0] ?? Infinity, min), Infinity);
    if ( minimumLevel > currentLevel ) return manager;

    const oldFlows = Array.fromRange(currentLevel + 1).slice(minimumLevel)
      .flatMap(l => this.flowsForLevel(clonedItem, l));

    // Revert advancements through minimum level
    oldFlows.reverse().forEach(flow => manager.steps.push({ type: "reverse", flow, automatic: true }));

    // Add new advancements
    const advancementArray = clonedItem.toObject().system.advancement;
    advancementArray.push(...advancements.map(a => {
      const obj = a.toObject();
      if ( obj.constructor.dataModels?.value ) a.value = (new a.constructor.metadata.dataModels.value()).toObject();
      else obj.value = foundry.utils.deepClone(a.constructor.metadata.defaults?.value ?? {});
      return obj;
    }));
    clonedItem.updateSource({"system.advancement": advancementArray});

    const newFlows = Array.fromRange(currentLevel + 1).slice(minimumLevel)
      .flatMap(l => this.flowsForLevel(clonedItem, l));

    // Restore existing advancements and apply new advancements
    newFlows.forEach(flow => {
      const matchingFlow = oldFlows.find(f => (f.advancement.id === flow.advancement.id) && (f.level === flow.level));
      if ( matchingFlow ) manager.steps.push({ type: "restore", flow: matchingFlow, automatic: true });
      else manager.steps.push({ type: "forward", flow });
    });

    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Construct a manager for a newly added item.
   * @param {Actor5e} actor         Actor to which the item is being added.
   * @param {object} itemData       Data for the item being added.
   * @param {object} options        Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forNewItem(actor, itemData, options={}) {
    const manager = new this(actor, options);

    // Prepare data for adding to clone
    const dataClone = foundry.utils.deepClone(itemData);
    dataClone._id = foundry.utils.randomID();
    if ( itemData.type === "class" ) {
      dataClone.system.levels = 0;
      if ( !manager.clone.system.details.originalClass ) {
        manager.clone.updateSource({"system.details.originalClass": dataClone._id});
      }
    }

    // Add item to clone & get new instance from clone
    manager.clone.updateSource({items: [dataClone]});
    const clonedItem = manager.clone.items.get(dataClone._id);

    // For class items, prepare level change data
    if ( itemData.type === "class" ) {
      return manager.createLevelChangeSteps(clonedItem, itemData.system?.levels ?? 1);
    }

    // All other items, just create some flows up to current character level (or class level for subclasses)
    let targetLevel = manager.clone.system.details.level;
    if ( clonedItem.type === "subclass" ) targetLevel = clonedItem.class?.system.levels ?? 0;
    Array.fromRange(targetLevel + 1)
      .flatMap(l => this.flowsForLevel(clonedItem, l))
      .forEach(flow => manager.steps.push({ type: "forward", flow }));

    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Construct a manager for modifying choices on an item at a specific level.
   * @param {Actor5e} actor         Actor from which the choices should be modified.
   * @param {object} itemId         ID of the item whose choices are to be changed.
   * @param {number} level          Level at which the choices are being changed.
   * @param {object} options        Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forModifyChoices(actor, itemId, level, options) {
    const manager = new this(actor, options);
    const clonedItem = manager.clone.items.get(itemId);
    if ( !clonedItem ) return manager;

    const flows = Array.fromRange(this.currentLevel(clonedItem, manager.clone) + 1).slice(level)
      .flatMap(l => this.flowsForLevel(clonedItem, l));

    // Revert advancements through changed level
    flows.reverse().forEach(flow => manager.steps.push({ type: "reverse", flow, automatic: true }));

    // Create forward advancements for level being changed
    flows.reverse().filter(f => f.level === level).forEach(flow => manager.steps.push({ type: "forward", flow }));

    // Create restore advancements for other levels
    flows.filter(f => f.level > level).forEach(flow => manager.steps.push({ type: "restore", flow, automatic: true }));

    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Construct a manager for an advancement that needs to be deleted.
   * @param {Actor5e} actor         Actor from which the advancement should be unapplied.
   * @param {string} itemId         ID of the item from which the advancement should be deleted.
   * @param {string} advancementId  ID of the advancement to delete.
   * @param {object} options        Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forDeletedAdvancement(actor, itemId, advancementId, options) {
    const manager = new this(actor, options);
    const clonedItem = manager.clone.items.get(itemId);
    const advancement = clonedItem?.advancement.byId[advancementId];
    if ( !advancement ) return manager;

    const minimumLevel = advancement.levels[0];
    const currentLevel = this.currentLevel(clonedItem, manager.clone);

    // If minimum level is greater than current level, no changes to remove
    if ( (minimumLevel > currentLevel) || !advancement.appliesToClass ) return manager;

    advancement.levels
      .reverse()
      .filter(l => l <= currentLevel)
      .map(l => new advancement.constructor.metadata.apps.flow(clonedItem, advancementId, l))
      .forEach(flow => manager.steps.push({ type: "reverse", flow, automatic: true }));

    if ( manager.steps.length ) manager.steps.push({ type: "delete", advancement, automatic: true });

    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Construct a manager for an item that needs to be deleted.
   * @param {Actor5e} actor         Actor from which the item should be deleted.
   * @param {string} itemId         ID of the item to be deleted.
   * @param {object} options        Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forDeletedItem(actor, itemId, options) {
    const manager = new this(actor, options);
    const clonedItem = manager.clone.items.get(itemId);
    if ( !clonedItem ) return manager;

    // For class items, prepare level change data
    if ( clonedItem.type === "class" ) {
      return manager.createLevelChangeSteps(clonedItem, clonedItem.system.levels * -1);
    }

    // All other items, just create some flows down from current character level
    Array.fromRange(manager.clone.system.details.level + 1)
      .flatMap(l => this.flowsForLevel(clonedItem, l))
      .reverse()
      .forEach(flow => manager.steps.push({ type: "reverse", flow, automatic: true }));

    // Add a final step to remove the item only if there are advancements to apply
    if ( manager.steps.length ) manager.steps.push({ type: "delete", item: clonedItem, automatic: true });
    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Construct a manager for a change in a class's levels.
   * @param {Actor5e} actor         Actor whose level has changed.
   * @param {string} classId        ID of the class being changed.
   * @param {number} levelDelta     Levels by which to increase or decrease the class.
   * @param {object} options        Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forLevelChange(actor, classId, levelDelta, options={}) {
    const manager = new this(actor, options);
    const clonedItem = manager.clone.items.get(classId);
    if ( !clonedItem ) return manager;
    return manager.createLevelChangeSteps(clonedItem, levelDelta);
  }

  /* -------------------------------------------- */

  /**
   * Create steps based on the provided level change data.
   * @param {string} classItem      Class being changed.
   * @param {number} levelDelta     Levels by which to increase or decrease the class.
   * @returns {AdvancementManager}  Manager with new steps.
   * @private
   */
  createLevelChangeSteps(classItem, levelDelta) {
    const pushSteps = (flows, data) => this.steps.push(...flows.map(flow => ({ flow, ...data })));
    const getItemFlows = characterLevel => this.clone.items.contents.flatMap(i => {
      if ( ["class", "subclass"].includes(i.type) ) return [];
      return this.constructor.flowsForLevel(i, characterLevel);
    });

    // Level increased
    for ( let offset = 1; offset <= levelDelta; offset++ ) {
      const classLevel = classItem.system.levels + offset;
      const characterLevel = this.actor.system.details.level + offset;
      const stepData = { type: "forward", class: {item: classItem, level: classLevel} };
      pushSteps(this.constructor.flowsForLevel(classItem, classLevel), stepData);
      pushSteps(this.constructor.flowsForLevel(classItem.subclass, classLevel), stepData);
      pushSteps(getItemFlows(characterLevel), stepData);
    }

    // Level decreased
    for ( let offset = 0; offset > levelDelta; offset-- ) {
      const classLevel = classItem.system.levels + offset;
      const characterLevel = this.actor.system.details.level + offset;
      const stepData = { type: "reverse", class: {item: classItem, level: classLevel}, automatic: true };
      pushSteps(getItemFlows(characterLevel).reverse(), stepData);
      pushSteps(this.constructor.flowsForLevel(classItem.subclass, classLevel).reverse(), stepData);
      pushSteps(this.constructor.flowsForLevel(classItem, classLevel).reverse(), stepData);
      if ( classLevel === 1 ) this.steps.push({ type: "delete", item: classItem, automatic: true });
    }

    // Ensure the class level ends up at the appropriate point
    this.steps.push({
      type: "forward", automatic: true,
      class: {item: classItem, level: classItem.system.levels += levelDelta}
    });

    return this;
  }

  /* -------------------------------------------- */

  /**
   * Creates advancement flows for all advancements at a specific level.
   * @param {Item5e} item          Item that has advancement.
   * @param {number} level         Level in question.
   * @returns {AdvancementFlow[]}  Created flow applications.
   * @protected
   */
  static flowsForLevel(item, level) {
    return (item?.advancement.byLevel[level] ?? [])
      .filter(a => a.appliesToClass)
      .map(a => new a.constructor.metadata.apps.flow(item, a.id, level));
  }

  /* -------------------------------------------- */

  /**
   * Determine the proper working level either from the provided item or from the cloned actor.
   * @param {Item5e} item    Item being advanced. If class or subclass, its level will be used.
   * @param {Actor5e} actor  Actor being advanced.
   * @returns {number}       Working level.
   */
  static currentLevel(item, actor) {
    return item.system.levels ?? item.class?.system.levels ?? actor.system.details.level;
  }

  /* -------------------------------------------- */
  /*  Form Rendering                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    if ( !this.step ) return {};

    // Prepare information for subheading
    const item = this.step.flow.item;
    let level = this.step.flow.level;
    if ( (this.step.class) && ["class", "subclass"].includes(item.type) ) level = this.step.class.level;

    const visibleSteps = this.steps.filter(s => !s.automatic);
    const visibleIndex = visibleSteps.indexOf(this.step);

    return {
      actor: this.clone,
      flowId: this.step.flow.id,
      header: item.name,
      subheader: level ? game.i18n.format("DND5E.AdvancementLevelHeader", { level }) : "",
      steps: {
        current: visibleIndex + 1,
        total: visibleSteps.length,
        hasPrevious: visibleIndex > 0,
        hasNext: visibleIndex < visibleSteps.length - 1
      }
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  render(...args) {
    if ( this.steps.length && (this._stepIndex === null) ) this._stepIndex = 0;

    // Ensure the level on the class item matches the specified level
    if ( this.step?.class ) {
      let level = this.step.class.level;
      if ( this.step.type === "reverse" ) level -= 1;
      this.step.class.item.updateSource({"system.levels": level});
      this.clone.reset();
    }

    /**
     * A hook event that fires when an AdvancementManager is about to be processed.
     * @function dnd5e.preAdvancementManagerRender
     * @memberof hookEvents
     * @param {AdvancementManager} advancementManager The advancement manager about to be rendered
     */
    const allowed = Hooks.call("dnd5e.preAdvancementManagerRender", this);

    // Abort if not allowed
    if ( allowed === false ) return this;

    if ( this.step?.automatic ) {
      if ( this._advancing ) return this;
      this._forward();
      return this;
    }

    return super.render(...args);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _render(force, options) {
    await super._render(force, options);
    if ( (this._state !== Application.RENDER_STATES.RENDERED) || !this.step ) return;

    // Render the step
    this.step.flow._element = null;
    await this.step.flow._render(force, options);
    this.setPosition();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("button[data-action]").click(event => {
      const buttons = html.find("button");
      buttons.attr("disabled", true);
      html.find(".error").removeClass("error");
      try {
        switch ( event.currentTarget.dataset.action ) {
          case "restart":
            if ( !this.previousStep ) return;
            return this._restart(event);
          case "previous":
            if ( !this.previousStep ) return;
            return this._backward(event);
          case "next":
          case "complete":
            return this._forward(event);
        }
      } finally {
        buttons.attr("disabled", false);
      }
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async close(options={}) {
    if ( !options.skipConfirmation ) {
      return new Dialog({
        title: `${game.i18n.localize("DND5E.AdvancementManagerCloseTitle")}: ${this.actor.name}`,
        content: game.i18n.localize("DND5E.AdvancementManagerCloseMessage"),
        buttons: {
          close: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("DND5E.AdvancementManagerCloseButtonStop"),
            callback: () => super.close(options)
          },
          continue: {
            icon: '<i class="fas fa-chevron-right"></i>',
            label: game.i18n.localize("DND5E.AdvancementManagerCloseButtonContinue")
          }
        },
        default: "close"
      }).render(true);
    }
    await super.close(options);
  }

  /* -------------------------------------------- */
  /*  Process                                     */
  /* -------------------------------------------- */

  /**
   * Advance through the steps until one requiring user interaction is encountered.
   * @param {Event} [event]  Triggering click event if one occurred.
   * @returns {Promise}
   * @private
   */
  async _forward(event) {
    this._advancing = true;
    try {
      do {
        const flow = this.step.flow;
        const type = this.step.type;

        // Apply changes based on step type
        if ( (type === "delete") && this.step.item ) this.clone.items.delete(this.step.item.id);
        else if ( (type === "delete") && this.step.advancement ) {
          this.step.advancement.item.deleteAdvancement(this.step.advancement.id, { source: true });
        }
        else if ( type === "restore" ) await flow.advancement.restore(flow.level, flow.retainedData);
        else if ( type === "reverse" ) await flow.retainData(await flow.advancement.reverse(flow.level));
        else if ( flow ) await flow._updateObject(event, flow._getSubmitData());

        this._stepIndex++;

        // Ensure the level on the class item matches the specified level
        if ( this.step?.class ) {
          let level = this.step.class.level;
          if ( this.step.type === "reverse" ) level -= 1;
          this.step.class.item.updateSource({"system.levels": level});
        }
        this.clone.reset();
      } while ( this.step?.automatic );
    } catch(error) {
      if ( !(error instanceof Advancement.ERROR) ) throw error;
      ui.notifications.error(error.message);
      this.step.automatic = false;
      if ( this.step.type === "restore" ) this.step.type = "forward";
    } finally {
      this._advancing = false;
    }

    if ( this.step ) this.render(true);
    else this._complete();
  }

  /* -------------------------------------------- */

  /**
   * Reverse through the steps until one requiring user interaction is encountered.
   * @param {Event} [event]                  Triggering click event if one occurred.
   * @param {object} [options]               Additional options to configure behavior.
   * @param {boolean} [options.render=true]  Whether to render the Application after the step has been reversed. Used
   *                                         by the restart workflow.
   * @returns {Promise}
   * @private
   */
  async _backward(event, { render=true }={}) {
    this._advancing = true;
    try {
      do {
        this._stepIndex--;
        if ( !this.step ) break;
        const flow = this.step.flow;
        const type = this.step.type;

        // Reverse step based on step type
        if ( (type === "delete") && this.step.item ) this.clone.updateSource({items: [this.step.item]});
        else if ( (type === "delete") && this.step.advancement ) this.advancement.item.createAdvancement(
          this.advancement.typeName, this.advancement._source, { source: true }
        );
        else if ( type === "reverse" ) await flow.advancement.restore(flow.level, flow.retainedData);
        else if ( flow ) await flow.retainData(await flow.advancement.reverse(flow.level));
        this.clone.reset();
      } while ( this.step?.automatic );
    } catch(error) {
      if ( !(error instanceof Advancement.ERROR) ) throw error;
      ui.notifications.error(error.message);
      this.step.automatic = false;
    } finally {
      this._advancing = false;
    }

    if ( !render ) return;
    if ( this.step ) this.render(true);
    else this.close({ skipConfirmation: true });
  }

  /* -------------------------------------------- */

  /**
   * Reset back to the manager's initial state.
   * @param {MouseEvent} [event]  The triggering click event if one occurred.
   * @returns {Promise}
   * @private
   */
  async _restart(event) {
    const restart = await Dialog.confirm({
      title: game.i18n.localize("DND5E.AdvancementManagerRestartConfirmTitle"),
      content: game.i18n.localize("DND5E.AdvancementManagerRestartConfirm")
    });
    if ( !restart ) return;
    // While there is still a renderable step.
    while ( this.steps.slice(0, this._stepIndex).some(s => !s.automatic) ) {
      await this._backward(event, {render: false});
    }
    this.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Apply changes to actual actor after all choices have been made.
   * @param {Event} event  Button click that triggered the change.
   * @returns {Promise}
   * @private
   */
  async _complete(event) {
    const updates = this.clone.toObject();
    const items = updates.items;
    delete updates.items;

    // Gather changes to embedded items
    const { toCreate, toUpdate, toDelete } = items.reduce((obj, item) => {
      if ( !this.actor.items.get(item._id) ) {
        obj.toCreate.push(item);
      } else {
        obj.toUpdate.push(item);
        obj.toDelete.findSplice(id => id === item._id);
      }
      return obj;
    }, { toCreate: [], toUpdate: [], toDelete: this.actor.items.map(i => i.id) });

    /**
     * A hook event that fires at the final stage of a character's advancement process, before actor and item updates
     * are applied.
     * @function dnd5e.preAdvancementManagerComplete
     * @memberof hookEvents
     * @param {AdvancementManager} advancementManager  The advancement manager.
     * @param {object} actorUpdates                    Updates to the actor.
     * @param {object[]} toCreate                      Items that will be created on the actor.
     * @param {object[]} toUpdate                      Items that will be updated on the actor.
     * @param {string[]} toDelete                      IDs of items that will be deleted on the actor.
     */
    if ( Hooks.call("dnd5e.preAdvancementManagerComplete", this, updates, toCreate, toUpdate, toDelete) === false ) {
      console.log("AdvancementManager completion was prevented by the 'preAdvancementManagerComplete' hook.");
      return this.close({ skipConfirmation: true });
    }

    // Apply changes from clone to original actor
    await Promise.all([
      this.actor.update(updates, { isAdvancement: true }),
      this.actor.createEmbeddedDocuments("Item", toCreate, { keepId: true, isAdvancement: true }),
      this.actor.updateEmbeddedDocuments("Item", toUpdate, { isAdvancement: true }),
      this.actor.deleteEmbeddedDocuments("Item", toDelete, { isAdvancement: true })
    ]);

    /**
     * A hook event that fires when an AdvancementManager is done modifying an actor.
     * @function dnd5e.advancementManagerComplete
     * @memberof hookEvents
     * @param {AdvancementManager} advancementManager The advancement manager that just completed
     */
    Hooks.callAll("dnd5e.advancementManagerComplete", this);

    // Close prompt
    return this.close({ skipConfirmation: true });
  }

}
