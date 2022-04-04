/**
 * Step in the advancement process that will be displayed on its individual page.
 *
 * @property {Actor5e} actor   Actor to which this step's changes will be applied.
 * @property {object} config   Configuration information specific to each step type.
 * @property {object} options  Options passed through to Application.
 * @extends {Application}
 */
export class AdvancementStep extends Application {

  constructor(actor, config, options) {
    super(options);

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
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/advancement-step.html",
      title: null,
      popOut: false,
      confirmClose: true,
      reverse: false,
      shouldRender: true
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get id() {
    return `actor-advancement-step-${this.appId}`;
  }

  /* -------------------------------------------- */

  /**
   * The main item associated with this step if available.
   * @type {Item5e|null}
   */
  get item() {
    return this.actor.items.get(this.config.item.id) ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Should this step be rendered or applied automatically?
   * @type {boolean}
   */
  get shouldRender() {
    return this.options.shouldRender;
  }

  /* -------------------------------------------- */

  /**
   * Advancement flows in this step in the order they should be applied.
   * @type {AdvancementFlow[]}
   */
  get flows() {
    return [];
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), { appId: this.id });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _render(force, options) {
    await super._render(force, options);

    // Render flows within the step
    return Promise.all(this.flows.map(f => {
      f._element = null;
      return f._render(force, options);
    }));
  }

  /* -------------------------------------------- */

  /**
   * Returns all advancements on an item for a specific level in the proper order.
   * @param {Item5e} item      Item that has advancement.
   * @param {number} level     Level in question.
   * @returns {Advancement[]}  Relevant advancement objects.
   * @protected
   */
  advancementsForLevel(item, level) {
    const advancements = Object.values(item.advancement).filter(a => a.levels.includes(level));
    return advancements.sort((a, b) => a.sortingValueForLevel(level).localeCompare(b.sortingValueForLevel(level)));
  }

  /* -------------------------------------------- */

  /**
   * Apply changes for this step to the actor.
   * @returns {Promise}  Fulfills once the changes have completed.
   */
  async applyChanges() {
    if ( this.options.reverse ) return this.undoChanges();
    for ( const flow of this.flows ) {
      const formData = flow._getSubmitData();
      await flow.apply(undefined, this.actor, formData);
      this.actor.prepareData();
    }
  }

  /* -------------------------------------------- */

  /**
   * Remove changes made by this step from the actor.
   * @returns {Promise}  Fulfills once the changes have completed.
   */
  async undoChanges() {
    for ( const flow of this.flows ) {
      await flow.advancement.reverse(this.actor, flow.level);
      this.actor.prepareData(undefined, this.actor);
    }
  }

  /* -------------------------------------------- */

  /**
   * Perform any cleanup operations necessary before the advancement prompt completes.
   */
  async cleanup() { }

}


/**
 * Handles presenting changes for a class and other items when level is increased by one.
 * @extends {AdvancementStep}
 */
export class LevelIncreasedStep extends AdvancementStep {

  /** @inheritdoc */
  get title() {
    if ( this.config.classLevel > 1 ) return game.i18n.localize("DND5E.AdvancementPromptLevelIncreasedTitle");
    return game.i18n.localize("DND5E.AdvancementPromptLevelNewClassTitle");
  }

  /* -------------------------------------------- */

  get shouldRender() {
    return this.flows.length > 0;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get flows() {
    this._flows ??= this.advancementsForLevel(this.item, this.config.classLevel).map(a => {
      return new a.constructor.metadata.apps.flow(this.item, a.id, this.config.classLevel);
    });
    return this._flows;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), {
      sections: [{
        level: this.config.level,
        header: this.item.name,
        subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: this.config.classLevel }),
        advancements: this.flows.map(f => f.id)
      }]
    });
  }

}


/**
 * Handles unapplying changes for a class and other items when level is decreased by one.
 * @extends {AdvancementStep}
 */
export class LevelDecreasedStep extends AdvancementStep {

  constructor(...args) {
    super(...args);

    // If class item has already been deleted on actor, add it back temporarily
    if ( !this.actor.items.get(this.config.item.id) ) {
      this._tempClass = true;
      this.actor.data.items = this.actor.data._source.items;
      this.actor.data._source.items.push(this.config.item.toObject());
      this.actor.prepareData();
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      reverse: true,
      shouldRender: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get flows() {
    this._flows ??= this.advancementsForLevel(this.item, this.config.classLevel).map(a => {
      return new a.constructor.metadata.apps.flow(this.item, a.id, this.config.classLevel);
    });
    return this._flows;
  }

  /* -------------------------------------------- */

  /**
   * Remove the class item from the actor.
   */
  cleanup() {
    if ( this._tempClass ) {
      this.actor.data.items = this.actor.data._source.items;
      this.actor.data._source.items.findSplice(i => i._id === this.config.item.id);
    }
  }

}


/**
 * Handles adding a new item with advancement at the current character level.
 * @extends {AdvancementStep}
 */
export class ItemAddedStep extends AdvancementStep { }


/**
 * Handles unapplying any advancement changes when a non-class item with advancement is removed.
 * @extends {AdvancementStep}
 */
export class ItemRemovedStep extends AdvancementStep { }


/**
 * Handles changing advancement choices for a single item at a specific level.
 * @extends {AdvancementStep}
 */
export class ModifyChoicesStep extends AdvancementStep {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize("DND5E.AdvancementPromptModifyChoicesTitle"),
      confirmClose: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get flows() {
    this._flows ??= this.advancementsForLevel(this.item, this.config.level).map(a => {
      return new a.constructor.metadata.apps.flow(this.item, a.id, this.config.level);
    });
    return this._flows;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), {
      sections: [{
        level: this.config.level,
        header: this.item.name,
        subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: this.config.level }),
        advancements: this.flows.map(f => f.id)
      }]
    });
  }

}
