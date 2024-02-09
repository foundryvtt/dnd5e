import { IdentifierField, MappingField } from "../fields.mjs";

/**
 * Data model for the Scale Value advancement type.
 *
 * @property {string} identifier        Identifier used to select this scale value in roll formulas.
 * @property {string} type              Type of data represented by this scale value.
 * @property {object} [distance]
 * @property {string} [distance.units]  If distance type is selected, the units each value uses.
 * @property {Object<string, *>} scale  Scale values for each level. Value format is determined by type.
 */
export class ScaleValueConfigurationData extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      identifier: new IdentifierField({required: true, label: "DND5E.Identifier"}),
      type: new foundry.data.fields.StringField({
        required: true, initial: "string", choices: TYPES, label: "DND5E.AdvancementScaleValueTypeLabel"
      }),
      distance: new foundry.data.fields.SchemaField({
        units: new foundry.data.fields.StringField({required: true, label: "DND5E.MovementUnits"})
      }),
      scale: new MappingField(new ScaleValueEntryField(), {required: true})
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static migrateData(source) {
    super.migrateData(source);
    if ( source.type === "numeric" ) source.type = "number";
    Object.values(source.scale ?? {}).forEach(v => TYPES[source.type].migrateData(v));
  }
}


/**
 * Data field that automatically selects the appropriate ScaleValueType based on the selected type.
 */
export class ScaleValueEntryField extends foundry.data.fields.ObjectField {
  /** @override */
  _cleanType(value, options) {
    if ( !(typeof value === "object") ) value = {};

    // Use a defined DataModel
    const cls = TYPES[options.source?.type];
    if ( cls ) return cls.cleanData(value, options);

    return value;
  }

  /* -------------------------------------------- */

  /** @override */
  initialize(value, model, options={}) {
    const cls = TYPES[model.type];
    if ( !value || !cls ) return value;
    return new cls(value, {parent: model, ...options});
  }

  /* -------------------------------------------- */

  /** @override */
  toObject(value) {
    return value.toObject(false);
  }
}


/**
 * Base scale value data type that stores generic string values.
 *
 * @property {string} value  String value.
 */
export class ScaleValueType extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      value: new foundry.data.fields.StringField({required: true})
    };
  }

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

  /**
   * Attempt to convert another scale value type to this one.
   * @param {ScaleValueType} original  Original type to attempt to convert.
   * @param {object} [options]         Options which affect DataModel construction.
   * @returns {ScaleValueType|null}
   */
  static convertFrom(original, options) {
    return new this({value: original.formula}, options);
  }

  /* -------------------------------------------- */

  /**
   * This scale value prepared to be used in roll formulas.
   * @type {string|null}
   */
  get formula() { return this.value; }

  /* -------------------------------------------- */

  /**
   * This scale value formatted for display.
   * @type {string|null}
   */
  get display() { return this.formula; }

  /* -------------------------------------------- */

  /**
   * Shortcut to the prepared value when used in roll formulas.
   * @returns {string}
   */
  toString() {
    return this.formula;
  }
}


/**
 * Scale value data type that stores numeric values.
 *
 * @property {number} value  Numeric value.
 */
export class ScaleValueTypeNumber extends ScaleValueType {
  /** @inheritdoc */
  static defineSchema() {
    return {
      value: new foundry.data.fields.NumberField({required: true})
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      label: "DND5E.AdvancementScaleValueTypeNumber",
      hint: "DND5E.AdvancementScaleValueTypeHintNumber",
      isNumeric: true
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static convertFrom(original, options) {
    const value = Number(original.formula);
    if ( Number.isNaN(value) ) return null;
    return new this({value}, options);
  }
}


/**
 * Scale value data type that stores challenge ratings.
 *
 * @property {number} value  CR value.
 */
export class ScaleValueTypeCR extends ScaleValueTypeNumber {
  /** @inheritdoc */
  static defineSchema() {
    return {
      value: new foundry.data.fields.NumberField({required: true, min: 0})
      // TODO: Add CR validator
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      label: "DND5E.AdvancementScaleValueTypeCR",
      hint: "DND5E.AdvancementScaleValueTypeHintCR"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get display() {
    switch ( this.value ) {
      case 0.125: return "&frac18;";
      case 0.25: return "&frac14;";
      case 0.5: return "&frac12;";
      default: return super.display;
    }
  }
}


/**
 * Scale value data type that stores dice values.
 *
 * @property {number} number  Number of dice.
 * @property {number} faces   Die faces.
 */
export class ScaleValueTypeDice extends ScaleValueType {
  /** @inheritdoc */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      number: new fields.NumberField({nullable: true, integer: true, positive: true}),
      faces: new fields.NumberField({required: true, integer: true, positive: true}),
      modifiers: new fields.SetField(new fields.StringField({required: true}))
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      label: "DND5E.AdvancementScaleValueTypeDice",
      hint: "DND5E.AdvancementScaleValueTypeHintDice"
    });
  }

  /* -------------------------------------------- */

  /**
   * List of die faces that can be chosen.
   * @type {number[]}
   */
  static FACES = [2, 3, 4, 6, 8, 10, 12, 20, 100];

  /* -------------------------------------------- */

  /** @inheritdoc */
  static convertFrom(original, options) {
    const [number, faces] = (original.formula ?? "").split("d");
    if ( !faces || !Number.isNumeric(number) || !Number.isNumeric(faces) ) return null;
    return new this({number: Number(number) || null, faces: Number(faces)}, options);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get formula() {
    if ( !this.faces ) return null;
    return `${this.number ?? ""}${this.die}`;
  }

  /* -------------------------------------------- */

  /**
   * The die value to be rolled with the leading "d" (e.g. "d4").
   * @type {string}
   */
  get die() {
    if ( !this.faces ) return "";
    return `d${this.faces}${Array.from(this.modifiers).filterJoin("")}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static migrateData(source) {
    if ( source.n ) source.number = source.n;
    if ( source.die ) source.faces = source.die;
  }
}


/**
 * Scale value data type that stores distance values.
 *
 * @property {number} value  Numeric value.
 */
export class ScaleValueTypeDistance extends ScaleValueTypeNumber {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      label: "DND5E.AdvancementScaleValueTypeDistance",
      hint: "DND5E.AdvancementScaleValueTypeHintDistance"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get display() {
    return `${this.value} ${CONFIG.DND5E.movementUnits[this.parent.configuration.distance?.units ?? "ft"]}`;
  }
}


/**
 * The available types of scaling value.
 * @enum {ScaleValueType}
 */
export const TYPES = {
  string: ScaleValueType,
  number: ScaleValueTypeNumber,
  cr: ScaleValueTypeCR,
  dice: ScaleValueTypeDice,
  distance: ScaleValueTypeDistance
};
