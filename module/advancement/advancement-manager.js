import { AdvancementError } from "./advancement-flow.js";


/**
 * @typedef {object} AdvancementStep
 * @property {string} type                Step type from "forward", "backward", "delete", or "restore".
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
 * @property {Actor5e} actor        Actor on which this advancement is being performed.
 * @property {object} [steps=[]]    Any initial steps that should be displayed.
 * @property {object} [options={}]  Additional application options.
 * @extends {Application}
 */
export class AdvancementManager extends Application {

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
      template: "systems/dnd5e/templates/advancement/advancement-manager.html",
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
      dataClone.data.levels = 0;
      if ( !manager.clone.data.data.details.originalClass ) {
        manager.clone.data.update({"data.details.originalClass": dataClone._id});
      }
    }

    // Add item to clone & get new instance from clone
    manager.clone.data.update({items: [dataClone]});
    manager.clone.prepareData();
    const clonedItem = manager.clone.items.get(dataClone._id);

    // For class items, prepare level change data
    if ( itemData.type === "class" ) {
      this.createLevelChangeSteps(manager, {[clonedItem.id]: itemData.data?.levels ?? 1});
    }

    // All other items, just create some flows up to current character level
    else {
      Array.fromRange(manager.clone.data.data.details.level + 1).slice(1)
        .flatMap(l => this.flowsForLevel(clonedItem, l))
        .forEach(flow => manager.steps.push({ type: "forward", flow }));
      manager._stepIndex = 0;
    }

    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Construct a manager for an item that needs to be deleted.
   * @param {Actor5e} actor         Actor from which the item should be deleted.
   * @param {object} item           Item to be deleted.
   * @param {object} options        Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forDeletedItem(actor, item, options) {
    // For class items, prepare level change data
    if ( item.type === "class" ) return this.forLevelChange(actor, {[item.id]: item.data.data.levels * -1});

    // All other items, just create some flows down from current character level
    const manager = new this(actor, options);
    const clonedItem = manager.clone.items.get(item.id);

    Array.fromRange(manager.clone.data.data.details.level + 1).slice(1)
      .flatMap(l => this.flowsForLevel(clonedItem, l))
      .reverse()
      .forEach(flow => manager.steps.push({ type: "reverse", flow, automatic: true }));
  
    // Add a final step to remove the item only if there are advancements to apply
    if ( manager.steps.length ) {
      manager._stepIndex = 0;
      manager.steps.push({ type: "delete", item: clonedItem, automatic: true });
    }

    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Construct a manager for a change in one or more class levels.
   * @param {Actor5e} actor                   Actor whose level has changed.
   * @param {object<string, number>} changes  A mapping of class IDs to their level deltas.
   * @param {object} options                  Rendering options passed to the application.
   * @returns {AdvancementManager|null}       Prepared manager. Steps count can be used to determine if
   *                                          advancements are needed.
   */
  static forLevelChange(actor, changes, options={}) {
    const manager = new this(actor, options);
    this.createLevelChangeSteps(manager, changes);
    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Create steps based on the provided level change data.
   * @param {AdvancementManager} manager      Manager within which to add the steps.
   * @param {object<string, number>} changes  A mapping of class IDs to their level deltas.
   * @private
   */
  static createLevelChangeSteps(manager, changes) {
    // Transform deltas into list of single level change steps
    const deltas = Object.entries(changes).sort((a, b) => a[1] - b[1]).reduce((arr, [id, delta]) => {
      const item = manager.clone.items.get(id);
      if ( !item || (delta === 0) ) return arr;
      for ( let offset = 1; offset <= delta; offset++ ) arr.push([item, 1]);
      for ( let offset = -1; offset >= delta; offset-- ) arr.push([item, -1]);
      return arr;
    }, []);

    const restores = {};
    let characterLevel = manager.clone.data.data.details.level;
    const finalCharacterLevel = characterLevel + Object.values(changes).reduce((delta, value) => delta + value, 0);
    const classLevels = {};

    const pushSteps = (flows, data) => manager.steps.push(...flows.map(flow => { return { flow, ...data } }));
    const getItemFlows = (characterLevel) => manager.clone.items.contents.flatMap(i => {
      if ( ["class", "subclass"].includes(i.type) ) return [];
      return this.flowsForLevel(i, characterLevel);
    });

    for ( const [classItem, delta] of deltas ) {
      classLevels[classItem.id] ??= classItem.data.data.levels;
      classLevels[classItem.id] += delta;
      let classLevel = classLevels[classItem.id];
      characterLevel += delta;

      if ( delta > 0 ) {
        const stepData = { type: "forward", class: {item: classItem, level: classLevel} };

        // Add class & subclass advancements
        pushSteps(this.flowsForLevel(classItem, classLevel), stepData);
        pushSteps(this.flowsForLevel(classItem.subclass, classLevel), stepData);

        // If restore steps for this character level, pop them off and append them
        if ( restores[characterLevel - 1] ) manager.steps.push(...restores[characterLevel - 1]);
  
        // Otherwise, add normal item advancements
        else pushSteps(getItemFlows(characterLevel), stepData);
      }

      else {
        classLevel += 1;
        const stepData = { type: "reverse", class: {item: classItem, level: classLevel}, automatic: true };
        const itemFlows = getItemFlows(characterLevel + 1).reverse();

        // If character level will need to be restored later, prepare restore steps
        if ( characterLevel < finalCharacterLevel ) {
          restores[characterLevel] = itemFlows.map(flow => ({ type: "restore", flow, automatic: true }));
        }

        // Add item, subclass, & class reverse steps
        pushSteps(itemFlows, stepData);
        pushSteps(this.flowsForLevel(classItem.subclass, classLevel).reverse(), stepData);
        pushSteps(this.flowsForLevel(classItem, classLevel).reverse(), stepData);

        // If level one advancements being removed, delete the class
        if ( classLevel === 1 ) manager.steps.push({ type: "delete", item: classItem, automatic: true });
      }
    }

    if ( manager.steps.length ) manager._stepIndex = 0;
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
    return (item?.advancementByLevel[level] ?? []).map(a => new a.constructor.metadata.apps.flow(item, a.id, level));
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
      subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { level }),
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
    // Ensure the level on the class item matches the specified level
    if ( this.step?.class ) {
      let level = this.step.class.level;
      if ( this.step.type === "reverse" ) level -= 1;
      this.step.class.item.data.update({"data.levels": level});
      this.clone.prepareData();
    }

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

        // Apply changes based on step type
        if ( this.step.type === "delete" ) this.clone.items.delete(this.step.item.id);
        else if ( this.step.type === "restore" ) await flow.advancement.restore(flow.level, flow.retainedData);
        else if ( this.step.type === "reverse" ) flow.retainedData = await flow.advancement.reverse(flow.level);
        else await flow._updateObject(event, flow._getSubmitData());

        this.clone.prepareData();
        this._stepIndex++;
      } while ( this.step?.automatic );
    } catch(error) {
      if ( !(error instanceof AdvancementError) ) throw error;
      return ui.notifications.error(error.message);
    } finally {
      this._advancing = false;
    }

    if ( this.step ) this.render(true);
    else this._complete();
  }

  /* -------------------------------------------- */

  /**
   * Reverse through the steps until one requiring user interaction is encountered.
   * @param {Event} [event]  Triggering click event if one occurred.
   * @returns {Promise}
   * @private
   */
  async _backward(event) {
    this._advancing = true;
    try {
      do {
        const flow = this.step.flow;

        // Reverse step based on step type
        if ( this.step.type === "delete" ) this.clone.data.update({items: [this.step.item]});
        else if ( this.step.type === "reverse" ) await flow.advancement.restore(flow.level, flow.retainedData);
        else flow.retainedData = await this.step.flow.advancement.reverse(flow.level);

        this.clone.prepareData();
        this._stepIndex--;
      } while ( this.step?.automatic );
    } catch(error) {
      if ( !(error instanceof AdvancementError) ) throw error;
      return ui.notifications.error(error.message);
    } finally {
      this._advancing = false;
    }

    if ( this.step ) this.render(true);
    else this.close({ skipConfirmation: true });
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

    // Apply changes from clone to original actor
    await Promise.all([
      this.actor.update(updates),
      this.actor.createEmbeddedDocuments("Item", toCreate, { keepId: true }),
      this.actor.updateEmbeddedDocuments("Item", toUpdate),
      this.actor.deleteEmbeddedDocuments("Item", toDelete)
    ]);

    // Close prompt
    return this.close({ skipConfirmation: true });
  }

}
