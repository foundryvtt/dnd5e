import {simplifyRollFormula, d20Roll, damageRoll} from "../dice.js";
import AbilityUseDialog from "../apps/ability-use-dialog.js";
import Proficiency from "../actor/proficiency.js";

/**
 * Override and extend the basic Item implementation.
 * @extends {Item}
 */
export default class Item5e extends Item {

  /* -------------------------------------------- */
  /*  Item Properties                             */
  /* -------------------------------------------- */

  /**
   * Which ability score modifier is used by this item.
   * @type {string|null}
   */
  get abilityMod() {
    const itemData = this.data.data;
    if (!("ability" in itemData)) return null;

    // Case 1 - defined directly by the item
    if (itemData.ability) return itemData.ability;

    // Case 2 - inferred from a parent actor
    else if (this.actor) {
      const actorData = this.actor.data.data;

      // Spells - Use Actor spellcasting modifier
      if (this.data.type === "spell") return actorData.attributes.spellcasting || "int";

      // Tools - default to Intelligence
      else if (this.data.type === "tool") return "int";

      // Weapons
      else if (this.data.type === "weapon") {
        const wt = itemData.weaponType;

        // Weapons using the spellcasting modifier
        if (["msak", "rsak"].includes(itemData.actionType)) {
          return actorData.attributes.spellcasting || "int";
        }

        // Finesse weapons - Str or Dex (PHB pg. 147)
        else if (itemData.properties.fin === true) {
          return (actorData.abilities.dex.mod >= actorData.abilities.str.mod) ? "dex" : "str";
        }

        // Ranged weapons - Dex (PH p.194)
        else if ( ["simpleR", "martialR"].includes(wt) ) return "dex";
      }
      return "str";
    }

    // Case 3 - unknown
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement an attack roll as part of its usage?
   * @type {boolean}
   */
  get hasAttack() {
    return ["mwak", "rwak", "msak", "rsak"].includes(this.data.data.actionType);
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a damage roll as part of its usage?
   * @type {boolean}
   */
  get hasDamage() {
    return !!(this.data.data.damage && this.data.data.damage.parts.length);
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a versatile damage roll as part of its usage?
   * @type {boolean}
   */
  get isVersatile() {
    return !!(this.hasDamage && this.data.data.damage.versatile);
  }

  /* -------------------------------------------- */

  /**
   * Does the item provide an amount of healing instead of conventional damage?
   * @type {boolean}
   */
  get isHealing() {
    return (this.data.data.actionType === "heal") && this.data.data.damage.parts.length;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a saving throw as part of its usage?
   * @type {boolean}
   */
  get hasSave() {
    const save = this.data.data?.save || {};
    return !!(save.ability && save.scaling);
  }

  /* --------------------------------------------- */

  /**
   * Does the Item implement an ability check as part of its usage?
   * @type {boolean}
   */
  get hasAbilityCheck() {
    return (this.data.data?.actionType === "abil") && this.data.data?.ability;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item have a target?
   * @type {boolean}
   */
  get hasTarget() {
    const target = this.data.data.target;
    return target && !["none", ""].includes(target.type);
  }

  /* -------------------------------------------- */

  /**
   * Does the Item have an area of effect target?
   * @type {boolean}
   */
  get hasAreaTarget() {
    const target = this.data.data.target;
    return target && (target.type in CONFIG.DND5E.areaTargetTypes);
  }

  /* -------------------------------------------- */

  /**
   * Is this Item limited in its ability to be used by charges or by recharge?
   * @type {boolean}
   */
  get hasLimitedUses() {
    let chg = this.data.data.recharge || {};
    let uses = this.data.data.uses || {};
    return !!chg.value || (uses.per && (uses.max > 0));
  }

  /* -------------------------------------------- */

  /**
   * Is this item any of the armor subtypes?
   * @type {boolean}
   */
  get isArmor() {
    return this.data.data.armor?.type in CONFIG.DND5E.armorTypes;
  }

  /* -------------------------------------------- */

  /**
   * Should this item's active effects be suppressed.
   * @type {boolean}
   */
  get areEffectsSuppressed() {
    const requireEquipped = (this.data.type !== "consumable") || ["rod", "trinket", "wand"].includes(
      this.data.data.consumableType);
    if ( requireEquipped && (this.data.data.equipped === false) ) return true;

    return this.data.data.attunement === CONFIG.DND5E.attunementTypes.REQUIRED;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Get the Item's data
    const itemData = this.data;
    const data = itemData.data;
    const C = CONFIG.DND5E;
    const labels = this.labels = {};

    // Classes
    if ( itemData.type === "class" ) {
      data.levels = Math.clamped(data.levels, 1, 20);
    }

    // Spell Level,  School, and Components
    if ( itemData.type === "spell" ) {
      data.preparation.mode = data.preparation.mode || "prepared";
      labels.level = C.spellLevels[data.level];
      labels.school = C.spellSchools[data.school];
      labels.components = Object.entries(data.components).reduce((arr, c) => {
        if ( c[1] !== true ) return arr;
        arr.push(c[0].titleCase().slice(0, 1));
        return arr;
      }, []);
      labels.materials = data?.materials?.value ?? null;
    }

    // Feat Items
    else if ( itemData.type === "feat" ) {
      const act = data.activation;
      if ( act && (act.type === C.abilityActivationTypes.legendary) ) labels.featType = game.i18n.localize("DND5E.LegendaryActionLabel");
      else if ( act && (act.type === C.abilityActivationTypes.lair) ) labels.featType = game.i18n.localize("DND5E.LairActionLabel");
      else if ( act && act.type ) labels.featType = game.i18n.localize(data.damage.length ? "DND5E.Attack" : "DND5E.Action");
      else labels.featType = game.i18n.localize("DND5E.Passive");
    }

    // Equipment Items
    else if ( itemData.type === "equipment" ) {
      labels.armor = data.armor.value ? `${data.armor.value} ${game.i18n.localize("DND5E.AC")}` : "";
    }

    // Activated Items
    if ( data.hasOwnProperty("activation") ) {

      // Ability Activation Label
      let act = data.activation || {};
      if ( act ) labels.activation = [act.cost, C.abilityActivationTypes[act.type]].filterJoin(" ");

      // Target Label
      let tgt = data.target || {};
      if (["none", "touch", "self"].includes(tgt.units)) tgt.value = null;
      if (["none", "self"].includes(tgt.type)) {
        tgt.value = null;
        tgt.units = null;
      }
      labels.target = [tgt.value, C.distanceUnits[tgt.units], C.targetTypes[tgt.type]].filterJoin(" ");

      // Range Label
      let rng = data.range || {};
      if ( ["none", "touch", "self"].includes(rng.units) ) {
        rng.value = null;
        rng.long = null;
      }
      labels.range = [rng.value, rng.long ? `/ ${rng.long}` : null, C.distanceUnits[rng.units]].filterJoin(" ");

      // Duration Label
      let dur = data.duration || {};
      if (["inst", "perm"].includes(dur.units)) dur.value = null;
      labels.duration = [dur.value, C.timePeriods[dur.units]].filterJoin(" ");

      // Recharge Label
      let chg = data.recharge || {};
      labels.recharge = `${game.i18n.localize("DND5E.Recharge")} [${chg.value}${parseInt(chg.value) < 6 ? "+" : ""}]`;
    }

    // Item Actions
    if ( data.hasOwnProperty("actionType") ) {
      // Damage
      let dam = data.damage || {};
      if ( dam.parts ) {
        labels.damage = dam.parts.map(d => d[0]).join(" + ").replace(/\+ -/g, "- ");
        labels.damageTypes = dam.parts.map(d => C.damageTypes[d[1]]).join(", ");
      }
    }

    // If this item is owned, we prepareFinalAttributes() at the end of actor init
    if (!this.isOwned) this.prepareFinalAttributes();
  }

  /* -------------------------------------------- */

  /**
   * Compute item attributes which might depend on prepared actor data. If this item is
   * embedded this method will be called after the actor's data is prepared. Otherwise it
   * will be called at the end of `Item5e#prepareDerivedData`.
   */
  prepareFinalAttributes() {
    // Proficiency
    const isProficient = (this.type === "spell") || this.data.data.proficient; // Always proficient in spell attacks.
    this.data.data.prof = new Proficiency(this.actor?.data.data.attributes.prof, isProficient);

    if ( this.data.data.hasOwnProperty("actionType") ) {
      // Ability checks
      this.labels.abilityCheck = game.i18n.format("DND5E.AbilityPromptTitle", {
        ability: CONFIG.DND5E.abilities[this.data.data?.ability]
      });

      // Saving throws
      this.getSaveDC();

      // To Hit
      this.getAttackToHit();

      // Limited Uses
      this.prepareMaxUses();

      // Damage Label
      this.getDerivedDamageLabel();
    }
  }

  /* -------------------------------------------- */

  /**
   * Populate a label with the compiled and simplified damage formula based on owned item
   * actor data. This is only used for display purposes and is not related to `Item5e#rollDamage`.
   * @returns {{damageType: number, formula: string}[]}
   */
  getDerivedDamageLabel() {
    const itemData = this.data.data;
    if ( !this.hasDamage || !itemData || !this.isOwned ) return [];
    const rollData = this.getRollData();
    const derivedDamage = itemData.damage?.parts?.map(damagePart => {
      let formula;
      try {
        const roll = new Roll(damagePart[0], rollData);
        formula = simplifyRollFormula(roll.formula, { preserveFlavor: true });
      }
      catch(err) { console.warn(`Unable to simplify formula for ${this.name}: ${err}`); }
      return { formula, damageType: damagePart[1] };
    });
    this.labels.derivedDamage = derivedDamage;
    return derivedDamage;
  }

  /* -------------------------------------------- */

  /**
   * Update the derived spell DC for an item that requires a saving throw.
   * @returns {number|null}
   */
  getSaveDC() {
    if ( !this.hasSave ) return;
    const save = this.data.data?.save;

    // Actor spell-DC based scaling
    if ( save.scaling === "spell" ) {
      save.dc = this.isOwned ? getProperty(this.actor.data, "data.attributes.spelldc") : null;
    }

    // Ability-score based scaling
    else if ( save.scaling !== "flat" ) {
      save.dc = this.isOwned ? getProperty(this.actor.data, `data.abilities.${save.scaling}.dc`) : null;
    }

    // Update labels
    const abl = CONFIG.DND5E.abilities[save.ability];
    this.labels.save = game.i18n.format("DND5E.SaveDC", {dc: save.dc || "", ability: abl});
    return save.dc;
  }

  /* -------------------------------------------- */

  /**
   * Update a label to the Item detailing its total to hit bonus.
   * Sources:
   * - item document's innate attack bonus
   * - item's actor's proficiency bonus if applicable
   * - item's actor's global bonuses to the given item type
   * - item's ammunition if applicable
   *
   * @returns {{rollData: object, parts: string[]}|null}  Data used in the item's Attack roll.
   */
  getAttackToHit() {
    const itemData = this.data.data;
    if ( !this.hasAttack || !itemData ) return;
    const rollData = this.getRollData();

    // Define Roll bonuses
    const parts = [];

    // Include the item's innate attack bonus as the initial value and label
    if ( itemData.attackBonus ) {
      parts.push(itemData.attackBonus);
      this.labels.toHit = itemData.attackBonus;
    }

    // Take no further action for un-owned items
    if ( !this.isOwned ) return {rollData, parts};

    // Ability score modifier
    parts.push("@mod");

    // Add proficiency bonus if an explicit proficiency flag is present or for non-item features
    if ( !["weapon", "consumable"].includes(this.data.type) || itemData.proficient ) {
      parts.push("@prof");
      if ( this.data.data.prof?.hasProficiency ) {
        rollData.prof = this.data.data.prof.term;
      }
    }

    // Actor-level global bonus to attack rolls
    const actorBonus = this.actor.data.data.bonuses?.[itemData.actionType] || {};
    if ( actorBonus.attack ) parts.push(actorBonus.attack);

    // One-time bonus provided by consumed ammunition
    if ( (itemData.consume?.type === "ammo") && this.actor.items ) {
      const ammoItemData = this.actor.items.get(itemData.consume.target)?.data;

      if (ammoItemData) {
        const ammoItemQuantity = ammoItemData.data.quantity;
        const ammoCanBeConsumed = ammoItemQuantity && (ammoItemQuantity - (itemData.consume.amount ?? 0) >= 0);
        const ammoItemAttackBonus = ammoItemData.data.attackBonus;
        const ammoIsTypeConsumable = (ammoItemData.type === "consumable") && (ammoItemData.data.consumableType === "ammo");
        if ( ammoCanBeConsumed && ammoItemAttackBonus && ammoIsTypeConsumable ) {
          parts.push("@ammo");
          rollData.ammo = ammoItemAttackBonus;
        }
      }
    }

    // Condense the resulting attack bonus formula into a simplified label
    const roll = new Roll(parts.join("+"), rollData);
    const formula = simplifyRollFormula(roll.formula);
    this.labels.toHit = !/^[+-]/.test(formula) ? `+ ${formula}` : formula;

    // Update labels and return the prepared roll data
    return {rollData, parts};
  }

  /* -------------------------------------------- */

  /**
   * Retrieve an item's critical hit threshold. Uses the smallest value from among the
   * following sources:
   * - item document
   * - item document's actor (if it has one)
   * - the constant '20'
   *
   * @returns {number|null}  The minimum value that must be rolled to be considered a critical hit.
   */
  getCriticalThreshold() {
    const itemData = this.data.data;
    const actorFlags = this.actor.data.flags.dnd5e || {};
    if ( !this.hasAttack || !itemData ) return;

    // Get the actor's critical threshold
    let actorThreshold = null;

    if ( this.data.type === "weapon" ) {
      actorThreshold = actorFlags.weaponCriticalThreshold;
    } else if ( this.data.type === "spell" ) {
      actorThreshold = actorFlags.spellCriticalThreshold;
    }

    // Return the lowest of the the item and actor thresholds
    return Math.min(itemData.critical?.threshold ?? 20, actorThreshold ?? 20);
  }

  /* -------------------------------------------- */

  /**
   * Populates the max uses of an item. If the item is an owned item and the `max`
   * is not numeric, calculate based on actor data.
   */
  prepareMaxUses() {
    const data = this.data.data;
    if (!data.uses?.max) return;
    let max = data.uses.max;

    // If this is an owned item and the max is not numeric, we need to calculate it
    if (this.isOwned && !Number.isNumeric(max)) {
      if (this.actor.data === undefined) return;
      try {
        max = Roll.replaceFormulaData(max, this.actor.getRollData(), {missing: 0, warn: true});
        max = Roll.safeEval(max);
      } catch(e) {
        console.error("Problem preparing Max uses for", this.data.name, e);
        return;
      }
    }
    data.uses.max = Number(max);
  }

  /* -------------------------------------------- */

  /**
   * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
   * @param {object} [options]
   * @param {boolean} [options.configureDialog]     Display a configuration dialog for the item roll, if applicable?
   * @param {string} [options.rollMode]             The roll display mode with which to display (or not) the card
   * @param {boolean} [options.createMessage]       Whether to automatically create a chat message (if true) or simply
   *                                                return
   *                                                the prepared chat message data (if false).
   * @returns {Promise<ChatMessage|object|void>}
   */
  async roll({configureDialog=true, rollMode, createMessage=true}={}) {
    let item = this;
    const id = this.data.data;                // Item system data
    const actor = this.actor;
    const ad = actor.data.data;               // Actor system data

    // Reference aspects of the item data necessary for usage
    const hasArea = this.hasAreaTarget;       // Is the ability usage an AoE?
    const resource = id.consume || {};        // Resource consumption
    const recharge = id.recharge || {};       // Recharge mechanic
    const uses = id?.uses ?? {};              // Limited uses
    const isSpell = this.type === "spell";    // Does the item require a spell slot?
    const requireSpellSlot = isSpell && (id.level > 0) && CONFIG.DND5E.spellUpcastModes.includes(id.preparation.mode);

    // Define follow-up actions resulting from the item usage
    let createMeasuredTemplate = hasArea;       // Trigger a template creation
    let consumeRecharge = !!recharge.value;     // Consume recharge
    let consumeResource = !!resource.target && (!item.hasAttack || (resource.type !== "ammo")); // Consume a linked (non-ammo) resource
    let consumeSpellSlot = requireSpellSlot;    // Consume a spell slot
    let consumeUsage = !!uses.per;              // Consume limited uses
    let consumeQuantity = uses.autoDestroy;     // Consume quantity of the item in lieu of uses
    let consumeSpellLevel = null;               // Consume a specific category of spell slot
    if ( requireSpellSlot ) consumeSpellLevel = id.preparation.mode === "pact" ? "pact" : `spell${id.level}`;

    // Display a configuration dialog to customize the usage
    const needsConfiguration =
      createMeasuredTemplate || consumeRecharge || consumeResource || consumeSpellSlot || consumeUsage;
    if (configureDialog && needsConfiguration) {
      const configuration = await AbilityUseDialog.create(this);
      if (!configuration) return;

      // Determine consumption preferences
      createMeasuredTemplate = Boolean(configuration.placeTemplate);
      consumeUsage = Boolean(configuration.consumeUse);
      consumeRecharge = Boolean(configuration.consumeRecharge);
      consumeResource = Boolean(configuration.consumeResource);
      consumeSpellSlot = Boolean(configuration.consumeSlot);

      // Handle spell upcasting
      if ( requireSpellSlot ) {
        consumeSpellLevel = configuration.level === "pact" ? "pact" : `spell${configuration.level}`;
        if ( consumeSpellSlot === false ) consumeSpellLevel = null;
        const upcastLevel = configuration.level === "pact" ? ad.spells.pact.level : parseInt(configuration.level);
        if (upcastLevel !== id.level) {
          item = this.clone({"data.level": upcastLevel}, {keepId: true});
          item.data.update({_id: this.id}); // Retain the original ID (needed until 0.8.2+)
          item.prepareFinalAttributes(); // Spell save DC, etc...
        }
      }
    }

    // Determine whether the item can be used by testing for resource consumption
    const usage = item._getUsageUpdates({
      consumeRecharge, consumeResource, consumeSpellLevel, consumeUsage, consumeQuantity
    });
    if ( !usage ) return;
    const {actorUpdates, itemUpdates, resourceUpdates} = usage;

    // Commit pending data updates
    if ( !foundry.utils.isObjectEmpty(itemUpdates) ) await item.update(itemUpdates);
    if ( consumeQuantity && (item.data.data.quantity === 0) ) await item.delete();
    if ( !foundry.utils.isObjectEmpty(actorUpdates) ) await actor.update(actorUpdates);
    if ( !foundry.utils.isObjectEmpty(resourceUpdates) ) {
      const resource = actor.items.get(id.consume?.target);
      if ( resource ) await resource.update(resourceUpdates);
    }

    // Initiate measured template creation
    if ( createMeasuredTemplate ) {
      const template = game.dnd5e.canvas.AbilityTemplate.fromItem(item);
      if ( template ) template.drawPreview();
    }

    // Create or return the Chat Message data
    return item.displayCard({rollMode, createMessage});
  }

  /* -------------------------------------------- */

  /**
   * Verify that the consumed resources used by an Item are available.
   * Otherwise display an error and return false.
   * @param {object} options
   * @param {boolean} options.consumeQuantity     Consume quantity of the item if other consumption modes are not
   *                                              available?
   * @param {boolean} options.consumeRecharge     Whether the item consumes the recharge mechanic
   * @param {boolean} options.consumeResource     Whether the item consumes a limited resource
   * @param {string|null} options.consumeSpellLevel The category of spell slot to consume, or null
   * @param {boolean} options.consumeUsage        Whether the item consumes a limited usage
   * @returns {object|boolean}            A set of data changes to apply when the item is used, or false
   * @private
   */
  _getUsageUpdates({consumeQuantity, consumeRecharge, consumeResource, consumeSpellLevel, consumeUsage}) {

    // Reference item data
    const id = this.data.data;
    const actorUpdates = {};
    const itemUpdates = {};
    const resourceUpdates = {};

    // Consume Recharge
    if ( consumeRecharge ) {
      const recharge = id.recharge || {};
      if ( recharge.charged === false ) {
        ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: this.name}));
        return false;
      }
      itemUpdates["data.recharge.charged"] = false;
    }

    // Consume Limited Resource
    if ( consumeResource ) {
      const canConsume = this._handleConsumeResource(itemUpdates, actorUpdates, resourceUpdates);
      if ( canConsume === false ) return false;
    }

    // Consume Spell Slots
    if ( consumeSpellLevel ) {
      if ( Number.isNumeric(consumeSpellLevel) ) consumeSpellLevel = `spell${consumeSpellLevel}`;
      const level = this.actor?.data.data.spells[consumeSpellLevel];
      const spells = Number(level?.value ?? 0);
      if ( spells === 0 ) {
        const label = game.i18n.localize(consumeSpellLevel === "pact" ? "DND5E.SpellProgPact" : `DND5E.SpellLevel${id.level}`);
        ui.notifications.warn(game.i18n.format("DND5E.SpellCastNoSlots", {name: this.name, level: label}));
        return false;
      }
      actorUpdates[`data.spells.${consumeSpellLevel}.value`] = Math.max(spells - 1, 0);
    }

    // Consume Limited Usage
    if ( consumeUsage ) {
      const uses = id.uses || {};
      const available = Number(uses.value ?? 0);
      let used = false;

      // Reduce usages
      const remaining = Math.max(available - 1, 0);
      if ( available >= 1 ) {
        used = true;
        itemUpdates["data.uses.value"] = remaining;
      }

      // Reduce quantity if not reducing usages or if usages hit 0 and we are set to consumeQuantity
      if ( consumeQuantity && (!used || (remaining === 0)) ) {
        const q = Number(id.quantity ?? 1);
        if ( q >= 1 ) {
          used = true;
          itemUpdates["data.quantity"] = Math.max(q - 1, 0);
          itemUpdates["data.uses.value"] = uses.max ?? 1;
        }
      }

      // If the item was not used, return a warning
      if ( !used ) {
        ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: this.name}));
        return false;
      }
    }

