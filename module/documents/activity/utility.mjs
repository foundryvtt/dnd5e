import UtilitySheet from "../../applications/activity/utility-sheet.mjs";
import UtilityActivityData from "../../data/activity/utility-data.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Generic activity for applying effects and rolling an arbitrary die.
 */
export default class UtilityActivity extends ActivityMixin(UtilityActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.UTILITY"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "utility",
      img: "systems/dnd5e/icons/svg/activity/utility.svg",
      title: "DND5E.UTILITY.Title",
      sheetClass: UtilitySheet
    }, { inplace: false })
  );
}
