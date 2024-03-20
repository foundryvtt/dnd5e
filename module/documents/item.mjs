import AdvancementManager from "../applications/advancement/advancement-manager.mjs";
import AdvancementConfirmationDialog from "../applications/advancement/advancement-confirmation-dialog.mjs";
import ClassData from "../data/item/class.mjs";
import ContainerData from "../data/item/container.mjs";
import EquipmentData from "../data/item/equipment.mjs";
import SpellData from "../data/item/spell.mjs";
import PhysicalItemTemplate from "../data/item/templates/physical-item.mjs";
import {d20Roll, damageRoll} from "../dice/dice.mjs";
import simplifyRollFormula from "../dice/simplify-roll-formula.mjs";
import Advancement from "./advancement/advancement.mjs";
import AbilityUseDialog from "../applications/item/ability-use-dialog.mjs";
import Proficiency from "./actor/proficiency.mjs";
import SystemDocumentMixin from "./mixins/document.mjs";

/**
 * Override and extend the basic Item implementation.
 */
export default class Item5e extends SystemDocumentMixin(Item) {

  /**
   * Caches an item linked to this one, such as a subclass associated with a class.
   * @type {Item5e}
   * @private
   */
  _classLink;

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeSource(data, options={}) {
    // Migrate backpack -> container.
    if ( data.type === "backpack" ) {
      data.type = "container";
      foundry.utils.setProperty(data, "flags.dnd5e.persistSourceMigration", true);
    }
    return super._initializeSource(data, options);
  }

  /* -------------------------------------------- */
  /*  Item Properties                             */
  /* -------------------------------------------- */

  /**
   * Which ability score modifier is used by this item?
   * @type {string|null}
   * @see {@link ActionTemplate#abilityMod}
   */
  get abilityMod() {
    return this.system.abilityMod ?? null;
  }

  /* --------------------------------------------- */

  /**
   * The item that contains this item, if it is in a container. Returns a promise if the item is located
   * in a compendium pack.
   * @type {Item5e|Promise<Item5e>|void}
   */
  get container() {
    if ( !this.system.container ) return;
    if ( this.isEmbedded ) return this.actor.items.get(this.system.container);
    if ( this.pack ) return game.packs.get(this.pack).getDocument(this.system.container);
    return game.items.get(this.system.container);
  }

  /* -------------------------------------------- */

  /**
   * What is the critical hit threshold for this item, if applicable?
   * @type {number|null}
   * @see {@link ActionTemplate#criticalThreshold}
   */
  get criticalThreshold() {
    return this.system.criticalThreshold ?? null;
  }

  /* --------------------------------------------- */

