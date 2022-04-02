import { AdvancementError } from "./advancement-flow.js";
import { LevelDecreasedStep, LevelIncreasedStep, ModifyChoicesStep } from "./advancement-step.js";


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
   * @param {object} [options]
   * @param {boolean} [options.render=true]  Should this prompt be rendered after the step is added?
   */
  levelChanged(data, options={}) {
    const allowed = Hooks.call("dnd5e.preLevelChanged", this, data, options);

    if ( allowed === false ) return;

    const {item, character, class: cls} = data;
    let levelDelta = character.final - character.initial;
    const render = options.render ?? true;
    options.render = false;

    // Level didn't change
    if ( levelDelta === 0 ) {
      if ( this.steps.length === 0 ) this.actor._advancement = null;
      return;
    };

    // Level increased
    for ( let offset = 1; offset <= levelDelta; offset++ ) {
      this._addStep(new LevelIncreasedStep(this.clone, {
        item,
        level: character.initial + offset,
        classLevel: cls.initial + offset
      }), options);
    }

    // Level decreased
    for ( let offset = 0; offset > levelDelta; offset-- ) {
      this._addStep(new LevelDecreasedStep(this.clone, {
        item,
        level: character.initial + offset,
        classLevel: cls.initial + offset
      }), options);
    }

    if ( render ) this.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a non-class item is added.
   * @param {Item5e} item    Item that was added.
   * @param {object} [options]
   * @param {boolean} [options.render=true]  Should this prompt be rendered after the step is added?
   */
  itemAdded(item, options) {
    this.actor._advancement = null;
    console.warn("Advancements on non-class items not currently supported");
  }

  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a non-class item is removed.
   * @param {Item5e} item    Item that was removed.
   * @param {object} [options]
   * @param {boolean} [options.render=true]  Should this prompt be rendered after the step is added?
   */
  itemRemoved(item, options) {
    this.actor._advancement = null;
    console.warn("Advancements on non-class items not currently supported");
  }

  /* -------------------------------------------- */

  /**
   * Modify the choices made on an item at the specified level.
   * @param {Item5e} item   Item to modify.
   * @param {number} level  Level at which the changes should be made.
   * @param {object} [options]
   * @param {boolean} [options.render=true]  Should this prompt be rendered after the step is added?
   */
  modifyChoices(item, level, options) {
    this._addStep(new ModifyChoicesStep(this.clone, { item, level }), options);
  }

  /* -------------------------------------------- */

  /**
   * Add an advancement step and re-render the app.
   * @param {AdvancementStep} step           Step to add.
   * @param {object} [options={}]
   * @param {boolean} [options.render=true]  Should this prompt be rendered after the step is added?
   * @private
   */
  _addStep(step, { render=true }={}) {
    const newIndex = this.steps.push(step) - 1;
    if ( this._stepIndex === null ) this._stepIndex = newIndex;
    if ( render ) this.render(true);
  }

  /* -------------------------------------------- */
  /*  Form Rendering                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const data = {};
    if ( this.previousStep ) data.previousStep = true;

    if ( !this.step ) return data;
    data.stepId = this.step.id;

    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  render(...args) {
    if ( !this.step?.shouldRender ) {
      if ( this._advancing ) return this;
      this._advancing = true;
      this.advanceStep();
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
    this.step._element = null;
    await this.step._render(force, options);
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
    if ( !options.skipConfirmation && this.step?.options.confirmClose ) {
      return new Dialog({
        title: `${game.i18n.localize("DND5E.AdvancementPromptCloseTitle")}: ${this.actor.name}`,
        content: game.i18n.localize("DND5E.AdvancementPromptCloseMessage"),
        buttons: {
          close: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("DND5E.AdvancementPromptCloseButtonStop"),
            callback: () => {
              this.actor._advancement = null;
              super.close(options);
            }
          },
          continue: {
            icon: '<i class="fas fa-chevron-right"></i>',
            label: game.i18n.localize("DND5E.AdvancementPromptCloseButtonContinue")
          }
        },
        default: "close"
      }).render(true);
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
      this._advancing = false;
      return;
    }

    // Check to see if this is the final step, if so, head over to complete
    if ( !this.nextStep ) return this.complete();

    // Increase step number and re-render
    this._stepIndex += 1;
    this._advancing = false;
    this.render(true);
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
      await this.previousStep.undoChanges();
    } catch(error) {
      if ( !(error instanceof AdvancementError) ) throw error;
      ui.notifications.error(error.message);
      this.setControlsDisabled(false);
      this._advancing = false;
      return;
    }

    // Decrease step number and re-render
    this._stepIndex -= 1;
    this._advancing = false;
    this.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Apply changes to actual actor after all choices have been made.
   * @returns {Promise}
   */
  async complete() {
    // Run any cleanup needed by steps
    await Promise.all(this.steps.map(async (s) => await s.cleanup()));

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

    const itemUpdates = items.reduce((obj, item) => {
      if ( !actor.items.get(item._id) ) {
        obj.toCreate.push(item);
      } else {
        obj.toUpdate.push(item);
        obj.toDelete.findSplice(id => id === item._id);
      }
      return obj;
    }, { toCreate: [], toUpdate: [], toDelete: actor.items.map(i => i.id) });

    const allowed = Hooks.call("dnd5e.preAdvancementCommitUpdates", updates, itemUpdates, this);
    if ( allowed === false ) return Promise.resolve(this.actor);
    const { toCreate, toUpdate, toDelete } = itemUpdates;
    const actorWithUpdates = await Promise.all([
      this.actor.update(updates),
      this.actor.createEmbeddedDocuments("Item", toCreate, { skipAdvancement: true, keepId: true }),
      this.actor.updateEmbeddedDocuments("Item", toUpdate, { skipAdvancement: true }),
      this.actor.deleteEmbeddedDocuments("Item", toDelete, { skipAdvancement: true })
    ]);

    Hooks.callAll("dnd5e.advancementCommitUpdates", actorWithUpdates, this);
    return actorWithUpdates;
  }

}
