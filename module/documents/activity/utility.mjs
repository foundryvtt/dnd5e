import BaseActivityData from "../../data/activity/base-activity.mjs";
import ActivityMixin from "./mixin.mjs";

export default class UtilityActivity extends ActivityMixin(BaseActivityData) {
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "utility",
      img: "systems/dnd5e/icons/svg/activity/utility.svg",
      title: "DND5E.ACTIVITY.Utility.Title"
    }, { inplace: false })
  );
}
