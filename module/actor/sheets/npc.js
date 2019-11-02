import { ActorSheet5e } from "../sheets/base.js";

/**
 * An Actor sheet for NPC type characters in the D&D5E system.
 * Extends the base ActorSheet5e class.
 * @type {ActorSheet5e}
 */
export class ActorSheet5eNPC extends ActorSheet5e {

  /**
   * Define default rendering options for the NPC sheet
   * @return {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "npc"],
      width: 620,
      height: 710
    });
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Get the correct HTML template path to use for rendering this particular sheet
   * @type {String}
   */
  get template() {
    if ( !game.user.isGM && this.actor.limited ) return "public/systems/dnd5e/templates/actors/limited-sheet.html";
    return "public/systems/dnd5e/templates/npc/npc-sheet.html";
  }

  /* -------------------------------------------- */

  /**
   * Organize Owned Items for rendering the NPC sheet
   * @private
   */
  _prepareItems(data) {

    // Categorize Items as Features and Spells
    const features = {
      weapons: {label: "Attacks", items: [], type: "weapon", subtype: "" },
      actions: { label: "Actions", items: [], type: "feat", subtype: "ability" },
      passive: { label: "Features", items: [], type: "feat", subtype: "passive" },
      equipment: { label: "Inventory", items: [], type: "backpack", subtype: "" }
    };
    const spellbook = {};

    // Iterate through items, allocating to containers
    for ( let i of data.items ) {
      i.img = i.img || DEFAULT_TOKEN;

      // Spells
      if ( i.type === "spell" ) this._prepareSpell(data.actor, spellbook, i);

      // Features
      else if ( i.type === "weapon" ) features.weapons.items.push(i);
      else if ( i.type === "feat" ) {
        if ( i.data.featType.value === "passive" ) features.passive.items.push(i);
        else features.actions.items.push(i);
      }
      else if (["equipment", "consumable", "tool", "backpack"].includes(i.type)) features.equipment.items.push(i);
    }

    // Assign and return
    data.features = features;
    data.spellbook = spellbook;
  }

  /* -------------------------------------------- */
  /*  Object Updates                              */
  /* -------------------------------------------- */

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  _updateObject(event, formData) {

    // Format NPC Challenge Rating
    let crv = "data.details.cr.value";
    let cr = formData[crv];
    if ( cr ) {
        let crs = {"1/8": 0.125, "1/4": 0.25, "1/2": 0.5};
        formData[crv] = crs[cr] || parseInt(cr);
    }

    // Parent ActorSheet update steps
    super._updateObject(event, formData);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html);

    // Rollable Health Formula
    html.find(".health .rollable").click(this._onRollHealthFormula.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling NPC health values using the provided formula
   * @param {Event} event     The original click event
   * @private
   */
  _onRollHealthFormula(event) {
    event.preventDefault();
    const formula = this.actor.data.data.attributes.hp.formula;
    if ( !formula ) return;
    const hp = new Roll(formula).roll().total;
    AudioHelper.play({src: CONFIG.sounds.dice});
    this.actor.update({"data.attributes.hp.value": hp, "data.attributes.hp.max": hp});
  }
}