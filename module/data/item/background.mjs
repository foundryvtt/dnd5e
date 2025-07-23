import ItemDataModel from "../abstract/item-data-model.mjs";
import AdvancementTemplate from "./templates/advancement.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import StartingEquipmentTemplate from "./templates/starting-equipment.mjs";

/**
 * Data definition for Background items.
 * @mixes AdvancementTemplate
 * @mixes ItemDescriptionTemplate
 * @mixes StartingEquipmentTemplate
 */
export default class BackgroundData extends ItemDataModel.mixin(
  AdvancementTemplate, ItemDescriptionTemplate, StartingEquipmentTemplate
) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.SOURCE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    singleton: true
  }, {inplace: false}));

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.prepareDescriptionData();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.subtitles = [{ label: game.i18n.localize(CONFIG.Item.typeLabels.background) }];
    context.singleDescription = true;
    context.parts = ["dnd5e.details-background", "dnd5e.details-starting-equipment"];
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @override */
  _advancementToCreate(options) {
    if ( game.settings.get("dnd5e", "rulesVersion") === "legacy" ) return [
      { type: "Trait", title: game.i18n.localize("DND5E.ADVANCEMENT.Defaults.BackgroundProficiencies") },
      { type: "ItemGrant", title: game.i18n.localize("DND5E.ADVANCEMENT.Defaults.BackgroundFeature") }
    ];

    return [
      { type: "AbilityScoreImprovement", configuration: { points: 3 } },
      { type: "Trait", title: game.i18n.localize("DND5E.ADVANCEMENT.Defaults.BackgroundProficiencies") },
      {
        type: "Trait",
        title: game.i18n.localize("DND5E.ADVANCEMENT.Defaults.ChooseLanguages"),
        configuration: { grants: ["languages:standard:common"] }
      },
      { type: "ItemGrant", title: game.i18n.localize("DND5E.ADVANCEMENT.Defaults.BackgroundFeat") }
    ];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;
    await this.preCreateAdvancement(data, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if ( (game.user.id !== userId) || this.parent.actor?.type !== "character" ) return;
    this.parent.actor.update({"system.details.background": this.parent.id});
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preDelete(options, user) {
    if ( (await super._preDelete(options, user)) === false ) return false;
    if ( this.parent.actor?.type !== "character" ) return;
    await this.parent.actor.update({"system.details.background": null});
  }
}
