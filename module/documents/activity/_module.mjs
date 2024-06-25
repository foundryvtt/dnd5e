import BaseActivityData from "../../data/activity/base-activity.mjs";
import ActivityMixin from "./mixin.mjs";
import UtilityActivity from "./utility.mjs";

/**
 * Set up the activities configuration data.
 */
export function setupConfiguration() {
  CONFIG.Activity = {
    documentClass: ActivityMixin(BaseActivityData),
    documentClasses: {
      utility: UtilityActivity
    },
    documentTypes: Array.from(game.system.flags.documentTypes.Activity)
    // TODO: Allow modules to register these types in their manifest flags
  };
}

export { ActivityMixin, UtilityActivity };
