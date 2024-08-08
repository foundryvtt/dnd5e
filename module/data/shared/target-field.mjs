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
}
