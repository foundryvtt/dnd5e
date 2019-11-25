import { ActorSheet5e } from "./base.js";


/**
 * An Actor sheet for player character type actors in the D&D5E system.
 * Extends the base ActorSheet5e class.
 * @type {ActorSheet5e}
 */
export class ActorSheet5eCharacter extends ActorSheet5e {

  /**
   * Define default rendering options for the NPC sheet
   * @return {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "character"],
      width: 672,
      height: 736
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
    if ( !game.user.isGM && this.actor.limited ) return "systems/dnd5e/templates/actors/limited-sheet.html";
    return "systems/dnd5e/templates/actors/character-sheet.html";
  }

  /* -------------------------------------------- */

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    const sheetData = super.getData();

    // Temporary HP
    let hp = sheetData.data.attributes.hp;
    if (hp.temp === 0) delete hp.temp;
    if (hp.tempmax === 0) delete hp.tempmax;

    // Resources
    sheetData["resources"] = ["primary", "secondary", "tertiary"].reduce((arr, r) => {
      const res = sheetData.data.resources[r] || {};
      res.name = r;
      res.placeholder = game.i18n.localize("DND5E.Resource"+r.titleCase());
      if (res && res.value === 0) delete res.value;
      if (res && res.max === 0) delete res.max;
      return arr.concat([res]);
    }, []);

    // Experience Tracking
    sheetData["disableExperience"] = game.settings.get("dnd5e", "disableExperienceTracking");

