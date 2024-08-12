import FormulaField from "../fields/formula-field.mjs";

const { SchemaField, SetField, StringField } = foundry.data.fields;

export default class SpellConfigurationData extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      ability: new SetField(new StringField()),
      preparation: new StringField({label: "DND5E.SpellPreparationMode"}),
      uses: new SchemaField({
        max: new FormulaField({deterministic: true, label: "DND5E.UsesMax"}),
        per: new StringField({label: "DND5E.UsesPeriod"})
      }, {label: "DND5E.LimitedUses"})
    };
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    if ( foundry.utils.getType(source.ability) === "string" ) {
      source.ability = source.ability ? [source.ability] : [];
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Changes that this spell configuration indicates should be performed on spells.
   * @param {object} data  Data for the advancement process.
   * @returns {object}
   */
  getSpellChanges(data={}) {
    const updates = {};
    if ( this.ability.size ) {
      updates["system.ability"] = this.ability.has(data.ability) ? data.ability : this.ability.first();
    }
    if ( this.preparation ) updates["system.preparation.mode"] = this.preparation;
    if ( this.uses.max && this.uses.per ) {
      updates["system.uses.max"] = this.uses.max;
      updates["system.uses.per"] = this.uses.per;
      if ( Number.isNumeric(this.uses.max) ) updates["system.uses.value"] = parseInt(this.uses.max);
      else {
        try {
          const rollData = this.parent.parent.actor.getRollData({ deterministic: true });
          const formula = Roll.replaceFormulaData(this.uses.max, rollData, {missing: 0});
          const roll = new Roll(formula);
          updates["system.uses.value"] = roll.evaluateSync().total;
        } catch(e) { }
      }
    }
    return updates;
  }
}
