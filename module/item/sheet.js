/**
 * Override and extend the core ItemSheet implementation to handle D&D5E specific item types
 * @type {ItemSheet}
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
      width: 560,
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
    const path = "systems/dnd5e/templates/items/";
    return `${path}/${this.item.data.type}.html`;
  }

  /* -------------------------------------------- */

  /**
   * Prepare item sheet data
   * Start with the base item data and extending with additional properties for rendering.
   */
  getData() {
    const data = super.getData();
    data.labels = this.item.labels;

    // Include CONFIG values
    data.config = CONFIG.DND5E;

    // Item Type, Status, and Details
    data.itemType = data.item.type.titleCase();
    data.itemStatus = this._getItemStatus(data.item);
    data.itemProperties = this._getItemProperties(data.item);
    data.isPhysical = data.item.data.hasOwnProperty("quantity");

    // Action Details
    data.hasAttackRoll = this.item.hasAttack;
    data.isHealing = data.item.data.actionType === "heal";
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Get the text item status which is shown beneath the Item type in the top-right corner of the sheet
   * @return {string}
   * @private
   */
  _getItemStatus(item) {
    if ( item.type === "spell" ) return item.data.preparation.prepared ? "Prepared" : "Unprepared";
    else if ( ["weapon", "equipment"].includes(item.type) ) return item.data.equipped ? "Equipped" : "Unequipped";
    else if ( item.type === "tool" ) return item.data.proficient ? "Proficient" : "Not Proficient";
  }

  /* -------------------------------------------- */

  /**
   * Get the Array of item properties which are used in the small sidebar of the description tab
   * @return {Array}
   * @private
   */
  _getItemProperties(item) {
    const props = [];
    const labels = this.item.labels;

    if ( item.type === "weapon" ) {
      props.push(...Object.entries(item.data.properties)
        .filter(e => e[1] === true)
        .map(e => CONFIG.DND5E.weaponProperties[e[0]]));
    }

    else if ( item.type === "spell" ) {
      props.push(
        labels.components,
        labels.materials,
        item.data.components.concentration ? "Concentration" : null,
        item.data.components.ritual ? "Ritual" : null
      )
    }

    else if ( item.type === "equipment" ) {
      props.push(CONFIG.DND5E.equipmentTypes[item.data.armor.type]);
      props.push(labels.armor);
    }

    else if ( item.type === "feat" ) {
      props.push(labels.featType);
    }

    // Action type
    if ( item.data.actionType ) {
      props.push(CONFIG.DND5E.itemActionTypes[item.data.actionType]);
    }

    // Action usage
    if ( (item.type !== "weapon") && item.data.activation && !isObjectEmpty(item.data.activation) ) {
      props.push(
        labels.activation,
        labels.range,
        labels.target,
        labels.duration
      )
    }
    return props.filter(p => !!p);
  }

  /* -------------------------------------------- */

  setPosition(position={}) {
    if ( this._sheetTab === "details" ) position.height = "auto";
    return super.setPosition(position);
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
    let damage = Object.entries(formData).filter(e => e[0].startsWith("data.damage.parts"));
    formData["data.damage.parts"] = damage.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(3);
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
      callback: clicked => {
        this["_sheetTab"] = clicked.data("tab");
        this.setPosition();
      }
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
      return this.item.update({"data.damage.parts": damage.parts.concat([["", ""]])});
    }

    // Remove a damage component
    if ( a.classList.contains("delete-damage") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".damage-part");
      const damage = duplicate(this.item.data.data.damage);
      damage.parts.splice(Number(li.dataset.damagePart), 1);
      return this.item.update({"data.damage.parts": damage.parts});
    }
  }
}
