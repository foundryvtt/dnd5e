import { AdvancementError } from "./advancement-flow.js";


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
    const step = this._stepIndex === null ? "" : game.i18n.format("DND5E.AdvancementManagerSteps", {
      current: this._stepIndex + 1,
      total: this.steps.length
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
      manager._createLevelChangeSteps(clonedItem, itemData.data?.levels ?? 1);
    }

    // All other items, just create some flows up to current character level
    else {
      Array.fromRange(manager.clone.data.data.details.level + 1).slice(1)
        .flatMap(l => this.flowsForLevel(clonedItem, l))
        .forEach(flow => manager.steps.push({ type: "item", flow }));
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
    const manager = new this(actor, options);
    const clonedItem = manager.clone.items.get(item.id);

    // For class items, prepare level change data
    if ( clonedItem.type === "class" ) {
      manager._createLevelChangeSteps(clonedItem, clonedItem.data.data.levels * -1);
    }

    // All other items, just create some flows down from current character level
    else {
      Array.fromRange(manager.clone.data.data.details.level + 1).slice(1)
        .flatMap(l => this.flowsForLevel(clonedItem, l))
        .reverse()
        .forEach(flow => manager.steps.push({ type: "item", flow, automatic: true, reverse: true }));
      manager._stepIndex = 0;
    }

    // Add a final step to remove the item
    if ( manager.steps.length ) manager.steps.push({type: "delete", item: clonedItem, automatic: true, reverse: true});
    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Construct a manager for a change in a class level.
   * @param {Actor5e} actor         Actor whose level has changed.
   * @param {string} classId        ID of the class being changed.
   * @param {number} levelDelta     Levels by which to increase or decrease the class.
   * @param {object} options        Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forLevelChange(actor, classId, levelDelta, options={}) {
    const manager = new this(actor, options);
    const clonedItem = manager.clone.items.get(classId);
    if ( !clonedItem ) return null;
    manager._createLevelChangeSteps(clonedItem, levelDelta);

    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Create steps based on the provided level change data.
   * @param {Item5e} classItem     Class being changed from the clone actor.
   * @param {number} levelDelta    Levels by which to increase or decrease the class.
   * @private
   */
  _createLevelChangeSteps(classItem, levelDelta) {
    const createFlows = (classLevel, characterLevel) => [
      ...this.constructor.flowsForLevel(classItem, classLevel),
      ...this.constructor.flowsForLevel(classItem.subclass, classLevel),
      ...this.clone.items.contents.flatMap(i => {
        if ( ["class", "subclass"].includes(i.type) ) return [];
        return this.constructor.flowsForLevel(i, characterLevel);
      })
    ];

    // Level increased
    for ( let offset = 1; offset <= levelDelta; offset++ ) {
      const classLevel = classItem.data.data.levels + offset;
      const characterLevel = this.actor.data.data.details.level + offset;
      createFlows(classLevel, characterLevel).forEach(flow => this.steps.push({
        type: "level", flow, classItem, classLevel
      }));
    }

    // Level decreased
    for ( let offset = 0; offset > levelDelta; offset-- ) {
      const classLevel = classItem.data.data.levels + offset;
      const characterLevel = this.actor.data.data.details.level + offset;
      createFlows(classLevel, characterLevel).forEach(flow => this.steps.push({
        type: "level", flow, classItem, classLevel,
        automatic: true, reverse: true
      }));
    }

    if ( this.steps.length ) this._stepIndex = 0;
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

    // Ensure the level on the class item matches the specified level
    if ( this.step.type === "level" ) {
      this.step.classItem.data.update({"data.levels": this.step.classLevel});
      this.clone.prepareData();
    }

    // Prepare information for subheading
    const item = this.step.flow.item;
    let level = this.step.flow.level;
    if ( (this.step.type === "level") && ["class", "subclass"].includes(item.type) ) level = this.step.classLevel;

    return {
      actor: this.clone,
      flowId: this.step.flow.id,
      header: item.name,
      subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { level }),
      steps: {
        current: this.stepIndex + 1,
        total: this.steps.length,
        hasPrevious: this.previousStep !== null,
        hasNext: this.nextStep !== null
      }
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  render(...args) {
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
        // Delete item
        if ( this.step.type === "delete" ) this.clone.items.delete(this.step.item.id);

        // Apply changes for the current step's flow
        else {
          const flow = this.step.flow;
          if ( this.step.reverse ) {
            await flow.advancement.reverse(flow.level);
          } else {
            const formData = flow._getSubmitData();
            await flow._updateObject(event, formData);
          }
        }

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
        if ( this.step.type === "delete" ) this.clone.data.update({items: [this.step.item]});
        else await this.step.flow.advancement.reverse(this.step.flow.level);
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
    // Apply changes from clone to original actor
    await this._commitUpdates(this.actor, this.clone);

    // Close prompt & remove from actor
    await this.close({ skipConfirmation: true });
  }

  /* -------------------------------------------- */

  /**
   * Apply changes from the clone actor back to the original actor.
   * @param {Actor5e} actor       Original actor to be updated based on changes to clone.
   * @param {Actor5e} clone       Clone actor to which advancement changes have been applied.
   * @returns {Promise<Actor5e>}  The original actor with the updates applied.
   * @private
   */
  async _commitUpdates(actor, clone) {
    const updates = this.clone.toObject();
    const items = updates.items;
    delete updates.items;

    const { toCreate, toUpdate, toDelete } = items.reduce((obj, item) => {
      if ( !actor.items.get(item._id) ) {
        obj.toCreate.push(item);
      } else {
        obj.toUpdate.push(item);
        obj.toDelete.findSplice(id => id === item._id);
      }
      return obj;
    }, { toCreate: [], toUpdate: [], toDelete: actor.items.map(i => i.id) });

    return Promise.all([
      this.actor.update(updates),
      this.actor.createEmbeddedDocuments("Item", toCreate, { skipAdvancement: true, keepId: true }),
      this.actor.updateEmbeddedDocuments("Item", toUpdate, { skipAdvancement: true }),
      this.actor.deleteEmbeddedDocuments("Item", toDelete, { skipAdvancement: true })
    ]);
  }

}
