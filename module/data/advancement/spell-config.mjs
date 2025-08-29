import FormulaField from "../fields/formula-field.mjs";

const { BooleanField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

export default class SpellConfigurationData extends foundry.abstract.DataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ability: new SetField(new StringField()),
      method: new StringField(),
      prepared: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
      uses: new SchemaField({
        max: new FormulaField({ deterministic: true }),
        per: new StringField(),
        requireSlot: new BooleanField()
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The item this advancement data belongs to.
   * @returns {Item5e}
   */
  get item() {
    return this.parent?.parent?.item;
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    if ( foundry.utils.getType(source.ability) === "string" ) source.ability = source.ability ? [source.ability] : [];
    if ( !("preparation" in source) ) return;
    const { preparation } = source;
    if ( preparation === "always" ) {
      if ( !("method" in source) ) source.method = "spell";
      if ( !("prepared" in source) ) source.prepared = 2;
    } else {
      if ( !("method" in source) ) {
        if ( preparation === "prepared" ) source.method = "spell";
        else if ( preparation ) source.method = preparation;
      }
      if ( !("prepared" in source) ) source.prepared = 0;
    }
    delete source.preparation;
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

    if ( this.method ) {
      foundry.utils.setProperty(itemData, "system.method", this.method);
      foundry.utils.setProperty(itemData, "system.prepared", this.prepared);
      const model = CONFIG.DND5E.spellcasting[this.method];
      const hasClass = (this.item?.type === "class") || (this.item?.type === "subclass");

      // Set source class.
      if ( model.slots && hasClass ) {
        const identifier = this.item.type === "class" ? this.item.identifier : this.item.system.classIdentifier;
        if ( identifier ) foundry.utils.setProperty(itemData, "system.sourceClass", identifier);
      }
    }

    if ( this.uses.max && this.uses.per ) {
      foundry.utils.setProperty(itemData, "system.uses.max", this.uses.max);
      itemData.system.uses.recovery ??= [];
      itemData.system.uses.recovery.push({ period: this.uses.per, type: "recoverAll" });

      const spellcasting = CONFIG.DND5E.spellcasting[itemData.system.method];
      const createForwardActivity = !this.uses.requireSlot && spellcasting?.slots;

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
