/**
 * Override and extend the basic :class:`ItemSheet` implementation
 */
export class ItemSheet5e extends ItemSheet {
  constructor(...args) {
    super(...args);

    /**
     * The tab being browsed
     * @type {string}
     */
    this._sheetTab = null;

    /**
     * The scroll position on the active tab
     * @type {number}
     */
    this._scrollTab = 100;
  }

  /* -------------------------------------------- */

	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
      width: 520,
      height: 460,
      classes: ["dnd5e", "sheet", "item"],
      template: `public/systems/dnd5e/templates/items-v2/item-sheet.html`,
      resizable: false
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare item sheet data
   * Start with the base item data and extending with additional properties for rendering.
   */
  getData() {
    const data = super.getData();

    // Item Type, Status, and Details
    data.itemType = data.item.type.titleCase();
    data.itemStatus = this._getItemStatus(data.item);
    data.itemProperties = this._getItemProperties(data.item);

    // Include commonly resourced enumerations
    data.abilities = CONFIG.TEMPLATE_METADATA.actor.data.abilities;
    data.activationTypes = CONFIG.DND5E.abilityActivationTypes;
    data.damageTypes = CONFIG.DND5E.damageTypes;
    data.distanceUnits = CONFIG.DND5E.distanceUnits;
    data.targetTypes = CONFIG.DND5E.targetTypes;
    data.timePeriods = CONFIG.DND5E.timePeriods;

    // Spell-specific data
    if ( data.item.type === "spell" ) {
      data.spellTypes = CONFIG.DND5E.spellTypes;
      data.spellSchools = CONFIG.DND5E.spellSchools;
      data.spellLevels = CONFIG.DND5E.spellLevels;
    }

    return data;
  }

  /* -------------------------------------------- */

  _getItemStatus(item) {
    if ( item.type === "spell" ) return item.data.prepared.value ? "Prepared" : "Unprepared";
    else if ( ["weapon", "equipment"].includes(item.type) ) return item.data.equipped.value ? "Equipped" : "Unequipped";
  }

  /* -------------------------------------------- */

  _getItemProperties(item) {
    const props = [];
    if ( item.type === "spell" ) {
      props.push(
        item.data.spellType.label,
        item.data.activation.label,
        item.data.range.label,
        item.data.target.label,
        item.data.duration.label,
        item.data.components.value,
        item.data.materials.value,
        item.data.concentration.value ? "Concentration" : null,
        item.data.ritual.value ? "Ritual" : null
      )
    }
    return props.filter(p => !!p);
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for interactive item sheet events
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    new Tabs(html.find(".tabs"), {
      initial: this["_sheetTab"],
      callback: clicked => this["_sheetTab"] = clicked.data("tab")
    });

    // Save scroll position
    html.find(".tab.active")[0].scrollTop = this._scrollTab;
    html.find(".tab").scroll(ev => this._scrollTab = ev.currentTarget.scrollTop);
  }
}
