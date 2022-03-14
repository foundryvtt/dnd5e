/**
 * Step in the advancement process that will be displayed on its individual page.
 *
 * @property {Actor5e} actor  Actor to which this step's changes will be applied.
 * @property {object} config  Configuration information specific to each step type.
 */
class AdvancementStep {

  constructor(actor, config) {
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

    /**
     * Advancement flows that make up this step grouped by level.
     * @type {object<number, AdvancementFlow[]>}
     */
    this.flows = {};

    /**
     * Updates that will be applied to the actor's properties. Will be provided to `Actor#update`.
     * @type {object}
     */
    this.actorUpdates = {};

    /**
     * Items that will be added or removed from the actor.
     * @type {object}
     */
    this.itemUpdates = { add: [], remove: [] };
  }

  /* -------------------------------------------- */

  /**
   * Title to be displayed for this step.
   * @type {string}
   */
  get title() { return null; }

  /* -------------------------------------------- */

  /**
   * Get the data that will be passed to the advancement manager template when rendering this step.
   * @returns {object}  Final data passed to the template.
   */
  async getData() { }

  /* -------------------------------------------- */

  /**
   * Get a flow object for a specific level.
   * @param {Advancement} advancement  Advancement from which to create the flow.
   * @param {number} level             Character level used when creating and referencing the flow.
   * @param {number} [classLevel]      Class level used when creating the flow.
   * @returns {AdvancementFlow}        The flow.
   * @protected
   */
  getFlow(advancement, level, classLevel) {
    this.flows[level] ??= {};
    this.flows[level][advancement.id] ??= new advancement.constructor.flowApp(advancement, classLevel ?? level);
    const cloneAdvancement = this.actor.items.get(advancement.parent.id).advancement[advancement.id];
    this.flows[level][advancement.id].advancement = cloneAdvancement;
    return this.flows[level][advancement.id];
  }

  /* -------------------------------------------- */

  /**
   * Get data needed to display an advancement in the step.
   * @param {AdvancementFlow} flow  Relevant advancement flow object.
   * @returns {object}              Display data for template rendering.
   * @protected
   */
  async getAdvancementFlowData(flow) {
    return {
      id: flow.advancement.id,
      type: flow.advancement.constructor.typeName,
      data: await flow.getData(),
      template: flow.constructor.defaultOptions.template,
      title: flow.title,
      order: flow.sortingValue
    };
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
    return Object.values(item.advancement).filter(a => {
      const levels = a.levels;
      return levels.includes(level);
    });
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners on each individual flow within this step.
   * @param {jQuery} html  HTML of the AdvancementManager application.
   */
  activateListeners(html) {
    html[0].querySelectorAll("section[data-id]").forEach(section => {
      const flow = this.flows[section.dataset.level]?.[section.dataset.id];
      if ( !flow ) return;
      flow.form = section;
      flow.activateListeners($(section));
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare the actor and item updates that all of the advancements within this step should apply.
   * @param {object} [config={}]
   * @param {object} [config.data={}]         Form data with individual advancement data grouped by ID.
   * @param {boolean} [config.reverse=false]  Prepare updates to undo these advancements.
   */
  prepareUpdates({ data={}, reverse=false }={}) {
    for ( const [currentLevel, flows] of Object.entries(this.flows) ) {
      for ( const [id, flow] of Object.entries(flows) ) {
        // Prepare update data from the form
        const level = (flow.advancement.parent.type === "class" ? this.config.classLevel : null) ?? Number(currentLevel);
        flow.initialUpdate = !reverse ? flow.prepareUpdate(foundry.utils.flattenObject(data[id] ?? {})) : {};
        const fetchData = { level, updates: flow.initialUpdate, reverse };

        // Prepare property changes
        Object.assign(this.actorUpdates, flow.advancement.propertyUpdates(fetchData));

        // Prepare added or removed items
        const { add, remove } = flow.advancement.itemUpdates(fetchData);
        this.itemUpdates.add.push(...add); // TODO: Keep added items associated with the advancement that provides them
        this.itemUpdates.remove.push(...remove);
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
  async getData() {
    const level = this.config.level;
    const classLevel = this.config.classLevel;

    const data = {
      sections: [{
        level,
        header: this.config.item.name,
        subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: classLevel }),
        advancements: await Promise.all(this.advancementsForLevel(this.config.item, classLevel).map(async a => {
          return await this.getAdvancementFlowData(this.getFlow(a, level, classLevel));
        }))
      }]
    };
    data.sections.forEach(s => s.advancements.sort((a, b) => a.order.localeCompare(b.order)));

    return data;
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
  async getData() {
    const data = {
      sections: [{
        level: this.config.level,
        header: this.config.item.name,
        subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: this.config.level }),
        advancements: await Promise.all(this.advancementsForLevel(this.config.item, this.config.level).map(async a => {
          return await this.getAdvancementFlowData(this.getFlow(a, this.config.level));
        }))
      }]
    }
    data.sections[0].advancements.sort((a, b) => a.order.localeCompare(b.order));
    return data;
  }

}
