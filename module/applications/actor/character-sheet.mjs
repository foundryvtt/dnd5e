import ActorSheet5e from "./base-sheet.mjs";

/**
 * An Actor sheet for player character type actors.
 */
export default class ActorSheet5eCharacter extends ActorSheet5e {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shaper", "sheet", "actor", "character"]
    });
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    const context = await super.getData(options);

    // Resources
    context.stats = ["physO", "menO", "physD", "menD"].reduce((arr, r) => {
      const stat = context.actor.system.stats[r] || {};
      stat.name = r;
      stat.placeholder = game.i18n.localize(`SHAPER.Stat${r.titleCase()}`);
      return arr.concat([stat]);
    }, []);

    return foundry.utils.mergeObject(context, {
      disableExperience: game.settings.get("shaper", "disableExperienceTracking")
    });
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareItems(context) {

    // Categorize items as inventory, features
    const inventory = {
      loot: { label: "SHAPER.ItemTypeLootPl", items: [], dataset: {type: "loot"} }
    };

    // Partition items by category
    let {items, feats} = context.items.reduce((obj, item) => {
      const {quantity, uses, recharge, target} = item.system;

      // Item details
      item.img = item.img || CONST.DEFAULT_TOKEN;
      item.isStack = Number.isNumeric(quantity) && (quantity !== 1);


      // Item usage
      item.hasUses = uses && (uses.max > 0);
      item.isOnCooldown = recharge && !!recharge.value && (recharge.charged === false);
      item.isDepleted = item.isOnCooldown && (uses.per && (uses.value > 0));
      item.hasTarget = !!target && !(["none", ""].includes(target.type));

      // Item toggle state
      this._prepareItemToggleState(item);

      // Classify items into types
      if ( item.type === "feat" ) obj.feats.push(item);
      else if ( Object.keys(inventory).includes(item.type) ) obj.items.push(item);
      return obj;
    }, { items: [], feats: [] });

    // Apply active item filters
    items = this._filterItems(items, this._filters.inventory);
    feats = this._filterItems(feats, this._filters.features);

    // Organize items
    for ( let i of items ) {
      i.system.quantity = i.system.quantity || 0;
      inventory[i.type].items.push(i);
    }


    // Organize Features
    const features = {
      active: {
        label: "SHAPER.FeatureActive", items: [],
        hasActions: true, dataset: {type: "feat", "activation.type": "action"} },
      passive: {
        label: "SHAPER.FeaturePassive", items: [],
        hasActions: false, dataset: {type: "feat"} }
    };
    for ( const feat of feats ) {     
      if ( feat.system.activation?.type ) features.active.items.push(feat);
      else features.passive.items.push(feat);
    }

    // Assign and return
    context.inventory = Object.values(inventory);
    context.features = Object.values(features);
  }

  /* -------------------------------------------- */

  /**
   * A helper method to establish the displayed preparation state for an item.
   * @param {Item5e} item  Item being prepared for display. *Will be mutated.*
   * @private
   */
  _prepareItemToggleState(item) {
    const isActive = !!item.system.equipped;
    item.toggleClass = isActive ? "active" : "";
    item.toggleTitle = game.i18n.localize(isActive ? "SHAPER.Equipped" : "SHAPER.Unequipped");
  }

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

  /**
   * Handle mouse click events for character sheet actions.
   * @param {MouseEvent} event  The originating click event.
   * @returns {Promise}         Dialog or roll result.
   * @private
   */
  _onSheetAction(event) {
    event.preventDefault();
    const button = event.currentTarget;
    switch ( button.dataset.action ) {
      case "rollInitiative":
        return this.actor.rollInitiative({createCombatants: true});
    }
  }
}
