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
      height: 420,
      classes: ["dnd5e", "sheet", "item"],
      resizable: false
    });
  }

  /* -------------------------------------------- */

  /**
   * Return a dynamic reference to the HTML template path used to render this Item Sheet
   * @return {string}
   */
  get template() {
    const path = "public/systems/dnd5e/templates/items-v2/";
    if ( this.item.data.type === "weapon" ) return path + "weapon.html";
    else return path + "item-sheet.html";
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

    // Action Details
    data.hasAttackRoll = ["matk", "ratk", "satk"].includes(data.item.data.actionType);
    data.isHealing = data.item.data.actionType === "heal";

    // Spell-specific data
    if ( data.item.type === "spell" ) {
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

    if ( ["weapon", "spell"].includes(item.type) ) {
      props.push(
        item.data.activation.label,
        item.data.range.label,
        item.data.target.label,
        item.data.duration.label,
      )
    }

    if ( item.type === "weapon" ) {
      props.push(...Object.entries(item.data.properties)
        .filter(e => e[1] === true)
        .map(e => CONFIG.DND5E.weaponProperties[e[0]]));
    }

    if ( item.type === "spell" ) {
      props.push(
        item.data.components.label,
        item.data.materials.value,
        item.data.components.concentration ? "Concentration" : null,
        item.data.components.ritual ? "Ritual" : null
      )
    }
    return props.filter(p => !!p);
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
	/* -------------------------------------------- */

  /**
   * Extend the parent class _updateObject method to ensure that damage ends up in an Array
   * @private
   */
  _updateObject(event, formData) {

    // Handle Damage Array
    let damage = Object.entries(formData).filter(e => e[0].startsWith("data.damage"));
    formData["data.damage"] = damage.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if ( !arr[i] ) arr[i] = [];
      arr[i][j] = entry[1];
      return arr;
    }, []);

    // Update the Item
    super._updateObject(event, formData);
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

    // Modify damage formula
    html.find(".damage-control").click(this._onDamageControl.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Add or remove a damage part from the damage formula
   * @param {Event} event     The original click event
   * @return {Promise}
   * @private
   */
  async _onDamageControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new damage component
    if ( a.classList.contains("add-damage") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const damage = this.item.data.data.damage;
      return this.item.update({"data.damage": damage.concat([["", ""]])});
    }

    // Remove a damage component
    if ( a.classList.contains("delete-damage") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".damage-part");
      const damage = duplicate(this.item.data.data.damage);
      damage.splice(Number(li.dataset.damagePart), 1);
      return this.item.update({"data.damage": damage});
    }
  }
}
