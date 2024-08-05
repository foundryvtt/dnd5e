import HealingSheet from "../../applications/activity/healing-sheet.mjs";
import HealingActivityData from "../../data/activity/healing-data.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for rolling healing.
 */
export default class HealingActivity extends ActivityMixin(HealingActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.HEALING"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "healing",
      img: "systems/dnd5e/icons/svg/activity/healing.svg",
      title: "DND5E.HEALING.Title",
      sheetClass: HealingSheet
    }, { inplace: false })
  );
}
