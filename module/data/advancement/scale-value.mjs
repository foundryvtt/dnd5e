import { formatLength } from "../../utils.mjs";
import IdentifierField from "../fields/identifier-field.mjs";
import MappingField from "../fields/mapping-field.mjs";
import { createCheckboxInput } from "../../applications/fields.mjs";

const { BooleanField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

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

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ADVANCEMENT.ScaleValue"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      identifier: new IdentifierField({ required: true }),
      type: new StringField({ required: true, initial: "string", choices: TYPES }),
      distance: new SchemaField({ units: new StringField({ required: true }) }),
      scale: new MappingField(new ScaleValueEntryField(), { required: true })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
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

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ADVANCEMENT.ScaleValue.Type.String"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      value: new StringField({ required: true })
    };
  }

  /* -------------------------------------------- */

  /**
   * Information on how a scale value of this type is configured.
   *
   * @typedef {object} ScaleValueTypeMetadata
   * @property {string} label       Name of this type.
   * @property {string} hint        Hint for this type shown in the scale value configuration.
   * @property {string} identifier  Hint for the identifier for this type.
   * @property {boolean} isNumeric  When using the default editing interface, should numeric inputs be used?
   */

  /**
   * Configuration information for this scale value type.
   * @type {ScaleValueTypeMetadata}
   */
  static get metadata() {
    return {
      label: "DND5E.ADVANCEMENT.ScaleValue.Type.String.Label",
      hint: "DND5E.ADVANCEMENT.ScaleValue.Type.String.Hint",
      identifier: "DND5E.ADVANCEMENT.ScaleValue.Type.String.Identifier",
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
    return new this({ value: original.formula }, options);
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
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

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve field data with associated values.
   * @param {number} level                Level for which this data is being prepared.
   * @param {ScaleValueType} [value]      Value for the field at this level.
   * @param {ScaleValueType} [lastValue]  Previous value used to generate placeholders.
   * @returns {Record<string, object>}
   */
  static getFields(level, value, lastValue) {
    const fields = {};
    for ( const [name, field] of Object.entries(this.schema.fields) ) {
      if ( field.options.hidden ) continue;
      fields[name] = {
        field,
        input: field instanceof BooleanField ? createCheckboxInput : null,
        name: `configuration.scale.${level}.${name}`,
        placeholder: this.getPlaceholder(name, lastValue),
        value: value?.[name]
      };
    }
    return fields;
  }

  /* -------------------------------------------- */

  /**
   * Create a placeholder value for the provided field.
   * @param {string} name                 Name of the field.
   * @param {ScaleValueType} [lastValue]  Scale value from a lower level.
   * @returns {string}
   */
  static getPlaceholder(name, lastValue) {
    return lastValue?.[name] ?? "";
  }
}


/**
 * Scale value data type that stores numeric values.
 *
 * @property {number} value  Numeric value.
 */
export class ScaleValueTypeNumber extends ScaleValueType {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      value: new NumberField({ required: true })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      label: "DND5E.ADVANCEMENT.ScaleValue.Type.Number.Label",
      hint: "DND5E.ADVANCEMENT.ScaleValue.Type.Number.Hint",
      isNumeric: true
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
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

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ADVANCEMENT.ScaleValue.Type.CR"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      value: new NumberField({ required: true, min: 0 })
      // TODO: Add CR validator
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      label: "DND5E.ADVANCEMENT.ScaleValue.Type.CR.Label",
      hint: "DND5E.ADVANCEMENT.ScaleValue.Type.CR.Hint"
    });
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
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

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ADVANCEMENT.ScaleValue.Type.Dice"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      number: new NumberField({ nullable: true, integer: true }),
      faces: new NumberField({ required: true, integer: true }),
      modifiers: new SetField(new StringField({ required: true }), { hidden: true })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      label: "DND5E.ADVANCEMENT.ScaleValue.Type.Dice.Label",
      hint: "DND5E.ADVANCEMENT.ScaleValue.Type.Dice.Hint",
      identifier: "DND5E.ADVANCEMENT.ScaleValue.Type.Dice.Identifier"
    });
  }

  /* -------------------------------------------- */

  /**
   * List of die faces that can be chosen.
   * @type {number[]}
   */
  static FACES = [2, 3, 4, 6, 8, 10, 12, 20, 100];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static convertFrom(original, options) {
    const [number, faces] = (original.formula ?? "").split("d");
    if ( !faces || !Number.isNumeric(number) || !Number.isNumeric(faces) ) return null;
    return new this({number: Number(number) || null, faces: Number(faces)}, options);
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get formula() {
    if ( !this.faces ) return null;
    return `${this.number ?? ""}${this.die}`;
  }

  /* -------------------------------------------- */

  /**
   * The entire die, with leading "d" and any modifiers, e.g., "d4" or "d4r1".
   * @type {string}
   */
  get die() {
    if ( !this.faces ) return "";
    return `d${this.faces}${this.mods}`;
  }

  /* -------------------------------------------- */

  /**
   * The die modifiers.
   * @type {string}
   */
  get mods() {
    if ( !this.modifiers ) return "";
    return this.modifiers.reduce((acc, mod) => {
      return acc + (dnd5e.utils.isValidDieModifier(mod) ? mod : "");
    }, "");
  }

  /* -------------------------------------------- */

  /**
   * The die value to be rolled with the leading "d" (e.g. "d4").
   * @type {string}
   */
  get denom() {
    if ( !this.faces ) return "";
    return `d${this.faces}`;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    if ( source.n ) source.number = source.n;
    if ( source.die ) source.faces = source.die;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static getFields(level, value, lastValue) {
    const fields = super.getFields(level, value, lastValue);
    fields.faces.options = [
      { value: "", label: fields.faces.placeholder },
      { rule: true },
      ...this.FACES.map(value => ({ value, label: `d${value}` }))
    ];
    return fields;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static getPlaceholder(name, lastValue) {
    if ( (name === "faces") && lastValue?.faces ) return `d${lastValue.faces}`;
    return super.getPlaceholder(name, lastValue);
  }
}


/**
 * Scale value data type that stores distance values.
 *
 * @property {number} value  Numeric value.
 */
export class ScaleValueTypeDistance extends ScaleValueTypeNumber {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      label: "DND5E.ADVANCEMENT.ScaleValue.Type.Distance.Label",
      hint: "DND5E.ADVANCEMENT.ScaleValue.Type.Distance.Hint"
    });
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get display() {
    return formatLength(this.value, this.parent.configuration.distance?.units || "ft");
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
