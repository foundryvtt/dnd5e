import { ItemDataModel } from "../../abstract.mjs";
import FormulaField from "../../fields/formula-field.mjs";
import EnchantmentField from "../fields/enchantment-field.mjs";
import SummonsField from "../fields/summons-field.mjs";

const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @deprecated since 4.0, targeted for removal in 4.4
 * @mixin
 */
export default class ActionTemplate extends ItemDataModel {
  /** @inheritDoc */
  static defineSchema() {
    foundry.utils.logCompatibilityWarning(
      "The `ActionTemplate` data model has been deprecated in favor of `ActivitiesTemplate`.",
      { since: "DnD5e 4.0", until: "DnD5e 5.0", once: true }
    );
    return {
      ability: new StringField({required: true, nullable: true, initial: null, label: "DND5E.AbilityModifier"}),
      actionType: new StringField({required: true, nullable: true, initial: null, label: "DND5E.ItemActionType"}),
      attack: new SchemaField({
        bonus: new FormulaField({required: true, label: "DND5E.ItemAttackBonus"}),
        flat: new BooleanField({label: "DND5E.ItemAttackFlat"})
      }),
      chatFlavor: new StringField({required: true, label: "DND5E.ChatFlavor"}),
      critical: new SchemaField({
        threshold: new NumberField({
          required: true, integer: true, initial: null, positive: true, label: "DND5E.ItemCritThreshold"
        }),
        damage: new FormulaField({required: true, label: "DND5E.ItemCritExtraDamage"})
      }),
      damage: new SchemaField({
        parts: new ArrayField(new ArrayField(new StringField({nullable: true})), {required: true}),
        versatile: new FormulaField({required: true, label: "DND5E.VersatileDamage"})
      }, {label: "DND5E.Damage"}),
      enchantment: new EnchantmentField(),
      formula: new FormulaField({required: true, label: "DND5E.OtherFormula"}),
      save: new SchemaField({
        ability: new StringField({required: true, blank: true, label: "DND5E.Ability"}),
        dc: new NumberField({required: true, min: 0, integer: true, label: "DND5E.AbbreviationDC"}),
        scaling: new StringField({required: true, blank: false, initial: "spell", label: "DND5E.ScalingFormula"})
      }, {label: "DND5E.SavingThrow"}),
      summons: new SummonsField()
    };
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    ActionTemplate.#migrateAbility(source);
    ActionTemplate.#migrateAttack(source);
    ActionTemplate.#migrateCritical(source);
    ActionTemplate.#migrateSave(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the ability field.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateAbility(source) {
    if ( Array.isArray(source.ability) ) source.ability = source.ability[0];
  }

  /* -------------------------------------------- */

  /**
   * Move 'attackBonus' to 'attack.bonus' and ensure a 0 or null is converted to an empty string rather than "0".
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateAttack(source) {
    if ( "attackBonus" in source ) {
      source.attack ??= {};
      source.attack.bonus ??= source.attackBonus;
    }
    if ( [0, "0", null].includes(source.attack?.bonus) ) source.attack.bonus = "";
  }

  /* -------------------------------------------- */

  /**
   * Ensure the critical field is an object.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateCritical(source) {
    if ( !("critical" in source) ) return;
    if ( (typeof source.critical !== "object") || (source.critical === null) ) source.critical = {
      threshold: null,
      damage: ""
    };
    if ( source.critical.damage === null ) source.critical.damage = "";
  }

  /* -------------------------------------------- */

  /**
   * Migrate the save field.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateSave(source) {
    if ( !("save" in source) ) return;
    source.save ??= {};
    if ( source.save.scaling === "" ) source.save.scaling = "spell";
    if ( source.save.ability === null ) source.save.ability = "";
    if ( typeof source.save.dc === "string" ) {
      if ( source.save.dc === "" ) source.save.dc = null;
      else if ( Number.isNumeric(source.save.dc) ) source.save.dc = Number(source.save.dc);
    }
  }

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Which ability score modifier is used by this item?
   * @type {string|null}
   */
  get abilityMod() {
    if ( this.ability === "none" ) return null;
    return this.ability || this._typeAbilityMod || {
      mwak: "str",
      rwak: "dex",
      msak: this.parent?.actor?.system.attributes.spellcasting || "int",
      rsak: this.parent?.actor?.system.attributes.spellcasting || "int"
    }[this.actionType] || null;
  }

  /* -------------------------------------------- */

  /**
   * Default ability key defined for this type.
   * @type {string|null}
   * @internal
   */
  get _typeAbilityMod() {
    return null;
  }

  /* -------------------------------------------- */

  /**
   * What is the critical hit threshold for this item? Uses the smallest value from among the following sources:
   *  - `critical.threshold` defined on the item
   *  - `critical.threshold` defined on ammunition, if consumption mode is set to ammo
   *  - Type-specific critical threshold
   * @type {number|null}
   */
  get criticalThreshold() {
    if ( !this.hasAttack ) return null;
    let ammoThreshold = Infinity;
    if ( this.hasAmmo ) {
      ammoThreshold = this.parent?.actor?.items.get(this.consume.target)?.system.critical.threshold ?? Infinity;
    }
    const threshold = Math.min(this.critical.threshold ?? Infinity, this._typeCriticalThreshold, ammoThreshold);
    return threshold < Infinity ? threshold : 20;
  }

  /* -------------------------------------------- */

  /**
   * Default critical threshold for this type.
   * @type {number}
   * @internal
   */
  get _typeCriticalThreshold() {
    return Infinity;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement an ability check as part of its usage?
   * @type {boolean}
   */
  get hasAbilityCheck() {
    return (this.actionType === "abil") && !!this.ability;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement an attack roll as part of its usage?
   * @type {boolean}
   */
  get hasAttack() {
    return ["mwak", "rwak", "msak", "rsak"].includes(this.actionType);
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a damage roll as part of its usage?
   * @type {boolean}
   */
  get hasDamage() {
    return this.actionType && (this.damage.parts.length > 0);
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a saving throw as part of its usage?
   * @type {boolean}
   */
  get hasSave() {
    return this.actionType && !!(this.save.ability && this.save.scaling);
  }

  /* -------------------------------------------- */

  /**
   * Does this Item implement summoning as part of its usage?
   * @type {boolean}
   */
  get hasSummoning() {
    return (this.actionType === "summ") && !!this.summons?.profiles.length;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item provide an amount of healing instead of conventional damage?
   * @type {boolean}
   */
  get isHealing() {
    return (this.actionType === "heal") && this.hasDamage;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a versatile damage roll as part of its usage?
   * @type {boolean}
   */
  get isVersatile() {
    return this.actionType && !!(this.hasDamage && this.damage.versatile);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  getRollData(options) {
    const data = super.getRollData(options);
    const key = this.abilityMod;
    if ( data && key && ("abilities" in data) ) {
      const ability = data.abilities[key];
      data.mod = ability?.mod ?? 0;
    }
    return data;
  }
}
