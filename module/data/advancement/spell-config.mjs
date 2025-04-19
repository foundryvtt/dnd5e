import FormulaField from "../fields/formula-field.mjs";

const { BooleanField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

export default class SpellConfigurationData extends foundry.abstract.DataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ability: new SetField(new StringField()),
      preparation: new StringField(),
      prepared: new NumberField({
        label: "DND5E.SpellPrepared",
        nullable: false,
        initial: CONFIG.DND5E.spellPreparationStates.unprepared.value,
        choices: () => {
          return Object.values(CONFIG.DND5E.spellPreparationStates).reduce((acc, v) => {
            if ( v.value !== 1 ) acc[v.value] = v.label;
            return acc;
          }, {});
        }
      }),
      uses: new SchemaField({
        max: new FormulaField({ deterministic: true }),
        per: new StringField(),
        requireSlot: new BooleanField()
      })
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

    if ( ["prepared", "always"].includes(source.preparation) ) {
      source.prepared = (source.preparation === "always") ? 2 : 0;
      source.preparation = "spell";
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
    if ( this.preparation ) {
      foundry.utils.mergeObject(itemData, {
        "system.preparation.mode": this.preparation,
        "system.preparation.prepared": this.prepared
      });
    }

    if ( this.uses.max && this.uses.per ) {
      foundry.utils.setProperty(itemData, "system.uses.max", this.uses.max);
      itemData.system.uses.recovery ??= [];
      itemData.system.uses.recovery.push({ period: this.uses.per, type: "recoverAll" });

      const preparationConfig = CONFIG.DND5E.spellcasting[itemData.system.preparation?.mode];
      const createForwardActivity = !this.uses.requireSlot && !preparationConfig?.isStatic;

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
}
