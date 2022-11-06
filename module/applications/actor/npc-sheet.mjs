import ActorSheet5e from "./base-sheet.mjs";

/**
 * An Actor sheet for NPC type characters.
 */
export default class ActorSheet5eNPC extends ActorSheet5e {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shaper", "sheet", "actor", "npc"],
      width: 600
    });
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = await super.getData(options);
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareItems(context) {

    // Categorize Items as Features
    const features = {
      weapons: { label: game.i18n.localize("SHAPER.AttackPl"), items: [], hasActions: true,
        dataset: {type: "weapon", "weapon-type": "natural"} },
      actions: { label: game.i18n.localize("SHAPER.ActionPl"), items: [], hasActions: true,
        dataset: {type: "feat", "activation.type": "action"} },
      passive: { label: game.i18n.localize("SHAPER.Features"), items: [], dataset: {type: "feat"} },
      equipment: { label: game.i18n.localize("SHAPER.Inventory"), items: [], dataset: {type: "loot"}}
    };

    // Start by classifying items into groups for rendering
    let [spells, other] = context.items.reduce((arr, item) => {
      const {quantity, uses, recharge, target} = item.system;
      item.img = item.img || CONST.DEFAULT_TOKEN;
      item.isStack = Number.isNumeric(quantity) && (quantity !== 1);
      item.hasUses = uses && (uses.max > 0);
      item.isOnCooldown = recharge && !!recharge.value && (recharge.charged === false);
      item.isDepleted = item.isOnCooldown && (uses.per && (uses.value > 0));
      item.hasTarget = !!target && !(["none", ""].includes(target.type));
      if ( item.type === "spell" ) arr[0].push(item);
      else arr[1].push(item);
      return arr;
    }, [[], []]);

    // Apply item filters
    other = this._filterItems(other, this._filters.features);

    // Organize Features
    for ( let item of other ) {
      if ( item.type === "weapon" ) features.weapons.items.push(item);
      else if ( item.type === "feat" ) {
        if ( item.system.activation.type ) features.actions.items.push(item);
        else features.passive.items.push(item);
      }
      else features.equipment.items.push(item);
    }

    // Assign and return
    context.features = Object.values(features);
  }


  /* -------------------------------------------- */
  /*  Object Updates                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {


    // Parent ActorSheet update steps
    return super._updateObject(event, formData);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".health .rollable").click(this._onRollHPFormula.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling NPC health values using the provided formula.
   * @param {Event} event  The original click event.
   * @private
   */
  _onRollHPFormula(event) {
    event.preventDefault();
    const formula = this.actor.system.attributes.hp.formula;
    if ( !formula ) return;
    const hp = new Roll(formula).roll({async: false}).total;
    AudioHelper.play({src: CONFIG.sounds.dice});
    this.actor.update({"system.attributes.hp.value": hp, "system.attributes.hp.max": hp});
  }
}
