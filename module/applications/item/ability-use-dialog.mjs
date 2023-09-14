/**
 * A specialized Dialog subclass for ability usage.
 *
 * @param {Item5e} item             Item that is being used.
 * @param {object} [dialogData={}]  An object of dialog data which configures how the modal window is rendered.
 * @param {object} [options={}]     Dialog rendering options.
 */
export default class AbilityUseDialog extends Dialog {
  constructor(item, dialogData={}, options={}) {
    super(dialogData, options);
    this.options.classes = ["dnd5e", "dialog"];

    /**
     * Store a reference to the Item document being used
     * @type {Item5e}
     */
    this.item = item;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * A constructor function which displays the Spell Cast Dialog app for a given Actor and Item.
   * Returns a Promise which resolves to the dialog FormData once the workflow has been completed.
   * @param {Item5e} item    Item being used.
   * @param {object} config  The ability use configuration's values.
   * @returns {Promise}      Promise that is resolved when the use dialog is acted upon.
   */
  static async create(item, config) {
    if ( !item.isOwned ) throw new Error("You cannot display an ability usage dialog for an unowned item");
    const isAble = item._getUsageConfig();
    config ??= item._getUsageConfigValues();
    const slotOptions = config.slotLevel ? this._createSpellSlotOptions(item.actor, item.system.level) : [];
    const errors = [];

    // Create a warning that a spell has no available spell slots.
    const canCast = slotOptions.length && slotOptions.some(l => l.hasSlots);
    if ( isAble.consumeSlot && !canCast ) errors.push(game.i18n.format("DND5E.SpellCastNoSlots", {
      level: CONFIG.DND5E.spellLevels[item.system.level],
      name: item.name
    }));

    const data = {
      item,
      ...isAble,
      config,
      slotOptions,
      note: this._getAbilityUseNote(item, config),
      title: game.i18n.format("DND5E.AbilityUseHint", {
        type: game.i18n.localize(CONFIG.Item.typeLabels[item.type]),
        name: item.name
      })
    };
    this._getAbilityUseWarnings(data);

    // Render the ability usage template
    const html = await renderTemplate("systems/dnd5e/templates/apps/ability-use.hbs", data);

    // Create the Dialog and return data as a Promise
    const isSpell = item.type === "spell";
    const label = game.i18n.localize(`DND5E.AbilityUse${isSpell ? "Cast" : "Use"}`);
    return new Promise(resolve => {
      const dlg = new this(item, {
        title: `${item.name}: ${game.i18n.localize("DND5E.AbilityUseConfig")}`,
        content: html,
        buttons: {
          use: {
            icon: `<i class="fas ${isSpell ? "fa-magic" : "fa-fist-raised"}"></i>`,
            label: label,
            callback: html => {
              const fd = new FormDataExtended(html[0].querySelector("form"));
              resolve(fd.object);
            }
          }
        },
        default: "use",
        close: () => resolve(null)
      });
      dlg.render(true);
    });
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Create an array of spell slot options for a select.
   * @param {Actor5e} actor  The actor with spell slots.
   * @param {number} level   The minimum level.
   * @returns {object[]}     Array of spell slot select options.
   * @private
   */
  static _createSpellSlotOptions(actor, level) {
    // Determine the levels which are feasible
    let lmax = 0;
    const options = Array.fromRange(Object.keys(CONFIG.DND5E.spellLevels).length).reduce((arr, i) => {
      if ( i < level ) return arr;
      const label = CONFIG.DND5E.spellLevels[i];
      const l = actor.system.spells[`spell${i}`] || {max: 0, override: null};
      let max = parseInt(l.override || l.max || 0);
      let slots = Math.clamped(parseInt(l.value || 0), 0, max);
      if ( max > 0 ) lmax = i;
      arr.push({
        idx: i,
        level: `spell${i}`,
        label: i > 0 ? game.i18n.format("DND5E.SpellLevelSlot", {level: label, n: slots}) : label,
        canCast: max > 0,
        hasSlots: slots > 0
      });
      return arr;
    }, []).filter(sl => sl.idx <= lmax);

    // If this character has pact slots, present them as well.
    const pact = actor.system.spells.pact;
    if ( pact.level >= level ) {
      options.push({
        level: "pact",
        label: `${game.i18n.format("DND5E.SpellLevelPact", {level: pact.level, n: pact.value})}`,
        canCast: true,
        hasSlots: pact.value > 0
      });
    }

    return options;
  }

  /* -------------------------------------------- */

  /**
   * Get the ability usage note that is displayed.
   * @param {object} item    Data for the item being used.
   * @returns {string}       The note to display.
   * @private
   */
  static _getAbilityUseNote(item) {
    const {quantity, recharge, uses} = item.system;
    const isAble = item._getUsageConfig();

    // Zero quantity
    if ( quantity <= 0 ) return game.i18n.localize("DND5E.AbilityUseUnavailableHint");

    // Abilities which use Recharge
    if ( isAble.consumeUsage && recharge?.value ) {
      return game.i18n.format(recharge.charged ? "DND5E.AbilityUseChargedHint" : "DND5E.AbilityUseRechargeHint", {
        type: game.i18n.localize(CONFIG.Item.typeLabels[item.type])
      });
    }

    // Does not use any resource
    if ( !uses?.per || !uses?.max ) return "";

    // Consumables
    if ( uses.autoDestroy ) {
      let str = "DND5E.AbilityUseNormalHint";
      if ( uses.value > 1 ) str = "DND5E.AbilityUseConsumableChargeHint";
      else if ( quantity > 1 ) str = "DND5E.AbilityUseConsumableQuantityHint";
      return game.i18n.format(str, {
        type: game.i18n.localize(`DND5E.Consumable${item.system.consumableType.capitalize()}`),
        value: uses.value,
        quantity: quantity,
        max: uses.max,
        per: CONFIG.DND5E.limitedUsePeriods[uses.per]
      });
    }

    // Other Items
    else {
      return game.i18n.format("DND5E.AbilityUseNormalHint", {
        type: game.i18n.localize(CONFIG.Item.typeLabels[item.type]),
        value: uses.value,
        max: uses.max,
        per: CONFIG.DND5E.limitedUsePeriods[uses.per]
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the ability usage warnings to display.
   * @param {object} data    Template data for the AbilityUseDialog. **will be mutated**
   * @returns {string[]}     The warnings to display.
   * @private
   */
  static _getAbilityUseWarnings(data) {
    const warnings = [];
    const item = data.item;
    const { quantity, level } = data.item.system;
    const scale = item.usageScaling;

    if ( (scale === "slot") && data.slotOptions.every(o => !o.hasSlots) ) {
      // Warn that the actor has no spell slots of any level with which to use this item.
      warnings.push(game.i18n.format("DND5E.SpellCastNoSlotsLeft", {
        name: item.name
      }));
    } else if ( (scale === "slot") && !data.slotOptions.some(o => (o.level === level) && o.hasSlots) ) {
      // Warn that the actor has no spell slots of this particular level with which to use this item.
      warnings.push(game.i18n.format("DND5E.SpellCastNoSlots", {
        level: CONFIG.DND5E.spellLevels[level],
        name: item.name
      }));
    }

    // Display warnings that the item or its resource item will be destroyed.
    if ( item.type === "consumable" ) {
      const type = game.i18n.localize(`DND5E.Consumable${item.system.consumableType.capitalize()}`)
      if ( this._willDestroyItem(item) && (is.quantity === 1) ) {
        warnings.push(game.i18n.format("DND5E.AbilityUseConsumableDestroyHint", {type}));
      }

      const consume = item.system.consume;
      const resource = item.actor.items.get(consume.target);
      const qty = consume.amount || 1;
      if ( resource && (resource.system.quantity === 1) && this._willDestroyItem(resource, qty) ) {
        warnings.push(game.i18n.format("DND5E.AbilityUseConsumableDestroyResourceHint", {type, name: resource.name}));
      }
    }

    data.warnings = warnings;
  }

  /* -------------------------------------------- */

  /**
   * Get whether an update for an item's limited uses will result in lowering its quantity.
   * @param {Item5e} item       The item targeted for updates.
   * @param {number} [consume]    The amount of limited uses to subtract.
   * @returns {boolean}
   * @private
   */
  static _willDestroyItem(item, consume=1){
    const hasUses = item.hasLimitedUses;
    const uses = item.system.uses;
    if ( !hasUses || !uses.autoDestroy ) return false;
    const value = uses.value - consume;
    return value <= 0;
  }
}
