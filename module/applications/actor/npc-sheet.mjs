import ActorSheet5e from "./base-sheet.mjs";
import ActorTypeConfig from "./type-config.mjs";

/**
 * An Actor sheet for NPC type characters.
 */
export default class ActorSheet5eNPC extends ActorSheet5e {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "npc"],
      width: 600
    });
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = await super.getData(options);

    // Challenge Rating
    const cr = parseFloat(context.system.details.cr ?? 0);
    const crLabels = {0: "0", 0.125: "1/8", 0.25: "1/4", 0.5: "1/2"};

    // Class Spellcasting
    context.classSpellcasting = Object.values(this.actor.classes).some(c => c.spellcasting?.levels);

    return foundry.utils.mergeObject(context, {
      labels: {
        cr: cr >= 1 ? String(cr) : crLabels[cr] ?? 1,
        type: context.system.details.type.label,
        armorType: this.getArmorLabel()
      }
    });
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareItems(context) {

    // Categorize Items as Features and Spells
    const features = {
      weapons: { label: game.i18n.localize("DND5E.AttackPl"), items: [], hasActions: true,
        dataset: {type: "weapon", "weapon-type": "natural"} },
      actions: { label: game.i18n.localize("DND5E.ActionPl"), items: [], hasActions: true,
        dataset: {type: "feat", "activation.type": "action"} },
      passive: { label: game.i18n.localize("DND5E.Features"), items: [], dataset: {type: "feat"} },
      equipment: { label: game.i18n.localize("DND5E.Inventory"), items: [], dataset: {type: "loot"}}
    };

    // Start by classifying items into groups for rendering
    const maxLevelDelta = CONFIG.DND5E.maxLevel - (this.actor.system.details.level ?? 0);
    let [spells, other] = context.items.reduce((arr, item) => {
      const {quantity, uses, target} = item.system;
      const ctx = context.itemContext[item.id] ??= {};
      ctx.isStack = Number.isNumeric(quantity) && (quantity !== 1);
      ctx.isExpanded = this._expanded.has(item.id);
      ctx.hasUses = uses && (uses.max > 0);
      ctx.hasTarget = !!target && !(["none", ""].includes(target.type));
      ctx.canToggle = false;
      // Item grouping
      ctx.group = item.system.activation?.type || "passive";
      ctx.ungroup = "feat";
      if ( item.type === "weapon" ) ctx.ungroup = "weapon";
      if ( ctx.group === "passive" ) ctx.ungroup = "passive";
      // Individual item preparation
      this._prepareItem(item, ctx);
      if ( item.type === "class" ) ctx.availableLevels = Array.fromRange(CONFIG.DND5E.maxLevel, 1).map(level => ({
        level, delta: level - item.system.levels, disabled: (level - item.system.levels) > maxLevelDelta
      }));
      if ( item.type === "spell" ) arr[0].push(item);
      else arr[1].push(item);
      return arr;
    }, [[], []]);

    // Apply item filters
    spells = this._filterItems(spells, this._filters.spellbook.properties);
    other = this._filterItems(other, this._filters.features.properties);

    // Organize Spellbook
    const spellbook = this._prepareSpellbook(context, spells);

    // Organize Features
    for ( let item of other ) {
      if ( item.type === "weapon" ) features.weapons.items.push(item);
      else if ( ["background", "class", "feat", "race", "subclass"].includes(item.type) ) {
        if ( item.system.activation?.type ) features.actions.items.push(item);
        else features.passive.items.push(item);
      }
      else features.equipment.items.push(item);
    }

    // Assign and return
    context.inventoryFilters = true;
    context.features = Object.values(features);
    context.spellbook = spellbook;
  }

  /* -------------------------------------------- */

  /**
   * Format NPC armor information into a localized string.
   * @returns {string}  Formatted armor label.
   */
  getArmorLabel() {
    const ac = this.actor.system.attributes.ac;
    const label = [];
    if ( ac.calc === "default" ) label.push(this.actor.armor?.name || game.i18n.localize("DND5E.ArmorClassUnarmored"));
    else label.push(game.i18n.localize(CONFIG.DND5E.armorClasses[ac.calc].label));
    if ( this.actor.shield ) label.push(this.actor.shield.name);
    return label.filterJoin(", ");
  }

  /* -------------------------------------------- */

  /**
   * A helper method to establish the displayed preparation state for an item.
   * @param {Item5e} item     Item being prepared for display.
   * @param {object} context  Context data for display.
   * @protected
   */
  _prepareItem(item, context) {}

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    if ( !this.isEditable ) return;
    html.find(".rollable[data-action]").click(this._onSheetAction.bind(this));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onConfigMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    if ( (event.currentTarget.dataset.action === "type") && (this.actor.system.details.race?.id) ) {
      new ActorTypeConfig(this.actor.system.details.race, { keyPath: "system.type" }).render(true);
    }
    else return super._onConfigMenu(event);
  }

  /* -------------------------------------------- */

  /**
   * Handle mouse click events for NPC sheet actions.
   * @param {MouseEvent} event  The originating click event.
   * @returns {Promise|void}
   * @private
   */
  _onSheetAction(event) {
    event.preventDefault();
    const button = event.currentTarget;
    switch ( button.dataset.action ) {
      case "editDescription":
        const { target } = button.closest("[data-target]").dataset;
        const editor = this.editors[target];
        editor.initial = foundry.utils.getProperty(this.actor, target);
        return this.activateEditor(name, {}, editor.initial);

      case "rollDeathSave":
        return this.actor.rollDeathSave({ event });

      case "rollInitiative":
        return this.actor.rollInitiativeDialog({ event });
    }
  }

  /* -------------------------------------------- */
  /*  Object Updates                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {

    // Format NPC Challenge Rating
    const crs = {"1/8": 0.125, "1/4": 0.25, "1/2": 0.5};
    let crv = "system.details.cr";
    let cr = formData[crv];
    cr = crs[cr] || parseFloat(cr);
    if ( cr ) formData[crv] = cr < 1 ? cr : parseInt(cr);

    // Parent ActorSheet update steps
    return super._updateObject(event, formData);
  }
}
