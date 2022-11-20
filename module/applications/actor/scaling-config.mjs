/**
 * @param {Actor5e} actor               The Actor instance being displayed within the sheet.
 * @param {ApplicationOptions} options  Additional application configuration options.
 * @param {string} statId           The stat key as defined in CONFIG.SHAPER.stats.
 */
export default class ActorScalingConfig extends DocumentSheet {
  constructor(actor, options, statId) {
    super(actor, options);
    this._statId = statId;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shaper"],
      template: "systems/shaper/templates/apps/scaling-config.hbs",
      width: 500,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    let label;
    switch(this._statId) {
      case 'hp':
        label = game.i18n.localize("SHAPER.HitPointsMax");
        break;
      case 'mp':
        label = game.i18n.localize("SHAPER.MindPointsMax");
        break;
      default:
        label = CONFIG.SHAPER.stats[this._statId].label;
        break;
    }
    return `${game.i18n.format("SHAPER.ScalingConfig", {stat: label})}: ${this.document.name}`;
    
    
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const src = this.object.toObject();
    switch(this._statId) {
      case 'hp':
      case 'mp':
        return {
          stat: src.system.attributes?.[this._statId] || {},
          statId: this._statId,
          config: CONFIG.SHAPER,
          scale0: src.system.attributes[this._statId].scale0,
          scale1: src.system.attributes[this._statId].scale1
        };
      default:
        return {
          stat: src.system.stats?.[this._statId] || {},
          statId: this._statId,
          config: CONFIG.SHAPER,
          scale0: src.system.stats[this._statId].scale0,
          scale1: src.system.stats[this._statId].scale1
        };
    }
  }
  
  /* -------------------------------------------- */

  /**
   * Prepare the update data to include choices in the provided object.
   * @param {object} formData  Form data to search for choices.
   * @returns {object}         Updates to apply to target.
   */
   _prepareUpdateData(formData) {
    const updateData = {};
    const updates = foundry.utils.expandObject(formData);
    switch(this._statId) {
      case 'hp':
      case 'mp':
        updateData[`system.attributes.${this._statId}.scale0`] = updates.scale0;
        updateData[`system.attributes.${this._statId}.scale1`] = updates.scale1;
        break;
      default:
        updateData[`system.stats.${this._statId}.scale0`] = updates.scale0;
        updateData[`system.stats.${this._statId}.scale1`]  = updates.scale1;
    }
    return updateData;
  }
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const actor = this.object;
    const updateData = this._prepareUpdateData(formData);
    if ( updateData ) await actor.update(updateData);
  }
}