    // Return data for rendering
    return sheetData;
  }

  /* -------------------------------------------- */

  /**
   * Organize and classify Owned Items for Character sheets
   * @private
   */
  _prepareItems(data) {

    // Categorize items as inventory, spellbook, features, and classes
    const inventory = {
      weapon: { label: "Weapons", items: [], dataset: {type: "weapon"} },
      equipment: { label: "Equipment", items: [], dataset: {type: "equipment"} },
      consumable: { label: "Consumables", items: [], dataset: {type: "consumable"} },
      tool: { label: "Tools", items: [], dataset: {type: "tool"} },
      backpack: { label: game.i18n.localize("DND5E.ItemContainerHeader"), items: [], dataset: {type: "backpack"} },
      loot: { label: "Loot", items: [], dataset: {type: "loot"} }
    };

    // Partition items by category
    let [items, spells, feats, classes] = data.items.reduce((arr, item) => {
      item.img = item.img || DEFAULT_TOKEN;
      item.isStack = item.data.quantity ? item.data.quantity > 1 : false;
      item.hasUses = item.data.uses && (item.data.uses.max > 0);
      item.isOnCooldown = item.data.recharge && !!item.data.recharge.value && (item.data.recharge.charged === false);
      const unusable = item.isOnCooldown && (item.data.uses.per && (item.data.uses.value > 0));
      item.isCharged = !unusable;
      if ( item.type === "spell" ) arr[1].push(item);
      else if ( item.type === "feat" ) arr[2].push(item);
      else if ( item.type === "class" ) arr[3].push(item);
      else if ( Object.keys(inventory).includes(item.type ) ) arr[0].push(item);
      return arr;
    }, [[], [], [], []]);

    // Apply active item filters
    items = this._filterItems(items, this._filters.inventory);
    spells = this._filterItems(spells, this._filters.spellbook);
    feats = this._filterItems(feats, this._filters.features);

    // Organize Spellbook
    const spellbook = this._prepareSpellbook(data, spells);
    const nPrepared = spells.filter(s => {
      return (s.data.level > 0) && (s.data.preparation.mode === "prepared") && s.data.preparation.prepared;
    }).length;

    // Organize Inventory
    let totalWeight = 0;
    for ( let i of items ) {
      i.data.quantity = i.data.quantity || 0;
      i.data.weight = i.data.weight || 0;
      i.totalWeight = Math.round(i.data.quantity * i.data.weight * 10) / 10;
      inventory[i.type].items.push(i);
      totalWeight += i.totalWeight;
    }
    data.data.attributes.encumbrance = this._computeEncumbrance(totalWeight, data);

    // Organize Features
    const features = {
      classes: { label: "Class Levels", items: [], hasActions: false, dataset: {type: "class"}, isClass: true },
      active: { label: "Active", items: [], hasActions: true, dataset: {type: "feat", "activation.type": "action"} },
      passive: { label: "Passive", items: [], hasActions: false, dataset: {type: "feat"} }
    };
    for ( let f of feats ) {
      if ( f.data.activation.type ) features.active.items.push(f);
      else features.passive.items.push(f);
    }
    classes.sort((a, b) => b.levels - a.levels);
    features.classes.items = classes;

    // Assign and return
    data.inventory = Object.values(inventory);
    data.spellbook = spellbook;
    data.preparedSpells = nPrepared;
    data.features = Object.values(features);
  }

  /* -------------------------------------------- */

  /**
   * Compute the level and percentage of encumbrance for an Actor.
   *
   * Optionally include the weight of carried currency across all denominations by applying the standard rule
   * from the PHB pg. 143
   *
   * @param {Number} totalWeight    The cumulative item weight from inventory items
   * @param {Object} actorData      The data object for the Actor being rendered
   * @return {Object}               An object describing the character's encumbrance level
   * @private
   */
  _computeEncumbrance(totalWeight, actorData) {

    // Encumbrance classes
    let mod = {
      tiny: 0.5,
      sm: 1,
      med: 1,
      lg: 2,
      huge: 4,
      grg: 8
    }[actorData.data.traits.size] || 1;

    // Apply Powerful Build feat
    if ( this.actor.getFlag("dnd5e", "powerfulBuild") ) mod = Math.min(mod * 2, 8);

    // Add Currency Weight
    if ( game.settings.get("dnd5e", "currencyWeight") ) {
      const currency = actorData.data.currency;
      const numCoins = Object.values(currency).reduce((val, denom) => val += denom, 0);
      totalWeight += numCoins / 50;
    }

    // Compute Encumbrance percentage
    const enc = {
      max: actorData.data.abilities.str.value * 15 * mod,
      value: Math.round(totalWeight * 10) / 10,
    };
    enc.pct = Math.min(enc.value * 100 / enc.max, 99);
    enc.encumbered = enc.pct > (2/3);
    return enc;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers
  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html);
    if ( !this.options.editable ) return;

    // Inventory Functions
    html.find(".currency-convert").click(this._onConvertCurrency.bind(this));

    // Spell Preparation
    html.find('.toggle-prepared').click(this._onPrepareItem.bind(this));

    // Short and Long Rest
    html.find('.short-rest').click(this._onShortRest.bind(this));
    html.find('.long-rest').click(this._onLongRest.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the prepared status of an Owned Item within the Actor
   * @param {Event} event   The triggering click event
   * @private
   */
  _onPrepareItem(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.getOwnedItem(itemId);
    return item.update({"data.preparation.prepared": !item.data.data.preparation.prepared});
  }

  /* -------------------------------------------- */

  /**
   * Take a short rest, calling the relevant function on the Actor instance
   * @param {Event} event   The triggering click event
   * @private
   */
  async _onShortRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.shortRest();
  }

  /* -------------------------------------------- */

  /**
   * Take a long rest, calling the relevant function on the Actor instance
   * @param {Event} event   The triggering click event
   * @private
   */
  async _onLongRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.longRest();
  }

  /* -------------------------------------------- */

  async _onConvertCurrency(event) {
    event.preventDefault();
    const curr = duplicate(this.actor.data.data.currency);
    console.log(curr);
    const convert = {
      cp: {into: "sp", each: 10},
      sp: {into: "ep", each: 5 },
      ep: {into: "gp", each: 2 },
      gp: {into: "pp", each: 10}
    };
    for ( let [c, t] of Object.entries(convert) ) {
      let change = Math.floor(curr[c] / t.each);
      curr[c] -= (change * t.each);
      curr[t.into] += change;
    }
    return this.actor.update({"data.currency": curr});
  }
}
