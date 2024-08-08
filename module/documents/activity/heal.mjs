import HealSheet from "../../applications/activity/heal-sheet.mjs";
import HealActivityData from "../../data/activity/heal-data.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for rolling healing.
 */
export default class HealActivity extends ActivityMixin(HealActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.HEAL"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "heal",
      img: "systems/dnd5e/icons/svg/activity/heal.svg",
      title: "DND5E.HEAL.Title",
      sheetClass: HealSheet
    }, { inplace: false })
  );
}