    // Return the configured usage
    return {itemUpdates, actorUpdates, resourceUpdates};
  }

  /* -------------------------------------------- */

  /**
   * Handle update actions required when consuming an external resource
   * @param {object} itemUpdates        An object of data updates applied to this item
   * @param {object} actorUpdates       An object of data updates applied to the item owner (Actor)
   * @param {object} resourceUpdates    An object of data updates applied to a different resource item (Item)
   * @returns {boolean|void}            Return false to block further progress, or return nothing to continue
   * @private
   */
  _handleConsumeResource(itemUpdates, actorUpdates, resourceUpdates) {
    const actor = this.actor;
    const itemData = this.data.data;
    const consume = itemData.consume || {};
    if ( !consume.type ) return;

    // No consumed target
    const typeLabel = CONFIG.DND5E.abilityConsumptionTypes[consume.type];
    if ( !consume.target ) {
      ui.notifications.warn(game.i18n.format("DND5E.ConsumeWarningNoResource", {name: this.name, type: typeLabel}));
      return false;
    }

    // Identify the consumed resource and its current quantity
    let resource = null;
    let amount = Number(consume.amount ?? 1);
    let quantity = 0;
    switch ( consume.type ) {
      case "attribute":
        resource = getProperty(actor.data.data, consume.target);
        quantity = resource || 0;
        break;
      case "ammo":
      case "material":
        resource = actor.items.get(consume.target);
        quantity = resource ? resource.data.data.quantity : 0;
        break;
      case "charges":
        resource = actor.items.get(consume.target);
        if ( !resource ) break;
        const uses = resource.data.data.uses;
        if ( uses.per && uses.max ) quantity = uses.value;
        else if ( resource.data.data.recharge?.value ) {
          quantity = resource.data.data.recharge.charged ? 1 : 0;
          amount = 1;
        }
        break;
    }

    // Verify that a consumed resource is available
    if ( resource === undefined ) {
      ui.notifications.warn(game.i18n.format("DND5E.ConsumeWarningNoSource", {name: this.name, type: typeLabel}));
      return false;
    }

    // Verify that the required quantity is available
    let remaining = quantity - amount;
    if ( remaining < 0 ) {
      ui.notifications.warn(game.i18n.format("DND5E.ConsumeWarningNoQuantity", {name: this.name, type: typeLabel}));
      return false;
    }

    // Define updates to provided data objects
    switch ( consume.type ) {
      case "attribute":
        actorUpdates[`data.${consume.target}`] = remaining;
        break;
      case "ammo":
      case "material":
        resourceUpdates["data.quantity"] = remaining;
        break;
      case "charges":
        const uses = resource.data.data.uses || {};
        const recharge = resource.data.data.recharge || {};
        if ( uses.per && uses.max ) resourceUpdates["data.uses.value"] = remaining;
        else if ( recharge.value ) resourceUpdates["data.recharge.charged"] = false;
        break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Display the chat card for an Item as a Chat Message
   * @param {object} [options]                Options which configure the display of the item chat card
   * @param {string} [options.rollMode]       The message visibility mode to apply to the created card
   * @param {boolean} [options.createMessage] Whether to automatically create a ChatMessage document (if true), or only
   *                                          return the prepared message data (if false)
   * @returns {ChatMessage|object} Chat message if `createMessage` is true, otherwise an object containing message data.
   */
  async displayCard({rollMode, createMessage=true}={}) {

    // Render the chat card template
    const token = this.actor.token;
    const templateData = {
      actor: this.actor.data,
      tokenId: token?.uuid || null,
      item: this.data,
      data: this.getChatData(),
      labels: this.labels,
      hasAttack: this.hasAttack,
      isHealing: this.isHealing,
      hasDamage: this.hasDamage,
      isVersatile: this.isVersatile,
      isSpell: this.data.type === "spell",
      hasSave: this.hasSave,
      hasAreaTarget: this.hasAreaTarget,
      isTool: this.data.type === "tool",
      hasAbilityCheck: this.hasAbilityCheck
    };
    const html = await renderTemplate("systems/dnd5e/templates/chat/item-card.html", templateData);

    // Create the ChatMessage data object
    const chatData = {
      user: game.user.data._id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      flavor: this.data.data.chatFlavor || this.name,
      speaker: ChatMessage.getSpeaker({actor: this.actor, token}),
      flags: {"core.canPopout": true}
    };

    // If the Item was destroyed in the process of displaying its card - embed the item data in the chat message
    if ( (this.data.type === "consumable") && !this.actor.items.has(this.id) ) {
      chatData.flags["dnd5e.itemData"] = this.data;
    }

    // Apply the roll mode to adjust message visibility
    ChatMessage.applyRollMode(chatData, rollMode || game.settings.get("core", "rollMode"));

    // Create the Chat Message or return its data
    return createMessage ? ChatMessage.create(chatData) : chatData;
  }

  /* -------------------------------------------- */
  /*  Chat Cards                                  */
  /* -------------------------------------------- */

  /**
   * Prepare an object of chat data used to display a card for the Item in the chat log.
   * @param {object} htmlOptions    Options used by the TextEditor.enrichHTML function.
   * @returns {object}              An object of chat data to render.
   */
  getChatData(htmlOptions={}) {
    const data = foundry.utils.deepClone(this.data.data);
    const labels = this.labels;

    // Rich text description
    data.description.value = TextEditor.enrichHTML(data.description.value, htmlOptions);

    // Item type specific properties
    const props = [];
    const fn = this[`_${this.data.type}ChatData`];
    if ( fn ) fn.bind(this)(data, labels, props);

    // Equipment properties
    if ( data.hasOwnProperty("equipped") && !["loot", "tool"].includes(this.data.type) ) {
      if ( data.attunement === CONFIG.DND5E.attunementTypes.REQUIRED ) {
        props.push(game.i18n.localize(CONFIG.DND5E.attunements[CONFIG.DND5E.attunementTypes.REQUIRED]));
      }
      props.push(
        game.i18n.localize(data.equipped ? "DND5E.Equipped" : "DND5E.Unequipped"),
        game.i18n.localize(data.proficient ? "DND5E.Proficient" : "DND5E.NotProficient")
      );
    }

    // Ability activation properties
    if ( data.hasOwnProperty("activation") ) {
      props.push(
        labels.activation + (data.activation?.condition ? ` (${data.activation.condition})` : ""),
        labels.target,
        labels.range,
        labels.duration
      );
    }

    // Filter properties and return
    data.properties = props.filter(p => !!p);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for equipment type items.
   * @param {object} data     Copy of item data being use to display the chat message.
   * @param {object} labels   Specially prepared item labels.
   * @param {string[]} props  Existing list of properties to be displayed. *Will be mutated.*
   * @private
   */
  _equipmentChatData(data, labels, props) {
    props.push(
      CONFIG.DND5E.equipmentTypes[data.armor.type],
      labels.armor || null,
      data.stealth.value ? game.i18n.localize("DND5E.StealthDisadvantage") : null
    );
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for weapon type items.
   * @param {object} data     Copy of item data being use to display the chat message.
   * @param {object} labels   Specially prepared item labels.
   * @param {string[]} props  Existing list of properties to be displayed. *Will be mutated.*
   * @private
   */
  _weaponChatData(data, labels, props) {
    props.push(
      CONFIG.DND5E.weaponTypes[data.weaponType]
    );
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for consumable type items.
   * @param {object} data     Copy of item data being use to display the chat message.
   * @param {object} labels   Specially prepared item labels.
   * @param {string[]} props  Existing list of properties to be displayed. *Will be mutated.*
   * @private
   */
  _consumableChatData(data, labels, props) {
    props.push(
      CONFIG.DND5E.consumableTypes[data.consumableType],
      `${data.uses.value}/${data.uses.max} ${game.i18n.localize("DND5E.Charges")}`
    );
    data.hasCharges = data.uses.value >= 0;
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for tool type items.
   * @param {object} data     Copy of item data being use to display the chat message.
   * @param {object} labels   Specially prepared item labels.
   * @param {string[]} props  Existing list of properties to be displayed. *Will be mutated.*
   * @private
   */
  _toolChatData(data, labels, props) {
    props.push(
      CONFIG.DND5E.abilities[data.ability] || null,
      CONFIG.DND5E.proficiencyLevels[data.proficient || 0]
    );
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for loot type items.
   * @param {object} data     Copy of item data being use to display the chat message.
   * @param {object} labels   Specially prepared item labels.
   * @param {string[]} props  Existing list of properties to be displayed. *Will be mutated.*
   * @private
   */
  _lootChatData(data, labels, props) {
    props.push(
      game.i18n.localize("DND5E.ItemTypeLoot"),
      data.weight ? `${data.weight} ${game.i18n.localize("DND5E.AbbreviationLbs")}` : null
    );
  }

  /* -------------------------------------------- */

  /**
   * Render a chat card for Spell type data.
   * @param {object} data     Copy of item data being use to display the chat message.
   * @param {object} labels   Specially prepared item labels.
   * @param {string[]} props  Existing list of properties to be displayed. *Will be mutated.*
   * @private
   */
  _spellChatData(data, labels, props) {
    props.push(
      labels.level,
      labels.components + (labels.materials ? ` (${labels.materials})` : "")
    );
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for items of the Feat type.
   * @param {object} data     Copy of item data being use to display the chat message.
   * @param {object} labels   Specially prepared item labels.
   * @param {string[]} props  Existing list of properties to be displayed. *Will be mutated.*
   * @private
   */
  _featChatData(data, labels, props) {
    props.push(data.requirements);
  }

  /* -------------------------------------------- */
  /*  Item Rolls - Attack, Damage, Saves, Checks  */
  /* -------------------------------------------- */

  /**
   * Place an attack roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the d20Roll logic for the core implementation
   *
   * @param {object} options        Roll options which are configured and provided to the d20Roll function
   * @returns {Promise<Roll|null>}   A Promise which resolves to the created Roll instance
   */
  async rollAttack(options={}) {
    const itemData = this.data.data;
    const flags = this.actor.data.flags.dnd5e || {};
    if ( !this.hasAttack ) {
      throw new Error("You may not place an Attack Roll with this Item.");
    }
    let title = `${this.name} - ${game.i18n.localize("DND5E.AttackRoll")}`;

    // Get the parts and rollData for this item's attack
    const {parts, rollData} = this.getAttackToHit();

    // Handle ammunition consumption
    delete this._ammo;
    let ammo = null;
    let ammoUpdate = null;
    const consume = itemData.consume;
    if ( consume?.type === "ammo" ) {
      ammo = this.actor.items.get(consume.target);
      if (ammo?.data) {
        const q = ammo.data.data.quantity;
        const consumeAmount = consume.amount ?? 0;
        if ( q && (q - consumeAmount >= 0) ) {
          this._ammo = ammo;
          title += ` [${ammo.name}]`;
        }
      }

      // Get pending ammunition update
      const usage = this._getUsageUpdates({consumeResource: true});
      if ( usage === false ) return null;
      ammoUpdate = usage.resourceUpdates || {};
    }

    // Compose roll options
    let rollConfig = {
      parts: parts,
      actor: this.actor,
      data: rollData,
      title: title,
      flavor: title,
      dialogOptions: {
        width: 400,
        top: options.event ? options.event.clientY - 80 : null,
        left: window.innerWidth - 710
      },
      messageData: {
        "flags.dnd5e.roll": {type: "attack", itemId: this.id },
        speaker: ChatMessage.getSpeaker({actor: this.actor})
      }
    };

    // Critical hit thresholds
    rollConfig.critical = this.getCriticalThreshold();

    // Elven Accuracy
    if ( flags.elvenAccuracy && ["dex", "int", "wis", "cha"].includes(this.abilityMod) ) {
      rollConfig.elvenAccuracy = true;
    }

    // Apply Halfling Lucky
    if ( flags.halflingLucky ) rollConfig.halflingLucky = true;

    // Compose calculated roll options with passed-in roll options
    rollConfig = mergeObject(rollConfig, options);

    // Invoke the d20 roll helper
    const roll = await d20Roll(rollConfig);
    if ( roll === null ) return null;

    // Commit ammunition consumption on attack rolls resource consumption if the attack roll was made
    if ( ammo && !foundry.utils.isObjectEmpty(ammoUpdate) ) await ammo.update(ammoUpdate);
    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Place a damage roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the damageRoll logic for the core implementation.
   * @param {object} [config]
   * @param {MouseEvent} [config.event]    An event which triggered this roll, if any
   * @param {boolean} [config.critical]    Should damage be rolled as a critical hit?
   * @param {number} [config.spellLevel]   If the item is a spell, override the level for damage scaling
   * @param {boolean} [config.versatile]   If the item is a weapon, roll damage using the versatile formula
   * @param {object} [config.options]      Additional options passed to the damageRoll function
   * @returns {Promise<Roll>}              A Promise which resolves to the created Roll instance, or null if the action
   *                                       cannot be performed.
   */
  rollDamage({critical=false, event=null, spellLevel=null, versatile=false, options={}}={}) {
    if ( !this.hasDamage ) throw new Error("You may not make a Damage Roll with this Item.");
    const itemData = this.data.data;
    const actorData = this.actor.data.data;
    const messageData = {
      "flags.dnd5e.roll": {type: "damage", itemId: this.id},
      speaker: ChatMessage.getSpeaker({actor: this.actor})
    };

    // Get roll data
    const parts = itemData.damage.parts.map(d => d[0]);
    const rollData = this.getRollData();
    if ( spellLevel ) rollData.item.level = spellLevel;

    // Configure the damage roll
    const actionFlavor = game.i18n.localize(itemData.actionType === "heal" ? "DND5E.Healing" : "DND5E.DamageRoll");
    const title = `${this.name} - ${actionFlavor}`;
    const rollConfig = {
      actor: this.actor,
      critical: critical ?? event?.altKey ?? false,
      data: rollData,
      event: event,
      fastForward: event ? event.shiftKey || event.altKey || event.ctrlKey || event.metaKey : false,
      parts: parts,
      title: title,
      flavor: this.labels.damageTypes.length ? `${title} (${this.labels.damageTypes})` : title,
      dialogOptions: {
        width: 400,
        top: event ? event.clientY - 80 : null,
        left: window.innerWidth - 710
      },
      messageData
    };

    // Adjust damage from versatile usage
    if ( versatile && itemData.damage.versatile ) {
      parts[0] = itemData.damage.versatile;
      messageData["flags.dnd5e.roll"].versatile = true;
    }

    // Scale damage from up-casting spells
    if ( (this.data.type === "spell") ) {
      if ( (itemData.scaling.mode === "cantrip") ) {
        let level;
        if ( this.actor.type === "character" ) level = actorData.details.level;
        else if ( itemData.preparation.mode === "innate" ) level = Math.ceil(actorData.details.cr);
        else level = actorData.details.spellLevel;
        this._scaleCantripDamage(parts, itemData.scaling.formula, level, rollData);
      }
      else if ( spellLevel && (itemData.scaling.mode === "level") && itemData.scaling.formula ) {
        const scaling = itemData.scaling.formula;
        this._scaleSpellDamage(parts, itemData.level, spellLevel, scaling, rollData);
      }
    }

    // Add damage bonus formula
    const actorBonus = getProperty(actorData, `bonuses.${itemData.actionType}`) || {};
    if ( actorBonus.damage && (parseInt(actorBonus.damage) !== 0) ) {
      parts.push(actorBonus.damage);
    }

    // Handle ammunition damage
    const ammoData = this._ammo?.data;

    // Only add the ammunition damage if the ammution is a consumable with type 'ammo'
    if ( this._ammo && (ammoData.type === "consumable") && (ammoData.data.consumableType === "ammo") ) {
      parts.push("@ammo");
      rollData.ammo = ammoData.data.damage.parts.map(p => p[0]).join("+");
      rollConfig.flavor += ` [${this._ammo.name}]`;
      delete this._ammo;
    }

    // Factor in extra critical damage dice from the Barbarian's "Brutal Critical"
    if ( itemData.actionType === "mwak" ) {
      rollConfig.criticalBonusDice = this.actor.getFlag("dnd5e", "meleeCriticalDamageDice") ?? 0;
    }

    // Factor in extra weapon-specific critical damage
    if ( itemData.critical?.damage ) {
      rollConfig.criticalBonusDamage = itemData.critical.damage;
    }

    // Call the roll helper utility
    return damageRoll(foundry.utils.mergeObject(rollConfig, options));
  }

  /* -------------------------------------------- */

  /**
   * Adjust a cantrip damage formula to scale it for higher level characters and monsters.
   * @param {string[]} parts   The original parts of the damage formula.
   * @param {string} scale     The scaling formula.
   * @param {number} level     Level at which the spell is being cast.
   * @param {object} rollData  A data object that should be applied to the scaled damage roll.
   * @returns {string[]}       The parts of the damage formula with the scaling applied.
   * @private
   */
  _scaleCantripDamage(parts, scale, level, rollData) {
    const add = Math.floor((level + 1) / 6);
    if ( add === 0 ) return;
    return this._scaleDamage(parts, scale || parts.join(" + "), add, rollData);
  }

  /* -------------------------------------------- */

  /**
   * Adjust the spell damage formula to scale it for spell level up-casting.
   * @param {string[]} parts      The original parts of the damage formula.
   * @param {number} baseLevel    Default level for the spell.
   * @param {number} spellLevel   Level at which the spell is being cast.
   * @param {string} formula      The scaling formula.
   * @param {object} rollData     A data object that should be applied to the scaled damage roll.
   * @returns {string[]}          The parts of the damage formula with the scaling applied.
   * @private
   */
  _scaleSpellDamage(parts, baseLevel, spellLevel, formula, rollData) {
    const upcastLevels = Math.max(spellLevel - baseLevel, 0);
    if ( upcastLevels === 0 ) return parts;
    return this._scaleDamage(parts, formula, upcastLevels, rollData);
  }

  /* -------------------------------------------- */

  /**
   * Scale an array of damage parts according to a provided scaling formula and scaling multiplier.
   * @param {string[]} parts    The original parts of the damage formula.
   * @param {string} scaling    The scaling formula.
   * @param {number} times      A number of times to apply the scaling formula.
   * @param {object} rollData   A data object that should be applied to the scaled damage roll
   * @returns {string[]}        The parts of the damage formula with the scaling applied.
   * @private
   */
  _scaleDamage(parts, scaling, times, rollData) {
    if ( times <= 0 ) return parts;
    const p0 = new Roll(parts[0], rollData);
    const s = new Roll(scaling, rollData).alter(times);

    // Attempt to simplify by combining like dice terms
    let simplified = false;
    if ( (s.terms[0] instanceof Die) && (s.terms.length === 1) ) {
      const d0 = p0.terms[0];
      const s0 = s.terms[0];
      if ( (d0 instanceof Die) && (d0.faces === s0.faces) && d0.modifiers.equals(s0.modifiers) ) {
        d0.number += s0.number;
        parts[0] = p0.formula;
        simplified = true;
      }
    }

    // Otherwise add to the first part
    if ( !simplified ) {
      parts[0] = `${parts[0]} + ${s.formula}`;
    }
    return parts;
  }

  /* -------------------------------------------- */

  /**
   * Prepare data needed to roll an attack using an item (weapon, feat, spell, or equipment)
   * and then pass it off to `d20Roll`.
   * @param {object} [options]
   * @param {boolean} [options.spellLevel]  Level at which a spell is cast.
   * @returns {Promise<Roll>}   A Promise which resolves to the created Roll instance.
   */
  async rollFormula({spellLevel}={}) {
    if ( !this.data.data.formula ) {
      throw new Error("This Item does not have a formula to roll!");
    }

    // Define Roll Data
    const rollData = this.getRollData();
    if ( spellLevel ) rollData.item.level = spellLevel;
    const title = `${this.name} - ${game.i18n.localize("DND5E.OtherFormula")}`;

    // Invoke the roll and submit it to chat
    const roll = await new Roll(rollData.item.formula, rollData).roll({async: true});
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: title,
      rollMode: game.settings.get("core", "rollMode"),
      messageData: {"flags.dnd5e.roll": {type: "other", itemId: this.id }}
    });
    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Perform an ability recharge test for an item which uses the d6 recharge mechanic.
   * @returns {Promise<Roll>}   A Promise which resolves to the created Roll instance
   */
  async rollRecharge() {
    const data = this.data.data;
    if ( !data.recharge.value ) return;

    // Roll the check
    const roll = await new Roll("1d6").roll({async: true});
    const success = roll.total >= parseInt(data.recharge.value);

    // Display a Chat Message
    const promises = [roll.toMessage({
      flavor: `${game.i18n.format("DND5E.ItemRechargeCheck", {name: this.name})} - ${game.i18n.localize(success ? "DND5E.ItemRechargeSuccess" : "DND5E.ItemRechargeFailure")}`,
      speaker: ChatMessage.getSpeaker({actor: this.actor, token: this.actor.token})
    })];

    // Update the Item data
    if ( success ) promises.push(this.update({"data.recharge.charged": true}));
    return Promise.all(promises).then(() => roll);
  }

  /* -------------------------------------------- */

  /**
   * Prepare data needed to roll a tool check and then pass it off to `d20Roll`.
   * @param {object} [options]  Roll configuration options provided to the d20Roll function.
   * @returns {Promise<Roll>}   A Promise which resolves to the created Roll instance.
   */
  rollToolCheck(options={}) {
    if ( this.type !== "tool" ) throw new Error("Wrong item type!");

    // Prepare roll data
    const rollData = this.getRollData();
    const abl = this.data.data.ability;
    const parts = ["@mod"];
    const title = `${this.name} - ${game.i18n.localize("DND5E.ToolCheck")}`;

    // Add proficiency
    if ( this.data.data.prof?.hasProficiency ) {
      parts.push("@prof");
      rollData.prof = this.data.data.prof.term;
    }

    // Add tool bonuses
    if ( this.data.data.bonus ) {
      parts.push("@toolBonus");
      rollData.toolBonus = Roll.replaceFormulaData(this.data.data.bonus, rollData);
    }

    // Add ability-specific check bonus
    if ( getProperty(rollData, `abilities.${abl}.bonuses.check`) ) {
      const checkBonusKey = `${abl}CheckBonus`;
      parts.push(`@${checkBonusKey}`);
      const checkBonus = getProperty(rollData, `abilities.${abl}.bonuses.check`);
      rollData[checkBonusKey] = Roll.replaceFormulaData(checkBonus, rollData);
    }

    // Add global actor bonus
    const bonuses = getProperty(this.actor.data.data, "bonuses.abilities") || {};
    if ( bonuses.check ) {
      parts.push("@checkBonus");
      rollData.checkBonus = Roll.replaceFormulaData(bonuses.check, rollData);
    }

    // Compose the roll data
    const rollConfig = mergeObject({
      parts: parts,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: title,
      dialogOptions: {
        width: 400,
        top: options.event ? options.event.clientY - 80 : null,
        left: window.innerWidth - 710
      },
      chooseModifier: true,
      halflingLucky: this.actor.getFlag("dnd5e", "halflingLucky" ) || false,
      reliableTalent: (this.data.data.proficient >= 1) && this.actor.getFlag("dnd5e", "reliableTalent"),
      messageData: {"flags.dnd5e.roll": {type: "tool", itemId: this.id }}
    }, options);
    rollConfig.event = options.event;

    // Call the roll helper utility
    return d20Roll(rollConfig);
  }

  /* -------------------------------------------- */

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item.
   * @returns {object}  Data used for @ formula replacement in Roll formulas.
   * @private
   */
  getRollData() {
    if ( !this.actor ) return null;
    const rollData = this.actor.getRollData();
    rollData.item = foundry.utils.deepClone(this.data.data);

    // Include an ability score modifier if one exists
    const abl = this.abilityMod;
    if ( abl ) {
      const ability = rollData.abilities[abl];
      if ( !ability ) {
        console.warn(`Item ${this.name} in Actor ${this.actor.name} has an invalid item ability modifier of ${abl} defined`);
      }
      rollData.mod = ability?.mod || 0;
    }

    return rollData;
  }

  /* -------------------------------------------- */
  /*  Chat Message Helpers                        */
  /* -------------------------------------------- */

  /**
   * Apply listeners to chat messages.
   * @param {HTML} html  Rendered chat message.
   */
  static chatListeners(html) {
    html.on("click", ".card-buttons button", this._onChatCardAction.bind(this));
    html.on("click", ".item-name", this._onChatCardToggleContent.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle execution of a chat card action via a click event on one of the card buttons
   * @param {Event} event       The originating click event
   * @returns {Promise}         A promise which resolves once the handler workflow is complete
   * @private
   */
  static async _onChatCardAction(event) {
    event.preventDefault();

    // Extract card data
    const button = event.currentTarget;
    button.disabled = true;
    const card = button.closest(".chat-card");
    const messageId = card.closest(".message").dataset.messageId;
    const message = game.messages.get(messageId);
    const action = button.dataset.action;

    // Validate permission to proceed with the roll
    const isTargetted = action === "save";
    if ( !( isTargetted || game.user.isGM || message.isAuthor ) ) return;

    // Recover the actor for the chat card
    const actor = await this._getChatCardActor(card);
    if ( !actor ) return;

    // Get the Item from stored flag data or by the item ID on the Actor
    const storedData = message.getFlag("dnd5e", "itemData");
    const item = storedData ? new this(storedData, {parent: actor}) : actor.items.get(card.dataset.itemId);
    if ( !item ) {
      return ui.notifications.error(game.i18n.format("DND5E.ActionWarningNoItem", {item: card.dataset.itemId, name: actor.name}));
    }
    const spellLevel = parseInt(card.dataset.spellLevel) || null;

    // Handle different actions
    let targets;
    switch ( action ) {
      case "attack":
        await item.rollAttack({event}); break;
      case "damage":
      case "versatile":
        await item.rollDamage({
          critical: event.altKey,
          event: event,
          spellLevel: spellLevel,
          versatile: action === "versatile"
        });
        break;
      case "formula":
        await item.rollFormula({event, spellLevel}); break;
      case "save":
        targets = this._getChatCardTargets(card);
        for ( let token of targets ) {
          const speaker = ChatMessage.getSpeaker({scene: canvas.scene, token: token});
          await token.actor.rollAbilitySave(button.dataset.ability, { event, speaker });
        }
        break;
      case "toolCheck":
        await item.rollToolCheck({event}); break;
      case "placeTemplate":
        const template = game.dnd5e.canvas.AbilityTemplate.fromItem(item);
        if ( template ) template.drawPreview();
        break;
      case "abilityCheck":
        targets = this._getChatCardTargets(card);
        for ( let token of targets ) {
          const speaker = ChatMessage.getSpeaker({scene: canvas.scene, token: token});
          await token.actor.rollAbilityTest(button.dataset.ability, { event, speaker });
        }
        break;
    }

    // Re-enable the button
    button.disabled = false;
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the visibility of chat card content when the name is clicked
   * @param {Event} event   The originating click event
   * @private
   */
  static _onChatCardToggleContent(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const card = header.closest(".chat-card");
    const content = card.querySelector(".card-content");
    content.style.display = content.style.display === "none" ? "block" : "none";
  }

  /* -------------------------------------------- */

  /**
   * Get the Actor which is the author of a chat card
   * @param {HTMLElement} card    The chat card being used
   * @returns {Actor|null}        The Actor document or null
   * @private
   */
  static async _getChatCardActor(card) {

    // Case 1 - a synthetic actor from a Token
    if ( card.dataset.tokenId ) {
      const token = await fromUuid(card.dataset.tokenId);
      if ( !token ) return null;
      return token.actor;
    }

    // Case 2 - use Actor ID directory
    const actorId = card.dataset.actorId;
    return game.actors.get(actorId) || null;
  }

  /* -------------------------------------------- */

  /**
   * Get the Actor which is the author of a chat card
   * @param {HTMLElement} card    The chat card being used
   * @returns {Actor[]}            An Array of Actor documents, if any
   * @private
   */
  static _getChatCardTargets(card) {
    let targets = canvas.tokens.controlled.filter(t => !!t.actor);
    if ( !targets.length && game.user.character ) targets = targets.concat(game.user.character.getActiveTokens());
    if ( !targets.length ) ui.notifications.warn(game.i18n.localize("DND5E.ActionWarningNoToken"));
    return targets;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    if ( !this.isEmbedded || (this.parent.type === "vehicle") ) return;
    const actorData = this.parent.data;
    const isNPC = this.parent.type === "npc";
    let updates;
    switch (data.type) {
      case "equipment":
        updates = this._onCreateOwnedEquipment(data, actorData, isNPC);
        break;
      case "spell":
        updates = this._onCreateOwnedSpell(data, actorData, isNPC);
        break;
      case "tool":
        updates = this._onCreateOwnedTool(data, actorData, isNPC);
        break;
      case "weapon":
        updates = this._onCreateOwnedWeapon(data, actorData, isNPC);
        break;
    }
    if (updates) return this.data.update(updates);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);

    // The below options are only needed for character classes
    if ( userId !== game.user.id ) return;
    const isCharacterClass = this.parent && (this.parent.type !== "vehicle") && (this.type === "class");
    if ( !isCharacterClass ) return;

    // Assign a new primary class
    const pc = this.parent.items.get(this.parent.data.data.details.originalClass);
    if ( !pc ) this.parent._assignPrimaryClass();

    // Prompt to add new class features
    if (options.addFeatures === false) return;
    this.parent.getClassFeatures({
      className: this.name,
      subclassName: this.data.data.subclass,
      level: this.data.data.levels
    }).then(features => {
      return this.parent.addEmbeddedItems(features, options.promptAddFeatures);
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);

    // The below options are only needed for character classes
    if ( userId !== game.user.id ) return;
    const isCharacterClass = this.parent && (this.parent.type !== "vehicle") && (this.type === "class");
    if ( !isCharacterClass ) return;

    // Prompt to add new class features
    const addFeatures = changed.name || (changed.data && ["subclass", "levels"].some(k => k in changed.data));
    if ( !addFeatures || (options.addFeatures === false) ) return;
    this.parent.getClassFeatures({
      className: changed.name || this.name,
      subclassName: changed.data?.subclass || this.data.data.subclass,
      level: changed.data?.levels || this.data.data.levels
    }).then(features => {
      return this.parent.addEmbeddedItems(features, options.promptAddFeatures);
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);

    // Assign a new primary class
    if ( this.parent && (this.type === "class") && (userId === game.user.id) ) {
      if ( this.id !== this.parent.data.data.details.originalClass ) return;
      this.parent._assignPrimaryClass();
    }
  }

  /* -------------------------------------------- */

  /**
   * Pre-creation logic for the automatic configuration of owned equipment type Items.
   *
   * @param {object} data       Data for the newly created item.
   * @param {object} actorData  Data for the actor to which the item is being added.
   * @param {boolean} isNPC     Is this actor an NPC?
   * @returns {object}          Updates to apply to the item data.
   * @private
   */
  _onCreateOwnedEquipment(data, actorData, isNPC) {
    const updates = {};
    if ( foundry.utils.getProperty(data, "data.equipped") === undefined ) {
      updates["data.equipped"] = isNPC;  // NPCs automatically equip equipment
    }
    if ( foundry.utils.getProperty(data, "data.proficient") === undefined ) {
      if ( isNPC ) {
        updates["data.proficient"] = true;  // NPCs automatically have equipment proficiency
      } else {
        const armorProf = CONFIG.DND5E.armorProficienciesMap[this.data.data.armor?.type]; // Player characters check proficiency
        const actorArmorProfs = actorData.data.traits?.armorProf?.value || [];
        updates["data.proficient"] =
          (armorProf === true) || actorArmorProfs.includes(armorProf)
          || actorArmorProfs.includes(this.data.data.baseItem);
      }
    }
    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Pre-creation logic for the automatic configuration of owned spell type Items.
   *
   * @param {object} data       Data for the newly created item.
   * @param {object} actorData  Data for the actor to which the item is being added.
   * @param {boolean} isNPC     Is this actor an NPC?
   * @returns {object}          Updates to apply to the item data.
   * @private
   */
  _onCreateOwnedSpell(data, actorData, isNPC) {
    const updates = {};
    if ( foundry.utils.getProperty(data, "data.preparation.prepared") === undefined ) {
      updates["data.preparation.prepared"] = isNPC; // NPCs automatically prepare spells
    }
    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Pre-creation logic for the automatic configuration of owned tool type Items.
   *
   * @param {object} data       Data for the newly created item.
   * @param {object} actorData  Data for the actor to which the item is being added.
   * @param {boolean} isNPC     Is this actor an NPC?
   * @returns {object}          Updates to apply to the item data.
   * @private
   */
  _onCreateOwnedTool(data, actorData, isNPC) {
    const updates = {};
    if ( data.data?.proficient === undefined ) {
      if ( isNPC ) {
        updates["data.proficient"] = 1;
      } else {
        const actorToolProfs = actorData.data.traits?.toolProf?.value;
        const proficient =
          actorToolProfs.includes(this.data.data.toolType) || actorToolProfs.includes(this.data.data.baseItem);
        updates["data.proficient"] = Number(proficient);
      }
    }
    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Pre-creation logic for the automatic configuration of owned weapon type Items.
   * @param {object} data       Data for the newly created item.
   * @param {object} actorData  Data for the actor to which the item is being added.
   * @param {boolean} isNPC     Is this actor an NPC?
   * @returns {object}          Updates to apply to the item data.
   * @private
   */
  _onCreateOwnedWeapon(data, actorData, isNPC) {
    const updates = {};

    // NPCs automatically equip items and are proficient with them
    if ( isNPC ) {
      updates["data.equipped"] = true;
      updates["data.proficient"] = true;
      return updates;
    }

    if ( data.data?.proficient !== undefined ) return updates;

    // Some weapon types are always proficient
    const weaponProf = CONFIG.DND5E.weaponProficienciesMap[this.data.data.weaponType];
    if ( weaponProf === true ) updates["data.proficient"] = true;

    // Characters may have proficiency in this weapon type (or specific base weapon)
    else {
      const actorProfs = actorData.data.traits?.weaponProf?.value || [];
      updates["data.proficient"] = actorProfs.includes(weaponProf) || actorProfs.includes(this.data.data.baseItem);
    }
    return updates;
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Create a consumable spell scroll Item from a spell Item.
   * @param {Item5e} spell      The spell to be made into a scroll
   * @returns {Item5e}          The created scroll consumable item
   */
  static async createScrollFromSpell(spell) {

    // Get spell data
    const itemData = (spell instanceof Item5e) ? spell.toObject() : spell;
    const {
      actionType, description, source, activation, duration, target, range, damage, formula, save, level
    } = itemData.data;

    // Get scroll data
    const scrollUuid = `Compendium.${CONFIG.DND5E.sourcePacks.ITEMS}.${CONFIG.DND5E.spellScrollIds[level]}`;
    const scrollItem = await fromUuid(scrollUuid);
    const scrollData = scrollItem.toObject();
    delete scrollData._id;

    // Split the scroll description into an intro paragraph and the remaining details
    const scrollDescription = scrollData.data.description.value;
    const pdel = "</p>";
    const scrollIntroEnd = scrollDescription.indexOf(pdel);
    const scrollIntro = scrollDescription.slice(0, scrollIntroEnd + pdel.length);
    const scrollDetails = scrollDescription.slice(scrollIntroEnd + pdel.length);

    // Create a composite description from the scroll description and the spell details
    const desc = `${scrollIntro}<hr/><h3>${itemData.name} (Level ${level})</h3><hr/>${description.value}<hr/><h3>Scroll Details</h3><hr/>${scrollDetails}`;

    // Create the spell scroll data
    const spellScrollData = foundry.utils.mergeObject(scrollData, {
      name: `${game.i18n.localize("DND5E.SpellScroll")}: ${itemData.name}`,
      img: itemData.img,
      data: {
        "description.value": desc.trim(), source, actionType, activation, duration, target, range, damage, formula,
        save, level
      }
    });
    return new this(spellScrollData);
  }
}
