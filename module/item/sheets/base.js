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

    // Include CONFIG values
    data.config = CONFIG.DND5E;
    data.abilities = CONFIG.TEMPLATE_METADATA.actor.data.abilities;

    // Item Type, Status, and Details
    data.itemType = data.item.type.titleCase();
    data.itemStatus = this._getItemStatus(data.item);
    data.itemProperties = this._getItemProperties(data.item);

    // Spell-specific data
    if ( data.item.type === "spell" ) {

      // Spell DC
      let save = data.item.data.save;
      if ( this.item.isOwned && (save.ability && !save.dc) ) {
        save.dc = this.item.actor.data.data.attributes.spelldc.value;
      }
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
        item.data.activation.label,
        item.data.range.label,
        item.data.target.label,
        item.data.duration.label,
        item.data.components.label,
        item.data.materials.value,
        item.data.components.concentration ? "Concentration" : null,
        item.data.components.ritual ? "Ritual" : null
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
