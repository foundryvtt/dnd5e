export default class AbilityUseDialog extends FormApplication {
  /** @override */
  constructor(item, config = {}, options = {}, fn) {
    super(item);
    this.item = item;
    this.actor = item.actor;
    this.config = config;
    this.usageOptions = options;
    this.fn = fn;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "dialog", "ability-use"],
      template: "systems/dnd5e/templates/apps/ability-use.hbs",
      closeOnSubmit: false,
      width: 400,
      height: "auto"
    });

  }

  /** @override */
  get title() {
    return `${this.item.name}: ${game.i18n.localize("DND5E.AbilityUseConfig")}`;
  }

  /** @override */
  get id() {
    return `item-usage-flow-${this.item.uuid.replaceAll(".", "-")}`;
  }

  /** @override */
  async getData() {
    const data = {
      title: game.i18n.format("DND5E.AbilityUseHint", {
        type: game.i18n.localize(CONFIG.Item.typeLabels[this.item.type]),
        name: this.item.name
      }),
      icon: (this.item.type === "spell") ? "fa-magic" : "fa-fist-raised",
      label: `DND5E.AbilityUse${(this.item.type === "spell") ? "Cast" : "Use"}`,

      methods: this.item._getUsageMethods(),
      config: this.config,
      spellLevels: this.#populateSlotOptions()
    };
    const upd = this.constructor.getWarningsAndUpdates(this.item, this.config, this.usageOptions);

    // Warn about zero spell slots of any level.
    upd.warnings.noSlots = this.config.consumeSlot && !data.spellLevels.some(l => l.hasSlots);

    data.warnings = this.constructor.localizeWarnings(this.item, upd.warnings);
    data.disabled = data.warnings.size > 0;
    data.notes = this.getAbilityUseNotes(upd);
    return data;
  }

  /**
   * Format the notes to display on the application, depending on the updates to be performed.
   * @param {object} actor              Updates to perform on the actor.
   * @param {object} item               Updates to perform on the item.
   * @param {object[]} resources        Updates to perform on the actor's owned items.
   * @param {Set<string>} deleteIds     Ids of items that are to be deleted.
   * @returns {string[]}
   */
  getAbilityUseNotes({actor, item, resources, deleteIds}) {
    const notes = [];

    /**
     * A hook event that fires before an item's usage notes are formatted.
     * @function dnd5e.preItemUsageNotes
     * @memberof hookEvents
     * @param {Item5e} item         Item being used.
     * @param {string[]} notes      Notes to display.
     * @returns {boolean}           Explicitly return `false` to prevent default notes.
     */
    if (Hooks.call("dnd5e.preItemUsageNotes", this.item, notes) === false) return notes;

    for (const id of deleteIds) {
      const item = this.actor.items.get(id);
      if (item) notes.push(game.i18n.format("DND5E.AbilityUseConsumeDestroy", {name: item.name}));
    }

    // Consumes quantity, uses, or recharge.
    for (const r of [item, ...resources]) {
      const item = this.actor.items.get(r._id) ?? this.item;
      const qty = r["system.quantity"];
      const uses = r["system.uses.value"];
      const charge = r["system.recharge.charged"];

      if (Number.isNumeric(uses)) {
        notes.push(game.i18n.format(`DND5E.AbilityUseConsumeUsage${uses !== 1 ? "Pl" : ""}`, {
          name: item.name,
          amount: uses
        }));
      } else if (charge === false) {
        notes.push(game.i18n.format("DND5E.AbilityUseConsumeCharge", {name: item.name}));
      } else if (Number.isNumeric(qty)) {
        notes.push(game.i18n.format("DND5E.AbilityUseConsumeQuantity", {
          amount: qty,
          name: item.name
        }));
      }
    }

    const regSpell = new RegExp(/system\.spells\.([a-z1-9]+)\.value/);
    const regResource = new RegExp(/system\.resources\.([a-z]+)\.value/);
    for (const key in actor) {
      const matchSpell = key.match(regSpell);
      const matchResource = key.match(regResource);
      if (matchSpell) {
        // consume spell slot.
        const remaining = game.i18n.format(`DND5E.${matchSpell[1] === "pact" ? "Pact" : "Spell"}Slot${actor[key] !== 1 ? "Pl" : ""}`, {
          level: matchSpell[1] === "pact" ? this.actor.system.spells.pact.level : CONFIG.DND5E.spellLevels[matchSpell[1].at(-1)]
        });
        notes.push(game.i18n.format("DND5E.AbilityUseConsumeSlot", {amount: actor[key], level: remaining}));
      } else if (matchResource) {
        const label = this.actor.system.resources[matchResource[1]].label || game.i18n.localize(`DND5E.Resource${matchResource[1].capitalize()}`);
        notes.push(game.i18n.format("DND5E.AbilityUseConsumeResource", {amount: actor[key], label: label}));
      } else {
        // consume any other attribute.
        notes.push(game.i18n.format("DND5E.AbilityUseConsumePool", {amount: actor[key]}));
      }
    }

    /**
     * A hook event that fires after an item's usage notes are formatted.
     * @function dnd5e.preItemUsageNotes
     * @memberof hookEvents
     * @param {Item5e} item         Item being used.
     * @param {string[]} notes      Notes to display.
     */
    Hooks.callAll("dnd5e.itemUsageNotes", this.item, notes);
    return notes;
  }

  /**
   * Gather a set of warnings to display in the application depending on given parameters.
   * @param {Item5e} item         The item being used.
   * @param {object} warnings     An object of keys for default warnings.
   * @returns {Set<string>}
   */
  static localizeWarnings(item, warnings) {
    const set = new Set();

    /**
     * A hook event that fires before an item's usage warnings are formatted.
     * @function dnd5e.preItemUsageWarnings
     * @memberof hookEvents
     * @param {Item5e} item         Item being used.
     * @param {object} warnings     An object of keys for default warnings.
     * @param {Set<string>} set     The set of formatted warnings.
     * @returns {boolean}           Explicitly return `false` to prevent default warnings.
     */
    if (Hooks.call("dnd5e.preItemUsageWarnings", item, warnings, set) === false) return set;

    // No spell slots of any level.
    if (warnings.noSlots) {
      set.add(game.i18n.format("DND5E.SpellCastNoSlots", {name: item.name}));
    }

    // Missing spell slots of specific level.
    else if (warnings.levelSlotsUnavailable) {
      set.add(game.i18n.format("DND5E.SpellCastNoSlotsOfLevel", {name: item.name}));
    }

    // Recharge is unavailable.
    if (warnings.rechargeUnavailable) {
      set.add(game.i18n.format("DND5E.ItemNoUses", {name: item.name}));
    }

    // Limited uses are unavailable.
    if (warnings.usesUnavailable) {
      set.add(game.i18n.format("DND5E.ItemNoUses", {name: item.name}));
    }

    // Resource is not specified.
    if (warnings.resourceUnset) {
      set.add(game.i18n.format("DND5E.ConsumeWarningNoResource", {
        name: item.name,
        type: CONFIG.DND5E.abilityConsumptionTypes[item.system.consume?.type]
      }));
    }

    // Resource is missing.
    if (warnings.resourceMissing) {
      set.add(game.i18n.format("DND5E.ConsumeWarningNoSource", {
        name: item.name,
        type: CONFIG.DND5E.abilityConsumptionTypes[item.system.consume?.type]
      }));
    }

    // Not enough uses on resource.
    if (warnings.resourceUnavailable) {
      const type = item.system.consume?.type;
      set.add(game.i18n.format(`DND5E.ConsumeWarning${type === "attribute" ? "ZeroAttribute" : "NoQuantity"}`, {
        name: item.name,
        type: CONFIG.DND5E.abilityConsumptionTypes[type]
      }));
    }

    /**
     * A hook event that fires after an item's usage warnings are formatted.
     * @function dnd5e.preItemUsageWarnings
     * @memberof hookEvents
     * @param {Item5e} item         Item being used.
     * @param {object} warnings     An object of keys for default warnings.
     * @param {Set<string>} set     The set of formatted warnings.
     */
    Hooks.callAll("dnd5e.itemUsageWarnings", item, warnings, set);
    return set;
  }

  /**
   * Configure the warnings object and the updates to perform on the item, actor, and resources.
   * @param {Item5e} item                     The item being used.
   * @param {ItemUseConfiguration} config     Configuration data for the item usage being prepared.
   * @param {ItemUseOptions} options          Additional options used for configuring item usage.
   * @returns {object}                        The usage configuration.
   */
  static getWarningsAndUpdates(item, config = {}, options = {}) {
    const methods = item._getUsageMethods();
    const usage = {
      actor: {},
      item: {},
      resources: [],
      deleteIds: new Set(),
      warnings: {}
    };

    /**
     * A hook event that fires before an item's resource consumption and warnings have been calculated.
     * @function dnd5e.preItemUsageCalculation
     * @memberof hookEvents
     * @param {Item5e} item                  Item being used.
     * @param {ItemUseConfiguration} config  Configuration data for the item usage being prepared.
     * @param {ItemUseOptions} options       Additional options used for configuring item usage.
     * @returns {boolean}                    Explicitly return `false` to prevent updates and warnings
     *                                       from being calculated.
     */
    if (Hooks.call("dnd5e.preItemUsageCalculation", item, config, options) === false) {
      usage.config = config;
      return usage;
    }

    if (methods.canConsumeResource && config.consumeResource) this.#updateConsumptionUpdates(item, config, usage);
    if (methods.canConsumeUses && config.consumeUsage) this.#updateItemUpdates(item, config, usage);
    if (methods.canConsumeSlot && config.consumeSlot) this.#updateSpellUpdates(item, config, usage);

    /**
     * A hook event that fires after an item's resource consumption and warnings have been calculated,
     * but before any updates are applied.
     * @function dnd5e.itemUsageCalculation
     * @memberof hookEvents
     * @param {Item5e} item                     Item being used.
     * @param {ItemUseConfiguration} config     Configuration data for the item usage being prepared.
     * @param {ItemUseOptions} options          Additional options used for configuring item usage.
     * @param {object} usage
     * @param {object} usage.actor              Updates that will be applied to the actor.
     * @param {object} usage.item               Updates that will be applied to the item being used.
     * @param {object[]} usage.resources        Updates that will be applied to other items on the actor.
     * @param {Set<string>} usage.deleteIds     Item ids for items that will be fully deleted off the actor.
     * @param {object} usage.warnings           An object of warning flags to trigger if consumption is invalid.
     */
    Hooks.callAll("dnd5e.itemUsageCalculation", item, config, options, usage);
    usage.config = config;
    return usage;
  }

  /**
   * Populate updates and warnings related to consuming an external resource.
   */
  static #updateConsumptionUpdates(item, config, data) {
    const consume = item.system.consume;

    // The targeted item is missing.
    if (!consume.target) {
      data.warnings.resourceUnset = true;
      return;
    }

    // Identify the consumed resource and its current quantity
    let resource = null;
    let amount = Number(consume.amount ?? 1);
    let quantity = 0;
    switch (consume.type) {
      case "attribute":
        resource = foundry.utils.getProperty(item.actor.system, consume.target);
        quantity = resource || 0;
        break;
      case "ammo":
      case "material":
        resource = item.actor.items.get(consume.target);
        quantity = resource ? resource.system.quantity : 0;
        break;
      case "hitDice":
        const denom = !["smallest", "largest"].includes(consume.target) ? consume.target : false;
        resource = Object.values(item.actor.classes).filter(cls => !denom || (cls.system.hitDice === denom));
        quantity = resource.reduce((count, cls) => count + cls.system.levels - cls.system.hitDiceUsed, 0);
        break;
      case "charges":
        resource = item.actor.items.get(consume.target);
        if (!resource) break;
        const uses = resource.system.uses;
        if (uses.per && uses.max) quantity = uses.value;
        else if (resource.system.recharge?.value) {
          quantity = resource.system.recharge.charged ? 1 : 0;
          amount = 1;
        }
        break;
    }

    // Verify that a consumed resource is available
    if (resource === undefined) {
      data.warnings.resourceMissing = true;
      return;
    }

    // Verify that the required quantity is available
    let remaining = quantity - amount;
    if (remaining < 0) {
      data.warnings.resourceUnavailable = true;
      return;
    }

    // Define updates to provided data objects
    switch (consume.type) {
      case "attribute":
        data.actor[`system.${consume.target}`] = remaining;
        break;
      case "ammo":
      case "material":
        data.resources.push({_id: consume.target, "system.quantity": remaining});
        break;
      case "hitDice":
        if (["smallest", "largest"].includes(consume.target)) resource = resource.sort((lhs, rhs) => {
          let sort = lhs.system.hitDice.localeCompare(rhs.system.hitDice, "en", {numeric: true});
          if (consume.target === "largest") sort *= -1;
          return sort;
        });
        let toConsume = consume.amount;
        for (const cls of resource) {
          const available = (toConsume > 0 ? cls.system.levels : 0) - cls.system.hitDiceUsed;
          const delta = toConsume > 0 ? Math.min(toConsume, available) : Math.max(toConsume, available);
          if (delta !== 0) {
            data.resources.push({_id: cls.id, "system.hitDiceUsed": cls.system.hitDiceUsed + delta});
            toConsume -= delta;
            if (toConsume === 0) break;
          }
        }
        break;
      case "charges":
        let push = true;
        const quantity = resource.system.quantity;
        const uses = resource.system.uses || {};
        const recharge = resource.system.recharge || {};
        const update = {_id: consume.target};
        if (uses.per && uses.max) {

          if (remaining >= 1) {
            update["system.uses.value"] = remaining;
          } else if (uses.autoDestroy) {
            if (quantity === 1) {
              data.deleteIds.add(resource.id);
              push = false;
            } else {
              update["system.uses.value"] = uses.max;
              update["system.quantity"] = quantity - 1;
            }
          }

        }
        else if (recharge.value) update["system.recharge.charged"] = false;
        if (push) data.resources.push(update);
        break;
    }
  }

  /**
   * Populate updates and warnings related to consuming the item's own limited uses or recharge.
   */
  static #updateItemUpdates(item, config, data) {
    const {recharge, uses, quantity} = item.system;

    // case 1: consume recharge
    if (!!recharge?.value) {
      if (recharge.charged) data.item["system.recharge.charged"] = false;
      else data.warnings.rechargeUnavailable = true;
      return;
    }

    // case 2: consume limited uses
    if (uses?.per && (uses.max > 0)) {

      if (!uses.value) {
        data.warnings.usesUnavailable = true;
        return;
      }

      const remaining = uses.value - 1;
      if (!uses.autoDestroy || (remaining >= 1)) {
        data.item["system.uses.value"] = remaining;
        return;
      }

      // case 2B: consume quantity instead of uses if the limited use consumption puts it at 0 uses and destroys it.
      if (uses.autoDestroy && (remaining === 0) && (quantity > 1)) {
        // reduce quantity
        data.item["system.quantity"] = Math.max(quantity - 1, 0);
        data.item["system.uses.value"] = uses.max;
      } else if (uses.autoDestroy && (remaining === 0) && quantity === 1) {
        // delete item (qty 0)
        data.deleteIds.add(item.id);
        data.item = {};
      }
    }
  }

  /**
   * Populate the updates and warnings related to consuming a spell slot with a leveled spell.
   */
  static #updateSpellUpdates(item, config, data) {
    const slot = config.currentSlot;
    const spells = Number(item.actor.system.spells[slot]?.value ?? 0);
    if (!spells) {
      data.warnings.levelSlotsUnavailable = true;
      return;
    }
    data.actor[`system.spells.${slot}.value`] = Math.max(spells - 1, 0);
  }

  /**
   * Get spell slot options.
   * @returns {object[]}
   */
  #populateSlotOptions() {
    if (this.item.type !== "spell") return [];

    const is = this.item.system;
    const as = this.item.actor.system;

    // Determine the levels which are feasible
    let lmax = 0;
    const spellLevels = Array.fromRange(Object.keys(CONFIG.DND5E.spellLevels).length).reduce((arr, i) => {
      if (i < is.level) return arr;
      const label = CONFIG.DND5E.spellLevels[i];
      const l = as.spells[`spell${i}`] || {max: 0, override: null};
      let max = parseInt(l.override || l.max || 0);
      let slots = Math.clamped(parseInt(l.value || 0), 0, max);
      if (max > 0) lmax = i;
      arr.push({
        level: `spell${i}`,
        label: i > 0 ? game.i18n.format("DND5E.SpellLevelSlot", {level: label, n: slots}) : label,
        canCast: max > 0,
        hasSlots: slots > 0,
        idx: i
      });
      return arr;
    }, []).filter(sl => sl.idx <= lmax);

    // If this character has pact slots, present them as an option for casting the spell.
    const pact = as.spells.pact;
    if (pact.level >= is.level) {
      spellLevels.push({
        level: "pact",
        label: `${game.i18n.format("DND5E.SpellLevelPact", {level: pact.level, n: pact.value})}`,
        canCast: true,
        hasSlots: pact.value > 0
      });
    }
    return spellLevels;
  }

  /** @override */
  async _onChangeInput(event) {
    await super._onChangeInput(event);
    foundry.utils.mergeObject(this.config, new FormDataExtended(this.form).object);
    this.render();
    return this.config;
  }

  /** @override */
  async _updateObject(event, formData) {
    const data = this.constructor.getWarningsAndUpdates(this.item, formData, this.usageOptions);
    this.fn(data);
    this.close();
  }

  /** @override */
  close(...args) {
    this.fn(null);
    return super.close(...args);
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * A constructor function which displays the Spell Cast Dialog app for a given Actor and Item.
   * Returns a Promise which resolves to the dialog FormData once the workflow has been completed.
   * @param {Item5e} item                     Item being used.
   * @param {ItemUseConfiguration} config     Configuration data for the item usage being prepared.
   * @param {ItemUseOptions} options          Additional options used for configuring item usage.
   * @returns {Promise}                       Promise that is resolved when the use dialog is acted upon.
   */
  static async create(item, config = {}, options = {}) {
    if (!item.isOwned) throw new Error("You cannot display an ability usage dialog for an unowned item");
    return new Promise(resolve => new this(item, config, options, resolve).render(true));
  }
}
