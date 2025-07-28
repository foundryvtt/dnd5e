import ActiveEffect5e from "../../../documents/active-effect.mjs";
import Proficiency from "../../../documents/actor/proficiency.mjs";
import { convertLength, convertWeight, defaultUnits, replaceFormulaData, simplifyBonus } from "../../../utils.mjs";
import AdvantageModeField from "../../fields/advantage-mode-field.mjs";
import FormulaField from "../../fields/formula-field.mjs";
import MovementField from "../../shared/movement-field.mjs";
import RollConfigField from "../../shared/roll-config-field.mjs";
import SensesField from "../../shared/senses-field.mjs";

const { NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { MovementData } from "../../shared/movement-field.mjs"
 * @import { RollConfigData } from "../../shared/roll-config-field.mjs"
 * @import { SensesData } from "../../shared/senses-field.mjs"
 */

/**
 * @typedef {object} ArmorClassData
 * @property {string} calc     Name of one of the built-in formulas to use.
 * @property {number} flat     Flat value used for flat or natural armor calculation.
 * @property {string} formula  Custom formula to use.
 */

/**
 * Shared contents of the attributes schema between various actor types.
 */
export default class AttributesFields {
  /**
   * Armor class fields shared between characters, NPCs, and vehicles.
   *
   * @type {ArmorClassData}
   */
  static get armorClass() {
    return {
      calc: new StringField({ initial: "default", label: "DND5E.ArmorClassCalculation" }),
      flat: new NumberField({ integer: true, min: 0, label: "DND5E.ArmorClassFlat" }),
      formula: new FormulaField({ deterministic: true, label: "DND5E.ArmorClassFormula" })
    };
  }

  /* -------------------------------------------- */

  /**
   * Fields shared between characters, NPCs, and vehicles.
   *
   * @type {object}
   * @property {ArmorClassData} ac       Armor class configuration.
   * @property {RollConfigData} init
   * @property {string} init.ability     The ability used for initiative rolls.
   * @property {string} init.bonus       The bonus provided to initiative rolls.
   * @property {MovementData} movement
   */
  static get common() {
    return {
      ac: new SchemaField(this.armorClass, { label: "DND5E.ArmorClass" }),
      init: new RollConfigField({
        ability: "",
        bonus: new FormulaField({ required: true, label: "DND5E.InitiativeBonus" })
      }, { label: "DND5E.Initiative" }),
      movement: new MovementField()
    };
  }

  /* -------------------------------------------- */

  /**
   * Fields shared between characters and NPCs.
   *
   * @type {object}
   * @property {object} attunement
   * @property {number} attunement.max              Maximum number of attuned items.
   * @property {SensesData} senses
   * @property {string} spellcasting                Primary spellcasting ability.
   * @property {number} exhaustion                  Creature's exhaustion level.
   * @property {RollConfigData} concentration
   * @property {string} concentration.ability       The ability used for concentration saving throws.
   * @property {object} concentration.bonuses
   * @property {string} concentration.bonuses.save  The bonus provided to concentration saving throws.
   * @property {number} concentration.limit         The amount of items this actor can concentrate on.
   * @property {object} loyalty
   * @property {number} loyalty.value               The creature's loyalty score.
   */
  static get creature() {
    return {
      attunement: new SchemaField({
        max: new NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 3, label: "DND5E.AttunementMax"
        })
      }, { label: "DND5E.Attunement" }),
      senses: new SensesField(),
      spellcasting: new StringField({ required: true, blank: true, label: "DND5E.SpellAbility" }),
      exhaustion: new NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.Exhaustion"
      }),
      concentration: new RollConfigField({
        ability: "",
        bonuses: new SchemaField({
          save: new FormulaField({ required: true, label: "DND5E.ConcentrationBonus" })
        }),
        limit: new NumberField({ integer: true, min: 0, initial: 1, label: "DND5E.ConcentrationLimit" })
      }, { label: "DND5E.Concentration" }),
      loyalty: new SchemaField({
        value: new NumberField({ integer: true, min: 0, max: 20, label: "DND5E.Loyalty" })
      })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /**
   * Migrate the old init.value and incorporate it into init.bonus.
   * @param {object} source  The source attributes object.
   * @internal
   */
  static _migrateInitiative(source) {
    const init = source?.init;
    if ( !init?.value || (typeof init?.bonus === "string") ) return;
    if ( init.bonus ) init.bonus += init.value < 0 ? ` - ${init.value * -1}` : ` + ${init.value}`;
    else init.bonus = `${init.value}`;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Initialize derived AC fields for Active Effects to target.
   * @this {CharacterData|NPCData|VehicleData}
   */
  static prepareBaseArmorClass() {
    const ac = this.attributes.ac;
    ac.armor = 10;
    ac.shield = ac.cover = 0;
    ac.min = ac.bonus = "";
  }

  /* -------------------------------------------- */

  /**
   * Initialize base encumbrance fields to be targeted by active effects.
   * @this {CharacterData|NPCData|VehicleData}
   */
  static prepareBaseEncumbrance() {
    const encumbrance = this.attributes.encumbrance ??= {};
    encumbrance.multipliers = { encumbered: "1", heavilyEncumbered: "1", maximum: "1", overall: "1" };
    encumbrance.bonuses = { encumbered: "", heavilyEncumbered: "", maximum: "", overall: "" };
  }

  /* -------------------------------------------- */

  /**
   * Prepare a character's AC value from their equipped armor and shield.
   * @this {CharacterData|NPCData|VehicleData}
   * @param {object} rollData  The Actor's roll data.
   */
  static prepareArmorClass(rollData) {
    const ac = this.attributes.ac;

    // Apply automatic migrations for older data structures
    let cfg = CONFIG.DND5E.armorClasses[ac.calc];
    if ( !cfg ) {
      ac.calc = "flat";
      if ( Number.isNumeric(ac.value) ) ac.flat = Number(ac.value);
      cfg = CONFIG.DND5E.armorClasses.flat;
    }

    // Identify Equipped Items
    const { armors, shields } = this.parent.itemTypes.equipment.reduce((obj, equip) => {
      if ( !equip.system.equipped || !(equip.system.type.value in CONFIG.DND5E.armorTypes)) return obj;
      if ( equip.system.type.value === "shield" ) obj.shields.push(equip);
      else obj.armors.push(equip);
      return obj;
    }, { armors: [], shields: [] });

    // Set stealth disadvantage
    if ( armors[0]?.system.properties.has("stealthDisadvantage") ) {
      AdvantageModeField.setMode(this, "skills.ste.roll.mode", -1);
    }

    ac.label = !["custom", "flat"].includes(ac.calc) ? CONFIG.DND5E.armorClasses[ac.calc]?.label : null;

    // Determine base AC
    switch ( ac.calc ) {

      // Flat AC (no additional bonuses)
      case "flat":
        ac.value = Number(ac.flat);
        return;

      // Natural AC (includes bonuses)
      case "natural":
        ac.base = Number(ac.flat);
        break;

      default:
        let formula = ac.calc === "custom" ? ac.formula : cfg.formula;
        if ( armors.length ) {
          if ( armors.length > 1 ) this.parent._preparationWarnings.push({
            message: game.i18n.localize("DND5E.WarnMultipleArmor"), type: "warning"
          });
          const armorData = armors[0].system.armor;
          const isHeavy = armors[0].system.type.value === "heavy";
          ac.armor = armorData.value ?? ac.armor;
          ac.dex = isHeavy ? 0 : Math.min(armorData.dex ?? Infinity, this.abilities.dex?.mod ?? 0);
          ac.equippedArmor = armors[0];
        }
        else ac.dex = this.abilities.dex?.mod ?? 0;

        if ( !ac.equippedArmor ) ac.label = null;

        rollData.attributes.ac = ac;
        try {
          const replaced = replaceFormulaData(formula, rollData, {
            actor: this, missing: null, property: game.i18n.localize("DND5E.ArmorClass")
          });
          ac.base = replaced ? new Roll(replaced).evaluateSync().total : 0;
        } catch(err) {
          this.parent._preparationWarnings.push({
            message: game.i18n.format("DND5E.WarnBadACFormula", { formula }), link: "armor", type: "error"
          });
          const replaced = Roll.replaceFormulaData(CONFIG.DND5E.armorClasses.default.formula, rollData);
          ac.base = new Roll(replaced).evaluateSync().total;
        }
        break;
    }

    // Equipped Shield
    if ( shields.length ) {
      if ( shields.length > 1 ) this.parent._preparationWarnings.push({
        message: game.i18n.localize("DND5E.WarnMultipleShields"), type: "warning"
      });
      ac.shield = shields[0].system.armor.value ?? 0;
      ac.equippedShield = shields[0];
    }

    // Compute cover.
    ac.cover = Math.max(ac.cover, this.parent.coverBonus);

    // Compute total AC and return
    ac.min = simplifyBonus(ac.min, rollData);
    ac.bonus = simplifyBonus(ac.bonus, rollData);
    ac.value = Math.max(ac.min, ac.base + ac.shield + ac.bonus + ac.cover);
  }

  /* -------------------------------------------- */

  /**
   * Prepare concentration data for an Actor.
   * @this {CharacterData|NPCData}
   * @param {object} rollData  The Actor's roll data.
   */
  static prepareConcentration(rollData) {
    const { concentration } = this.attributes;
    const abilityId = concentration.ability || CONFIG.DND5E.defaultAbilities.concentration;
    const ability = this.abilities?.[abilityId] || {};
    const bonus = simplifyBonus(concentration.bonuses.save, rollData);
    concentration.save = (ability.save?.value ?? 0) + bonus;
  }

  /* -------------------------------------------- */

  /**
   * Calculate encumbrance details for an Actor.
   * @this {CharacterData|NPCData|VehicleData}
   * @param {object} rollData  The Actor's roll data.
   * @param {object} [options]
   * @param {Function} [options.validateItem]  Determine whether an item's weight should count toward encumbrance.
   */
  static prepareEncumbrance(rollData, { validateItem }={}) {
    const config = CONFIG.DND5E.encumbrance;
    const encumbrance = this.attributes.encumbrance ??= {};
    const baseUnits = CONFIG.DND5E.encumbrance.baseUnits[this.parent.type]
      ?? CONFIG.DND5E.encumbrance.baseUnits.default;
    const unitSystem = game.settings.get("dnd5e", "metricWeightUnits") ? "metric" : "imperial";

    // Get the total weight from items
    let weight = this.parent.items
      .filter(item => !item.container && (validateItem?.(item) ?? true))
      .reduce((weight, item) => weight + (item.system.totalWeightIn?.(baseUnits[unitSystem]) ?? 0), 0);

    // [Optional] add Currency Weight (for non-transformed actors)
    const currency = this.currency;
    if ( game.settings.get("dnd5e", "currencyWeight") && currency ) {
      const numCoins = Object.values(currency).reduce((val, denom) => val + Math.max(denom, 0), 0);
      const currencyPerWeight = config.currencyPerWeight[unitSystem];
      weight += convertWeight(
        numCoins / currencyPerWeight,
        config.baseUnits.default[unitSystem],
        baseUnits[unitSystem]
      );
    }

    // Determine the Encumbrance size class
    const keys = Object.keys(CONFIG.DND5E.actorSizes);
    const index = keys.findIndex(k => k === this.traits.size);
    const sizeConfig = CONFIG.DND5E.actorSizes[
      keys[this.parent.flags.dnd5e?.powerfulBuild ? Math.min(index + 1, keys.length - 1) : index]
    ];
    const sizeMod = sizeConfig?.capacityMultiplier ?? sizeConfig?.token ?? 1;
    let maximumMultiplier;

    const calculateThreshold = threshold => {
      let base = this.abilities.str?.value ?? 10;
      const bonus = simplifyBonus(encumbrance.bonuses?.[threshold], rollData)
        + simplifyBonus(encumbrance.bonuses?.overall, rollData);
      let multiplier = simplifyBonus(encumbrance.multipliers[threshold], rollData)
        * simplifyBonus(encumbrance.multipliers.overall, rollData);
      if ( threshold === "maximum" ) maximumMultiplier = multiplier;
      if ( this.parent.type === "vehicle" ) base = this.attributes.capacity.cargo;
      else multiplier *= (config.threshold[threshold]?.[unitSystem] ?? 1) * sizeMod;
      return (base * multiplier).toNearest(0.1) + bonus;
    };

    // Populate final Encumbrance values
    encumbrance.value = weight.toNearest(0.1);
    encumbrance.thresholds = {
      encumbered: calculateThreshold("encumbered"),
      heavilyEncumbered: calculateThreshold("heavilyEncumbered"),
      maximum: calculateThreshold("maximum")
    };
    encumbrance.max = encumbrance.thresholds.maximum;
    encumbrance.mod = (sizeMod * maximumMultiplier).toNearest(0.1);
    encumbrance.stops = {
      encumbered: Math.clamp((encumbrance.thresholds.encumbered * 100) / encumbrance.max, 0, 100),
      heavilyEncumbered: Math.clamp((encumbrance.thresholds.heavilyEncumbered * 100) / encumbrance.max, 0, 100)
    };
    encumbrance.pct = Math.clamp((encumbrance.value * 100) / encumbrance.max, 0, 100);
    encumbrance.encumbered = encumbrance.value > encumbrance.heavilyEncumbered;
  }

  /* -------------------------------------------- */

  /**
   * Adjust exhaustion level based on Active Effects.
   * @this {CharacterData|NPCData}
   */
  static prepareExhaustionLevel() {
    const exhaustion = this.parent.effects.get(ActiveEffect5e.ID.EXHAUSTION);
    const level = exhaustion?.getFlag("dnd5e", "exhaustionLevel");
    this.attributes.exhaustion = Number.isFinite(level) ? level : 0;
  }

  /* -------------------------------------------- */

  /**
   * Calculate maximum hit points, taking an provided advancement into consideration.
   * @param {object} hp                 HP object to calculate.
   * @param {object} [options={}]
   * @param {HitPointsAdvancement[]} [options.advancement=[]]  Advancement items from which to get hit points per-level.
   * @param {number} [options.bonus=0]  Additional bonus to add atop the calculated value.
   * @param {number} [options.mod=0]    Modifier for the ability to add to hit points from advancement.
   * @this {ActorDataModel}
   */
  static prepareHitPoints(hp, { advancement=[], mod=0, bonus=0 }={}) {
    const base = advancement.reduce((total, advancement) => total + advancement.getAdjustedTotal(mod), 0);
    hp.max = (hp.max ?? 0) + base + bonus;
    if ( this.parent.hasConditionEffect("halfHealth") ) hp.max = Math.floor(hp.max * 0.5);

    hp.effectiveMax = Math.max(hp.max + (hp.tempmax ?? 0), 0);
    hp.value = Math.min(hp.value, hp.effectiveMax);
    hp.damage = hp.effectiveMax - hp.value;
    hp.pct = Math.clamp(hp.effectiveMax ? (hp.value / hp.effectiveMax) * 100 : 0, 0, 100);
  }

  /* -------------------------------------------- */

  /**
   * Prepare the initiative data for an actor.
   * @this {CharacterData|NPCData|VehicleData}
   * @param {object} rollData  The Actor's roll data.
   */
  static prepareInitiative(rollData) {
    const init = this.attributes.init ??= {};
    const flags = this.parent.flags.dnd5e ?? {};
    const globalCheckBonus = simplifyBonus(this.bonuses?.abilities?.check, rollData);

    // Compute initiative modifier
    const abilityId = init.ability || CONFIG.DND5E.defaultAbilities.initiative;
    const ability = this.abilities?.[abilityId] || {};
    init.mod = ability.mod ?? 0;

    // Initiative proficiency
    const isLegacy = game.settings.get("dnd5e", "rulesVersion") === "legacy";
    const prof = this.attributes.prof ?? 0;
    const joat = flags.jackOfAllTrades && isLegacy;
    const ra = this.parent._isRemarkableAthlete(abilityId);
    const alert = flags.initiativeAlert && !isLegacy;
    init.prof = new Proficiency(prof, alert ? 1 : (joat || ra) ? 0.5 : 0, !ra);

    // Adjust rolling mode
    if ( (flags.remarkableAthlete && !isLegacy) || this.parent.hasConditionEffect("initiativeAdvantage") ) {
      AdvantageModeField.setMode(this, "attributes.init.roll.mode", 1);
    }
    if ( this.parent.hasConditionEffect("initiativeDisadvantage") ) {
      AdvantageModeField.setMode(this, "attributes.init.roll.mode", -1);
    }

    // Total initiative includes all numeric terms
    const initBonus = simplifyBonus(init.bonus, rollData);
    const abilityBonus = simplifyBonus(ability.bonuses?.check, rollData);
    init.total = init.mod + initBonus + abilityBonus + globalCheckBonus
      + (flags.initiativeAlert && isLegacy ? 5 : 0)
      + (Number.isNumeric(init.prof.term) ? init.prof.flat : 0);
    init.score = CONFIG.DND5E.skillPassive.base + init.total + (init.roll.mode * CONFIG.DND5E.skillPassive.modifier);
  }

  /* -------------------------------------------- */

  /**
   * Modify movement speeds taking exhaustion and any other conditions into account.
   * @this {CharacterData|NPCData}
   */
  static prepareMovement() {
    const statuses = this.parent.statuses;
    const noMovement = this.parent.hasConditionEffect("noMovement");
    const halfMovement = this.parent.hasConditionEffect("halfMovement");
    const encumbered = statuses.has("encumbered");
    const heavilyEncumbered = statuses.has("heavilyEncumbered");
    const exceedingCarryingCapacity = statuses.has("exceedingCarryingCapacity");
    const crawl = this.parent.hasConditionEffect("crawl");
    const units = this.attributes.movement.units ??= defaultUnits("length");
    let reduction = game.settings.get("dnd5e", "rulesVersion") === "modern"
      ? (this.attributes.exhaustion ?? 0) * (CONFIG.DND5E.conditionTypes.exhaustion?.reduction?.speed ?? 0) : 0;
    reduction = convertLength(reduction, CONFIG.DND5E.defaultUnits.length.imperial, units);
    for ( const type of Object.keys(CONFIG.DND5E.movementTypes) ) {
      let speed = Math.max(0, this.attributes.movement[type] - reduction);
      if ( noMovement || (crawl && (type !== "walk")) ) speed = 0;
      else {
        if ( halfMovement ) speed *= 0.5;
        if ( heavilyEncumbered ) {
          speed = Math.max(0, speed - (CONFIG.DND5E.encumbrance.speedReduction.heavilyEncumbered[units] ?? 0));
        } else if ( encumbered ) {
          speed = Math.max(0, speed - (CONFIG.DND5E.encumbrance.speedReduction.encumbered[units] ?? 0));
        }
        if ( exceedingCarryingCapacity ) {
          speed = Math.min(speed, CONFIG.DND5E.encumbrance.speedReduction.exceedingCarryingCapacity[units] ?? 0);
        }
      }
      this.attributes.movement[type] = speed;
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply movement and sense changes based on a race item. This method should be called during
   * the `prepareEmbeddedData` step of data preparation.
   * @param {Item5e} race                    Race item from which to get the stats.
   * @param {object} [options={}]
   * @param {boolean} [options.force=false]  Override any values on the actor.
   * @this {CharacterData|NPCData}
   */
  static prepareRace(race, { force=false }={}) {
    for ( const key of Object.keys(CONFIG.DND5E.movementTypes) ) {
      if ( !race.system.movement[key] || (!force && (this.attributes.movement[key] !== null)) ) continue;
      this.attributes.movement[key] = race.system.movement[key];
    }
    if ( race.system.movement.hover ) this.attributes.movement.hover = true;
    if ( force && race.system.movement.units ) this.attributes.movement.units = race.system.movement.units;
    else this.attributes.movement.units ??= race.system.movement.units;

    for ( const key of Object.keys(CONFIG.DND5E.senses) ) {
      if ( !race.system.senses[key] || (!force && (this.attributes.senses[key] !== null)) ) continue;
      this.attributes.senses[key] = race.system.senses[key];
    }
    this.attributes.senses.special = [this.attributes.senses.special, race.system.senses.special].filterJoin(";");
    if ( force && race.system.senses.units ) this.attributes.senses.units = race.system.senses.units;
    else this.attributes.senses.units ??= race.system.senses.units;
  }

  /* -------------------------------------------- */

  /**
   * Prepare spellcasting DC & modifier.
   * @this {CharacterData|NPCData}
   */
  static prepareSpellcastingAbility() {
    const ability = this.abilities?.[this.attributes.spellcasting];
    this.attributes.spell ??= {};
    this.attributes.spell.abilityLabel = CONFIG.DND5E.abilities[this.attributes.spellcasting]?.label ?? "";
    this.attributes.spell.attack = ability ? ability.attack : this.attributes.prof;
    this.attributes.spell.dc = ability ? ability.dc : 8 + this.attributes.prof;
    this.attributes.spell.mod = ability ? ability.mod : 0;
  }
}
