import AttackSheet from "../../applications/activity/attack-sheet.mjs";
import AttackActivityData from "../../data/activity/attack-data.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for making attacks and rolling damage.
 */
export default class AttackActivity extends ActivityMixin(AttackActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.ATTACK"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "attack",
      img: "systems/dnd5e/icons/svg/activity/attack.svg",
      title: "DND5E.ATTACK.Title.one",
      sheetClass: AttackSheet
    }, { inplace: false })
  );
}
