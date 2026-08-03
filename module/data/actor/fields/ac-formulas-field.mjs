import FormulaField from "../../fields/formula-field.mjs";

const { ArrayField, BooleanField, SchemaField, StringField } = foundry.data.fields;

/**
 * Field for storing AC formulas with some special handling to cast string formulas to full objects.
 */
export default class ACFormulasField extends ArrayField {
  constructor() {
    super(new SchemaField({
      armored: new BooleanField({
        nullable: true, initial: null, label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.formulas.element.armored.label"
      }),
      formula: new FormulaField({
        deterministic: true, label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.formulas.element.formula.label"
      }),
      label: new StringField({ label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.formulas.element.label.label" }),
      shielded: new BooleanField({
        nullable: true, initial: null, label: "DND5E.ARMORCLASS.FIELDS.attributes.ac.formulas.element.shielded.label"
      })
    }));
  }

  /* -------------------------------------------- */
  /*  Active Effect Integration                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  applyChange(value, model, change, options) {
    if ( (change.type === "add") && (typeof change.value === "string") ) change.value = {
      formula: change.value, label: change.effect?.name ?? _loc("DND5E.ARMORCLASS.Calculation.Custom")
    };
    return super.applyChange(value, model, change, options);
  }
}
