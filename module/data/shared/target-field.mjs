import { formatDistance, prepareFormulaValue } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { BooleanField, SchemaField, StringField } = foundry.data.fields;

/**
 * Field for storing target data.
 *
 * @property {object} template
 * @property {string} template.count        Number of templates created.
 * @property {boolean} template.contiguous  Must all created areas be connected to one another?
 * @property {string} template.type         Type of area of effect caused by this activity.
 * @property {string} template.size         Size of the activity's area of effect on its primary axis.
 * @property {string} template.width        Width of line area of effect.
 * @property {string} template.height       Height of cylinder area of effect.
 * @property {string} template.units        Units used to measure the area of effect sizes.
 * @property {object} affects
 * @property {string} affects.count         Number of individual targets that can be affected.
 * @property {string} affects.type          Type of targets that can be affected (e.g. creatures, objects, spaces).
 * @property {boolean} affects.choice       When targeting an area, can the user choose who it affects?
 * @property {string} affects.special       Description of special targeting.
 */
export default class TargetField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      template: new SchemaField({
        count: new FormulaField({ deterministic: true }),
        contiguous: new BooleanField(),
        type: new StringField(),
        size: new FormulaField({ deterministic: true }),
        width: new FormulaField({ deterministic: true }),
        height: new FormulaField({ deterministic: true }),
        units: new StringField({ initial: "ft" })
      }),
      affects: new SchemaField({
        count: new FormulaField({ deterministic: true }),
        type: new StringField(),
        choice: new BooleanField(),
        special: new StringField()
      }),
      ...fields
    };
    super(fields, options);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare data for this field. Should be called during the `prepareFinalData` stage.
   * @this {ItemDataModel|BaseActivityData}
   * @param {object} rollData  Roll data used for formula replacements.
   * @param {object} [labels]  Object in which to insert generated labels.
   */
  static prepareData(rollData, labels) {
    this.target.affects.scalar = !["", "self", "any"].includes(this.target.affects.type);
    if ( this.target.affects.scalar ) {
      prepareFormulaValue(this, "target.affects.count", "DND5E.TARGET.FIELDS.target.affects.count.label", rollData);
    } else this.target.affects.count = null;

    this.target.template.dimensions = TargetField.templateDimensions(this.target.template.type);

    if ( this.target.template.type ) {
      this.target.template.count ||= "1";
      if ( this.target.template.dimensions.width ) this.target.template.width ||= "5";
      if ( this.target.template.dimensions.height ) this.target.template.height ||= "5";
      prepareFormulaValue(this, "target.template.count", "DND5E.TARGET.FIELDS.target.template.count.label", rollData);
      prepareFormulaValue(this, "target.template.size", "DND5E.TARGET.FIELDS.target.template.size.label", rollData);
      prepareFormulaValue(this, "target.template.width", "DND5E.TARGET.FIELDS.target.template.width.label", rollData);
      prepareFormulaValue(this, "target.template.height", "DND5E.TARGET.FIELDS.target.template.height.label", rollData);
    } else {
      this.target.template.count = null;
      this.target.template.size = null;
      this.target.template.width = null;
      this.target.template.height = null;
    }

    if ( labels ) {
      const parts = [];

      if ( this.target.template.type ) {
        if ( this.target.template.count > 1 ) parts.push(`${this.target.template.count} ×`);
        if ( this.target.template.units in CONFIG.DND5E.movementUnits ) {
          parts.push(formatDistance(this.target.template.size, this.target.template.units));
        } else {
          parts.push(this.target.template.size);
        }
        parts.push(CONFIG.DND5E.areaTargetTypes[this.target.template.type]?.label);
      }

      else if ( this.target.affects.type ) {
        if ( this.target.affects.scalar ) parts.push(this.target.affects.count);
        parts.push(CONFIG.DND5E.individualTargetTypes[this.target.affects.type]);
      }

      labels.target = parts.filterJoin(" ");
    }
  }

  /* -------------------------------------------- */

  /**
   * Create the template dimensions labels for a template type.
   * @param {string} type  Area of effect type.
   * @returns {{ size: string, [width]: string, [height]: string }}
   */
  static templateDimensions(type) {
    const sizes = CONFIG.DND5E.areaTargetTypes[type]?.sizes;
    const dimensions = { size: "DND5E.AreaOfEffect.Size.Label" };
    if ( sizes ) {
      dimensions.width = sizes.includes("width") && (sizes.includes("length") || sizes.includes("radius"));
      dimensions.height = sizes.includes("height");
      if ( sizes.includes("radius") ) dimensions.size = "DND5E.AreaOfEffect.Size.Radius";
      else if ( sizes.includes("length") ) dimensions.size = "DND5E.AreaOfEffect.Size.Length";
      else if ( sizes.includes("width") ) dimensions.size = "DND5E.AreaOfEffect.Size.Width";
      if ( sizes.includes("thickness") ) dimensions.width = "DND5E.AreaOfEffect.Size.Thickness";
      else if ( dimensions.width ) dimensions.width = "DND5E.AreaOfEffect.Size.Width";
      if ( dimensions.height ) dimensions.height = "DND5E.AreaOfEffect.Size.Height";
    }
    return dimensions;
  }
}
