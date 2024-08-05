import EnchantSheet from "../../applications/activity/enchant-sheet.mjs";
import EnchantActivityData from "../../data/activity/enchant-data.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for enchanting items.
 */
export default class EnchantActivity extends ActivityMixin(EnchantActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.ENCHANT"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "enchant",
      img: "systems/dnd5e/icons/svg/activity/enchant.svg",
      title: "DND5E.ENCHANT.Title",
      sheetClass: EnchantSheet
    }, { inplace: false })
  );

  /* -------------------------------------------- */

  /** @inheritDoc */
  static localize() {
    super.localize();
    this._localizeSchema(this.schema.fields.effects.element, ["DND5E.ENCHANT.FIELDS.effects"]);
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * List of item types that are enchantable.
   * @type {Set<string>}
   */
  get enchantableTypes() {
    return Object.entries(CONFIG.Item.dataModels).reduce((set, [k, v]) => {
      if ( v.metadata?.enchantable ) set.add(k);
      return set;
    }, new Set());
  }
}
