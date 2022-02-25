/*

{ type: "levelIncreased", data: LevelChangeData }
{ type: "itemAdded", item: Item5e }

*/

/**
 * Represents data about a change is character and class level for an actor.
 *
 * @typedef {object} LevelChangeData
 * @property {Item5e|null} item  Class item that was added or changed (null if class was removed).
 * @property {{ initial: number, final: number }} character  Overall character level changes.
 * @property {{ initial: number, final: number }} class      Changes to the class's level.
 */

export class StupidClassForDoingAdvancement extends FormApplication {

  constructor(actor, steps=[], options={}) {
    super(actor, options);

    /**
     * 
     */
    this.steps = steps;

    /**
     * Step being currently displayed.
     * @type {number|null}
     */
    this.stepIndex = steps.length ? 0 : null;

    /**
     * Cache of advancement flows.
     * @type {object}
     */
    this.flows = {};
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "flow"],
      template: "systems/dnd5e/templates/advancement/stupid-advancement-template.html",
      width: 460,
      height: "auto",
      title: "I Have No Idea What To Name This Class"
    });
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
  /*  Advancement Actions                         */
  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a class is added or level is changed.
   * @param {LevelChangeData} data  Information on the class and level changes.
   */
  levelChanged(data) {
    if ( data.character.final < data.character.initial ) return; // TODO: Add support for leveling down?
    this._addStep({ type: "levelChanged", data });
  }

  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a non-class item is added.
   * @param {Item5e} item    Item that was added.
   */
  itemAdded(item) {
    this._addStep({ type: "itemAdded", item });
  }

  /* -------------------------------------------- */

  /**
   * Add a step to this advancement process when a non-class item is removed.
   * @param {Item5e} item    Item that was removed.
   */
  itemRemoved(item) {
    this._addStep({ type: "itemRemoved", item });
  }

  /* -------------------------------------------- */

  /**
   * Add an advancement step and re-render the app using debounce.
   * @param {AdvancementStep} step  Step to add.
   * @private
   */
  _addStep(step) {
    const newIndex = this.steps.push(step) - 1;
    if ( this.stepIndex === null ) this.stepIndex = newIndex;
    this.render(true);
    // TODO: Re-render using a debounce to avoid multiple renders if several steps are added in a row.
  }

  /* -------------------------------------------- */
  /*  Form Rendering                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    // Only level changed now
    // And only support one level
    const data = {};

    const step = this.steps[this.stepIndex];
    if ( !step ) return data;

    if ( (step.type === "levelChanged") && step.data.item ) {

      const cls = step.data.item;
      const level = step.data.class.final;
      data.header = cls.name;
      data.subheader = `Level ${level}`; // TODO: Localize
      data.advancements = await Promise.all(this._advancementsForLevel(cls, level).map(async (a) => {
        this.flows[a.id] ??= new a.constructor.flowApp(a, { level });
        const value = {
          id: a.id,
          type: a.constructor.typeName,
          data: await this.flows[a.id].getData(),
          template: this.flows[a.id].options.template,
          title: this.flows[a.id].title,
          order: a.sortingValueForLevel(level)
        };
        return value;
      }));
      data.advancements.sort((a, b) => a.order.localeCompare(b.order));

    } else if ( step.type === "itemAdded" ) {
      console.log("Not yet supported");
    }

    return data;
  }

  /* -------------------------------------------- */

  /**
   * Returns all advancements on an item for a specific level.
   * @param {Item5e} item      Item that has advancement.
   * @param {number} level     Level in question.
   * @returns {Advancement[]}  Relevant advancement objects.
   */
  _advancementsForLevel(item, level) {
    return Object.values(item.advancement).filter(a => {
      const levels = a.levels;
      return levels.includes(level);
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html[0].querySelectorAll("section[data-id]").forEach(section => {
      this.flows[section.dataset.id]?.activateListeners(section);
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async close(options={}) {
    // TODO: Add confirmation dialog
    this.actor._advancement = null;
    await super.close(options);
  }

}
