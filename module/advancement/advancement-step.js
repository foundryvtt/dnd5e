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
     * Data for each section displayed. Only required property is `flows` containing an array of AdvancementFlows.
     * @type {object[]}
     */
    this.sections = this.prepareSections();
    this.sections.forEach(s => s.flows.sort((a, b) => a.sortingValue.localeCompare(b.sortingValue)));

    /**
     * All of the stored update data. `actor` is changes to actor properties passed to `Actor#update`.
     * `item` contains `add` which lists UUID of items to add and `remove` which contains IDs of items to remove.
     * @type {object}
     */
    this.updates = {
      actor: {},
      item: { add: [], remove: [] }
    };
  }

  /* -------------------------------------------- */

  /**
   * Title to be displayed for this step.
   * @type {string}
   */
  get title() { return null; }

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
   */
  prepareSections() { }

  /* -------------------------------------------- */

  /**
   * Get the data that will be passed to the advancement manager template for rendering the provided section.
   * @params {object} section  Data on section to be rendered.
   * @returns {object}         Final data for rendering the section.
   */
  getSectionData(section) { }

  /* -------------------------------------------- */

  /**
   * Get data needed to display an advancement in the step.
   * @param {AdvancementFlow} flow  Relevant advancement flow object.
   * @returns {object}              Display data for template rendering.
   * @protected
   */
  getAdvancementFlowData(flow) {
    return {
      flow,
      appId: flow.id,
      id: flow.advancement.id,
      type: flow.advancement.constructor.typeName,
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
   * Replace the stored actor with the one provided and update all flows accordingly.
   * @param {Actor5e} actor  Actor to set.
   */
  swapActor(actor) {
    this.actor = actor;

    for ( const flow of this.flows ) {
      const advancement = actor.items.get(flow.advancement.parent.id)?.advancement[flow.advancement.id];
      if ( advancement ) flow.advancement = advancement;
      else flow.advancement.actor = actor;
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare the actor and item updates that all of the advancements within this step should apply.
   * @param {object} [config={}]
   * @param {object} [config.data={}]         Form data with individual advancement data grouped by ID.
   * @param {boolean} [config.reverse=false]  Prepare updates to undo these advancements.
   */
  prepareUpdates({ data={}, reverse=false }={}) {
    for ( const section of this.sections ) {
      for ( const flow of section.flows ) {
        // Prepare update data from the form
        const level = (flow.advancement.parent.type === "class" ? this.config.classLevel : null) ?? section.level;
        flow.initialUpdate = !reverse ? flow.prepareUpdate(foundry.utils.flattenObject(data[flow.advancement.id] ?? {})) : {};
        const fetchData = { level, updates: flow.initialUpdate, reverse };

        // Prepare property changes
        Object.assign(this.updates.actor, flow.advancement.propertyUpdates(fetchData));

        // Prepare added or removed items
        const { add, remove } = flow.advancement.itemUpdates(fetchData);
        this.updates.item.add.push(...add); // TODO: Keep added items associated with the advancement that provides them
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
  getSectionData(section) {
    return {
      level: section.level,
      header: section.item.name,
      subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: section.classLevel }),
      advancements: section.flows.map(f => this.getAdvancementFlowData(f))
    };
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
  getSectionData(section) {
    return {
      level: section.level,
      header: section.item.name,
      subheader: game.i18n.format("DND5E.AdvancementLevelHeader", { number: section.level }),
      advancements: section.flows.map(f => this.getAdvancementFlowData(f))
    };
  }

}
