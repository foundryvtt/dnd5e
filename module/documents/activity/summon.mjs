import SummonSheet from "../../applications/activity/summon-sheet.mjs";
import SummonActivityData from "../../data/activity/summon-data.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for summoning creatures.
 */
export default class SummonActivity extends ActivityMixin(SummonActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.SUMMON"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "summon",
      img: "systems/dnd5e/icons/svg/activity/summon.svg",
      title: "DND5E.SUMMON.Title",
      sheetClass: SummonSheet
    }, { inplace: false })
  );
}
