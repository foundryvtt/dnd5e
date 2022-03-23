import { AdvancementError } from "./advancement-flow.js";
import { LevelIncreasedStep, ModifyChoicesStep } from "./advancement-step.js";


/**
 * Application for controlling the advancement workflow and displaying the interface.
 *
 * @property {Actor5e} actor                 Actor on which this advancement is being performed.
 * @property {AdvancementStep[]} [steps=[]]  Any initial steps that should be displayed.
 * @property {object} [options={}]           Additional application options.
 * @extends {Application}
 */
export class AdvancementPrompt extends Application {

  constructor(actor, steps=[], options={}) {
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
      template: "systems/dnd5e/templates/advancement/advancement-prompt.html",
      width: 460,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return this.step?.title ?? game.i18n.localize("DND5E.AdvancementPromptTitle");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get id() {
    return `actor-${this.actor.id}-advancement`;
  }

  /* -------------------------------------------- */

  /**
   * Get the step that is currently in progress.
   * @type {AdvancementStep|null}
   */
  get step() {
    if ( this._stepIndex === null ) return null;
    return this.steps[this._stepIndex];
  }

  /* -------------------------------------------- */

  /**
   * Get the step before the current one.
   * @type {AdvancementStep|null}
   */
  get previousStep() {
    if ( this._stepIndex === null ) return null;
    return this.steps[this._stepIndex - 1];
  }

  /* -------------------------------------------- */

  /**
   * Get the step after the current one.
   * @type {AdvancementStep|null}
   */
  get nextStep() {
    if ( this._stepIndex === null ) return null;
    return this.steps[this._stepIndex + 1];
  }

  /* -------------------------------------------- */
  /*  Advancement Actions                         */
  /* -------------------------------------------- */

  /**
   * Represents data about a change in character and class level for an actor.
   *
   * @typedef {object} LevelChangeData
   * @property {Item5e|null} item  Class item that was added or changed.
   * @property {{ initial: number, final: number }} character  Overall character level changes.
   * @property {{ initial: number, final: number }} class      Changes to the class's level.
   */

  /**
   * Add a step to this advancement process when a class is added or level is changed.
   * @param {LevelChangeData} data  Information on the class and level changes.
   */
  levelChanged({ item, character, class: cls }) {
    let levelDelta = character.final - character.initial;

    // Level didn't change
    if ( levelDelta === 0 ) return;

    // Level increased
    for ( let offset = 1; offset <= levelDelta; offset++ ) {
      this._addStep(new LevelIncreasedStep(this.clone, {
        item: item,
        level: character.initial + offset,
        classLevel: cls.initial + offset
      }));
    }

    // Level decreased
    for ( let offset = 0; offset > levelDelta; offset-- ) {
      this.actor._advancement = null;
      console.warn("Unapplying advancements from leveling not currently supported");
    }
  }

  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a non-class item is added.
   * @param {Item5e} item    Item that was added.
   */
  itemAdded(item) {
    this.actor._advancement = null;
    console.warn("Advancements on non-class items not currently supported");
  }

  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a non-class item is removed.
   * @param {Item5e} item    Item that was removed.
   */
  itemRemoved(item) {
    this.actor._advancement = null;
    console.warn("Advancements on non-class items not currently supported");
  }

  /* -------------------------------------------- */

  /**
   * Modify the choices made on an item at the specified level.
   * @param {Item5e} item   Item to modify.
   * @param {number} level  Level at which the changes should be made.
   */
  modifyChoices(item, level) {
    this._addStep(new ModifyChoicesStep(this.clone, { item, level }));
  }

  /* -------------------------------------------- */

  /**
   * Add an advancement step and re-render the app.
   * @param {AdvancementStep} step  Step to add.
   * @private
   */
  _addStep(step) {
    const newIndex = this.steps.push(step) - 1;
    if ( this._stepIndex === null ) this._stepIndex = newIndex;
    this.render(true);
  }

  /* -------------------------------------------- */
  /*  Form Rendering                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const data = {};
    if ( this.previousStep ) data.previousStep = true;

    // TODO: If step is empty or doesn't want to be rendered, move to next step automatically
    if ( !this.step ) return data;
    data.stepId = this.step.id;

    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _render(force, options) {
    await super._render(force, options);
    if ( (this._state !== Application.RENDER_STATES.RENDERED) || !this.step ) return;

    // Render the step
    this.step._element = null;
    await this.step._render(true, options);
    this.setPosition();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("button[name='previous']")?.click(this.reverseStep.bind(this));
    html.find("button[name='next']").click(this.advanceStep.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Control whether the next/previous buttons are enabled or disabled.
   * @param {boolean} disabled  Should they be disabled?
   */
  setControlsDisabled(disabled) {
    const nextButton = this.element[0]?.querySelector("button[name='next']");
    if ( nextButton ) nextButton.disabled = disabled;
    const previousButton = this.element[0]?.querySelector("button[name='previous']");
    if ( previousButton ) previousButton.disabled = disabled;
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
  /*  Process                                     */
  /* -------------------------------------------- */

  /**
   * Advance to the next step in the workflow.
   * @returns {Promise}
   */
  async advanceStep() {
    this.setControlsDisabled(true);

    // Clear visible errors
    this.element[0]?.querySelectorAll(".error").forEach(f => f.classList.remove("error"));

    // Apply changes from current step
    try {
      await this.step.applyChanges();
    } catch(error) {
      if ( !(error instanceof AdvancementError) ) throw error;
      ui.notifications.error(error.message);
      this.setControlsDisabled(false);
      return;
    }

    // Check to see if this is the final step, if so, head over to complete
    if ( !this.nextStep ) return this.complete();

    // Increase step number and re-render
    this._stepIndex += 1;
    this.step.actor = this.clone;
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Return to a previous step in the workflow.
   * @returns {Promise}
   */
  async reverseStep() {
    if ( !this.previousStep ) return;
    this.setControlsDisabled(true);

    // Undo changes from previous step
    try {
      this.previousStep.actor = this.clone;
      await this.previousStep.undoChanges();
    } catch(error) {
      if ( !(error instanceof AdvancementError) ) throw error;
      ui.notifications.error(error.message);
      this.setControlsDisabled(false);
      return;
    }

    // Decrease step number and re-render
    this._stepIndex -= 1;
    this.step.actor = this.clone;
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Apply changes to actual actor after all choices have been made.
   * @returns {Promise}
   */
  async complete() {
    // Apply changes from clone to original actor
    await this.commitUpdates(this.actor, this.clone);

    // Close prompt & remove from actor
    await this.close({ skipConfirmation: true });
  }

  /* -------------------------------------------- */

  /**
   * Apply changes from the clone actor back to the original actor.
   * @param {Actor5e} actor       Original actor to be updated based on changes to clone.
   * @param {Actor5e} clone       Clone actor to which advancement changes have been applied.
   * @returns {Promise<Actor5e>}  The original actor with the updates applied.
   */
  async commitUpdates(actor, clone) {
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