  /**
   * Does the Item implement an ability check as part of its usage?
   * @type {boolean}
   * @see {@link ActionTemplate#hasAbilityCheck}
   */
  get hasAbilityCheck() {
    return this.system.hasAbilityCheck ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does this item support advancement and have advancements defined?
   * @type {boolean}
   */
  get hasAdvancement() {
    return !!this.system.advancement?.length;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item have an area of effect target?
   * @type {boolean}
   * @see {@link ActivatedEffectTemplate#hasAreaTarget}
   */
  get hasAreaTarget() {
    return this.system.hasAreaTarget ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement an attack roll as part of its usage?
   * @type {boolean}
   * @see {@link ActionTemplate#hasAttack}
   */
  get hasAttack() {
    return this.system.hasAttack ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a damage roll as part of its usage?
   * @type {boolean}
   * @see {@link ActionTemplate#hasDamage}
   */
  get hasDamage() {
    return this.system.hasDamage ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item target one or more distinct targets?
   * @type {boolean}
   * @see {@link ActivatedEffectTemplate#hasIndividualTarget}
   */
  get hasIndividualTarget() {
    return this.system.hasIndividualTarget ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Is this Item limited in its ability to be used by charges or by recharge?
   * @type {boolean}
   * @see {@link ActivatedEffectTemplate#hasLimitedUses}
   * @see {@link FeatData#hasLimitedUses}
   */
  get hasLimitedUses() {
    return this.system.hasLimitedUses ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does this Item draw from a resource?
   * @type {boolean}
   * @see {@link ActivatedEffectTemplate#hasResource}
   */
  get hasResource() {
    return this.system.hasResource ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does this Item draw from ammunition?
   * @type {boolean}
   * @see {@link ActivatedEffectTemplate#hasAmmo}
   */
  get hasAmmo() {
    return this.system.hasAmmo ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a saving throw as part of its usage?
   * @type {boolean}
   * @see {@link ActionTemplate#hasSave}
   */
  get hasSave() {
    return this.system.hasSave ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item have a target?
   * @type {boolean}
   * @see {@link ActivatedEffectTemplate#hasTarget}
   */
  get hasTarget() {
    return this.system.hasTarget ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Return an item's identifier.
   * @type {string}
   */
  get identifier() {
    return this.system.identifier || this.name.slugify({strict: true});
  }

  /* --------------------------------------------- */

  /**
   * Is this Item an activatable item?
   * @type {boolean}
   */
  get isActive() {
    return this.system.isActive ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Is this item any of the armor subtypes?
   * @type {boolean}
   * @see {@link EquipmentTemplate#isArmor}
   */
  get isArmor() {
    return this.system.isArmor ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does the item provide an amount of healing instead of conventional damage?
   * @type {boolean}
   * @see {@link ActionTemplate#isHealing}
   */
  get isHealing() {
    return this.system.isHealing ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Is this item a separate large object like a siege engine or vehicle component that is
   * usually mounted on fixtures rather than equipped, and has its own AC and HP?
   * @type {boolean}
   * @see {@link EquipmentData#isMountable}
   * @see {@link WeaponData#isMountable}
   */
  get isMountable() {
    return this.system.isMountable ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Is this class item the original class for the containing actor? If the item is not a class or it is not
   * embedded in an actor then this will return `null`.
   * @type {boolean|null}
   */
  get isOriginalClass() {
    if ( this.type !== "class" || !this.isEmbedded || !this.parent.system.details?.originalClass ) return null;
    return this.id === this.parent.system.details.originalClass;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a versatile damage roll as part of its usage?
   * @type {boolean}
   * @see {@link ActionTemplate#isVersatile}
   */
  get isVersatile() {
    return this.system.isVersatile ?? false;
  }

  /* --------------------------------------------- */

  /**
   * Does this item require concentration?
   * @type {boolean}
   */
  get requiresConcentration() {
    const isValid = this.system.validProperties.has("concentration") && this.system.properties.has("concentration");
    return isValid && this.isActive && this.system.hasScalarDuration;
  }

  /* -------------------------------------------- */

  /**
   * Class associated with this subclass. Always returns null on non-subclass or non-embedded items.
   * @type {Item5e|null}
   */
  get class() {
    if ( !this.isEmbedded || (this.type !== "subclass") ) return null;
    const cid = this.system.classIdentifier;
    return this._classLink ??= this.parent.items.find(i => (i.type === "class") && (i.identifier === cid));
  }

  /* -------------------------------------------- */

  /**
   * Subclass associated with this class. Always returns null on non-class or non-embedded items.
   * @type {Item5e|null}
   */
  get subclass() {
    if ( !this.isEmbedded || (this.type !== "class") ) return null;
    const items = this.parent.items;
    const cid = this.identifier;
    return this._classLink ??= items.find(i => (i.type === "subclass") && (i.system.classIdentifier === cid));
  }

  /* -------------------------------------------- */

  /**
   * Retrieve scale values for current level from advancement data.
   * @type {object}
   */
  get scaleValues() {
    if ( !this.advancement.byType.ScaleValue ) return {};
    const level = this.type === "class" ? this.system.levels : this.type === "subclass" ? this.class?.system.levels
      : this.parent?.system.details.level ?? 0;
    return this.advancement.byType.ScaleValue.reduce((obj, advancement) => {
      obj[advancement.identifier] = advancement.valueForLevel(level);
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * Does this item scale with any kind of consumption?
   * @type {string|null}
   */
  get usageScaling() {
    const { level, preparation, consume } = this.system;
    const isLeveled = (this.type === "spell") && (level > 0);
    if ( isLeveled && CONFIG.DND5E.spellPreparationModes[preparation.mode]?.upcast ) return "slot";
    else if ( isLeveled && this.hasResource && consume.scale ) return "resource";
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Spellcasting details for a class or subclass.
   *
   * @typedef {object} SpellcastingDescription
   * @property {string} type              Spellcasting type as defined in ``CONFIG.DND5E.spellcastingTypes`.
   * @property {string|null} progression  Progression within the specified spellcasting type if supported.
   * @property {string} ability           Ability used when casting spells from this class or subclass.
   * @property {number|null} levels       Number of levels of this class or subclass's class if embedded.
   */

  /**
   * Retrieve the spellcasting for a class or subclass. For classes, this will return the spellcasting
   * of the subclass if it overrides the class. For subclasses, this will return the class's spellcasting
   * if no spellcasting is defined on the subclass.
   * @type {SpellcastingDescription|null}  Spellcasting object containing progression & ability.
   */
  get spellcasting() {
    const spellcasting = this.system.spellcasting;
    if ( !spellcasting ) return null;
    const isSubclass = this.type === "subclass";
    const classSC = isSubclass ? this.class?.system.spellcasting : spellcasting;
    const subclassSC = isSubclass ? spellcasting : this.subclass?.system.spellcasting;
    const finalSC = foundry.utils.deepClone(
      ( subclassSC && (subclassSC.progression !== "none") ) ? subclassSC : classSC
    );
    if ( !finalSC ) return null;
    finalSC.levels = this.isEmbedded ? (this.system.levels ?? this.class?.system.levels) : null;

    // Temp method for determining spellcasting type until this data is available directly using advancement
    if ( CONFIG.DND5E.spellcastingTypes[finalSC.progression] ) finalSC.type = finalSC.progression;
    else finalSC.type = Object.entries(CONFIG.DND5E.spellcastingTypes).find(([type, data]) => {
      return !!data.progression?.[finalSC.progression];
    })?.[0];

    return finalSC;
  }

  /* -------------------------------------------- */

  /**
   * Should this item's active effects be suppressed.
   * @type {boolean}
   */
  get areEffectsSuppressed() {
    const requireEquipped = (this.type !== "consumable")
      || ["rod", "trinket", "wand"].includes(this.system.type.value);
    if ( requireEquipped && (this.system.equipped === false) ) return true;
    return this.system.attunement === CONFIG.DND5E.attunementTypes.REQUIRED;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.labels = {};

    // Clear out linked item cache
    this._classLink = undefined;

    // Advancement
    this._prepareAdvancement();

    // Item Properties
    if ( this.system.properties ) {
      this.labels.properties = this.system.properties.reduce((acc, prop) => {
        if ( (prop === "concentration") && !this.requiresConcentration ) return acc;
        acc.push({
          abbr: prop,
          label: CONFIG.DND5E.itemProperties[prop]?.label,
          icon: CONFIG.DND5E.itemProperties[prop]?.icon
        });
        return acc;
      }, []);
    }

    // Specialized preparation per Item type
    switch ( this.type ) {
      case "equipment":
        this._prepareEquipment(); break;
      case "feat":
        this._prepareFeat(); break;
      case "spell":
        this._prepareSpell(); break;
      case "weapon":
        this._prepareWeapon(); break;
    }

    // Activated Items
    this._prepareActivation();
    this._prepareAction();
    this._prepareRecovery();

    // Un-owned items can have their final preparation done here, otherwise this needs to happen in the owning Actor
    if ( !this.isOwned ) this.prepareFinalAttributes();
  }

  /* -------------------------------------------- */

  /**
   * Prepare derived data for an equipment-type item and define labels.
   * @protected
   */
  _prepareEquipment() {
    this.labels.armor = this.system.armor.value ? `${this.system.armor.value} ${game.i18n.localize("DND5E.AC")}` : "";
  }

  /* -------------------------------------------- */

  /**
   * Prepare derived data for a feat-type item and define labels.
   * @protected
   */
  _prepareFeat() {
    const act = this.system.activation;
    if ( act?.type === "legendary" ) this.labels.featType = game.i18n.localize("DND5E.LegendaryActionLabel");
    else if ( act?.type === "lair" ) this.labels.featType = game.i18n.localize("DND5E.LairActionLabel");
    else if ( act?.type ) {
      const isAttack = /\w\wak$/.test(this.system.actionType);
      this.labels.featType = game.i18n.localize(isAttack ? "DND5E.Attack" : "DND5E.Action");
    }
    else this.labels.featType = game.i18n.localize("DND5E.Passive");
  }

  /* -------------------------------------------- */

  /**
   * Prepare derived data for a spell-type item and define labels.
   * @protected
   */
  _prepareSpell() {
    const attributes = this.system?.validProperties.reduce((obj, k) => {
      obj[k] = CONFIG.DND5E.itemProperties[k];
      return obj;
    }, {});
    this.system.preparation.mode ||= "prepared";
    this.labels.level = CONFIG.DND5E.spellLevels[this.system.level];
    this.labels.school = CONFIG.DND5E.spellSchools[this.system.school]?.label;
    this.labels.components = this.system.properties.reduce((obj, c) => {
      const config = attributes[c];
      if ( !config ) return obj;
      const { abbreviation: abbr, label, icon } = config;
      obj.all.push({ abbr, label, icon, tag: config.isTag });
      if ( config.isTag ) obj.tags.push(label);
      else obj.vsm.push(abbr);
      return obj;
    }, {all: [], vsm: [], tags: []});
    this.labels.components.vsm = new Intl.ListFormat(game.i18n.lang, { style: "narrow", type: "conjunction" })
      .format(this.labels.components.vsm);
    this.labels.materials = this.system?.materials?.value ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Prepare derived data for a weapon-type item and define labels.
   * @protected
   */
  _prepareWeapon() {
    this.labels.armor = this.system.armor.value ? `${this.system.armor.value} ${game.i18n.localize("DND5E.AC")}` : "";
  }

  /* -------------------------------------------- */

  /**
   * Prepare derived data for activated items and define labels.
   * @protected
   */
  _prepareActivation() {
    if ( !("activation" in this.system) ) return;
    const C = CONFIG.DND5E;

    // Ability Activation Label
    const act = this.system.activation ?? {};
    if ( !act.type ) act.type = null;   // Backwards compatibility
    this.labels.activation = act.type ? [
      (act.type in C.staticAbilityActivationTypes) ? null : act.cost,
      C.abilityActivationTypes[act.type]
    ].filterJoin(" ") : "";

    // Target Label
    let tgt = this.system.target ?? {};
    if ( ["none", ""].includes(tgt.type) ) tgt.type = null;   // Backwards compatibility
    if ( [null, "self"].includes(tgt.type) ) tgt.value = tgt.units = null;
    else if ( tgt.units === "touch" ) tgt.value = null;

    if ( this.hasTarget ) {
      const target = [tgt.value];
      if ( this.hasAreaTarget ) {
        if ( tgt.units in C.movementUnits ) target.push(game.i18n.localize(`DND5E.Dist${tgt.units.capitalize()}Abbr`));
        else target.push(C.distanceUnits[tgt.units]);
      }
      target.push(C.targetTypes[tgt.type]);
      this.labels.target = target.filterJoin(" ");
    }

    // Range Label
    let rng = this.system.range ?? {};
    if ( ["none", ""].includes(rng.units) ) rng.units = null; // Backwards compatibility
    if ( [null, "touch", "self"].includes(rng.units) ) rng.value = rng.long = null;
    if ( this.isActive && rng.units ) {
      this.labels.range = [rng.value, rng.long ? `/ ${rng.long}` : null];
      if ( rng.units in C.movementUnits ) {
        this.labels.range.push(game.i18n.localize(`DND5E.Dist${rng.units.capitalize()}Abbr`));
      }
      else this.labels.range.push(C.distanceUnits[rng.units]);
      this.labels.range = this.labels.range.filterJoin(" ");
    } else this.labels.range = game.i18n.localize("DND5E.None");

    // Recharge Label
    let chg = this.system.recharge ?? {};
    const chgSuffix = `${chg.value}${parseInt(chg.value) < 6 ? "+" : ""}`;
    this.labels.recharge = `${game.i18n.localize("DND5E.Recharge")} [${chgSuffix}]`;
  }

  /* -------------------------------------------- */

  /**
   * Prepare derived data and labels for items which have an action which deals damage.
   * @protected
   */
  _prepareAction() {
    if ( !("actionType" in this.system) ) return;
    let dmg = this.system.damage || {};
    if ( dmg.parts ) {
      const types = CONFIG.DND5E.damageTypes;
      this.labels.damage = dmg.parts.map(d => d[0]).join(" + ").replace(/\+ -/g, "- ");
      this.labels.damageTypes = dmg.parts.map(d => types[d[1]]?.label).join(", ");
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare recovery labels.
   * @protected
   */
  _prepareRecovery() {
    const { per } = this.system.uses ?? {};
    const config = CONFIG.DND5E.limitedUsePeriods[per] ?? {};
    this.labels.recovery = config.abbreviation ?? config.label;
  }

  /* -------------------------------------------- */

  /**
   * Prepare advancement objects from stored advancement data.
   * @protected
   */
  _prepareAdvancement() {
    const minAdvancementLevel = ["class", "subclass"].includes(this.type) ? 1 : 0;
    this.advancement = {
      byId: {},
      byLevel: Object.fromEntries(
        Array.fromRange(CONFIG.DND5E.maxLevel, minAdvancementLevel).map(l => [l, []])
      ),
      byType: {},
      needingConfiguration: []
    };
    for ( const advancement of this.system.advancement ?? [] ) {
      if ( !(advancement instanceof Advancement) ) continue;
      this.advancement.byId[advancement.id] = advancement;
      this.advancement.byType[advancement.type] ??= [];
      this.advancement.byType[advancement.type].push(advancement);
      advancement.levels.forEach(l => this.advancement.byLevel[l]?.push(advancement));
      if ( !advancement.levels.length
        || ((advancement.levels.length === 1) && (advancement.levels[0] < minAdvancementLevel)) ) {
        this.advancement.needingConfiguration.push(advancement);
      }
    }
    Object.entries(this.advancement.byLevel).forEach(([lvl, data]) => data.sort((a, b) => {
      return a.sortingValueForLevel(lvl).localeCompare(b.sortingValueForLevel(lvl), game.i18n.lang);
    }));
  }

  /* -------------------------------------------- */

  /**
   * Determine an item's proficiency level based on its parent actor's proficiencies.
   * @protected
   */
  _prepareProficiency() {
    if ( !["spell", "weapon", "equipment", "tool", "feat", "consumable"].includes(this.type) ) return;
    if ( !this.actor?.system.attributes?.prof ) {
      this.system.prof = new Proficiency(0, 0);
      return;
    }

    this.system.prof = new Proficiency(this.actor.system.attributes.prof, this.system.proficiencyMultiplier ?? 0);
  }

  /* -------------------------------------------- */

  /**
   * Compute item attributes which might depend on prepared actor data. If this item is embedded this method will
   * be called after the actor's data is prepared.
   * Otherwise, it will be called at the end of `Item5e#prepareDerivedData`.
   */
  prepareFinalAttributes() {

    // Proficiency
    this._prepareProficiency();

    // Class data
    if ( this.type === "class" ) this.system.isOriginalClass = this.isOriginalClass;

    // Action usage
    if ( "actionType" in this.system ) {
      this.labels.abilityCheck = game.i18n.format("DND5E.AbilityPromptTitle", {
        ability: CONFIG.DND5E.abilities[this.system.ability]?.label ?? ""
      });

      // Saving throws
      this.getSaveDC();

      // To Hit
      this.getAttackToHit();

      // Limited Uses
      this.prepareMaxUses();

      // Duration
      this.prepareDurationValue();

      // Damage Label
      this.getDerivedDamageLabel();
    }
  }

  /* -------------------------------------------- */

  /**
   * Populate a label with the compiled and simplified damage formula based on owned item
   * actor data. This is only used for display purposes and is not related to `Item5e#rollDamage`.
   * @returns {{damageType: string, formula: string, label: string}[]}
   */
  getDerivedDamageLabel() {
    if ( !this.hasDamage || !this.isOwned ) return [];
    const rollData = this.getRollData();
    const damageLabels = { ...CONFIG.DND5E.damageTypes, ...CONFIG.DND5E.healingTypes };
    const derivedDamage = this.system.damage?.parts?.map((damagePart, index) => {
      let formula;
      try {
        formula = damagePart[0];
        if ( (index === 0) && this.system.magicAvailable ) formula = `${formula} + ${this.system.magicalBonus ?? 0}`;
        const roll = new Roll(formula, rollData);
        formula = simplifyRollFormula(roll.formula, { preserveFlavor: true });
      }
      catch(err) {
        const parentInfo = this.parent ? ` on ${this.parent.name} (${this.parent.id})` : "";
        console.warn(`Unable to simplify formula for ${this.name} (${this.id})${parentInfo}`, err);
      }
      const damageType = damagePart[1];
      return { formula, damageType, label: `${formula} ${damageLabels[damageType]?.label ?? ""}` };
    });
    return this.labels.derivedDamage = derivedDamage;
  }

  /* -------------------------------------------- */

  /**
   * Update the derived spell DC for an item that requires a saving throw.
   * @returns {number|null}
   */
  getSaveDC() {
    if ( !this.hasSave ) return null;
    const save = this.system.save;

    // Actor spell-DC based scaling
    if ( save.scaling === "spell" ) {
      save.dc = this.isOwned ? this.actor.system.attributes.spelldc : null;
    }

    // Ability-score based scaling
    else if ( save.scaling !== "flat" ) {
      save.dc = this.isOwned ? this.actor.system.abilities[save.scaling].dc : null;
    }

    // Update labels
    const abl = CONFIG.DND5E.abilities[save.ability]?.label ?? "";
    this.labels.save = game.i18n.format("DND5E.SaveDC", {dc: save.dc || "", ability: abl});
    return save.dc;
  }

  /* -------------------------------------------- */

  /**
   * Update a label to the Item detailing its total to hit bonus from the following sources:
   * - item's actor's proficiency bonus if applicable
   * - item's actor's global bonuses to the given item type
   * - item document's innate & magical attack bonuses
   * - item's ammunition if applicable
   * @returns {{rollData: object, parts: string[]}|null}  Data used in the item's Attack roll.
   */
  getAttackToHit() {
    if ( !this.hasAttack ) return null;
    const flat = this.system.attack.flat;
    const rollData = this.getRollData();
    const parts = [];
    let ammo;

    if ( this.isOwned && !flat ) {
      // Ability score modifier
      if ( this.system.ability !== "none" ) parts.push("@mod");

      // Add proficiency bonus.
      if ( this.system.prof?.hasProficiency ) {
        parts.push("@prof");
        rollData.prof = this.system.prof.term;
      }

      // Actor-level global bonus to attack rolls
      const actorBonus = this.actor.system.bonuses?.[this.system.actionType] || {};
      if ( actorBonus.attack ) parts.push(actorBonus.attack);

      ammo = this.hasAmmo ? this.actor.items.get(this.system.consume.target) : null;
    }

    // Include the item's innate & magical attack bonuses
    if ( this.system.attack.bonus ) parts.push(this.system.attack.bonus);
    if ( this.system.magicalBonus && this.system.magicAvailable && !flat ) parts.push(this.system.magicalBonus);

    // One-time bonus provided by consumed ammunition
    if ( ammo && !flat ) {
      const ammoItemQuantity = ammo.system.quantity;
      const ammoCanBeConsumed = ammoItemQuantity && (ammoItemQuantity - (this.system.consume.amount ?? 0) >= 0);
      const ammoParts = [
        Roll.replaceFormulaData(ammo.system.attack.bonus, rollData),
        ammo.system.magicAvailable ? ammo.system.magicalBonus : null
      ].filter(b => b);
      const ammoIsTypeConsumable = (ammo.type === "consumable") && (ammo.system.type.value === "ammo");
      if ( ammoCanBeConsumed && ammoParts.length && ammoIsTypeConsumable ) {
        parts.push("@ammo");
        rollData.ammo = ammoParts.join(" + ");
      }
    }

    // Condense the resulting attack bonus formula into a simplified label
    const roll = new Roll(parts.join("+"), rollData);
    const formula = simplifyRollFormula(roll.formula) || "0";
    this.labels.modifier = simplifyRollFormula(roll.formula, { deterministic: true }) || "0";
    this.labels.toHit = !/^[+-]/.test(formula) ? `+ ${formula}` : formula;
    return { rollData, parts };
  }

  /* -------------------------------------------- */

  /**
   * Populates the max uses of an item.
   * If the item is an owned item and the `max` is not numeric, calculate based on actor data.
   */
  prepareMaxUses() {
    const uses = this.system.uses;
    if ( !uses?.max ) return;
    let max = uses.max;
    if ( this.isOwned && !Number.isNumeric(max) ) {
      const property = game.i18n.localize("DND5E.UsesMax");
      try {
        const rollData = this.getRollData({ deterministic: true });
        max = Roll.safeEval(this.replaceFormulaData(max, rollData, { property }));
      } catch(e) {
        const message = game.i18n.format("DND5E.FormulaMalformedError", { property, name: this.name });
        this.actor._preparationWarnings.push({ message, link: this.uuid, type: "error" });
        console.error(message, e);
        return;
      }
    }
    uses.max = Number(max);
  }

  /* -------------------------------------------- */

  /**
   * Populate the duration value of an item. If the item is an owned item and the
   * duration value is not numeric, calculate based on actor data.
   */
  prepareDurationValue() {
    const duration = this.system.duration;
    let value = duration?.value;

    if ( !value ) {
      if ( duration?.units ) this.labels.duration = CONFIG.DND5E.timePeriods[duration.units];
      return;
    }

    // If this is an owned item and the value is not numeric, we need to calculate it
    if ( this.isOwned && !Number.isNumeric(value) ) {
      const property = game.i18n.localize("DND5E.Duration");
      try {
        const rollData = this.getRollData({ deterministic: true });
        value = Roll.safeEval(this.replaceFormulaData(value, rollData, { property }));
      } catch(e) {
        const message = game.i18n.format("DND5E.FormulaMalformedError", { property, name: this.name });
        this.actor._preparationWarnings.push({ message, link: this.uuid, type: "error" });
        console.error(message, e);
        return;
      }
    }
    duration.value = Number(value);

    // Now that duration value is a number, set the label
    if ( ["inst", "perm"].includes(duration.units) ) duration.value = null;
    this.labels.duration = [duration.value, CONFIG.DND5E.timePeriods[duration.units]].filterJoin(" ");
  }

  /* -------------------------------------------- */

  /**
   * Replace referenced data attributes in the roll formula with values from the provided data.
   * If the attribute is not found in the provided data, display a warning on the actor.
   * @param {string} formula           The original formula within which to replace.
   * @param {object} data              The data object which provides replacements.
   * @param {object} options
   * @param {string} options.property  Name of the property to which this formula belongs.
   * @returns {string}                 Formula with replaced data.
   */
  replaceFormulaData(formula, data, { property }) {
    const dataRgx = new RegExp(/@([a-z.0-9_-]+)/gi);
    const missingReferences = new Set();
    formula = formula.replace(dataRgx, (match, term) => {
      let value = foundry.utils.getProperty(data, term);
      if ( value == null ) {
        missingReferences.add(match);
        return "0";
      }
      return String(value).trim();
    });
    if ( (missingReferences.size > 0) && this.actor ) {
      const listFormatter = new Intl.ListFormat(game.i18n.lang, { style: "long", type: "conjunction" });
      const message = game.i18n.format("DND5E.FormulaMissingReferenceWarn", {
        property, name: this.name, references: listFormatter.format(missingReferences)
      });
      this.actor._preparationWarnings.push({ message, link: this.uuid, type: "warning" });
    }
    return formula;
  }

  /* -------------------------------------------- */

  /**
   * Configuration data for an item usage being prepared.
   *
   * @typedef {object} ItemUseConfiguration
   * @property {boolean} createMeasuredTemplate     Should this item create a template?
   * @property {boolean} createSummons              Should this item create a summoned creature?
   * @property {boolean} consumeResource            Should this item consume a (non-ammo) resource?
   * @property {boolean} consumeSpellSlot           Should this item (a spell) consume a spell slot?
   * @property {boolean} consumeUsage               Should this item consume its limited uses or recharge?
   * @property {string|number|null} slotLevel       The spell slot type or level to consume by default.
   * @property {string|null} summonsProfile         ID of the summoning profile to use.
   * @property {number|null} resourceAmount         The amount to consume by default when scaling with consumption.
   * @property {boolean} beginConcentrating         Should this item initiate concentration?
   * @property {string|null} endConcentration       The id of the active effect to end concentration on, if any.
   */

  /**
   * Additional options used for configuring item usage.
   *
   * @typedef {object} ItemUseOptions
   * @property {boolean} configureDialog  Display a configuration dialog for the item usage, if applicable?
   * @property {string} rollMode          The roll display mode with which to display (or not) the card.
   * @property {boolean} createMessage    Whether to automatically create a chat message (if true) or simply return
   *                                      the prepared chat message data (if false).
   * @property {object} flags             Additional flags added to the chat message.
   * @property {Event} event              The browser event which triggered the item usage, if any.
   */

  /**
   * Trigger an item usage, optionally creating a chat message with followup actions.
   * @param {ItemUseConfiguration} [config]      Initial configuration data for the usage.
   * @param {ItemUseOptions} [options]           Options used for configuring item usage.
   * @returns {Promise<ChatMessage|object|void>} Chat message if options.createMessage is true, message data if it is
   *                                             false, and nothing if the roll wasn't performed.
   */
  async use(config={}, options={}) {
    let item = this;
    const is = item.system;
    const as = item.actor.system;

    // Ensure the options object is ready
    options = foundry.utils.mergeObject({
      configureDialog: true,
      createMessage: true,
      "flags.dnd5e.use": {type: this.type, itemId: this.id, itemUuid: this.uuid}
    }, options);

    // Define follow-up actions resulting from the item usage
    if ( config.consumeSlotLevel ) {
      console.warn("You are passing 'consumeSlotLevel' to the ItemUseConfiguration object, which now expects a key as 'slotLevel'.");
      config.slotLevel = config.consumeSlotLevel;
      delete config.consumeSlotLevel;
    }
    config = foundry.utils.mergeObject(this._getUsageConfig(), config);

    /**
     * A hook event that fires before an item usage is configured.
     * @function dnd5e.preUseItem
     * @memberof hookEvents
     * @param {Item5e} item                  Item being used.
     * @param {ItemUseConfiguration} config  Configuration data for the item usage being prepared.
     * @param {ItemUseOptions} options       Additional options used for configuring item usage.
     * @returns {boolean}                    Explicitly return `false` to prevent item from being used.
     */
    if ( Hooks.call("dnd5e.preUseItem", item, config, options) === false ) return;

    // Are any default values necessitating a prompt?
    const needsConfiguration = Object.values(config).includes(true);

    // Display configuration dialog
    if ( (options.configureDialog !== false) && needsConfiguration ) {
      const configuration = await AbilityUseDialog.create(item, config);
      if ( !configuration ) return;
      foundry.utils.mergeObject(config, configuration);
    }

    // Handle upcasting
    if ( item.type === "spell" ) {
      let level = null;
      if ( config.slotLevel ) {
        // A spell slot was consumed.
        if ( Number.isInteger(config.slotLevel) ) level = config.slotLevel;
        else if ( config.slotLevel in as.spells ) {
          if ( /^spell([0-9]+)$/.test(config.slotLevel) ) level = parseInt(config.slotLevel.replace("spell", ""));
          else level = as.spells[config.slotLevel].level;
        }
      } else if ( config.resourceAmount ) {
        // A quantity of the resource was consumed.
        const diff = config.resourceAmount - (this.system.consume.amount || 1);
        level = is.level + diff;
      }
      if ( level && (level !== is.level) ) {
        item = item.clone({"system.level": level}, {keepId: true});
        item.prepareData();
        item.prepareFinalAttributes();
      }
    }
    if ( item.type === "spell" ) foundry.utils.mergeObject(options.flags, {"dnd5e.use.spellLevel": item.system.level});

    /**
     * A hook event that fires before an item's resource consumption has been calculated.
     * @function dnd5e.preItemUsageConsumption
     * @memberof hookEvents
     * @param {Item5e} item                  Item being used.
     * @param {ItemUseConfiguration} config  Configuration data for the item usage being prepared.
     * @param {ItemUseOptions} options       Additional options used for configuring item usage.
     * @returns {boolean}                    Explicitly return `false` to prevent item from being used.
     */
    if ( Hooks.call("dnd5e.preItemUsageConsumption", item, config, options) === false ) return;

    // Determine whether the item can be used by testing the chosen values of the config.
    const usage = item._getUsageUpdates(config);
    if ( !usage ) return;

    /**
     * A hook event that fires after an item's resource consumption has been calculated but before any
     * changes have been made.
     * @function dnd5e.itemUsageConsumption
     * @memberof hookEvents
     * @param {Item5e} item                     Item being used.
     * @param {ItemUseConfiguration} config     Configuration data for the item usage being prepared.
     * @param {ItemUseOptions} options          Additional options used for configuring item usage.
     * @param {object} usage
     * @param {object} usage.actorUpdates       Updates that will be applied to the actor.
     * @param {object} usage.itemUpdates        Updates that will be applied to the item being used.
     * @param {object[]} usage.resourceUpdates  Updates that will be applied to other items on the actor.
     * @param {Set<string>} usage.deleteIds     Item ids for those which consumption will delete.
     * @returns {boolean}                       Explicitly return `false` to prevent item from being used.
     */
    if ( Hooks.call("dnd5e.itemUsageConsumption", item, config, options, usage) === false ) return;

    // Commit pending data updates
    const { actorUpdates, itemUpdates, resourceUpdates, deleteIds } = usage;
    if ( !foundry.utils.isEmpty(itemUpdates) ) await item.update(itemUpdates);
    if ( !foundry.utils.isEmpty(deleteIds) ) await this.actor.deleteEmbeddedDocuments("Item", [...deleteIds]);
    if ( !foundry.utils.isEmpty(actorUpdates) ) await this.actor.update(actorUpdates);
    if ( !foundry.utils.isEmpty(resourceUpdates) ) await this.actor.updateEmbeddedDocuments("Item", resourceUpdates);

    // Prepare card data & display it if options.createMessage is true
    const cardData = await item.displayCard(options);

    // Initiate or concentration.
    const effects = [];
    if ( config.beginConcentrating ) {
      const effect = await item.actor.beginConcentrating(item);
      if ( effect ) effects.push(effect);

      if ( config.endConcentration ) {
        const deleted = await item.actor.endConcentration(config.endConcentration);
        effects.push(...deleted);
      }
    }

    // Initiate measured template creation
    let templates;
    if ( config.createMeasuredTemplate ) {
      try {
        templates = await (dnd5e.canvas.AbilityTemplate.fromItem(item))?.drawPreview();
      } catch(err) {
        Hooks.onError("Item5e#use", err, {
          msg: game.i18n.localize("DND5E.PlaceTemplateError"),
          log: "error",
          notify: "error"
        });
      }
    }

    // Initiate summons creation
    let summoned;
    if ( config.createSummons ) {
      try {
        summoned = await item.system.summons.summon(config.summonsProfile);
      } catch(err) {
        Hooks.onError("Item5e#use", err, { log: "error", notify: "error" });
      }
    }

    /**
     * A hook event that fires when an item is used, after the measured template has been created if one is needed.
     * @function dnd5e.useItem
     * @memberof hookEvents
     * @param {Item5e} item                                Item being used.
     * @param {ItemUseConfiguration} config                Configuration data for the roll.
     * @param {ItemUseOptions} options                     Additional options for configuring item usage.
     * @param {MeasuredTemplateDocument[]|null} templates  The measured templates if they were created.
     * @param {ActiveEffect5e[]} effects                   The active effects that were created or deleted.
     * @param {TokenDocument5e[]|null} summoned            Summoned tokens if they were created.
     */
    Hooks.callAll("dnd5e.useItem", item, config, options, templates ?? null, effects, summoned ?? null);

    return cardData;
  }

  /**
   * Prepare an object of possible and default values for item usage. A value that is `null` is ignored entirely.
   * @returns {ItemUseConfiguration}  Configuration data for the roll.
   */
  _getUsageConfig() {
    const { consume, uses, summons, target, level, preparation } = this.system;

    const config = {
      consumeSpellSlot: null,
      slotLevel: null,
      beginConcentrating: null,
      endConcentration: null,
      consumeUsage: null,
      consumeResource: null,
      resourceAmount: null,
      createMeasuredTemplate: null,
      createSummons: null,
      summonsProfile: null
    };

    const scaling = this.usageScaling;
    if ( scaling === "slot" ) {
      config.consumeSpellSlot = true;
      config.slotLevel = (preparation?.mode === "pact") ? "pact" : `spell${level}`;
    } else if ( scaling === "resource" ) {
      config.resourceAmount = consume.amount || 1;
    }
    if ( this.hasLimitedUses ) config.consumeUsage = uses.prompt;
    if ( this.hasResource ) {
      config.consumeResource = true;
      // Do not suggest consuming your own uses if also consuming them through resources.
      if ( consume.target === this.id ) config.consumeUsage = null;
    }
    if ( game.user.can("TEMPLATE_CREATE") && this.hasAreaTarget && canvas.scene ) {
      config.createMeasuredTemplate = target.prompt;
    }
    if ( this.system.hasSummoning && this.system.summons.canSummon && canvas.scene ) {
      config.createSummons = summons.prompt;
      config.summonsProfile = this.system.summons.profiles[0]._id;
    }
    if ( this.requiresConcentration ) {
      config.beginConcentrating = true;
      const { effects } = this.actor.concentration;
      const limit = this.actor.system.attributes?.concentration?.limit ?? 0;
      if ( limit && (limit <= effects.size) ) {
        const id = effects.find(e => {
          const data = e.flags.dnd5e?.itemData ?? {};
          return (data === this.id) || (data._id === this.id);
        })?.id ?? effects.first()?.id ?? null;
        config.endConcentration = id;
      }
    }

    return config;
  }

  /* -------------------------------------------- */

  /**
   * Verify that the consumed resources used by an Item are available and prepare the updates that should
   * be performed. If required resources are not available, display an error and return false.
   * @param {ItemUseConfiguration} config  Configuration data for an item usage being prepared.
   * @returns {object|boolean}             A set of data changes to apply when the item is used, or false.
   * @protected
   */
  _getUsageUpdates(config) {
    const actorUpdates = {};
    const itemUpdates = {};
    const resourceUpdates = [];
    const deleteIds = new Set();

    // Consume own limited uses or recharge
    if ( config.consumeUsage ) {
      const canConsume = this._handleConsumeUses(itemUpdates, actorUpdates, resourceUpdates, deleteIds);
      if ( canConsume === false ) return false;
    }

    // Consume Limited Resource
    if ( config.consumeResource ) {
      const canConsume = this._handleConsumeResource(config, itemUpdates, actorUpdates, resourceUpdates, deleteIds);
      if ( canConsume === false ) return false;
    }

    // Consume Spell Slots
    if ( config.consumeSpellSlot ) {
      const level = this.actor?.system.spells[config.slotLevel];
      const spells = Number(level?.value ?? 0);
      if ( spells === 0 ) {
        const labelKey = config.slotLevel === "pact" ? "DND5E.SpellProgPact" : `DND5E.SpellLevel${this.system.level}`;
        const label = game.i18n.localize(labelKey);
        ui.notifications.warn(game.i18n.format("DND5E.SpellCastNoSlots", {name: this.name, level: label}));
        return false;
      }
      actorUpdates[`system.spells.${config.slotLevel}.value`] = Math.max(spells - 1, 0);
    }

    // Determine whether the item can be used by testing for available concentration.
    if ( config.beginConcentrating ) {
      const { effects } = this.actor.concentration;

      // Case 1: Replacing.
      if ( config.endConcentration ) {
        const replacedEffect = effects.find(i => i.id === config.endConcentration);
        if ( !replacedEffect ) {
          ui.notifications.warn("DND5E.ConcentratingMissingItem", {localize: true});
          return false;
        }
      }

      // Case 2: Starting concentration, but at limit.
      else if ( effects.size >= this.actor.system.attributes.concentration.limit ) {
        ui.notifications.warn("DND5E.ConcentratingLimited", {localize: true});
        return false;
      }
    }

    // Return the configured usage
    return {itemUpdates, actorUpdates, resourceUpdates, deleteIds};
  }

  /* -------------------------------------------- */

  /**
   * Handle update actions required when consuming an item's uses or recharge
   * @param {object} itemUpdates        An object of data updates applied to this item
   * @param {object} actorUpdates       An object of data updates applied to the item owner (Actor)
   * @param {object[]} resourceUpdates  An array of updates to apply to other items owned by the actor
   * @param {Set<string>} deleteIds     A set of item ids that will be deleted off the actor
   * @returns {boolean|void}            Return false to block further progress, or return nothing to continue
   * @protected
   */
  _handleConsumeUses(itemUpdates, actorUpdates, resourceUpdates, deleteIds) {
    const recharge = this.system.recharge || {};
    const uses = this.system.uses || {};
    const quantity = this.system.quantity ?? 1;
    let used = false;

    // Consume recharge.
    if ( recharge.value ) {
      if ( recharge.charged ) {
        itemUpdates["system.recharge.charged"] = false;
        used = true;
      }
    }

    // Consume uses (or quantity).
    else if ( uses.max && uses.per && (uses.value > 0) ) {
      const remaining = Math.max(uses.value - 1, 0);

      if ( remaining > 0 || (!remaining && !uses.autoDestroy) ) {
        used = true;
        itemUpdates["system.uses.value"] = remaining;
      } else if ( quantity >= 2 ) {
        used = true;
        itemUpdates["system.quantity"] = quantity - 1;
        itemUpdates["system.uses.value"] = uses.max;
      } else if ( quantity === 1 ) {
        used = true;
        deleteIds.add(this.id);
      }
    }

    // If the item was not used, return a warning
    if ( !used ) {
      ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: this.name}));
      return false;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle update actions required when consuming an external resource
   * @param {ItemUseConfiguration} usageConfig  Configuration data for an item usage being prepared.
   * @param {object} itemUpdates                An object of data updates applied to this item
   * @param {object} actorUpdates               An object of data updates applied to the item owner (Actor)
   * @param {object[]} resourceUpdates          An array of updates to apply to other items owned by the actor
   * @param {Set<string>} deleteIds             A set of item ids that will be deleted off the actor
   * @returns {boolean|void}                    Return false to block further progress, or return nothing to continue
   * @protected
   */
  _handleConsumeResource(usageConfig, itemUpdates, actorUpdates, resourceUpdates, deleteIds) {
    const consume = this.system.consume || {};
    if ( !consume.type ) return;

    // No consumed target
    const typeLabel = CONFIG.DND5E.abilityConsumptionTypes[consume.type];
    if ( !consume.target ) {
      ui.notifications.warn(game.i18n.format("DND5E.ConsumeWarningNoResource", {name: this.name, type: typeLabel}));
      return false;
    }

    // Identify the consumed resource and its current quantity
    let resource = null;
    let amount = usageConfig.resourceAmount ? usageConfig.resourceAmount : (consume.amount || 0);
    let quantity = 0;
    switch ( consume.type ) {
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
        if ( !resource ) break;
        const uses = resource.system.uses;
        if ( uses.per && uses.max ) quantity = uses.value;
        else if ( resource.system.recharge?.value ) {
          quantity = resource.system.recharge.charged ? 1 : 0;
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
        actorUpdates[`system.${consume.target}`] = remaining;
        break;
      case "ammo":
      case "material":
        resourceUpdates.push({_id: consume.target, "system.quantity": remaining});
        break;
      case "hitDice":
        if ( ["smallest", "largest"].includes(consume.target) ) resource = resource.sort((lhs, rhs) => {
          let sort = lhs.system.hitDice.localeCompare(rhs.system.hitDice, "en", {numeric: true});
          if ( consume.target === "largest" ) sort *= -1;
          return sort;
        });
        let toConsume = amount;
        for ( const cls of resource ) {
          const available = (toConsume > 0 ? cls.system.levels : 0) - cls.system.hitDiceUsed;
          const delta = toConsume > 0 ? Math.min(toConsume, available) : Math.max(toConsume, available);
          if ( delta !== 0 ) {
            resourceUpdates.push({_id: cls.id, "system.hitDiceUsed": cls.system.hitDiceUsed + delta});
            toConsume -= delta;
            if ( toConsume === 0 ) break;
          }
        }
        break;
      case "charges":
        const uses = resource.system.uses || {};
        const recharge = resource.system.recharge || {};
        const update = {_id: consume.target};
        // Reduce quantity of, or delete, the external resource.
        if ( uses.per && uses.max && uses.autoDestroy && (remaining === 0) ) {
          update["system.quantity"] = Math.max(resource.system.quantity - 1, 0);
          update["system.uses.value"] = uses.max ?? 1;
          if ( update["system.quantity"] === 0 ) deleteIds.add(resource.id);
          else resourceUpdates.push(update);
          break;
        }

        // Regular consumption.
        if ( uses.per && uses.max ) update["system.uses.value"] = remaining;
        else if ( recharge.value ) update["system.recharge.charged"] = false;
        resourceUpdates.push(update);
        break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Display the chat card for an Item as a Chat Message
   * @param {ItemUseOptions} [options]  Options which configure the display of the item chat card.
   * @returns {ChatMessage|object}      Chat message if `createMessage` is true, otherwise an object containing
   *                                    message data.
   */
  async displayCard(options={}) {

    // Render the chat card template
    const token = this.actor.token;
    const hasButtons = this.hasAttack || this.hasDamage || this.isVersatile || this.hasSave || this.system.formula
      || this.hasAreaTarget || (this.type === "tool") || this.hasAbilityCheck || this.system.hasSummoning;
    const templateData = {
      hasButtons,
      actor: this.actor,
      config: CONFIG.DND5E,
      tokenId: token?.uuid || null,
      item: this,
      effects: this.effects,
      data: await this.system.getCardData(),
      labels: this.labels,
      hasAttack: this.hasAttack,
      isHealing: this.isHealing,
      hasDamage: this.hasDamage,
      isVersatile: this.isVersatile,
      isSpell: this.type === "spell",
      hasSave: this.hasSave,
      hasAreaTarget: this.hasAreaTarget,
      isTool: this.type === "tool",
      hasAbilityCheck: this.hasAbilityCheck
    };
    const html = await renderTemplate("systems/dnd5e/templates/chat/item-card.hbs", templateData);

    // Create the ChatMessage data object
    const chatData = {
      user: game.user.id,
      content: html,
      speaker: ChatMessage.getSpeaker({actor: this.actor, token}),
      flags: {"core.canPopout": true}
    };
    // TODO: Remove when v11 support is dropped.
    if ( game.release.generation < 12 ) chatData.type = CONST.CHAT_MESSAGE_TYPES.OTHER;

    // If the Item was destroyed in the process of displaying its card - embed the item data in the chat message
    if ( (this.type === "consumable") && !this.actor.items.has(this.id) ) {
      chatData.flags["dnd5e.itemData"] = templateData.item.toObject();
    }

    // Merge in the flags from options
    chatData.flags = foundry.utils.mergeObject(chatData.flags, options.flags);

    /**
     * A hook event that fires before an item chat card is created.
     * @function dnd5e.preDisplayCard
     * @memberof hookEvents
     * @param {Item5e} item             Item for which the chat card is being displayed.
     * @param {object} chatData         Data used to create the chat message.
     * @param {ItemUseOptions} options  Options which configure the display of the item chat card.
     */
    Hooks.callAll("dnd5e.preDisplayCard", this, chatData, options);

    // Apply the roll mode to adjust message visibility
    ChatMessage.applyRollMode(chatData, options.rollMode ?? game.settings.get("core", "rollMode"));

    // Create the Chat Message or return its data
    const card = (options.createMessage !== false) ? await ChatMessage.create(chatData) : chatData;

    /**
     * A hook event that fires after an item chat card is created.
     * @function dnd5e.displayCard
     * @memberof hookEvents
     * @param {Item5e} item              Item for which the chat card is being displayed.
     * @param {ChatMessage|object} card  The created ChatMessage instance or ChatMessageData depending on whether
     *                                   options.createMessage was set to `true`.
     */
    Hooks.callAll("dnd5e.displayCard", this, card);

    return card;
  }

  /* -------------------------------------------- */
  /*  Chat Cards                                  */
  /* -------------------------------------------- */

  /**
   * Prepare an object of chat data used to display a card for the Item in the chat log.
   * @param {object} htmlOptions    Options used by the TextEditor.enrichHTML function.
   * @returns {object}              An object of chat data to render.
   */
  async getChatData(htmlOptions={}) {
    const data = this.toObject().system;

    // Rich text description
    data.description.value = await TextEditor.enrichHTML(data.description.value, {
      async: true,
      relativeTo: this,
      rollData: this.getRollData(),
      ...htmlOptions
    });

    // Type specific properties
    data.properties = [
      ...this.system.chatProperties ?? [],
      ...this.system.equippableItemCardProperties ?? [],
      ...this.system.activatedEffectCardProperties ?? []
    ].filter(p => p);

    return data;
  }

  /* -------------------------------------------- */
  /*  Item Rolls - Attack, Damage, Saves, Checks  */
  /* -------------------------------------------- */

  /**
   * Place an attack roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the d20Roll logic for the core implementation
   *
   * @param {D20RollConfiguration} options  Roll options which are configured and provided to the d20Roll function
   * @returns {Promise<D20Roll|null>}       A Promise which resolves to the created Roll instance
   */
  async rollAttack(options={}) {
    const flags = this.actor.flags.dnd5e ?? {};
    if ( !this.hasAttack ) throw new Error("You may not place an Attack Roll with this Item.");
    let title = `${this.name} - ${game.i18n.localize("DND5E.AttackRoll")}`;

    // Get the parts and rollData for this item's attack
    const {parts, rollData} = this.getAttackToHit();
    if ( options.spellLevel ) rollData.item.level = options.spellLevel;

    // Handle ammunition consumption
    let ammoUpdate = [];
    const consume = this.system.consume;
    const ammo = this.hasAmmo ? this.actor.items.get(consume.target) : null;
    if ( ammo ) {
      const q = ammo.system.quantity;
      const consumeAmount = consume.amount ?? 0;
      if ( q && (q - consumeAmount >= 0) ) {
        title += ` [${ammo.name}]`;
      }

      // Get pending ammunition update
      const usage = this._getUsageUpdates({consumeResource: true});
      if ( usage === false ) return null;
      ammoUpdate = usage.resourceUpdates ?? [];
    }

    // Flags
    const elvenAccuracy = (flags.elvenAccuracy
      && CONFIG.DND5E.characterFlags.elvenAccuracy.abilities.includes(this.abilityMod)) || undefined;

    // Compose roll options
    const rollConfig = foundry.utils.mergeObject({
      actor: this.actor,
      data: rollData,
      critical: this.criticalThreshold,
      title,
      flavor: title,
      elvenAccuracy,
      halflingLucky: flags.halflingLucky,
      dialogOptions: {
        width: 400,
        top: options.event ? options.event.clientY - 80 : null,
        left: window.innerWidth - 710
      },
      messageData: {
        "flags.dnd5e": {
          targets: this.constructor._formatAttackTargets(),
          roll: { type: "attack", itemId: this.id, itemUuid: this.uuid }
        },
        speaker: ChatMessage.getSpeaker({actor: this.actor})
      }
    }, options);
    rollConfig.parts = parts.concat(options.parts ?? []);

    /**
     * A hook event that fires before an attack is rolled for an Item.
     * @function dnd5e.preRollAttack
     * @memberof hookEvents
     * @param {Item5e} item                  Item for which the roll is being performed.
     * @param {D20RollConfiguration} config  Configuration data for the pending roll.
     * @returns {boolean}                    Explicitly return false to prevent the roll from being performed.
     */
    if ( Hooks.call("dnd5e.preRollAttack", this, rollConfig) === false ) return;

    const roll = await d20Roll(rollConfig);
    if ( roll === null ) return null;

    /**
     * A hook event that fires after an attack has been rolled for an Item.
     * @function dnd5e.rollAttack
     * @memberof hookEvents
     * @param {Item5e} item          Item for which the roll was performed.
     * @param {D20Roll} roll         The resulting roll.
     * @param {object[]} ammoUpdate  Updates that will be applied to ammo Items as a result of this attack.
     */
    Hooks.callAll("dnd5e.rollAttack", this, roll, ammoUpdate);

    // Commit ammunition consumption on attack rolls resource consumption if the attack roll was made
    if ( ammoUpdate.length ) await this.actor?.updateEmbeddedDocuments("Item", ammoUpdate);
    return roll;
  }

  /* -------------------------------------------- */

  /**
   * @typedef {object} TargetDescriptor5e
   * @property {string} uuid  The UUID of the target.
   * @property {string} img   The target's image.
   * @property {string} name  The target's name.
   * @property {number} ac    The target's armor class.
   */

  /**
   * Extract salient information about targeted Actors.
   * @returns {TargetDescriptor5e[]}
   * @protected
   */
  static _formatAttackTargets() {
    const targets = new Map();
    for ( const token of game.user.targets ) {
      const { name, img, system, uuid } = token.actor ?? {};
      const ac = system?.attributes?.ac ?? {};
      if ( uuid && Number.isNumeric(ac.value) ) targets.set(uuid, { name, img, uuid, ac: ac.value });
    }
    return Array.from(targets.values());
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
   * @param {DamageRollConfiguration} [config.options]  Additional options passed to the damageRoll function
   * @returns {Promise<DamageRoll[]>}      A Promise which resolves to the created Roll instances, or null if the action
   *                                       cannot be performed.
   */
  async rollDamage({critical, event=null, spellLevel=null, versatile=false, options={}}={}) {
    if ( !this.hasDamage ) throw new Error("You may not make a Damage Roll with this Item.");

    // Get roll data
    const dmg = this.system.damage;
    const properties = Array.from(this.system.properties).filter(p => CONFIG.DND5E.itemProperties[p]?.isPhysical);
    const rollConfigs = dmg.parts.map(([formula, type]) => ({ parts: [formula], type, properties }));
    const rollData = this.getRollData();
    if ( spellLevel ) rollData.item.level = spellLevel;

    // Configure the damage roll
    const actionFlavor = game.i18n.localize(this.system.actionType === "heal" ? "DND5E.Healing" : "DND5E.DamageRoll");
    const title = `${this.name} - ${actionFlavor}`;
    const rollConfig = {
      actor: this.actor,
      critical,
      data: rollData,
      event,
      title: title,
      flavor: this.labels.damageTypes.length ? `${title} (${this.labels.damageTypes})` : title,
      dialogOptions: {
        width: 400,
        top: event ? event.clientY - 80 : null,
        left: window.innerWidth - 710
      },
      messageData: {
        "flags.dnd5e": {
          targets: this.constructor._formatAttackTargets(),
          roll: {type: "damage", itemId: this.id, itemUuid: this.uuid}
        },
        speaker: ChatMessage.getSpeaker({actor: this.actor})
      }
    };

    // Adjust damage from versatile usage
    if ( versatile && dmg.versatile ) {
      rollConfigs[0].parts[0] = dmg.versatile;
      rollConfig.messageData["flags.dnd5e.roll"].versatile = true;
    }

    // Add magical damage if available
    if ( this.system.magicalBonus && this.system.magicAvailable ) {
      rollConfigs[0].parts.push(this.system.magicalBonus);
    }

    // Scale damage from up-casting spells
    const scaling = this.system.scaling;
    if ( this.type === "spell" ) {
      if ( scaling.mode === "cantrip" ) {
        let level;
        if ( this.actor.type === "character" ) level = this.actor.system.details.level;
        else if ( this.system.preparation.mode === "innate" ) level = Math.ceil(this.actor.system.details.cr);
        else level = this.actor.system.details.spellLevel;
        rollConfigs.forEach(c => this._scaleCantripDamage(c.parts, scaling.formula, level, rollData));
      }
      else if ( spellLevel && (scaling.mode === "level") && scaling.formula ) {
        rollConfigs.forEach(c =>
          this._scaleSpellDamage(c.parts, this.system.level, spellLevel, scaling.formula, rollData)
        );
      }
    }

    // Add damage bonus formula
    const actorBonus = foundry.utils.getProperty(this.actor.system, `bonuses.${this.system.actionType}`) || {};
    if ( actorBonus.damage && (parseInt(actorBonus.damage) !== 0) ) {
      rollConfigs[0].parts.push(actorBonus.damage);
    }

    // Only add the ammunition damage if the ammunition is a consumable with type 'ammo'
    const ammo = this.hasAmmo ? this.actor.items.get(this.system.consume.target) : null;
    if ( ammo ) {
      const properties = Array.from(ammo.system.properties).filter(p => CONFIG.DND5E.itemProperties[p]?.isPhysical);
      if ( this.system.properties.has("mgc") && !properties.includes("mgc") ) properties.push("mgc");
      const ammoConfigs = ammo.system.damage.parts.map((([formula, type]) => ({ parts: [formula], type, properties })));
      if ( ammo.system.magicalBonus && ammo.system.magicAvailable ) {
        rollConfigs[0].parts.push("@ammo");
        properties.forEach(p => {
          if ( !rollConfigs[0].properties.includes(p) ) rollConfigs[0].properties.push(p);
        });
        rollData.ammo = ammo.system.magicalBonus;
      }
      rollConfigs.push(...ammoConfigs);
    }

    // Factor in extra critical damage dice from the Barbarian's "Brutal Critical"
    if ( this.system.actionType === "mwak" ) {
      rollConfig.criticalBonusDice = this.actor.getFlag("dnd5e", "meleeCriticalDamageDice") ?? 0;
    }

    // Factor in extra weapon-specific critical damage
    if ( this.system.critical?.damage ) rollConfig.criticalBonusDamage = this.system.critical.damage;

    foundry.utils.mergeObject(rollConfig, options);
    rollConfig.rollConfigs = rollConfigs.concat(options.rollConfigs ?? []);

    /**
     * A hook event that fires before a damage is rolled for an Item.
     * @function dnd5e.preRollDamage
     * @memberof hookEvents
     * @param {Item5e} item                     Item for which the roll is being performed.
     * @param {DamageRollConfiguration} config  Configuration data for the pending roll.
     * @returns {boolean}                       Explicitly return false to prevent the roll from being performed.
     */
    if ( Hooks.call("dnd5e.preRollDamage", this, rollConfig) === false ) return;

    const rolls = await damageRoll(rollConfig);

    /**
     * A hook event that fires after a damage has been rolled for an Item.
     * @function dnd5e.rollDamage
     * @memberof hookEvents
     * @param {Item5e} item                    Item for which the roll was performed.
     * @param {DamageRoll|DamageRoll[]} rolls  The resulting rolls (or single roll if `returnMultiple` is `false`).
     */
    if ( rolls || (rollConfig.returnMultiple && rolls?.length) ) Hooks.callAll("dnd5e.rollDamage", this, rolls);

    return rolls;
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
    if ( add === 0 ) return [];
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

    // Otherwise, add to the first part
    if ( !simplified ) parts[0] = `${parts[0]} + ${s.formula}`;
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
    if ( !this.system.formula ) throw new Error("This Item does not have a formula to roll!");

    const rollConfig = {
      formula: this.system.formula,
      data: this.getRollData(),
      chatMessage: true
    };
    if ( spellLevel ) rollConfig.data.item.level = spellLevel;

    /**
     * A hook event that fires before a formula is rolled for an Item.
     * @function dnd5e.preRollFormula
     * @memberof hookEvents
     * @param {Item5e} item                 Item for which the roll is being performed.
     * @param {object} config               Configuration data for the pending roll.
     * @param {string} config.formula       Formula that will be rolled.
     * @param {object} config.data          Data used when evaluating the roll.
     * @param {boolean} config.chatMessage  Should a chat message be created for this roll?
     * @returns {boolean}                   Explicitly return false to prevent the roll from being performed.
     */
    if ( Hooks.call("dnd5e.preRollFormula", this, rollConfig) === false ) return;

    const roll = await new Roll(rollConfig.formula, rollConfig.data).roll({async: true});

    if ( rollConfig.chatMessage ) {
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor: this.actor}),
        flavor: `${this.name} - ${game.i18n.localize("DND5E.OtherFormula")}`,
        rollMode: game.settings.get("core", "rollMode"),
        messageData: {"flags.dnd5e.roll": {type: "other", itemId: this.id, itemUuid: this.uuid}}
      });
    }

    /**
     * A hook event that fires after a formula has been rolled for an Item.
     * @function dnd5e.rollFormula
     * @memberof hookEvents
     * @param {Item5e} item  Item for which the roll was performed.
     * @param {Roll} roll    The resulting roll.
     */
    Hooks.callAll("dnd5e.rollFormula", this, roll);

    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Perform an ability recharge test for an item which uses the d6 recharge mechanic.
   * @returns {Promise<Roll>}   A Promise which resolves to the created Roll instance
   */
  async rollRecharge() {
    const recharge = this.system.recharge ?? {};
    if ( !recharge.value ) return;

    const rollConfig = {
      formula: "1d6",
      data: this.getRollData(),
      target: parseInt(recharge.value),
      chatMessage: true
    };

    /**
     * A hook event that fires before the Item is rolled to recharge.
     * @function dnd5e.preRollRecharge
     * @memberof hookEvents
     * @param {Item5e} item                 Item for which the roll is being performed.
     * @param {object} config               Configuration data for the pending roll.
     * @param {string} config.formula       Formula that will be used to roll the recharge.
     * @param {object} config.data          Data used when evaluating the roll.
     * @param {number} config.target        Total required to be considered recharged.
     * @param {boolean} config.chatMessage  Should a chat message be created for this roll?
     * @returns {boolean}                   Explicitly return false to prevent the roll from being performed.
     */
    if ( Hooks.call("dnd5e.preRollRecharge", this, rollConfig) === false ) return;

    const roll = await new Roll(rollConfig.formula, rollConfig.data).roll({async: true});
    const success = roll.total >= rollConfig.target;

    if ( rollConfig.chatMessage ) {
      const resultMessage = game.i18n.localize(`DND5E.ItemRecharge${success ? "Success" : "Failure"}`);
      roll.toMessage({
        flavor: `${game.i18n.format("DND5E.ItemRechargeCheck", {name: this.name})} - ${resultMessage}`,
        speaker: ChatMessage.getSpeaker({actor: this.actor, token: this.actor.token})
      });
    }

    /**
     * A hook event that fires after the Item has rolled to recharge, but before any changes have been performed.
     * @function dnd5e.rollRecharge
     * @memberof hookEvents
     * @param {Item5e} item  Item for which the roll was performed.
     * @param {Roll} roll    The resulting roll.
     * @returns {boolean}    Explicitly return false to prevent the item from being recharged.
     */
    if ( Hooks.call("dnd5e.rollRecharge", this, roll) === false ) return roll;

    // Update the Item data
    if ( success ) this.update({"system.recharge.charged": true});

    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Prepare data needed to roll a tool check and then pass it off to `d20Roll`.
   * @param {D20RollConfiguration} [options]  Roll configuration options provided to the d20Roll function.
   * @returns {Promise<Roll>}                 A Promise which resolves to the created Roll instance.
   */
  async rollToolCheck(options={}) {
    if ( this.type !== "tool" ) throw new Error("Wrong item type!");
    return this.actor?.rollToolCheck(this.system.type.baseItem, {
      ability: this.system.ability,
      bonus: this.system.bonus,
      prof: this.system.prof,
      item: this,
      ...options
    });
  }

  /* -------------------------------------------- */

  /**
   * @inheritdoc
   * @param {object} [options]
   * @param {boolean} [options.deterministic] Whether to force deterministic values for data properties that could be
   *                                          either a die term or a flat term.
   */
  getRollData({ deterministic=false }={}) {
    let data;
    if ( this.system.getRollData ) data = this.system.getRollData({ deterministic });
    else {
      if ( !this.actor ) return null;
      data = { ...this.actor.getRollData({ deterministic }), item: { ...this.system } };
    }
    if ( data?.item ) {
      data.item.flags = { ...this.flags };
      data.item.name = this.name;
    }
    return data;
  }

  /* -------------------------------------------- */
  /*  Chat Message Helpers                        */
  /* -------------------------------------------- */

  /**
   * Apply listeners to chat messages.
   * @param {HTML} html  Rendered chat message.
   */
  static chatListeners(html) {
    html.on("click", ".chat-card button[data-action]", this._onChatCardAction.bind(this));
    html.on("click", ".item-name, .collapsible", this._onChatCardToggleContent.bind(this));
    html[0].addEventListener("click", event => {
      if ( event.target.closest("[data-context-menu]") ) {
        event.preventDefault();
        event.stopPropagation();
        event.target.closest("[data-message-id]").dispatchEvent(new PointerEvent("contextmenu", {
          view: window, bubbles: true, cancelable: true
        }));
      }
    });
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

    try {
      // Recover the actor for the chat card
      const actor = await this._getChatCardActor(card);
      if ( !actor ) return;

      // Validate permission to proceed with the roll
      const isTargetted = action === "save";
      if ( !( isTargetted || game.user.isGM || actor.isOwner ) ) return;

      // Get the Item from stored flag data or by the item ID on the Actor
      const storedData = message.getFlag("dnd5e", "itemData");
      let item = storedData ? new this(storedData, {parent: actor}) : actor.items.get(card.dataset.itemId);
      if ( !item ) {
        ui.notifications.error(game.i18n.format("DND5E.ActionWarningNoItem", {
          item: card.dataset.itemId, name: actor.name
        }));
        return null;
      }
      const spellLevel = parseInt(card.dataset.spellLevel) || null;

      // Handle different actions
      let targets;
      switch ( action ) {
        case "abilityCheck":
          targets = this._getChatCardTargets(card);
          for ( let token of targets ) {
            const speaker = ChatMessage.getSpeaker({scene: canvas.scene, token: token.document});
            await token.actor.rollAbilityTest(button.dataset.ability, { event, speaker });
          }
          break;
        case "applyEffect":
          const li = button.closest("li.effect");
          let effect = item.effects.get(li.dataset.effectId);
          if ( !effect ) effect = await fromUuid(li.dataset.uuid);
          let warn = false;
          for ( const token of canvas.tokens.controlled ) {
            if ( await this._applyEffectToToken(effect, token) === false ) warn = true;
          }
          if ( warn ) ui.notifications.warn("DND5E.EffectApplyWarning", { localize: true });
          break;
        case "attack":
          await item.rollAttack({
            event: event,
            spellLevel: spellLevel
          });
          break;
        case "damage":
        case "versatile":
          await item.rollDamage({
            event: event,
            spellLevel: spellLevel,
            versatile: action === "versatile"
          });
          break;
        case "formula":
          await item.rollFormula({event, spellLevel});
          break;
        case "placeTemplate":
          try {
            await dnd5e.canvas.AbilityTemplate.fromItem(item, {"flags.dnd5e.spellLevel": spellLevel})?.drawPreview();
          } catch(err) {
            Hooks.onError("Item5e#_onChatCardAction", err, {
              msg: game.i18n.localize("DND5E.PlaceTemplateError"),
              log: "error",
              notify: "error"
            });
          }
          break;
        case "save":
          targets = this._getChatCardTargets(card);
          for ( let token of targets ) {
            const dc = parseInt(button.dataset.dc);
            const speaker = ChatMessage.getSpeaker({scene: canvas.scene, token: token.document});
            await token.actor.rollAbilitySave(button.dataset.ability, {
              event, speaker, targetValue: Number.isFinite(dc) ? dc : undefined
            });
          }
          break;
        case "summon":
          if ( spellLevel ) item = item.clone({ "system.level": spellLevel });
          await this._onChatCardSummon(message, item);
          break;
        case "toolCheck":
          await item.rollToolCheck({event});
          break;
      }

    } catch(err) {
      Hooks.onError("Item5e._onChatCardAction", err, { log: "error", notify: "error" });
    } finally {
      // Re-enable the button
      button.disabled = false;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle applying an Active Effect to a Token.
   * @param {ActiveEffect5e} effect  The effect.
   * @param {Token5e} token          The token.
   * @returns {Promise<ActiveEffect5e>|false}
   * @protected
   */
  static _applyEffectToToken(effect, token) {
    if ( !game.user.isGM && !token.actor?.isOwner ) return false;

    // Enable an existing effect on the target if it originated from this effect
    const existingEffect = token.actor?.effects.find(e => e.origin === effect.uuid);
    if ( existingEffect ) {
      return existingEffect.update({
        ...effect.constructor.getInitialDuration(),
        disabled: false
      });
    }

    // Otherwise, create a new effect on the target
    const effectData = foundry.utils.mergeObject(effect.toObject(), {
      disabled: false,
      transfer: false,
      origin: effect.uuid
    });
    return ActiveEffect.implementation.create(effectData, { parent: token.actor });
  }

  /* -------------------------------------------- */

  /**
   * Handle summoning from a chat card.
   * @param {ChatMessage5e} message  The message that was clicked.
   * @param {Item5e} item            The item from which to summon.
   */
  static async _onChatCardSummon(message, item) {
    let summonsProfile;

    // No profile specified and only one profile on item, use that one
    if ( item.system.summons.profiles.length === 1 ) {
      summonsProfile = item.system.summons.profiles[0]._id;
    }

    // Otherwise show the item use dialog to get the profile
    else {
      const config = await AbilityUseDialog.create(item, {
        beginConcentrating: null,
        consumeResource: null,
        consumeSpellSlot: null,
        consumeUsage: null,
        createMeasuredTemplate: null,
        createSummons: true
      }, {
        button: {
          icon: '<i class="fa-solid fa-spaghetti-monster-flying"></i>',
          label: game.i18n.localize("DND5E.Summoning.Action.Summon")
        },
        disableScaling: true
      });
      if ( !config?.summonsProfile ) return;
      summonsProfile = config.summonsProfile;
    }

    try {
      await item.system.summons.summon(summonsProfile);
    } catch(err) {
      Hooks.onError("Item5e#_onChatCardSummon", err, { log: "error", notify: "error" });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the visibility of chat card content when the name is clicked
   * @param {Event} event   The originating click event
   * @private
   */
  static _onChatCardToggleContent(event) {
    const header = event.currentTarget;
    if ( header.classList.contains("collapsible") && !event.target.closest(".collapsible-content.card-content") ) {
      event.preventDefault();
      header.classList.toggle("collapsed");

      // Clear the height from the chat popout container so that it appropriately resizes.
      const popout = header.closest(".chat-popout");
      if ( popout ) popout.style.height = "";
    }
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
    if ( !targets.length ) ui.notifications.warn("DND5E.ActionWarningNoToken", {localize: true});
    return targets;
  }

  /* -------------------------------------------- */
  /*  Advancements                                */
  /* -------------------------------------------- */

  /**
   * Create a new advancement of the specified type.
   * @param {string} type                          Type of advancement to create.
   * @param {object} [data]                        Data to use when creating the advancement.
   * @param {object} [options]
   * @param {boolean} [options.showConfig=true]    Should the new advancement's configuration application be shown?
   * @param {boolean} [options.source=false]       Should a source-only update be performed?
   * @returns {Promise<AdvancementConfig>|Item5e}  Promise for advancement config for new advancement if local
   *                                               is `false`, or item with newly added advancement.
   */
  createAdvancement(type, data={}, { showConfig=true, source=false }={}) {
    if ( !this.system.advancement ) return this;

    let config = CONFIG.DND5E.advancementTypes[type];
    if ( !config ) throw new Error(`${type} not found in CONFIG.DND5E.advancementTypes`);
    if ( config.prototype instanceof Advancement ) {
      foundry.utils.logCompatibilityWarning(
        "Advancement type configuration changed into an object with `documentClass` defining the advancement class.",
        { since: "DnD5e 3.1", until: "DnD5e 3.3", once: true }
      );
      config = {
        documentClass: config,
        validItemTypes: config.metadata.validItemTypes
      };
    }
    const cls = config.documentClass;

    if ( !config.validItemTypes.has(this.type) || !cls.availableForItem(this) ) {
      throw new Error(`${type} advancement cannot be added to ${this.name}`);
    }

    const createData = foundry.utils.deepClone(data);
    const advancement = new cls(data, {parent: this});
    if ( advancement._preCreate(createData) === false ) return;

    const advancementCollection = this.toObject().system.advancement;
    advancementCollection.push(advancement.toObject());
    if ( source ) return this.updateSource({"system.advancement": advancementCollection});
    return this.update({"system.advancement": advancementCollection}).then(() => {
      if ( !showConfig ) return this;
      const config = new cls.metadata.apps.config(this.advancement.byId[advancement.id]);
      return config.render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Update an advancement belonging to this item.
   * @param {string} id                       ID of the advancement to update.
   * @param {object} updates                  Updates to apply to this advancement.
   * @param {object} [options={}]
   * @param {boolean} [options.source=false]  Should a source-only update be performed?
   * @returns {Promise<Item5e>|Item5e}        This item with the changes applied, promised if source is `false`.
   */
  updateAdvancement(id, updates, { source=false }={}) {
    if ( !this.system.advancement ) return this;
    const idx = this.system.advancement.findIndex(a => a._id === id);
    if ( idx === -1 ) throw new Error(`Advancement of ID ${id} could not be found to update`);

    const advancement = this.advancement.byId[id];
    advancement.updateSource(updates);
    if ( source ) {
      advancement.render();
      return this;
    }

    const advancementCollection = this.toObject().system.advancement;
    advancementCollection[idx] = advancement.toObject();
    return this.update({"system.advancement": advancementCollection}).then(r => {
      advancement.render();
      return r;
    });
  }

  /* -------------------------------------------- */

  /**
   * Remove an advancement from this item.
   * @param {string} id                       ID of the advancement to remove.
   * @param {object} [options={}]
   * @param {boolean} [options.source=false]  Should a source-only update be performed?
   * @returns {Promise<Item5e>|Item5e}        This item with the changes applied.
   */
  deleteAdvancement(id, { source=false }={}) {
    if ( !this.system.advancement ) return this;

    const advancementCollection = this.toObject().system.advancement.filter(a => a._id !== id);
    if ( source ) return this.updateSource({"system.advancement": advancementCollection});
    return this.update({"system.advancement": advancementCollection});
  }

  /* -------------------------------------------- */

  /**
   * Duplicate an advancement, resetting its value to default and giving it a new ID.
   * @param {string} id                             ID of the advancement to duplicate.
   * @param {object} [options]
   * @param {boolean} [options.showConfig=true]     Should the new advancement's configuration application be shown?
   * @param {boolean} [options.source=false]        Should a source-only update be performed?
   * @returns {Promise<AdvancementConfig>|Item5e}   Promise for advancement config for duplicate advancement if source
   *                                                is `false`, or item with newly duplicated advancement.
   */
  duplicateAdvancement(id, options) {
    const original = this.advancement.byId[id];
    if ( !original ) return this;
    const duplicate = original.toObject();
    delete duplicate._id;
    if ( original.constructor.metadata.dataModels?.value ) {
      duplicate.value = (new original.constructor.metadata.dataModels.value()).toObject();
    } else {
      duplicate.value = original.constructor.metadata.defaults?.value ?? {};
    }
    return this.createAdvancement(original.constructor.typeName, duplicate, options);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getEmbeddedDocument(embeddedName, id, options) {
    if ( embeddedName !== "Advancement" ) return super.getEmbeddedDocument(embeddedName, id, options);
    const advancement = this.advancement.byId[id];
    if ( options?.strict && (advancement === undefined) ) {
      throw new Error(`The key ${id} does not exist in the ${embeddedName} Collection`);
    }
    return advancement;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;

    // Create class identifier based on name
    if ( ["class", "subclass"].includes(this.type) && !this.system.identifier ) {
      await this.updateSource({ "system.identifier": data.name.slugify({strict: true}) });
    }

    if ( !this.isEmbedded || (this.parent.type === "vehicle") ) return;
    const isNPC = this.parent.type === "npc";
    let updates;
    switch (data.type) {
      case "equipment":
        updates = this._onCreateOwnedEquipment(data, isNPC);
        break;
      case "spell":
        updates = this._onCreateOwnedSpell(data, isNPC);
        break;
      case "weapon":
        updates = this._onCreateOwnedWeapon(data, isNPC);
        break;
      case "feat":
        updates = this._onCreateOwnedFeature(data, isNPC);
        break;
    }
    if ( updates ) return this.updateSource(updates);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if ( (userId !== game.user.id) || !this.parent ) return;

    // Assign a new original class
    if ( (this.parent.type === "character") && (this.type === "class") ) {
      const pc = this.parent.items.get(this.parent.system.details.originalClass);
      if ( !pc ) await this.parent._assignPrimaryClass();
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preUpdate(changed, options, user) {
    if ( (await super._preUpdate(changed, options, user)) === false ) return false;

    if ( foundry.utils.hasProperty(changed, "system.container") ) {
      options.formerContainer = (await this.container)?.uuid;
    }

    if ( (this.type !== "class") || !("levels" in (changed.system || {})) ) return;

    // Check to make sure the updated class level isn't below zero
    if ( changed.system.levels <= 0 ) {
      ui.notifications.warn("DND5E.MaxClassLevelMinimumWarn", {localize: true});
      changed.system.levels = 1;
    }

    // Check to make sure the updated class level doesn't exceed level cap
    if ( changed.system.levels > CONFIG.DND5E.maxLevel ) {
      ui.notifications.warn(game.i18n.format("DND5E.MaxClassLevelExceededWarn", {max: CONFIG.DND5E.maxLevel}));
      changed.system.levels = CONFIG.DND5E.maxLevel;
    }
    if ( !this.isEmbedded || (this.parent.type !== "character") ) return;

    // Check to ensure the updated character doesn't exceed level cap
    const newCharacterLevel = this.actor.system.details.level + (changed.system.levels - this.system.levels);
    if ( newCharacterLevel > CONFIG.DND5E.maxLevel ) {
      ui.notifications.warn(game.i18n.format("DND5E.MaxCharacterLevelExceededWarn", {max: CONFIG.DND5E.maxLevel}));
      changed.system.levels -= newCharacterLevel - CONFIG.DND5E.maxLevel;
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDelete(options, userId) {
    super._onDelete(options, userId);
    if ( userId !== game.user.id ) return;

    // Delete a container's contents when it is deleted
    const contents = await this.system.allContainedItems;
    if ( contents?.size && options.deleteContents ) {
      await Item.deleteDocuments(Array.from(contents.map(i => i.id)), { pack: this.pack, parent: this.parent });
    }

    // Assign a new original class
    if ( this.parent && (this.type === "class") && (this.id === this.parent.system.details.originalClass) ) {
      this.parent._assignPrimaryClass();
    }
  }

  /* -------------------------------------------- */

  /**
   * Pre-creation logic for the automatic configuration of owned equipment type Items.
   *
   * @param {object} data       Data for the newly created item.
   * @param {boolean} isNPC     Is this actor an NPC?
   * @returns {object}          Updates to apply to the item data.
   * @private
   */
  _onCreateOwnedEquipment(data, isNPC) {
    const updates = {};
    if ( foundry.utils.getProperty(data, "system.equipped") === undefined ) {
      updates["system.equipped"] = isNPC;  // NPCs automatically equip equipment
    }
    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Pre-creation logic for the automatic configuration of owned spell type Items.
   *
   * @param {object} data       Data for the newly created item.
   * @param {boolean} isNPC     Is this actor an NPC?
   * @returns {object}          Updates to apply to the item data.
   * @private
   */
  _onCreateOwnedSpell(data, isNPC) {
    const updates = {};
    if ( foundry.utils.getProperty(data, "system.preparation.prepared") === undefined ) {
      updates["system.preparation.prepared"] = isNPC; // NPCs automatically prepare spells
    }
    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Pre-creation logic for the automatic configuration of owned weapon type Items.
   * @param {object} data       Data for the newly created item.
   * @param {boolean} isNPC     Is this actor an NPC?
   * @returns {object|void}     Updates to apply to the item data.
   * @private
   */
  _onCreateOwnedWeapon(data, isNPC) {
    if ( !isNPC ) return;
    // NPCs automatically equip items.
    const updates = {};
    if ( !foundry.utils.hasProperty(data, "system.equipped") ) updates["system.equipped"] = true;
    return updates;
  }

  /**
   * Pre-creation logic for the automatic configuration of owned feature type Items.
   * @param {object} data       Data for the newly created item.
   * @param {boolean} isNPC     Is this actor an NPC?
   * @returns {object}          Updates to apply to the item data.
   * @private
   */
  _onCreateOwnedFeature(data, isNPC) {
    const updates = {};
    if ( isNPC && !foundry.utils.getProperty(data, "system.type.value") ) {
      updates["system.type.value"] = "monster"; // Set features on NPCs to be 'monster features'.
    }
    return updates;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async deleteDialog(options={}) {
    // If item has advancement, handle it separately
    if ( this.actor?.system.metadata?.supportsAdvancement && !game.settings.get("dnd5e", "disableAdvancements") ) {
      const manager = AdvancementManager.forDeletedItem(this.actor, this.id);
      if ( manager.steps.length ) {
        try {
          const shouldRemoveAdvancements = await AdvancementConfirmationDialog.forDelete(this);
          if ( shouldRemoveAdvancements ) return manager.render(true);
          return this.delete({ shouldRemoveAdvancements });
        } catch(err) {
          return;
        }
      }
    }

    // Display custom delete dialog when deleting a container with contents
    const count = await this.system.contentsCount;
    if ( count ) {
      return Dialog.confirm({
        title: `${game.i18n.format("DOCUMENT.Delete", {type: game.i18n.localize("DND5E.Container")})}: ${this.name}`,
        content: `<h4>${game.i18n.localize("AreYouSure")}</h4>
          <p>${game.i18n.format("DND5E.ContainerDeleteMessage", {count})}</p>
          <label>
            <input type="checkbox" name="deleteContents">
            ${game.i18n.localize("DND5E.ContainerDeleteContents")}
          </label>`,
        yes: html => {
          const deleteContents = html.querySelector('[name="deleteContents"]').checked;
          this.delete({ deleteContents });
        },
        options: { ...options, jQuery: false }
      });
    }

    return super.deleteDialog(options);
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Prepare creation data for the provided items and any items contained within them. The data created by this method
   * can be passed to `createDocuments` with `keepId` always set to true to maintain links to container contents.
   * @param {Item5e[]} items                     Items to create.
   * @param {object} [context={}]                Context for the item's creation.
   * @param {Item5e} [context.container]         Container in which to create the item.
   * @param {boolean} [context.keepId=false]     Should IDs be maintained?
   * @param {Function} [context.transformAll]    Method called on provided items and their contents.
   * @param {Function} [context.transformFirst]  Method called only on provided items.
   * @returns {Promise<object[]>}                Data for items to be created.
   */
  static async createWithContents(items, { container, keepId=false, transformAll, transformFirst }={}) {
    let depth = 0;
    if ( container ) {
      depth = 1 + (await container.system.allContainers()).length;
      if ( depth > PhysicalItemTemplate.MAX_DEPTH ) {
        ui.notifications.warn(game.i18n.format("DND5E.ContainerMaxDepth", { depth: PhysicalItemTemplate.MAX_DEPTH }));
        return;
      }
    }

    const createItemData = async (item, containerId, depth) => {
      let newItemData = transformAll ? await transformAll(item) : item;
      if ( transformFirst && (depth === 0) ) newItemData = await transformFirst(newItemData);
      if ( !newItemData ) return;
      if ( newItemData instanceof Item ) newItemData = newItemData.toObject();
      foundry.utils.mergeObject(newItemData, {"system.container": containerId} );
      if ( !keepId ) newItemData._id = foundry.utils.randomID();

      created.push(newItemData);

      const contents = await item.system.contents;
      if ( contents && (depth < PhysicalItemTemplate.MAX_DEPTH) ) {
        for ( const doc of contents ) await createItemData(doc, newItemData._id, depth + 1);
      }
    };

    const created = [];
    for ( const item of items ) await createItemData(item, container?.id, depth);
    return created;
  }

  /* -------------------------------------------- */

  /**
   * Create a consumable spell scroll Item from a spell Item.
   * @param {Item5e|object} spell     The spell or item data to be made into a scroll
   * @param {object} [options]        Additional options that modify the created scroll
   * @returns {Promise<Item5e>}       The created scroll consumable item
   */
  static async createScrollFromSpell(spell, options={}) {

    // Get spell data
    const itemData = (spell instanceof Item5e) ? spell.toObject() : spell;

    /**
     * A hook event that fires before the item data for a scroll is created.
     * @function dnd5e.preCreateScrollFromSpell
     * @memberof hookEvents
     * @param {object} itemData    The initial item data of the spell to convert to a scroll
     * @param {object} [options]   Additional options that modify the created scroll
     * @returns {boolean}          Explicitly return false to prevent the scroll to be created.
     */
    if ( Hooks.call("dnd5e.preCreateScrollFromSpell", itemData, options) === false ) return;

    let {
      actionType, description, source, activation, duration, target,
      range, damage, formula, save, level, attack, ability, properties
    } = itemData.system;

    // Get scroll data
    let scrollUuid;
    const id = CONFIG.DND5E.spellScrollIds[level];
    if ( foundry.data.validators.isValidId(id) ) {
      scrollUuid = game.packs.get(CONFIG.DND5E.sourcePacks.ITEMS).index.get(id).uuid;
    } else {
      scrollUuid = id;
    }
    const scrollItem = await fromUuid(scrollUuid);
    const scrollData = scrollItem.toObject();
    delete scrollData._id;

    // Split the scroll description into an intro paragraph and the remaining details
    const scrollDescription = scrollData.system.description.value;
    const pdel = "</p>";
    const scrollIntroEnd = scrollDescription.indexOf(pdel);
    const scrollIntro = scrollDescription.slice(0, scrollIntroEnd + pdel.length);
    const scrollDetails = scrollDescription.slice(scrollIntroEnd + pdel.length);
    const isConc = properties.includes("concentration");

    // Create a composite description from the scroll description and the spell details
    const desc = [
      scrollIntro,
      "<hr>",
      `<h3>${itemData.name} (${game.i18n.format("DND5E.LevelNumber", {level})})</h3>`,
      isConc ? `<p><em>${game.i18n.localize("DND5E.ScrollRequiresConcentration")}</em></p>` : null,
      "<hr>",
      description.value,
      "<hr>",
      `<h3>${game.i18n.localize("DND5E.ScrollDetails")}</h3>`,
      "<hr>",
      scrollDetails
    ].filterJoin("");

    // Used a fixed attack modifier and saving throw according to the level of spell scroll.
    if ( ["mwak", "rwak", "msak", "rsak"].includes(actionType) ) {
      attack = { bonus: scrollData.system.attack.bonus };
    }
    if ( save.ability ) {
      save.scaling = "flat";
      save.dc = scrollData.system.save.dc;
    }

    // Create the spell scroll data
    const spellScrollData = foundry.utils.mergeObject(scrollData, {
      name: `${game.i18n.localize("DND5E.SpellScroll")}: ${itemData.name}`,
      img: itemData.img,
      effects: itemData.effects ?? [],
      system: {
        description: {value: desc.trim()}, source, actionType, activation, duration, target,
        range, damage, formula, save, level, ability, properties, attack: {bonus: attack.bonus, flat: true}
      }
    });
    foundry.utils.mergeObject(spellScrollData, options);
    spellScrollData.system.properties = [
      "mgc",
      ...scrollData.system.properties,
      ...properties ?? [],
      ...options.system?.properties ?? []
    ];

    /**
     * A hook event that fires after the item data for a scroll is created but before the item is returned.
     * @function dnd5e.createScrollFromSpell
     * @memberof hookEvents
     * @param {Item5e|object} spell       The spell or item data to be made into a scroll.
     * @param {object} spellScrollData    The final item data used to make the scroll.
     */
    Hooks.callAll("dnd5e.createScrollFromSpell", spell, spellScrollData);
    return new this(spellScrollData);
  }

  /* -------------------------------------------- */

  /**
   * Spawn a dialog for creating a new Item.
   * @param {object} [data]  Data to pre-populate the Item with.
   * @param {object} [context]
   * @param {Actor5e} [context.parent]       A parent for the Item.
   * @param {string|null} [context.pack]     A compendium pack the Item should be placed in.
   * @param {string[]|null} [context.types]  A list of types to restrict the choices to, or null for no restriction.
   * @returns {Promise<Item5e|null>}
   */
  static async createDialog(data={}, { parent=null, pack=null, types=null, ...options }={}) {
    types ??= game.documentTypes[this.documentName].filter(t => (t !== CONST.BASE_DOCUMENT_TYPE) && (t !== "backpack"));
    if ( !types.length ) return null;
    const collection = parent ? null : pack ? game.packs.get(pack) : game.collections.get(this.documentName);
    const folders = collection?._formatFolderSelectOptions() ?? [];
    const label = game.i18n.localize(this.metadata.label);
    const title = game.i18n.format("DOCUMENT.Create", { type: label });
    const name = data.name || game.i18n.format("DOCUMENT.New", { type: label });
    let type = data.type || CONFIG[this.documentName]?.defaultType;
    if ( !types.includes(type) ) type = types[0];
    const content = await renderTemplate("systems/dnd5e/templates/apps/document-create.hbs", {
      folders, name, type,
      folder: data.folder,
      hasFolders: folders.length > 0,
      types: types.reduce((arr, type) => {
        const label = CONFIG[this.documentName]?.typeLabels?.[type] ?? type;
        arr.push({
          type,
          label: game.i18n.has(label) ? game.i18n.localize(label) : type,
          icon: this.getDefaultArtwork({ type })?.img ?? "icons/svg/item-bag.svg"
        });
        return arr;
      }, []).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
    });
    return Dialog.prompt({
      title, content,
      label: title,
      render: html => {
        const app = html.closest(".app");
        const folder = app.querySelector("select");
        if ( folder ) app.querySelector(".dialog-buttons").insertAdjacentElement("afterbegin", folder);
        app.querySelectorAll(".window-header .header-button").forEach(btn => {
          const label = btn.innerText;
          const icon = btn.querySelector("i");
          btn.innerHTML = icon.outerHTML;
          btn.dataset.tooltip = label;
          btn.setAttribute("aria-label", label);
        });
        app.querySelector(".document-name").select();
      },
      callback: html => {
        const form = html.querySelector("form");
        const fd = new FormDataExtended(form);
        const createData = foundry.utils.mergeObject(data, fd.object, { inplace: false });
        if ( !createData.folder ) delete createData.folder;
        if ( !createData.name?.trim() ) createData.name = this.defaultName();
        return this.create(createData, { parent, pack, renderSheet: true });
      },
      rejectClose: false,
      options: { ...options, jQuery: false, width: 350, classes: ["dnd5e2", "create-document", "dialog"] }
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static getDefaultArtwork(itemData={}) {
    const { type } = itemData;
    const { img } = super.getDefaultArtwork(itemData);
    return { img: CONFIG.DND5E.defaultArtwork.Item[type] ?? img };
  }

  /* -------------------------------------------- */
  /*  Migrations & Deprecations                   */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static migrateData(source) {
    source = super.migrateData(source);
    if ( source.type === "class" ) ClassData._migrateTraitAdvancement(source);
    else if ( source.type === "container" ) ContainerData._migrateWeightlessData(source);
    else if ( source.type === "equipment" ) EquipmentData._migrateStealth(source);
    else if ( source.type === "spell" ) SpellData._migrateComponentData(source);
    return source;
  }
}
