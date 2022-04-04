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
     * @type {object}
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
  levelChanged({ item, character, class: cls }, options={}) {
    let levelDelta = character.final - character.initial;
    const render = options.render ?? true;
    options.render = false;

    // Level didn't change
    if ( levelDelta === 0 ) {
      if ( this.steps.length === 0 ) this.actor._advancement = null;
      return;
    }
    const classItem = this.clone.items.find(i => i.id === item.id);

    // Level increased
    for ( let offset = 1; offset <= levelDelta; offset++ ) {
      const classLevel = cls.initial + offset;
      const characterLevel = character.initial + offset;
      const flows = [
        ...this.constructor.flowsForLevel(classItem, classLevel),
        ...this.constructor.flowsForLevel(classItem.subclass, classLevel),
        ...this.clone.items.contents.flatMap(i => {
          if ( ["class", "subclass"].includes(i.type) ) return [];
          return this.constructor.flowsForLevel(i, characterLevel);
        })
      ];
      flows.forEach(flow => this.steps.push({ type: "level", flow, classItem, classLevel }));
    }

    // Level decreased
    for ( let offset = 0; offset > levelDelta; offset-- ) {
      this.actor._advancement = null;
      console.warn("Level decrease advancement disabled for the moment");
      return;
    }

    this._stepIndex = 0;
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
    item = this.clone.items.find(i => i.id === item.id);
    if ( !item ) return;
    const characterLevel = this.clone.data.data.details.level;
    const flows = Array.fromRange(characterLevel + 1).slice(1).flatMap(l => this.constructor.flowsForLevel(item, l));
    flows.forEach(flow => this.steps.push({ type: "item", flow }));
    this._stepIndex = 0;
    this.render(true);
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
    this.actor._advancement = null;
    console.warn("Modifying choices has been disabled for the moment");
    // this._addStep(new ModifyChoicesStep(this.clone, { item, level }), options);
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
    const advancements = Object.values(item?.advancement ?? {}).filter(a => a.levels.includes(level));
    advancements.sort((a, b) => a.sortingValueForLevel(level).localeCompare(b.sortingValueForLevel(level)));
    return advancements.map(a => new a.constructor.metadata.apps.flow(item, a.id, level));
  }

  /* -------------------------------------------- */
  /*  Form Rendering                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    if ( !this.step ) return {};
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
    this.step.flow._element = null;
    await this.step.flow._render(force, options);
    this.setPosition();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("button[name='previous']")?.click(this.reverseStep.bind(this));
    html.find("button[name='next']")?.click(this.advanceStep.bind(this));
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
      return new Dialog({
        title: `${game.i18n.localize("DND5E.AdvancementManagerCloseTitle")}: ${this.actor.name}`,
        content: game.i18n.localize("DND5E.AdvancementManagerCloseMessage"),
        buttons: {
          close: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("DND5E.AdvancementManagerCloseButtonStop"),
            callback: () => {
              this.actor._advancement = null;
              super.close(options);
            }
          },
          continue: {
            icon: '<i class="fas fa-chevron-right"></i>',
            label: game.i18n.localize("DND5E.AdvancementManagerCloseButtonContinue")
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
   * @param {Event} event  Button click that triggered the change.
   * @returns {Promise}
   */
  async advanceStep(event) {
    this.setControlsDisabled(true);

    // Clear visible errors
    this.element[0]?.querySelectorAll(".error").forEach(f => f.classList.remove("error"));

    // Apply changes from current step
    try {
      const flow = this.step.flow;
      if ( this.step.reverse ) {
        await flow.advancement.reverse(flow.level);
      } else {
        const formData = flow._getSubmitData();
        await flow._updateObject(event, formData);
      }
      this.actor.prepareData();
    } catch(error) {
      this.setControlsDisabled(false);
      if ( !(error instanceof AdvancementError) ) throw error;
      ui.notifications.error(error.message);
      this._advancing = false;
      return;
    }

    // Check to see if this is the final step, if so, head over to complete
    if ( !this.nextStep ) return this.complete(event);

    // Increase step number and re-render
    this._stepIndex += 1;
    this._advancing = false;
    this.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Return to a previous step in the workflow.
   * @param {Event} event  Button click that triggered the change.
   * @returns {Promise}
   */
  async reverseStep(event) {
    if ( !this.previousStep ) return;
    this.setControlsDisabled(true);

    // Undo changes from previous step
    try {
      await this.step.flow.advancement.reverse(this.step.flow.level);
      this.actor.prepareData();
    } catch(error) {
      this.setControlsDisabled(false);
      if ( !(error instanceof AdvancementError) ) throw error;
      ui.notifications.error(error.message);
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
   * @param {Event} event  Button click that triggered the change.
   * @returns {Promise}
   */
  async complete(event) {
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
