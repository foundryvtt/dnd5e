/**
 * Base application for the Advancement Flow steps that should be subclassed by individual advancement types.
 *
 * @extends {Application}
 */
export class AdvancementFlow extends Application {

  constructor(advancement, options={}) {
    super(options);
  
    /**
     * Advancement to which this flow belongs.
     */
    this.advancement = advancement;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "flow"],
      width: 460,
      height: "auto",
      level: null
    });
  }
  
  /* -------------------------------------------- */

  get title() {
    return this.advancement.title;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return { advancement: this.advancement, level: this.options.level };
  }

  /* -------------------------------------------- */

  /**
   * Render this application to be inserted into a larger Flow application.
   * @param {object} [options={}]  Options with which to update the current values of Application#options.
   * @returns {Promise<jQuery>}    Rendered inner content.
   * @protected
   */
  async _renderInsert(options={}) {
    foundry.utils.mergeObject(this.options, options, { insertKeys: false });
    const data = await this.getData(this.options);
    const html = await this._renderInner(data);
    this.activateListeners(html);
    return html;
  }

  /* -------------------------------------------- */

  /**
   * Perform any steps to prepare the form data to be saved within advancement values.
   * @param {object} formData  Data object taken from the form.
   * @returns {object}         Data formatted to be applied as an update to `Advancement#data.value`.
   */
  prepareUpdate(formData) {
    return formData;
  }
  
  /* -------------------------------------------- */

  /**
   * Perform any final transformation necessary on the value updates after items have been added.
   * @param {object} update        Value update data provided by `AdvancementFlow#prepareUpdate`.
   * @param {Item5e[]} itemsAdded  Any items added to the actor.
   * @returns {object}             Final value updates to apply to the advancement.
   */
  finalizeUpdate(update, itemsAdded) {
    return update;
  }

}
