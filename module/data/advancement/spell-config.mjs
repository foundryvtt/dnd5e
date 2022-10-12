import { FormulaField } from "../fields.mjs";

export default class SpellConfigurationData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      ability: new foundry.data.fields.StringField({label: "DND5E.AbilityModifier"}),
      preparation: new foundry.data.fields.StringField({label: "DND5E.SpellPreparationMode"}),
      uses: new foundry.data.fields.SchemaField({
        max: new FormulaField({extended: true, label: "DND5E.UsesMax"}),
        per: new foundry.data.fields.StringField({label: "DND5E.UsesPeriod"})
      }, {label: "DND5E.LimitedUses"})
    };
  }

  /* -------------------------------------------- */

  /**
   * Changes that this spell configuration indicates should be perform on spells.
   * @type {object}
   */
  get spellChanges() {
    const updates = {};
    if ( this.ability ) updates["system.ability"] = this.ability;
    if ( this.preparation ) updates["system.preparation.mode"] = this.preparation;
    if ( this.uses.max && this.uses.per ) {
      updates["system.uses.max"] = this.uses.max;
      updates["system.uses.per"] = this.uses.per;
      if ( Number.isNumeric(this.uses.max) ) updates["system.uses.value"] = parseInt(this.uses.max);
      else {
        try {
          const rollData = this.parent.parent.actor.getRollData({ deterministic: true });
          const formula = Roll.replaceFormulaData(this.uses.max, rollData, {missing: 0});
          updates["system.uses.value"] = Roll.safeEval(formula);
        } catch(e) { }
      }
    }
    return updates;
  }
}
