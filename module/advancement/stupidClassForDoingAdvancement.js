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
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement"],
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
    this._addStep({ type: "levelIncreased", data });
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
    console.log(step);
    console.log(`Steps: ${this.steps.length}`);
    const newIndex = this.steps.push(step);
    if ( this.stepIndex === null ) this.stepIndex = newIndex;
    this.render(true);
    // TODO: Re-render using a debounce to avoid multiple renders if several steps are added in a row.
  }
  
  /* -------------------------------------------- */
  /*  Form Rendering                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return {};
  }

}
