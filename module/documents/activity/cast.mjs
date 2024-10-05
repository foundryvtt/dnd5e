import CastSheet from "../../applications/activity/cast-sheet.mjs";
import CastActivityData from "../../data/activity/cast-data.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for casting a spell from another item.
 */
export default class CastActivity extends ActivityMixin(CastActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.CAST"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "cast",
      img: "systems/dnd5e/icons/svg/activity/cast.svg",
      title: "DND5E.CAST.Title",
      sheetClass: CastSheet
    }, { inplace: false })
  );
}
