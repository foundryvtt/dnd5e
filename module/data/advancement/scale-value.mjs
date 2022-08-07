import { IdentifierField } from "../fields.mjs";

export class ScaleValueConfigurationData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      identifier: new IdentifierField({required: true, label: "DND5E.Identifier"}),
      type: new foundry.data.fields.StringField({
        required: true, initial: "string", label: "DND5E.AdvancementScaleValueTypeLabel"
      }),
      distance: new foundry.data.fields.SchemaField({
        units: new foundry.data.fields.StringField({required: true, label: "DND5E.MovementUnits"})
      }),
      // TODO: Switch to MappingField with custom type with #1688
      scale: new foundry.data.fields.ObjectField({required: true})
    };
  }
}


export class ScaleValueTypeBase extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      value: new foundry.data.fields.StringField({required: true, blank: false})
    };
  }

  /**
   * Information on how a scale value of this type is configured.
   *
   * @typedef {object} ScaleValueTypeMetadata
   * @property {string} label       Name of this type.
   * @property {string} hint        Hint for this type shown in the scale value configuration.
   * @property {boolean} isNumeric  When using the default editing interface, should numeric inputs be used?
   */

  /**
   * Configuration information for this scale value type.
   * @type {ScaleValueTypeMetadata}
   */
  static get metadata() {
    return {
      label: "DND5E.AdvancementScaleValueTypeString",
      hint: "DND5E.AdvancementScaleValueTypeHintString",
      isNumeric: false
    };
  }

  /**
   * This scale value prepared to be used in roll formulas.
   * @type {string|null}
   */
  get prepared() { return this.value; }

  /**
   * This scale value formatted for display.
   * @type {string|null}
   */
  get formatted() { return this.prepared; }

  /**
   * Shortcut to the prepared value when used in roll formulas.
   * @returns {string}
   */
  toString() {
    return this.prepared;
  }
}


export class ScaleValueTypeNumber extends ScaleValueTypeBase {
  static defineSchema() {
    return {
      value: new foundry.data.fields.NumberField({required: true})
    };
  }

  static get metadata() {
    return {
      label: "DND5E.AdvancementScaleValueTypeNumber",
      hint: "DND5E.AdvancementScaleValueTypeHintNumber",
      isNumeric: true
    };
  }
}


export class ScaleValueTypeCR extends ScaleValueTypeBase {
  static defineSchema() {
    return {
      value: new foundry.data.fields.NumberField({required: true, min: 0})
      // TODO: Add CR validator
    };
  }

  static get metadata() {
    return {
      label: "DND5E.AdvancementScaleValueTypeCR",
      hint: "DND5E.AdvancementScaleValueTypeHintCR",
      isNumeric: true
    };
  }

  get formatted() {
    switch (this.value) {
      case 0.125: return "&frac18;";
      case 0.25: return "&frac14;";
      case 0.5: return "&frac12;";
      default: return super.formatted;
    }
  }
}


export class ScaleValueTypeDice extends ScaleValueTypeBase {
  static defineSchema() {
    return {
      n: new foundry.data.fields.NumberField({nullable: true, integer: true, positive: true}),
      die: new foundry.data.fields.NumberField({required: true, integer: true, positive: true})
    };
  }

  static get metadata() {
    return {
      label: "DND5E.AdvancementScaleValueTypeDice",
      hint: "DND5E.AdvancementScaleValueTypeHintDice"
    };
  }

  get prepared() { return `${this.n ?? ""}${this.dice}`; }

  /**
   * The number of dice to roll.
   * @type {number}
   */
  get number() { return this.n ?? 0; }

  /**
   * The die value to be rolled with the leading "d" (e.g. "d4").
   * @type {string}
   */
  get dice() { return `d${this.die}`; }
}


export class ScaleValueTypeDistance extends ScaleValueTypeNumber {
  static get metadata() {
    return {
      label: "DND5E.AdvancementScaleValueTypeDistance",
      hint: "DND5E.AdvancementScaleValueTypeHintDistance"
    };
  }

  get formatted() {
    return `${this.value} ${CONFIG.DND5E.movementUnits[this.parent.configuration.distance.units]}`;
  }
}
