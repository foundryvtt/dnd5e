/**
 * Override and extend the basic :class:`ItemSheet` implementation
 */
class ItemSheet5e extends ItemSheet {
	static get defaultOptions() {
	  const options = super.defaultOptions;
	  options.width = 520;
	  options.height = 460;
	  options.classes = options.classes.concat(["dnd5e", "item"]);
	  options.resizable = false;
	  return options;
  }

  /* -------------------------------------------- */

  /**
   * Use a type-specific template for each different item type
   */
  get template() {
    let type = this.item.type;
    // return `public/systems/dnd5e/templates/items/item-${type}-sheet.html`;
    return `public/systems/dnd5e/templates/items/item-sheet.html`;
  }

  /* -------------------------------------------- */

  /**
   * Prepare item sheet data
   * Start with the base item data and extending with additional properties for rendering.
   */
  getData() {
    const data = super.getData();
    data['abilities'] = game.system.template.actor.data.abilities;

    // Sheet display details
    mergeObject(data, {
      type: this.item.type,
      hasSidebar: true,
      sidebarTemplate: () => `public/systems/dnd5e/templates/items/${this.item.type}-sidebar.html`,
      hasDetails: true,
      detailsTemplate: () => `public/systems/dnd5e/templates/items/${this.item.type}-details.html`
    });

    // Spell Data
    if ( this.item.type === "spell" ) {
      mergeObject(data, {
        spellSchools: CONFIG.spellSchools,
        spellLevels: CONFIG.spellLevels,
        spellComponents: this._formatSpellComponents(data.data)
      });
    }

    // Damage types
    let dt = duplicate(CONFIG.damageTypes);
    if ( ["spell", "feat"].includes(this.item.type) ) mergeObject(dt, CONFIG.healingTypes);
    data['damageTypes'] = dt;

    // Item types
    let types = (this.item.type === "equipment") ? "armorTypes" : this.item.type + "Types";
    data[types] = CONFIG[types];

    // Tool-specific data
    if ( this.item.type === "tool" ) {
      data["proficiencies"] = CONFIG.proficiencyLevels;
    }
    return data;
  }

  /* -------------------------------------------- */

  _formatSpellComponents(data) {
    let comps = data.components.value.split(",").map(c => CONFIG.spellComponents[c.trim()] || c.trim());
    if ( data.materials.value ) comps.push(data.materials.value);
    return comps;
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

// Activate global listeners
Hooks.on('renderChatLog', (log, html, data) => Item5e.chatListeners(html));

// Override CONFIG
CONFIG.Item.sheetClass = ItemSheet5e;
