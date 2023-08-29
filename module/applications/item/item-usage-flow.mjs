export default class ItemUsageFlow extends FormApplication {
  constructor(item, config = {}, options = {}, fn) {
    super(item, options);
    this.item = item;
    this.actor = item.actor;
    this.config = foundry.utils.deepClone(config);
    this.fn = fn;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "dialog", "item-usage-flow"],
      template: "systems/dnd5e/templates/apps/item-usage-flow.hbs",
      submitOnChange: false,
      closeOnSubmit: false
    });

  }

  async getData() {
    this.itemUpdates = {};
    this.actorUpdates = {};
    this.resourceUpdates = [];
    this.deleteUpdates = new Set();
    this.notes = [];
    this.warnings = [];

    this.config = foundry.utils.mergeObject({
      createMeasuredTemplate: true,
      consumeUsage: true,
      consumeResource: true,
      consumeSpellSlot: true,
      currentSlotLevel: null
    }, this.config);

    const data = {
      title: game.i18n.format("DND5E.AbilityUseHint", {
        type: game.i18n.localize(CONFIG.Item.typeLabels[this.item.type]),
        name: this.item.name
      }),
      item: this.item,
      actor: this.actor,
      spellLevels: this.#getSpellData(),

      itemUpdates: this.itemUpdates,
      actorUpdates: this.actorUpdates,
      resourceUpdates: this.resourceUpdates,

      canCreateTemplate: game.user.can("TEMPLATE_CREATE") && this.item.hasAreaTarget,
      canConsumeUses: this.#updateItemUpdates() === true,
      canConsumeResource: this.#updateConsumptionUpdates() === true,
      canConsumeSlot: this.#updateSpellUpdates() === true,
      ...this.config,

      notes: this.notes,
      warnings: this.warnings
    };

    console.warn("------------------------------------------------");
    console.warn("ITEM UPDATES:", this.itemUpdates);
    console.warn("ACTOR UPDATES:", this.actorUpdates);
    console.warn("OTHER ITEMS:", this.resourceUpdates);
    console.warn("ITEMS TO BE DELETED:", this.deleteUpdates);
    console.warn("------------------------------------------------");

    data.icon = (this.item.type === "spell") ? "fa-magic" : "fa-fist-raised";

    return data;
  }

  // update consumption thingies and return true if can consume.
  #updateConsumptionUpdates() {
    const consume = this.item.system.consume || {};
    if (!consume.type) return false;

    // No consumed target
    const typeLabel = CONFIG.DND5E.abilityConsumptionTypes[consume.type];
    if (!consume.target) {
      this.warnings.push(game.i18n.format("DND5E.ConsumeWarningNoResource", {name: this.item.name, type: typeLabel}));
      return false;
    }

    // Identify the consumed resource and its current quantity
    let resource = null;
    let amount = Number(consume.amount ?? 1);
    let quantity = 0;
    switch (consume.type) {
      case "attribute":
        resource = foundry.utils.getProperty(this.actor.system, consume.target);
        quantity = resource || 0;
        break;
      case "ammo":
      case "material":
        resource = this.actor.items.get(consume.target);
        quantity = resource ? resource.system.quantity : 0;
        break;
      case "hitDice":
        const denom = !["smallest", "largest"].includes(consume.target) ? consume.target : false;
        resource = Object.values(this.actor.classes).filter(cls => !denom || (cls.system.hitDice === denom));
        quantity = resource.reduce((count, cls) => count + cls.system.levels - cls.system.hitDiceUsed, 0);
        break;
      case "charges":
        resource = this.actor.items.get(consume.target);
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
      this.warnings.push(game.i18n.format("DND5E.ConsumeWarningNoSource", {name: this.item.name, type: typeLabel}));
      return false;
    }

    // Verify that the required quantity is available
    let remaining = quantity - amount;
    if ((remaining < 0) && this.config.consumeResource) {
      this.warnings.push(game.i18n.format("DND5E.ConsumeWarningNoQuantity", {name: this.item.name, type: typeLabel}));
    }

    // Do not create any updates if invalid or toggled off.
    if (!this.config.consumeResource) return true;

    // Define updates to provided data objects
    switch (consume.type) {
      case "attribute":
        this.actorUpdates[`system.${consume.target}`] = remaining;
        break;
      case "ammo":
      case "material":
        this.resourceUpdates.push({_id: consume.target, "system.quantity": remaining});
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
            this.resourceUpdates.push({_id: cls.id, "system.hitDiceUsed": cls.system.hitDiceUsed + delta});
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
              this.deleteUpdates.add(resource.id);
              push = false;
            } else {
              update["system.uses.value"] = uses.max;
              update["system.quantity"] = quantity - 1;
            }
          }

        }
        else if (recharge.value) update["system.recharge.charged"] = false;
        if (push) this.resourceUpdates.push(update);
        break;
    }
    return true;
  }

  // update item's own uses or recharge update, return true if can consume uses/recharge.
  #updateItemUpdates() {
    const {recharge, uses, quantity} = this.item.system;
    const consuming = this.config.consumeUsage;

    // case 1: consume recharge
    if (!!recharge?.value) {
      // show warning if consuming but can't
      if (consuming && !recharge.charged) this.warnings.push(game.i18n.format("DND5E.ItemNoUses", {name: this.item.name}));
      // add update if consuming and can
      if (consuming && recharge.charged) this.itemUpdates["system.recharge.charged"] = false;
      return true;
    }

    // case 2: consume limited uses
    if (uses.per && (uses.max > 0)) {

      if (!uses.value) {
        if (consuming) this.warnings.push(game.i18n.format("DND5E.ItemNoUses", {name: this.item.name}));
        return true;
      }


      const remaining = uses.value - 1;
      if (remaining >= 1) {
        if (consuming) this.itemUpdates["system.uses.value"] = remaining;
        return true;
      }

      // case 2B: consume quantity instead of uses if the limited use consumption puts it at 0 uses and destroys it.
      if (uses.autoDestroy && (remaining === 0)) {
        if (!consuming) return true;

        if (quantity > 1) {
          // reduce quantity
          this.itemUpdates["system.quantity"] = Math.max(quantity - 1, 0);
          this.itemUpdates["system.uses.value"] = uses.max;
        } else if (quantity === 1) {
          // delete item (qty 0)
          this.deleteUpdates.add(this.item.id);
          this.itemUpdates = [];
        }
        return true;
      }
    }
  }

  // update stuff
  #updateSpellUpdates() {
    const is = this.item.system;
    const isSpell = this.item.type === "spell";
    const consumeSpellSlot = isSpell && (is.level > 0) && CONFIG.DND5E.spellUpcastModes.includes(is.preparation.mode);
    let currentLevel = this.config.currentSlotLevel ?? (consumeSpellSlot ? is.preparation.mode === "pact" ? "pact" : is.level : null);

    if (!consumeSpellSlot || !currentLevel) return false;

    if (Number.isNumeric(currentLevel)) currentLevel = `spell${currentLevel}`;
    const level = this.actor.system.spells[currentLevel];
    const spells = Number(level?.value ?? 0);
    if (this.config.consumeSpellSlot) {
      this.actorUpdates[`system.spells.${currentLevel}.value`] = Math.max(spells - 1, 0);
    }

    return true;
  }

  /**
   * Get spell slot options.
   * @returns {object[]}
   */
  #getSpellData() {
    const is = this.item.system;
    const as = this.actor.system;

    // Determine whether the spell may be up-cast
    const consumeSpellSlot = (is.level > 0) && CONFIG.DND5E.spellUpcastModes.includes(is.preparation.mode);
    if (!consumeSpellSlot) return [];

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
        level: i,
        label: i > 0 ? game.i18n.format("DND5E.SpellLevelSlot", {level: label, n: slots}) : label,
        canCast: max > 0,
        hasSlots: slots > 0
      });
      return arr;
    }, []).filter(sl => sl.level <= lmax);

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
    const canCast = spellLevels.some(l => l.hasSlots);
    if (!canCast && this.config.consumeSpellSlot) this.warnings.push(game.i18n.format("DND5E.SpellCastNoSlots", {
      level: CONFIG.DND5E.spellLevels[is.level],
      name: this.item.name
    }));

    return spellLevels;
  }

  /** @override */
  async _onChangeInput(event) {
    await super._onChangeInput(event);
    foundry.utils.mergeObject(this.config, new FormDataExtended(this.form).object);
    this.render();
    return this.config;
  }

  async _updateObject(event, formData) {
    this.fn({
      config: formData,
      valid: this.warnings.length > 0,
      updates: {
        actor: this.actorUpdates,
        item: this.itemUpdates,
        resources: this.resourceUpdates,
        deleteIds: Array.from(this.deleteUpdates)
      }
    });
    this.close();
  }

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
   * @param {Item5e} item  Item being used.
   * @returns {Promise}    Promise that is resolved when the use dialog is acted upon.
   */
  static async create(item, options = {}, config = {}) {
    if (!item.isOwned) throw new Error("You cannot display an ability usage dialog for an unowned item");
    return new Promise(resolve => new this(item, options, config, resolve).render(true));
  }
}
