import * as stepTypes from "./advancementStep.js";

/**
 * Application for controlling the advancement workflow and displaying the interface.
 *
 * @property {Actor5e} actor                 Actor up which this advancement is being performed.
 * @property {AdvancementStep[]} [steps=[]]  Any initial steps that should be displayed.
 * @property {object} [options={}]           Additional application options.
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
    return this.step?.title ?? game.i18n.localize("DND5E.AdvancementManagerTitle");
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
   * Represents data about a change is character and class level for an actor.
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
  levelChanged(data) {
    let levelDelta = data.character.final - data.character.initial;
    let offset = 1;

    // TODO: Simplify all this
    // Level increased
    if ( levelDelta > 0 ) {
      while ( levelDelta > 0 ) {
        this._addStep(new stepTypes.LevelIncreasedStep(this.actor, {
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
        this._addStep(new stepTypes.LevelDecreasedStep(this.actor, {
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
      throw new Error("Level did not change within level change advancement.");
    }
  }

  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a non-class item is added.
   * @param {Item5e} item    Item that was added.
   */
  itemAdded(item) {
    console.warn("Advancements on non-class items not currently supported");
    // this._addStep(new stepTypes.ItemAddedStep(this.actor, { item }));
  }

  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a non-class item is removed.
   * @param {Item5e} item    Item that was removed.
   */
  itemRemoved(item) {
    console.warn("Advancements on non-class items not currently supported");
    // this._addStep(new stepTypes.ItemRemovedStep(this.actor, { item }));
  }

  /* -------------------------------------------- */

  /**
   * Modify the choices made on an item at the specified level.
   * @param {Item5e} item   Item to modify.
   * @param {number} level  Level at which the changes should be made.
   */
  modifyChoices(item, level) {
    this._addStep(new stepTypes.ModifyChoicesStep(this.actor, { item, level }));
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
    // TODO: If no advancements are valid for this level, don't show the dialog
  }

  /* -------------------------------------------- */
  /*  Form Rendering                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const data = {};
    if ( this.previousStep ) data.previousStep = true;

    if ( !this.step ) return data; // TODO: If no step available, just close the window I suppose
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
    this.step.prepareUpdates({ actor: this.clone, data: foundry.utils.expandObject(formData) });

    // Apply changes to actor clone
    await this.step.applyUpdates(this.clone);

    // Check to see if this is the final step, if so, head over to complete
    if ( !this.nextStep ) return this.complete();

    // Increase step number and re-render
    this._stepIndex += 1;
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Return to a previous step in the workflow.
   * @returns {Promise}
   */
  async reverseStep() {
    if ( !this.previousStep ) return;

    // Prepare updates that need to be removed
    this.previousStep.prepareUpdates({ actor: this.clone, reverse: true });

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
    for ( const step of this.steps ) {
      await step.applyUpdates(this.actor);
    }
    // TODO: This currently shows multiple visible changes and takes awhile, rework how changes are applied to merge
    //       multiple steps into a single change object

    // Close manager & remove from actor
    await this.close({ skipConfirmation: true });
  }

}
