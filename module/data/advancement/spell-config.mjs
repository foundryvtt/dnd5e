import FormulaField from "../fields/formula-field.mjs";

const { BooleanField, SchemaField, SetField, StringField } = foundry.data.fields;

export default class SpellConfigurationData extends foundry.abstract.DataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ability: new SetField(new StringField()),
      preparation: new StringField({ label: "DND5E.SpellPreparation.Mode" }),
      uses: new SchemaField({
        max: new FormulaField({ deterministic: true, label: "DND5E.UsesMax" }),
        per: new StringField({ label: "DND5E.UsesPeriod" }),
        requireSlot: new BooleanField()
      }, { label: "DND5E.LimitedUses" })
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
   * Apply changes to a spell item based on this spell configuration.
   * @param {object} itemData          Data for the item to modify.
   * @param {object} [config={}]
   * @param {string} [config.ability]  Spellcasting ability selected during advancement process.
   */
  applySpellChanges(itemData, { ability }={}) {
    ability = this.ability.size ? this.ability.has(ability) ? ability : this.ability.first() : null;
    if ( ability ) foundry.utils.setProperty(itemData, "system.ability", ability);
    if ( this.preparation ) foundry.utils.setProperty(itemData, "system.preparation.mode", this.preparation);

    if ( this.uses.max && this.uses.per ) {
      foundry.utils.setProperty(itemData, "system.uses.max", this.uses.max);
      itemData.system.uses.recovery ??= [];
      itemData.system.uses.recovery.push({ period: this.uses.per, type: "recoverAll" });

      const preparationConfig = CONFIG.DND5E.spellPreparationModes[itemData.system.preparation?.mode];
      const createForwardActivity = !this.uses.requireSlot && preparationConfig?.upcast;

      for ( const activity of Object.values(itemData.system.activities ?? {}) ) {
        if ( !activity.consumption?.spellSlot ) continue;

        // Create a forward activity
        if ( createForwardActivity ) {
          const newActivity = {
            _id: foundry.utils.randomID(),
            type: "forward",
            name: `${activity.name ?? game.i18n.localize(
              CONFIG.DND5E.activityTypes[activity.type]?.documentClass.metadata.title
            )} (${game.i18n.localize("DND5E.ADVANCEMENT.SPELLCONFIG.FreeCasting").toLowerCase()})`,
            sort: (activity.sort ?? 0) + 1,
            activity: {
              id: activity._id
            },
            consumption: {
              targets: [{ type: "itemUses", target: "", value: "1" }]
            }
          };
          foundry.utils.setProperty(itemData, `system.activities.${newActivity._id}`, newActivity);
        }

        // Modify existing activity
        else {
          const activityData = foundry.utils.deepClone(activity);
          activityData.consumption.targets ??= [];
          activityData.consumption.targets.push({ type: "itemUses", target: "", value: "1" });
          foundry.utils.setProperty(itemData, `system.activities.${activityData._id}`, activityData);
        }
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Changes that this spell configuration indicates should be performed on spells.
   * @param {object} data  Data for the advancement process.
   * @returns {object}
   * @deprecated since DnD5e 4.0, available until DnD5e 4.4
   */
  getSpellChanges(data={}) {
    foundry.utils.logCompatibilityWarning(
      "The `getSpellChanges` method on `SpellConfigurationData` has been deprecated and replaced with `applySpellChanges`.",
      { since: "DnD5e 4.0", until: "DnD5e 4.4" }
    );
    const updates = {};
    if ( this.ability.size ) {
      updates["system.ability"] = this.ability.has(data.ability) ? data.ability : this.ability.first();
    }
    if ( this.preparation ) updates["system.preparation.mode"] = this.preparation;
    if ( this.uses.max && this.uses.per ) {
      updates["system.uses.max"] = this.uses.max;
      updates["system.uses.per"] = this.uses.per;
    }
    return updates;
  }
}
