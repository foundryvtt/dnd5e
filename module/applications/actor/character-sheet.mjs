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
    context.resources = ["primary", "secondary", "tertiary"].reduce((arr, r) => {
      const res = context.actor.system.resources[r] || {};
      res.name = r;
      res.placeholder = game.i18n.localize(`SHAPER.Resource${r.titleCase()}`);
      if (res && res.value === 0) delete res.value;
      if (res && res.max === 0) delete res.max;
      return arr.concat([res]);
    }, []);

    return foundry.utils.mergeObject(context, {
      disableExperience: game.settings.get("shaper", "disableExperienceTracking"),
      weightUnit: game.i18n.localize(`SHAPER.Abbreviation${
        game.settings.get("shaper", "metricWeightUnits") ? "Kgs" : "Lbs"}`)
    });
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareItems(context) {

    // Categorize items as inventory, features, and classes
    const inventory = {
      weapon: { label: "SHAPER.ItemTypeWeaponPl", items: [], dataset: {type: "weapon"} },
      equipment: { label: "SHAPER.ItemTypeEquipmentPl", items: [], dataset: {type: "equipment"} },
      consumable: { label: "SHAPER.ItemTypeConsumablePl", items: [], dataset: {type: "consumable"} },
      tool: { label: "SHAPER.ItemTypeToolPl", items: [], dataset: {type: "tool"} },
      backpack: { label: "SHAPER.ItemTypeContainerPl", items: [], dataset: {type: "backpack"} },
      loot: { label: "SHAPER.ItemTypeLootPl", items: [], dataset: {type: "loot"} }
    };

    // Partition items by category
    let {items, feats, backgrounds} = context.items.reduce((obj, item) => {
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
      else if ( item.type === "background" ) obj.backgrounds.push(item);
      else if ( Object.keys(inventory).includes(item.type) ) obj.items.push(item);
      return obj;
    }, { items: [], feats: [], backgrounds: [] });

    // Apply active item filters
    items = this._filterItems(items, this._filters.inventory);
    feats = this._filterItems(feats, this._filters.features);

    // Organize items
    for ( let i of items ) {
      i.system.quantity = i.system.quantity || 0;
      i.system.weight = i.system.weight || 0;
      i.totalWeight = (i.system.quantity * i.system.weight).toNearest(0.1);
      inventory[i.type].items.push(i);
    }

    const maxLevelDelta = CONFIG.SHAPER.maxLevel - this.actor.system.details.level;


    // Organize Features
    const features = {
      background: {
        label: "SHAPER.ItemTypeBackground", items: backgrounds,
        hasActions: false, dataset: {type: "background"} },
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
    context.labels.background = backgrounds[0]?.name;
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
    html.find(".level-selector").change(this._onLevelChange.bind(this));
    html.find(".item-toggle").click(this._onToggleItem.bind(this));
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
      case "convertCurrency":
        return Dialog.confirm({
          title: `${game.i18n.localize("SHAPER.CurrencyConvert")}`,
          content: `<p>${game.i18n.localize("SHAPER.CurrencyConvertHint")}</p>`,
          yes: () => this.actor.convertCurrency()
        });
      case "rollDeathSave":
        return this.actor.rollDeathSave({event: event});
      case "rollInitiative":
        return this.actor.rollInitiative({createCombatants: true});
    }
  }

  /* -------------------------------------------- */

  /**
   * Respond to a new level being selected from the level selector.
   * @param {Event} event                           The originating change.
   * @returns {Promise<Item5e>}  updated class item.
   * @private
   */
  async _onLevelChange(event) {
    event.preventDefault();
    const delta = Number(event.target.value);
    const classId = event.target.closest(".item")?.dataset.itemId;
    if ( !delta || !classId ) return;
    const classItem = this.actor.items.get(classId);
    return classItem.update({"system.levels": classItem.system.levels + delta});
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the state of an Owned Item within the Actor.
   * @param {Event} event        The triggering click event.
   * @returns {Promise<Item5e>}  Item with the updates applied.
   * @private
   */
  _onToggleItem(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    return item.update({[attr]: !foundry.utils.getProperty(item, attr)});
  }


  /* -------------------------------------------- */

  /** @override */
  async _onDropSingleItem(itemData) {

    // Increment the number of class levels a character instead of creating a new item
    if ( itemData.type === "class" ) {
      const charLevel = this.actor.system.details.level;
      itemData.system.levels = Math.min(itemData.system.levels, CONFIG.SHAPER.maxLevel - charLevel);
      if ( itemData.system.levels <= 0 ) {
        const err = game.i18n.format("SHAPER.MaxCharacterLevelExceededWarn", { max: CONFIG.SHAPER.maxLevel });
        ui.notifications.error(err);
        return false;
      }

      const cls = this.actor.itemTypes.class.find(c => c.identifier === itemData.system.identifier);
      if ( cls ) {
        const priorLevel = cls.system.levels;
        cls.update({"system.levels": priorLevel + itemData.system.levels});
        return false;
      }
    }


    return super._onDropSingleItem(itemData);
  }
}
