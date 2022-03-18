/**
 * Step in the advancement process that will be displayed on its individual page.
 *
 * @property {Actor5e} actor   Actor to which this step's changes will be applied.
 * @property {object} config   Configuration information specific to each step type.
 * @property {object} options  Options passed through to Application.
 * @xtends {Application}
 */
class AdvancementStep extends Application {

  constructor(actor, config, options) {
    super(options);

    /**
     * Actor that will be used when calculating changes.
     * @type {Actor5e}
     */
    this._actor = actor;

    /**
     * Step configuration information.
     * @type {object}
     */
    this.config = config;

    /**
     * Data for each section displayed. Only required property is `flows` containing an array of AdvancementFlows.
     * @type {object[]}
     */
    this.sections = this.prepareSections();
    this.sections.forEach(s => s.flows.sort((a, b) => a.sortingValue.localeCompare(b.sortingValue)));

    /**
     * All of the stored update data. `actor` is changes to actor properties passed to `Actor#update`.
     * `item` contains `add` which is a mapping between UUID of items to add and the advancement origin.
     * and `remove` which contains IDs of items to remove.
     * @type {{
     *   actor: object,
     *   item: {
     *     add: object,
     *     remove: string[]
     *   }
     * }}
     */
    this.updates = {
      actor: {},
      item: { add: {}, remove: [] }
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/advancement-step.html",
      popOut: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get id() {
    return `actor-advancement-step-${this.appId}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() { return null; }

  /* -------------------------------------------- */

  /**
   * Actor used by this advancement step.
   */
  get actor() {
    return this._actor;
  }

  /* -------------------------------------------- */

  /**
   * Replace the stored actor with the one provided and update all flows accordingly.
   * @param {Actor5e} actor  Actor to set.
   */
  set actor(actor) {
    this._actor = actor;
    
    for ( const flow of this.flows ) {
      const advancement = actor.items.get(flow.advancement.parent.id)?.advancement[flow.advancement.id];
      if ( advancement ) flow.advancement = advancement;
      else flow.advancement.actor = actor;
    }
  }

  /* -------------------------------------------- */

  /**
   * Advancement flows in this step in the order they should be applied.
   * @type {AdvancementFlow[]}
   */
  get flows() {
    return this.sections.flatMap(s => s.flows);
  }

  /* -------------------------------------------- */

  /**
   * Build up the sections list on initial creation of this step.
   * @returns {object[]}
   */
  prepareSections() { return []; }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _render(force, options) {
    await super._render(force, options);

    // Render flows within the step
    return Promise.all(this.flows.map(f => {
      f._element = null;
      return f._render(true, options);
    }));
  }

  /* -------------------------------------------- */

  /**
   * Returns all advancements on an item for a specific level.
   * @param {Item5e} item      Item that has advancement.
   * @param {number} level     Level in question.
   * @returns {Advancement[]}  Relevant advancement objects.
   * @protected
   */
  advancementsForLevel(item, level) {
    return Object.values(item.advancement).filter(a => a.levels.includes(level));
  }

  /* -------------------------------------------- */

  /**
   * Prepare the actor and item updates that all of the advancements within this step should apply.
   * @param {object} [config={}]
   * @param {boolean} [config.reverse=false]  Prepare updates to undo these advancements.
   */
  prepareUpdates({ reverse=false }={}) {
    for ( const section of this.sections ) {
      for ( const flow of section.flows ) {
        // Prepare update data from the form
        const level = (flow.advancement.parent.type === "class" ? this.config.classLevel : null) ?? section.level;
        flow.initialUpdate = reverse ? {} : flow.prepareUpdate(flow.form ? flow._getSubmitData() : {});
        const fetchData = { level, updates: flow.initialUpdate, reverse };

        // Prepare property changes
        Object.assign(this.updates.actor, flow.advancement.propertyUpdates(fetchData));

        // Prepare added or removed items
        const { add, remove } = flow.advancement.itemUpdates(fetchData);
        add.forEach(uuid => this.updates.item.add[uuid] = `${flow.advancement.parent.id}.${flow.advancement.id}`);
        this.updates.item.remove.push(...remove);
      }
    }
  }

}


/**
 * Handles presenting changes for a class and other items when level is increased by one.
 * @extends {AdvancementStep}
 */
export class LevelIncreasedStep extends AdvancementStep {

  /** @inheritdoc */
  get title() {
    if ( this.config.classLevel > 1 ) return game.i18n.localize("DND5E.AdvancementManagerLevelIncreasedTitle");
    return game.i18n.localize("DND5E.AdvancementManagerLevelNewClassTitle");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareSections() {
    const sections = [{
      level: this.config.level,
      classLevel: this.config.classLevel,
      item: this.config.item,
      flows: this.advancementsForLevel(this.config.item, this.config.classLevel).map(a => {
        return new a.constructor.flowApp(a, this.config.classLevel);
      })
    }];
    return sections;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), {
      sections: this.sections.map(section => {
        return {
          level: section.level,
          header: section.item.name,
          subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: section.classLevel }),
          advancements: section.flows.map(f => f.getPlaceholderData())
        };
      })
    });
  }

}


/**
 * Handles unapplying changes for a class and other items when level is decreased by one.
 * @extends {AdvancementStep}
 */
export class LevelDecreasedStep extends AdvancementStep { }


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
  get title() {
    return game.i18n.localize("DND5E.AdvancementManagerModifyChoicesTitle");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareSections() {
    const sections = [{
      level: this.config.level,
      item: this.config.item,
      flows: this.advancementsForLevel(this.config.item, this.config.level).map(a => {
        return new a.constructor.flowApp(a, this.config.level);
      })
    }];
    return sections;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), {
      sections: this.sections.map(section => {
        return {
          level: section.level,
          header: section.item.name,
          subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: section.level }),
          advancements: section.flows.map(f => f.getPlaceholderData())
        };
      })
    });
  }

}
