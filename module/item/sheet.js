/**
 * Override and extend the basic ItemSheet implementation for the D&D5E system.
 * This base item sheet handles several item types and is extended by other sheets for other types.
 */
export class ItemSheet5e extends ItemSheet {
	static get defaultOptions() {
	  const options = super.defaultOptions;
	  options.width = 520;
	  options.height = 460;
	  options.classes = options.classes.concat(["dnd5e", "item"]);
	  options.template = `public/systems/dnd5e/templates/items/item-sheet.html`;
	  options.resizable = false;
	  return options;
  }

  /* -------------------------------------------- */

  /**
   * Prepare item sheet data
   * Start with the base item data and extending with additional properties for rendering.
   */
  getData() {
    const data = super.getData();

    // Sheet display details
    const type = this.item.type;
    mergeObject(data, {
      type: type,
      hasSidebar: true,
      sidebarTemplate: () => `public/systems/dnd5e/templates/items/${type}-sidebar.html`,
      hasDetails: ["consumable", "equipment", "feat", "spell", "weapon"].includes(type),
      detailsTemplate: () => `public/systems/dnd5e/templates/items/${type}-details.html`
    });

    // Damage types
    let dt = duplicate(CONFIG.DND5E.damageTypes);
    if ( ["spell", "feat"].includes(type) ) mergeObject(dt, CONFIG.DND5E.healingTypes);
    data['damageTypes'] = dt;

    // Consumable Data
    if ( type === "consumable" ) {
      data.consumableTypes = CONFIG.DND5E.consumableTypes
    }

    // Spell Data
    else if ( type === "spell" ) {
      mergeObject(data, {
        spellTypes: CONFIG.DND5E.spellTypes,
        spellSchools: CONFIG.DND5E.spellSchools,
        spellLevels: CONFIG.DND5E.spellLevels,
        spellComponents: this._formatSpellComponents(data.data),
        activationTypes: CONFIG.DND5E.abilityActivationTypes,
        distanceUnits: CONFIG.DND5E.distanceUnits,
        targetTypes: CONFIG.DND5E.targetTypes,
        timePeriods: CONFIG.DND5E.timePeriods,
      });
    }

    // Weapon Data
    else if ( this.item.type === "weapon" ) {
      data.weaponTypes = CONFIG.DND5E.weaponTypes;
      data.weaponProperties = this._formatWeaponProperties(data.data);
    }

    // Feat types
    else if ( type === "feat" ) {
      data.featTypes = CONFIG.DND5E.featTypes;
      data.featTags = [
        data.data.target.value,
        data.data.time.value
      ].filter(t => !!t);
    }

    // Equipment data
    else if ( type === "equipment" ) {
      data.armorTypes = CONFIG.DND5E.armorTypes;
    }

    // Tool-specific data
    else if ( type === "tool" ) {
      data.proficiencies = CONFIG.DND5E.proficiencyLevels;
    }
    return data;
  }

  /* -------------------------------------------- */

  _formatSpellComponents(data) {
    if ( !data.components.value ) return [];
    let comps = data.components.value.split(",").map(c => CONFIG.DND5E.spellComponents[c.trim()] || c.trim());
    if ( data.materials.value ) comps.push(data.materials.value);
    return comps;
  }

  /* -------------------------------------------- */

  _formatWeaponProperties(data) {
    if ( !data.properties.value ) return [];
    return data.properties.value.split(",").map(p => p.trim());
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for interactive item sheet events
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    new Tabs(html.find(".tabs"), {
      initial: this.item.data.flags["_sheetTab"],
      callback: clicked => this.item.data.flags["_sheetTab"] = clicked.attr("data-tab")
    });

    // Checkbox changes
    html.find('input[type="checkbox"]').change(event => this._onSubmit(event));
  }
}
