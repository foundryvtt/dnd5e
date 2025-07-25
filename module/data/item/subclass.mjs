import ItemDataModel from "../abstract/item-data-model.mjs";
import IdentifierField from "../fields/identifier-field.mjs";
import SpellcastingField from "./fields/spellcasting-field.mjs";
import AdvancementTemplate from "./templates/advancement.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

/**
 * Data definition for Subclass items.
 * @mixes ItemDescriptionTemplate
 *
 * @property {string} classIdentifier  Identifier slug for the class with which this subclass should be associated.
 * @property {SpellcastingField} spellcasting  Details on subclass's spellcasting ability.
 */
export default class SubclassData extends ItemDataModel.mixin(AdvancementTemplate, ItemDescriptionTemplate) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.SOURCE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      classIdentifier: new IdentifierField({
        required: true, label: "DND5E.ClassIdentifier", hint: "DND5E.ClassIdentifierHint"
      }),
      spellcasting: new SpellcastingField()
    });
  }

  /* -------------------------------------------- */

  /** @override */
  static get compendiumBrowserFilters() {
    return new Map([
      ["class", {
        label: "TYPES.Item.class",
        type: "set",
        config: {
          choices: dnd5e.registry.classes.choices,
          keyPath: "system.classIdentifier"
        }
      }],
      ["hasSpellcasting", {
        label: "DND5E.CompendiumBrowser.Filters.HasSpellcasting",
        type: "boolean",
        createFilter: (filters, value, def) => {
          if ( value === 0 ) return;
          const filter = { k: "system.spellcasting.progression", v: "none" };
          if ( value === -1 ) filters.push(filter);
          else filters.push({ o: "NOT", v: filter });
        }
      }]
    ]);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareBaseData() {
    super.prepareBaseData();
    this.spellcasting.preparation.value = 0;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.prepareDescriptionData();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData() {
    SpellcastingField.prepareData.call(this, this.parent.getRollData({ deterministic: true }));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.subtitles = [{ label: game.i18n.localize(CONFIG.Item.typeLabels.subclass) }];
    context.singleDescription = true;
    context.parts = ["dnd5e.details-subclass", "dnd5e.details-spellcasting"];
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    const actor = this.parent.actor;
    if ( !actor || (userId !== game.user.id) ) return;
    if ( !actor.system.attributes?.spellcasting && this.parent.spellcasting?.ability ) {
      actor.update({ "system.attributes.spellcasting": this.parent.spellcasting.ability });
    }
  }
}
