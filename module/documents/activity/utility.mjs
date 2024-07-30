import ActivitySheet from "../../applications/activity/activity-sheet.mjs";
import BaseActivityData from "../../data/activity/base-activity.mjs";
import ActivityMixin from "./mixin.mjs";

export default class UtilityActivity extends ActivityMixin(BaseActivityData) {
  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "utility",
      img: "systems/dnd5e/icons/svg/activity/utility.svg",
      title: "DND5E.ACTIVITY.Utility.Title",
      sheetClass: ActivitySheet
    }, { inplace: false })
  );
}
