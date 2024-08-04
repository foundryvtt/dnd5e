import DamageSheet from "../../applications/activity/damage-sheet.mjs";
import DamageActivityData from "../../data/activity/damage-data.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for rolling damage.
 */
export default class DamageActivity extends ActivityMixin(DamageActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.DAMAGE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "damage",
      img: "systems/dnd5e/icons/svg/activity/damage.svg",
      title: "DND5E.DAMAGE.Title",
      sheetClass: DamageSheet
    }, { inplace: false })
  );
}
