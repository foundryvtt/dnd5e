import SaveSheet from "../../applications/activity/save-sheet.mjs";
import SaveActivityData from "../../data/activity/save-data.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for making saving throws and rolling damage.
 */
export default class SaveActivity extends ActivityMixin(SaveActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.SAVE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "save",
      img: "systems/dnd5e/icons/svg/activity/save.svg",
      title: "DND5E.SAVE.Title.one",
      sheetClass: SaveSheet
    }, { inplace: false })
  );
}
