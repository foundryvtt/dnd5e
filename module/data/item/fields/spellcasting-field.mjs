import { simplifyBonus } from "../../../utils.mjs";
import FormulaField from "../../fields/formula-field.mjs";

const { SchemaField, StringField } = foundry.data.fields;

/**
 * Data field for class & subclass spellcasting information.
 *
 * @property {string} progression          Spellcasting progression (e.g. full, half, pact).
 * @property {string} ability              Ability used for spell attacks and save DCs.
 * @property {object} preparation
 * @property {string} preparation.formula  Formula used to calculate max prepared spells, if a prepared caster.
 */
export default class SpellcastingField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      progression: new StringField({
        required: true,
        initial: "none",
        blank: false,
        label: "DND5E.SpellProgression"
      }),
      ability: new StringField({ label: "DND5E.SpellAbility" }),
      preparation: new SchemaField({
        formula: new FormulaField({ label: "DND5E.SpellPreparation.Formula" })
      }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.Spellcasting", ...options });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare data for this field. Should be called during the `prepareFinalData` stage.
   * @this {ItemDataModel}
   * @param {object} rollData  Roll data used for formula replacements.
   */
  static prepareData(rollData) {
    this.spellcasting.preparation.max = simplifyBonus(this.spellcasting.preparation.formula, rollData);

    // Temp method for determining spellcasting type until this data is available directly using advancement
    this.spellcasting.type = CONFIG.DND5E.spellProgression[this.spellcasting.progression]?.type;
    this.spellcasting.slots = CONFIG.DND5E.spellcasting[this.spellcasting.type]?.slots;

    const actor = this.parent.actor;
    if ( !actor ) return;
    this.spellcasting.levels = this.levels ?? this.parent.class?.system.levels;

    // Prepare attack bonus and save DC
    const ability = actor.system.abilities?.[this.spellcasting.ability];
    const mod = ability?.mod ?? 0;
    const modProf = mod + (actor.system.attributes?.prof ?? 0);
    const msak = simplifyBonus(actor.system.bonuses?.msak?.attack, rollData);
    const rsak = simplifyBonus(actor.system.bonuses?.rsak?.attack, rollData);
    this.spellcasting.attack = modProf + (msak === rsak ? msak : 0);
    this.spellcasting.save = ability?.dc ?? (8 + modProf);
  }
}
