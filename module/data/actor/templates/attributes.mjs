import Proficiency from "../../../documents/actor/proficiency.mjs";
import AppliedRules from "../../../documents/applied-rules.mjs";
import { applyFallProne } from "../../../rules/falling.mjs";
import { convertLength, convertWeight, defaultUnits, replaceFormulaData, simplifyBonus } from "../../../utils.mjs";
import AdvantageModeField from "../../fields/advantage-mode-field.mjs";
import ConditionData from "../../active-effect/condition.mjs";
import FormulaField from "../../fields/formula-field.mjs";
import MovementField from "../../shared/movement-field.mjs";
import RollConfigField from "../../shared/roll-config-field.mjs";
import SensesField from "../../shared/senses-field.mjs";
import ACFormulasField from "../fields/ac-formulas-field.mjs";

const { NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { ActorRollData, DeathSaveOutcome } from "../../../documents/_types.mjs";
 * @import { ArmorClassData, AttributesCommonData, AttributesCreatureData, HitPointsData } from "./_types.mjs";
 */

/**
 * Shared contents of the attributes schema between various actor types.
 */
export default class AttributesFields {
  /**
   * Armor class fields shared between characters, NPCs, and vehicles.
   * @type {ArmorClassData}
   */
  static get armorClass() {
    return {
      armor: new NumberField({
        integer: true, min: 0, initial: 10, persisted: false, label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.armor.label"
      }),
      base: new NumberField({
        integer: true, initial: -Infinity, persisted: false, label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.base.label"
      }),
      bonus: new FormulaField({
        deterministic: true, persisted: false, label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.bonus.label"
      }),
      calc: new StringField({ persisted: false, label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.calc.label" }),
      calcs: new SetField(new StringField(), {
        initial: ["unarmored", "armored"], label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.calcs.label",
        hint: "DND5E.ARMORCLASS.FIELDS.attributes.ac.calcs.hint"
      }),
      cover: new NumberField({
        integer: true, min: 0, initial: 0, persisted: false, label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.cover.label"
      }),
      flat: new NumberField({
        required: true, integer: true, min: 0, label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.flat.label",
        hint: "DND5E.ARMORCLASS.FIELDS.attributes.ac.flat.hint"
      }),
      formula: new StringField({ persisted: false, label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.formula.label" }),
      formulas: new ACFormulasField(),
      min: new FormulaField({
        deterministic: true, persisted: false, label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.min.label"
      }),
      override: new NumberField({
        min: 0, integer: true, label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.override.label", initial: null,
        hint: "DND5E.ARMORCLASS.FIELDS.attributes.ac.override.hint"
      }),
      shield: new NumberField({
        integer: true, min: 0, initial: 0, persisted: false, label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.shield.label"
      })
    };
  }

  /* -------------------------------------------- */
  /**
   * Hit points fields shared between NPCs, objects, and vehicles.
   * @type {HitPointsData}
   */
  static get hitPoints() {
    return {
      dt: new NumberField({ integer: true, min: 0, label: "DND5E.DamageThreshold" }),
      max: new NumberField({ nullable: true, integer: true, min: 0, initial: null, label: "DND5E.HitPointsMax" }),
      temp: new NumberField({ integer: true, initial: 0, min: 0, label: "DND5E.HitPointsTemp" }),
      tempmax: new NumberField({
        integer: true, initial: 0, label: "DND5E.HitPointsTempMax", hint: "DND5E.HitPointsTempMaxHint"
      }),
      value: new NumberField({ nullable: true, integer: true, min: 0, initial: null, label: "DND5E.HitPointsCurrent" })
    };
  }

  /* -------------------------------------------- */

  /**
   * Fields shared between characters, NPCs, and vehicles.
   * @type {AttributesCommonData}
   */
  static get common() {
    return {
      ac: new SchemaField(this.armorClass, { label: "DND5E.ArmorClass" }),
      encumbrance: new SchemaField({
        bonuses: new SchemaField({
          encumbered: new FormulaField({
            deterministic: true,
            label: "DND5E.ENCUMBRANCE.FIELDS.attributes.encumbrance.bonuses.encumbered.label"
          }),
          heavilyEncumbered: new FormulaField({
            deterministic: true,
            label: "DND5E.ENCUMBRANCE.FIELDS.attributes.encumbrance.bonuses.heavilyEncumbered.label"
          }),
          maximum: new FormulaField({
            deterministic: true,
            label: "DND5E.ENCUMBRANCE.FIELDS.attributes.encumbrance.bonuses.maximum.label"
          }),
          overall: new FormulaField({
            deterministic: true,
            label: "DND5E.ENCUMBRANCE.FIELDS.attributes.encumbrance.bonuses.overall.label"
          })
        }),
        multipliers: new SchemaField({
          encumbered: new FormulaField({
            deterministic: true, initial: "1",
            label: "DND5E.ENCUMBRANCE.FIELDS.attributes.encumbrance.multipliers.encumbered.label"
          }),
          heavilyEncumbered: new FormulaField({
            deterministic: true, initial: "1",
            label: "DND5E.ENCUMBRANCE.FIELDS.attributes.encumbrance.multipliers.heavilyEncumbered.label"
          }),
          maximum: new FormulaField({
            deterministic: true, initial: "1",
            label: "DND5E.ENCUMBRANCE.FIELDS.attributes.encumbrance.multipliers.maximum.label"
          }),
          overall: new FormulaField({
            deterministic: true, initial: "1",
            label: "DND5E.ENCUMBRANCE.FIELDS.attributes.encumbrance.multipliers.overall.label"
          })
        })
      }, { persisted: false }),
      init: new RollConfigField({
        bonuses: new SchemaField({}, { persisted: false })
      }, { label: "DND5E.Initiative", labelPrefix: "DND5E.INITIATIVE.FIELDS.attributes.init.roll." }),
      movement: new MovementField()
    };
  }

  /* -------------------------------------------- */

  /**
   * Fields shared between characters and NPCs.
   * @type {AttributesCreatureData}
   */
  static get creature() {
    return {
      attunement: new SchemaField({
        max: new NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 3, label: "DND5E.AttunementMax"
        }),
        value: new NumberField({ integer: true, min: 0, initial: 0, persisted: false })
      }, { label: "DND5E.Attunement" }),
      senses: new SensesField(),
      spell: new SchemaField({
        attack: new NumberField({ integer: true }),
        dc: new NumberField({ integer: true }),
        mod: new NumberField({ integer: true })
      }, { persisted: false }),
      spellcasting: new StringField({ required: true, blank: true, label: "DND5E.SpellAbility" }),
      exhaustion: new NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.Exhaustion"
      }),
      concentration: new RollConfigField({
        bonuses: new SchemaField({}, { persisted: false }),
        limit: new NumberField({
          integer: true, min: 0, initial: 1, label: "DND5E.CONCENTRATION.FIELDS.attributes.concentration.limit.label"
        })
      }, { label: "DND5E.Concentration", labelPrefix: "DND5E.CONCENTRATION.FIELDS.attributes.concentration.roll." }),
      loyalty: new SchemaField({
        value: new NumberField({ integer: true, min: 0, max: 20, label: "DND5E.Loyalty" })
      })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /**
   * Migrate the old single armor formula into formulas.
   * @param {object} [source]  The source attributes object.
   * @internal
   */
  static _migrateArmorClass(source) {
    const ac = source?.ac ?? {};
    if ( Number.isNumeric(ac.value) && !CONFIG.DND5E.armorClasses[ac.calc] ) {
      ac.override = Number(ac.value);
      delete ac.value;
    }

    if ( !ac.calc ) return;
    switch ( ac.calc ) {
      case "custom":
        ac.formulas ??= [];
        ac.formulas.push({ formula: ac.formula });
        break;
      case "flat":
        ac.override = ac.flat;
        break;
      case "default": break;
      case "natural":
        ac.calcs = ["natural"];
        break;
      default:
        ac.calcs ??= ["unarmored", "armored"];
        ac.calcs.push(ac.calc);
        break;
    }
    delete ac.calc;
    delete ac.formula;
  }

  /* -------------------------------------------- */

  /**
   * Migrate the old init.value and incorporate it into init.bonus.
   * @param {object} [source]  The source attributes object.
   * @internal
   */
  static _migrateInitiative(source) {
    const init = source?.init;
    if ( !init?.value || (typeof init?.bonus === "string") ) return;
    init.roll ??= {};
    if ( init.roll.bonus ) init.roll.bonus += init.value < 0 ? ` - ${init.value * -1}` : ` + ${init.value}`;
    else init.roll.bonus = `${init.value}`;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Initialize derived AC fields for Active Effects to target.
   * @this {CharacterData|NPCData|VehicleData}
   */
  static prepareBaseArmorClass() {}

  /* -------------------------------------------- */

  /**
   * Initialize base encumbrance fields to be targeted by active effects.
   * @this {CharacterData|NPCData|VehicleData}
   */
  static prepareBaseEncumbrance() {}

  /* -------------------------------------------- */

  /**
   * Prepare a character's AC value from their equipped armor and shield.
   * @this {CharacterData|NPCData|VehicleData}
   * @param {ActorRollData} rollData  The Actor's roll data.
   */
  static prepareArmorClass(rollData) {
    const ac = this.attributes.ac;
    ac.label = "";
    ac.flat ||= 0;

    // Add formulas set by old-style AEs
    if ( ac.calc === "flat" ) ac.override = ac.flat;
    else if ( (ac.calc === "custom") && ac.formula ) ac.formulas.push({
      formula: ac.formula, label: _loc("DND5E.ARMORCLASS.Calculation.Custom")
    });
    else if ( ac.calc in CONFIG.DND5E.armorClasses ) ac.calcs.add(ac.calc);

    // Add selected formulas
    const baseFormulas = foundry.utils.iterateEntries(CONFIG.DND5E.armorClasses)
      .filter(([id]) => ac.calcs.has(id))
      .map(([id, data]) => ({ ...data, id, type: "base" }));
    ac.formulas.unshift(...baseFormulas);

    // Identify Equipped Items
    const { armors, shields } = this.parent.itemTypes.equipment.reduce((obj, equip) => {
      if ( !equip.system.equipped || !(equip.system.type.value in CONFIG.DND5E.armorTypes)) return obj;
      if ( equip.system.type.value === "shield" ) obj.shields.push(equip);
      else obj.armors.push(equip);
      return obj;
    }, { armors: [], shields: [] });

    // Equipped Armor
    if ( armors.length ) {
      if ( armors.length > 1 ) this.parent._preparationWarnings.push({
        message: _loc("DND5E.WarnMultipleArmor"), type: "warning"
      });
      ac.equippedArmor = armors[0];
      ac.armor = ac.equippedArmor.system.armor.value ?? ac.armor;
      if ( ac.equippedArmor.system.properties.has("stealthDisadvantage") && this.skills ) {
        AdvantageModeField.setMode(this, "skills.ste.roll.mode", -1);
      }
    }

    // Equipped Shield
    if ( shields.length ) {
      if ( shields.length > 1 ) this.parent._preparationWarnings.push({
        message: _loc("DND5E.WarnMultipleShields"), type: "warning"
      });
      ac.equippedShield = shields[0];
      ac.shield = ac.equippedShield.system.armor.value ?? 0;
    }

    // If armor is equipped, prepare clamped abilities
    const isHeavy = ac.equippedArmor?.system.type.value === "heavy";
    ac.clamped = Object.entries(this.abilities).reduce((obj, [k, v]) => {
      obj[k] = isHeavy ? 0 : Math.min(v.mod, ac.equippedArmor?.system.armor.dex ?? Infinity);
      return obj;
    }, {});
    ac.dex = ac.clamped.dex;

    const validFormulas = ac.formulas.filter(formula => {
      if ( !formula.formula ) return false;
      if ( (typeof formula.armored === "boolean") && (formula.armored !== !!ac.equippedArmor) ) return false;
      if ( (typeof formula.shielded === "boolean") && (formula.shielded !== !!ac.equippedShield) ) return false;
      return true;
    });

    for ( const config of validFormulas ) {
      try {
        const replaced = replaceFormulaData(config.formula, rollData, {
          actor: this, missing: null, property: _loc("DND5E.ArmorClass")
        });
        const result = replaced ? new Roll(replaced).evaluateSync().total : 0;
        if ( result > ac.base ) {
          ac.activeFormula = config;
          ac.base = result;
          ac.calc = config.id ?? "custom";
          ac.formula = config.formula;
          if ( config.id === "armored" ) ac.label = ac.equippedArmor.name;
          else ac.label = config.label ?? "";
        }
      } catch {
        this.parent._preparationWarnings.push({
          message: _loc("DND5E.WarnBadACFormula", { formula: config.formula }), link: "armor", type: "error"
        });
      }
    }

    if ( !Number.isFinite(ac.base) ) {
      ac.base = ac.flat ?? 0;
      ac.calc = "natural";
      ac.formula = "@attributes.ac.flat";
    }

    ac.cover = Math.max(ac.cover, this.parent.coverBonus);
    ac.min = simplifyBonus(ac.min, rollData);
    ac.bonus = simplifyBonus(ac.bonus, rollData);
    if ( Number.isFinite(ac.override) ) ac.value = ac.override;
    else ac.value = Math.max(ac.min, ac.base + ac.shield + ac.bonus + ac.cover);
  }

  /* -------------------------------------------- */

  /**
   * Prepare concentration data for an Actor.
   * @this {CharacterData|NPCData}
   * @param {ActorRollData} rollData  The Actor's roll data.
   */
  static prepareConcentration(rollData) {
    const { concentration } = this.attributes;
    const abilityId = concentration.ability || CONFIG.DND5E.defaultAbilities.concentration;
    const ability = this.abilities?.[abilityId] || {};
    const bonus = simplifyBonus(concentration.roll.bonus, rollData);
    concentration.save = (ability.save?.value ?? 0) + bonus;
  }

  /* -------------------------------------------- */

  /**
   * Calculate encumbrance details for an Actor.
   * @this {CharacterData|NPCData|VehicleData}
   * @param {ActorRollData} rollData           The Actor's roll data.
   * @param {object} [options]
   * @param {Function} [options.validateItem]  Determine whether an item's weight should count toward encumbrance.
   */
  static prepareEncumbrance(rollData, { validateItem }={}) {
    const config = CONFIG.DND5E.encumbrance;
    const encumbrance = this.attributes.encumbrance ??= {};
    const baseUnits = CONFIG.DND5E.encumbrance.baseUnits[this.parent.type]
      ?? CONFIG.DND5E.encumbrance.baseUnits.default;
    const unitSystem = game.settings.get("dnd5e", "metricWeightUnits") ? "metric" : "imperial";
    const { attributes } = this;

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
    const keys = CONFIG.DND5E.actorSizes.orderedKeys;
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
      if ( this.isVehicle ) {
        const { cargo } = attributes.capacity;
        base = convertWeight(cargo.value || Infinity, cargo.units, baseUnits[unitSystem]);
      }
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
      encumbered: Number.isFinite(encumbrance.max)
        ? Math.clamp((encumbrance.thresholds.encumbered * 100) / encumbrance.max, 0, 100)
        : 0,
      heavilyEncumbered: Number.isFinite(encumbrance.max)
        ? Math.clamp((encumbrance.thresholds.heavilyEncumbered * 100) / encumbrance.max, 0, 100)
        : 0
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
    this.attributes.exhaustion = this.conditions.exhaustion ?? 0;
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
    if ( this.parent.hasConditionEffect("halfHealth") ) hp.max *= 0.5;
    hp.max = Math.floor(hp.max);

    hp.effectiveMax = Math.max(hp.max + (hp.tempmax ?? 0), 0);
    hp.value = Math.min(hp.value, hp.effectiveMax);
    hp.damage = hp.effectiveMax - hp.value;
    hp.pct = Math.clamp(hp.effectiveMax ? (hp.value / hp.effectiveMax) * 100 : 0, 0, 100);
  }

  /* -------------------------------------------- */

  /**
   * Prepare the initiative data for an actor.
   * @this {CharacterData|NPCData|VehicleData}
   * @param {ActorRollData} rollData  The Actor's roll data.
   */
  static prepareInitiative(rollData) {
    const init = this.attributes.init ??= {};
    const flags = this.parent.flags.dnd5e ?? {};
    const globalCheckBonus = simplifyBonus(this.rolls?.ability?.check?.bonus, rollData);

    // Compute initiative modifier
    const abilityId = init.ability || CONFIG.DND5E.defaultAbilities.initiative;
    const ability = this.abilities?.[abilityId] || {};
    init.mod = ability.mod ?? 0;

    // Initiative proficiency
    const isLegacy = dnd5e.settings.rulesVersion === "legacy";
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

    // Complete roll data
    rollData = { ...rollData };
    rollData.roll = { ability: abilityId, proficient: init.prof.multiplier >= 1, type: "initiative" };

    // Total initiative includes all numeric terms
    const initBonus = simplifyBonus(init.roll.bonus, rollData);
    const abilityBonus = simplifyBonus(ability.check?.roll?.bonus, rollData);
    const ruleBonus = simplifyBonus(
      AppliedRules.collect("check:bonus", this.parent).filterWith(rollData).toFormula(), rollData
    );
    const quality = this.attributes.quality?.value ?? 0;
    init.total = init.mod + initBonus + abilityBonus + globalCheckBonus + ruleBonus + quality
      + (flags.initiativeAlert && isLegacy ? 5 : 0)
      + (Number.isNumeric(init.prof.term) ? init.prof.flat : 0) + this.parent.conditionRollReduction;
    init.score = CONFIG.DND5E.skillPassive.base + init.total + (init.roll.mode * CONFIG.DND5E.skillPassive.modifier);
  }

  /* -------------------------------------------- */

  /**
   * Modify movement speeds taking exhaustion and any other conditions into account.
   * @this {CharacterData|NPCData|VehicleData}
   * @param {ActorRollData} rollData  The Actor's roll data.
   */
  static prepareMovement(rollData=this.parent.getRollData()) {
    const statuses = this.parent.statuses;
    const noMovement = this.parent.hasConditionEffect("noMovement");
    const crawl = this.parent.hasConditionEffect("crawl");
    const speeds = this.attributes.movement.speeds;
    for ( const type of Object.keys(CONFIG.DND5E.movementTypes) ) {
      if ( noMovement || (crawl && (type !== "walk")) ) speeds[type] = 0;
      else speeds[type] = Math.max(0, simplifyBonus(speeds[type], rollData));
      if ( type === "walk" ) this.attributes.movement.speed = speeds.walk;
    }

    const halfMovement = this.parent.hasConditionEffect("halfMovement");
    const encumbered = statuses.has("encumbered");
    const heavilyEncumbered = statuses.has("heavilyEncumbered");
    const exceedingCarryingCapacity = statuses.has("exceedingCarryingCapacity");
    const units = this.attributes.movement.units ??= defaultUnits("length");

    let reduction = statuses.reduce((acc, status) => {
      const immune = this.traits?.ci?.value?.has(status);
      if ( immune ) return acc;

      const speed = CONFIG.DND5E.conditionTypes[status]?.reduction?.speed ?? 0;
      const level = ConditionData.hasLevels(status)
        ? this.parent.system.conditions[status] ?? 0
        : Boolean(statuses.has(status));
      return acc + (level * speed);
    }, 0);
    if ( ((this.attributes.ac?.equippedArmor?.system.strength ?? 0) > (this.abilities?.str?.value ?? Infinity))
      && !this.parent.flags.dnd5e?.ignoreArmorSpeedReduction && this.isCreature ) {
      reduction += CONFIG.DND5E.armorSpeedReduction;
    }
    reduction = convertLength(reduction, CONFIG.DND5E.defaultUnits.length.imperial, units);
    const bonus = simplifyBonus(this.attributes.movement.bonus, rollData);
    const multiplier = this.attributes.movement.multiplier * (halfMovement ? 0.5 : 1);
    this.attributes.movement.max = 0;
    for ( const type of Object.keys(CONFIG.DND5E.movementTypes) ) {
      let speed = Math.max(0, speeds[type] - reduction);
      if ( (speed * multiplier) > 0 ) {
        speed = Math.max(0, speed + bonus) * multiplier;
        if ( heavilyEncumbered ) {
          speed = Math.max(0, speed - (CONFIG.DND5E.encumbrance.speedReduction.heavilyEncumbered[units] ?? 0));
        } else if ( encumbered ) {
          speed = Math.max(0, speed - (CONFIG.DND5E.encumbrance.speedReduction.encumbered[units] ?? 0));
        }
        if ( exceedingCarryingCapacity ) {
          speed = Math.min(speed, CONFIG.DND5E.encumbrance.speedReduction.exceedingCarryingCapacity[units] ?? 0);
        }
        speeds[type] = speed;
      } else {
        speeds[type] = 0;
      }
      this.attributes.movement.max = Math.max(speeds[type], this.attributes.movement.max);
      if ( type === "walk" ) this.attributes.movement.speed = speeds[type];
    }
    const baseSpeed = this._source.attributes.movement.speeds.walk || this.attributes.movement.fromSpecies?.walk;
    this.attributes.movement.slowed = speeds.walk <= (simplifyBonus(baseSpeed, rollData) / 2);
    this.attributes.movement.speeds.jump = (this.abilities?.str.value ?? 0) / 2;
  }

  /* -------------------------------------------- */

  /**
   * Convert the actor's price into the default currency.
   * @this {NPCData|VehicleData}
   */
  static preparePrice() {
    const { price } = this.attributes;
    const { conversion } = CONFIG.DND5E.currencies[price.denomination] ?? {};
    const { conversion: defaultConversion } = CONFIG.DND5E.currencies[CONFIG.DND5E.defaultCurrency] ?? {};
    if ( (price.value !== null) && conversion && defaultConversion ) {
      price.valueInGP = Math.floor(price.value * defaultConversion / conversion);
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
    const { movement, senses } = race.system;
    for ( const key of Object.keys(CONFIG.DND5E.movementTypes) ) {
      if ( !movement.speeds[key] || (!force && this.attributes.movement.speeds[key]) ) continue;
      this.attributes.movement.fromSpecies ??= {};
      this.attributes.movement.speeds[key] = this.attributes.movement.fromSpecies[key] = movement.speeds[key];
    }
    if ( movement.hover ) this.attributes.movement.hover = true;
    if ( force && movement.units ) this.attributes.movement.units = movement.units;
    else this.attributes.movement.units ??= movement.units;

    for ( const key of Object.keys(CONFIG.DND5E.senses) ) {
      if ( !senses.ranges[key] || (!force && (this.attributes.senses.ranges[key] !== null)) ) continue;
      this.attributes.senses.ranges[key] = senses.ranges[key];
    }
    this.attributes.senses.special = [this.attributes.senses.special, senses.special].filterJoin(";");
    if ( force && senses.units ) this.attributes.senses.units = senses.units;
    else this.attributes.senses.units ??= senses.units;
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
    this.attributes.spell.attack = ability ? ability.attack.value : this.attributes.prof;
    this.attributes.spell.dc = ability ? ability.dc : 8 + this.attributes.prof;
    this.attributes.spell.mod = ability ? ability.mod : 0;
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /**
   * Track changes to HP when updated and set death save status.
   * @this {CharacterData|NPCData|VehicleData}
   * @param {object} changes  The candidate changes to the Document.
   * @param {object} options  Additional options which modify the update request.
   * @param {BaseUser} user   The User requesting the document update.
   */
  static async preUpdateHP(changes, options, user) {
    const isDead = this.attributes.hp.value <= 0;
    if ( isDead && (foundry.utils.getProperty(changes, "system.attributes.hp.value") > 0) ) {
      foundry.utils.setProperty(changes, "system.attributes.death.success", 0);
      foundry.utils.setProperty(changes, "system.attributes.death.failure", 0);
    }
    foundry.utils.setProperty(options, "dnd5e.hp", { ...this.attributes.hp });
  }

  /* -------------------------------------------- */

  /**
   * Display concentration challenge if necessary, set bloodied status, and fire damage hook.
   * @this {CharacterData|NPCData|VehicleData}
   * @param {object} changed  The differential data that was changed relative to the document's prior values.
   * @param {object} options  Additional options which modify the update request.
   * @param {string} userId   The id of the User requesting the document update.
   */
  static async onUpdateHP(changed, options, userId) {
    if ( !changed.system?.attributes?.hp ) return;
    if ( userId === game.userId ) {
      await this.parent.updateBloodied(options);
      await this.parent.updateDowned(options);
      await applyFallProne(this.parent, options);
    }

    const hp = options.dnd5e?.hp;
    if ( !hp || options.isRest || options.isAdvancement ) return;

    const curr = this.attributes.hp;
    const changes = {
      hp: curr.value - hp.value,
      temp: curr.temp - hp.temp
    };
    changes.total = changes.hp + changes.temp;
    if ( !Number.isInteger(changes.total) || (changes.total === 0) ) return;

    this.parent._displayTokenEffect(changes);
    if ( !game.settings.get("dnd5e", "disableConcentration") && (userId === game.userId)
      && (options.dnd5e?.concentrationCheck !== false)
      && (changes.total < 0) && ((changes.temp < 0) || (curr.value < curr.effectiveMax)) ) {
      this.parent.challengeConcentration({ dc: this.parent.getConcentrationDC(-changes.total) });
    }

    /**
     * A hook event that fires when an actor is damaged or healed by any means. The actual name
     * of the hook will depend on the change in hit points.
     * @function dnd5e.damageActor
     * @memberof hookEvents
     * @param {Actor5e} actor                                       The actor that had their hit points reduced.
     * @param {{hp: number, temp: number, total: number}} changes   The changes to hit points.
     * @param {object} update                                       The original update delta.
     * @param {string} userId                                       Id of the user that performed the update.
     */
    Hooks.callAll(`dnd5e.${changes.total > 0 ? "heal" : "damage"}Actor`, this.parent, changes, changed, userId);
  }

  /* -------------------------------------------- */

  /**
   * Trigger auto-downed logic if the failed death save threshold is reached.
   * @this {CharacterData|NPCData}
   * @param {object} changed  The differential data that was changed relative to the document's prior values.
   * @param {object} options  Additional options which modify the update request.
   * @param {string} userId   The id of the User requesting the document update.
   */
  static async onUpdateDeathSaves(changed, options, userId) {
    const failure = changed.system?.attributes?.death?.failure;
    if ( (failure === undefined) || (failure < this.attributes.death.threshold.failure) ) return;

    // If hp update is included, updateDowned will be called in onUpdateHP, so exit early
    if ( changed.system.attributes.hp ) return;
    if ( userId === game.userId ) await this.parent.updateDowned(options);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Determine the actor updates and terminal outcome resulting from a death saving throw.
   * @param {object} death                            Current death save data.
   * @param {number} death.success                    Number of successful death saves.
   * @param {number} death.failure                    Number of failed death saves.
   * @param {{ success: number, failure: number }} death.threshold  Success and failure thresholds.
   * @param {object} result
   * @param {boolean} result.isSuccess                    Whether the save succeeded.
   * @param {boolean} [result.isCritical]                 Whether the save was a natural 20.
   * @param {boolean} [result.isFumble]                   Whether the save was a natural 1.
   * @returns {{ outcome: DeathSaveOutcome, updates: object }}
   */
  static applyDeathSaveResult(death, { isSuccess, isCritical=false, isFumble=false }) {
    const updates = {};
    let outcome = null;
    if ( isSuccess ) {
      const successes = (death.success || 0) + 1;

      // Critical success - revive with 1 hp.
      if ( isCritical ) {
        Object.assign(updates, {
          "system.attributes.death.success": 0,
          "system.attributes.death.failure": 0,
          "system.attributes.hp.value": 1
        });
        outcome = "revive";
      }

      // Normal success - stabilize when the success threshold is reached.
      else if ( successes >= death.threshold.success ) {
        Object.assign(updates, {
          "system.attributes.death.success": 0,
          "system.attributes.death.failure": 0
        });
        outcome = "stable";
      }

      else updates["system.attributes.death.success"] = Math.clamp(successes, 0, death.threshold.success);
    }

    else {
      const failures = Math.clamp((death.failure || 0) + (isFumble ? 2 : 1), 0, death.threshold.failure);
      updates["system.attributes.death.failure"] = failures;
      if ( failures >= death.threshold.failure ) outcome = "death";
    }

    return { outcome, updates };
  }
}
