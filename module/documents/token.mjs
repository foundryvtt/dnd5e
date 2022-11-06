/**
 * Extend the base TokenDocument class to implement system-specific HP bar logic.
 */
export default class TokenDocument5e extends TokenDocument {

  /** @inheritdoc */
  getBarAttribute(...args) {
    const data = super.getBarAttribute(...args);
    if ( data && (data.attribute === "attributes.hp") ) {
      const hp = this.actor.system.attributes.hp || {};
      data.value += (hp.temp || 0);
    }
    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static getTrackedAttributes(data, _path=[]) {
    const attributes = super.getTrackedAttributes(data, _path);
    if ( _path.length ) return attributes;
    const allowed = CONFIG.SHAPER.trackableAttributes;
    attributes.value = attributes.value.filter(attrs => this._isAllowedAttribute(allowed, attrs));
    return attributes;
  }

  /* -------------------------------------------- */

  /**
   * Get an Array of attribute choices which are suitable for being consumed by an item usage.
   * @param {object} data  The actor data.
   * @returns {{bar: string[], value: string[]}}
   */
   static getConsumedAttributes(data) {
    const attributes = super.getTrackedAttributes(data);
    const allowed = CONFIG.SHAPER.consumableResources;
    
    // TODO Find how this list is populated; only allow HP, MP
    /**
     * TODO (written here so you find it, dumbass)
     * Find out why items can't be edited
     * Edit UI on item sheets, remove number from activation cost
     * Remove range box on target
     * Remove number boxes for range
     * Figure out possible durations
     * Remove limited use row
     * Remove action recharge
     * Add a space for cooldown
     * Add a space for upkeep
     * Remove other damage formulae boxes -> Bane/Boon and Impact
     */

    console.log(allowed);
    attributes.value = attributes.value.filter(attrs => this._isAllowedAttribute(allowed, attrs));
    return attributes;
  }
  /* -------------------------------------------- */

  /**
   * Traverse the configured allowed attributes to see if the provided one matches.
   * @param {object} allowed  The allowed attributes structure.
   * @param {string[]} attrs  The attributes list to test.
   * @returns {boolean}       Whether the given attribute is allowed.
   * @private
   */
  static _isAllowedAttribute(allowed, attrs) {
    let allow = allowed;
    for ( const attr of attrs ) {
      if ( allow === undefined ) return false;
      if ( allow === true ) return true;
      if ( allow["*"] !== undefined ) allow = allow["*"];
      else allow = allow[attr];
    }
    return allow !== undefined;
  }
}
