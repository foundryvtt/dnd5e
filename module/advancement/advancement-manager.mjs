import {Advancement} from "./advancement.js";

/**
 * @typedef AdvancementStep
 * @property {Advancement} advancement
 * @property {number} characterLevel
 * @property {number} classLevel
 */

/**
 * A FormApplication which is responsible for managing the advancement of an Actor.
 * @extends FormApplication
 */
export default class AdvancementManager extends FormApplication {
  constructor(actor, item, steps=[], stepIndex=null, options={}) {
    const clone = actor.clone();
    super(clone, options);

    /**
     * The original actor to which changes will be applied when the process is complete.
     * @type {Actor5e}
     */
    this.actor = actor;

    /**
     * A clone of the original actor to which the changes can be applied during the advancement process.
     * @type {Actor5e}
     */
    this.clone = clone;

    /**
     * The item which initiated the advancement workflow
     * @type {Item5e}
     */
    this.item = item;

    /**
     * Advancement steps that will be applied in order.
     * @type {AdvancementStep[]}
     */
    this.steps = steps;

    /**
     * The index of the currently displayed step.
     * @type {number|null}
     */
    this.stepIndex = stepIndex;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement"],
      template: "systems/dnd5e/templates/advancement/advancement-manager.html",
      width: 460,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `Advancement: ${this.actor.name}`;
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
    return this.steps[this.stepIndex] ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Get the step before the current one.
   * @type {AdvancementStep|null}
   */
  get previousStep() {
    return this.steps[this.stepIndex - 1] ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Get the step after the current one.
   * @type {AdvancementStep|null}
   */
  get nextStep() {
    const nextIndex = this.stepIndex === null ? 0 : this.stepIndex + 1;
    return this.steps[nextIndex] ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Get the class item instance on the cloned actor which is being advanced
   * @type {Item5e}
   */
  get classItem() {
    const existing = this.clone.items.find(i => (i.type === "class") && (i.identifier === this.item.identifier));
    if ( existing ) return existing;
    this.clone.data.update({items: [this.item.toObject()]});
    return this.classItem;
  }

  /* -------------------------------------------- */
  /*  Control Methods                             */
  /* -------------------------------------------- */

  /**
   * Continue the advancement workflow to the next step.
   * @param formData
   * @returns {Promise<*>}
   */
  async next(formData) {
    this.classItem.data.update({"data.levels": this.step.classLevel});
    this.clone.prepareData();
    await this.step.advancement.apply(this.clone, this.step, formData);
    this.clone.prepareData();
    this.stepIndex += 1;
  }

  /**
   * Rewind the advancement workflow to its previous step.
   * @returns {Promise<*>}
   */
  async previous() {
    this.classItem.data.update({"data.levels": this.step.classLevel});
    this.clone.prepareData();
    await this.step.advancement.reverse(this.clone, this.step, formData);
    this.clone.prepareData();
    this.stepIndex -= 1;
  }

  /**
   * Complete the advancement workflow by applying changes from the clone to the base Actor.
   * @returns {Promise<void>}
   */
  async complete() {
    await this.actor.update(this.clone.toObject());
  }

  /* -------------------------------------------- */
  /*  Rendering Methods                           */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    return {
      actor: this.clone,
      item: this.item,
      step: this.step,
      stepTitle: this.step.advancement.title,
      stepHTML: await this.step.advancement.render(this.clone, this.step),
      stepNumber: this.stepIndex + 1,
      stepsTotal: this.steps.length,
      hasPrevious: this.previousStep !== null,
      hasNext: this.nextStep !== null,
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    this.step.advancement.activateListeners(this.clone, this.form);
    html.find("button[data-action]").click(this._onClickActionButton.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle button clicks to control the advancement flow
   * @param {PointerEvent} event    The originating button click event
   * @private
   */
  async _onClickActionButton(event) {
    event.preventDefault();
    const button = event.target;
    const formData = this._getSubmitData();
    try {
      switch (button.dataset.action) {
        case "next":
          await this.next(formData);
          return this.render();
        case "previous":
          await this.previous(formData);
          return this.render();
        case "complete":
          await this.next(formData);
          await this.complete();
          return this.close();
      }
    } catch(err) {
      return ui.notifications.error(err.message);
    }
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Construct an AdvancementManager for an Actor who is advancing in class level.
   * @param {Actor5e} actor         The Actor who is advancing
   * @param {Item5e} classItem      The class Item which is being advanced
   * @param {object}} [options={}]  Options provided to the AdvancementManager constructor
   * @param {{initial: number, final:number}} [options.characterLevel]  Context about character level advancement
   * @param {{initial: number, final:number}} [options.classLevel]      Context about class level advancement
   * @returns {AdvancementManager|null} An AdvancementManager instance or null if no advancement is required
   */
  static fromLevelChange(actor, classItem, {characterLevel={}, classLevel={}, ...options}={}) {
    if ( !classItem.hasAdvancement ) {
      throw new Error(`The ${classItem.name} Item does not provide Advancement data!`);
    }

    // Identify character level change
    const systemData = actor.data.data;
    const charInitial = characterLevel.initial ?? systemData.details.level;
    const charFinal = characterLevel.final ?? charInitial + 1;
    const levelDelta = charFinal - charInitial;
    if ( levelDelta === 0 ) return null;

    // Identify class level change
    const itemData = classItem.data.data;
    const classInitial = classLevel.initial ?? 0;
    const classFinal = classLevel.final ?? itemData.levels;
    const [leveledAdvancements, generalAdvancements] = itemData.advancement.partition(a => a.level === undefined);

    const _defineStep = (advancementData, charLevel, classLevel) => {
      return {
        advancement: Advancement.fromData(classItem, advancementData),
        characterLevel: charLevel,
        classLevel: classLevel
      }
    }

    // Increase class level
    if ( classFinal > classInitial ) {
      const steps = [];
      for ( let n=1; n<=levelDelta; n++ ) {  // Advance forward in level
        const charLevel = charInitial + n;
        const classLevel = classInitial + n;
        steps.push(...generalAdvancements.map(a => _defineStep(a, charLevel, classLevel)));
        for ( const a of leveledAdvancements ) {
          if ( a.level === classLevel ) steps.push(_defineStep(a, charLevel, classLevel));
          if ( a.level > classLevel ) break;
        }
      }
      return new this(actor, classItem, steps, 0, options);
    }

    // Decrease class level
    else if ( classFinal < classInitial ) {
      const steps = [];
      for ( let n=levelDelta; n>0; n-- ) {  // Rewind backward in level
        const charLevel = charFinal + n;
        const classLevel = classFinal + n;
        steps.push(...generalAdvancements.map(a => _defineStep(a, charLevel, classLevel)));
        for ( const a of leveledAdvancements ) {
          if ( a.level === classLevel ) steps.push(_defineStep(a, charLevel, classLevel));
        }
      }
      return new this(actor, classItem, steps, 0, options);
    }

    // Otherwise, no change (shouldn't happen)
    return null;
  }
}
