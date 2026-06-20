import ForwardSheet from "../../applications/activity/forward-sheet.mjs";
import BaseForwardActivityData from "../../data/activity/forward-data.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for triggering another activity with modified consumption.
 */
export default class ForwardActivity extends ActivityMixin(BaseForwardActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.FORWARD"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "forward",
      img: "systems/dnd5e/icons/svg/activity/forward.svg",
      title: "DND5E.FORWARD.Title",
      hint: "DND5E.FORWARD.Hint",
      sheetClass: ForwardSheet
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /** @override */
  async use(usage={}, dialog={}, message={}) {
    let targetActivity = null;
    const actor = this.actor;

    const targetItemId = this.targetItem;
    const targetActivityId = this.activity;

    if (targetItemId) {
      const targetItem = actor.items.get(targetItemId);
      if (!targetItem) {
        ui.notifications.error(game.i18n.format("DND5E.FORWARD.Warning.ItemNotFound", { id: targetItemId }));
        return;
      }
      targetActivity = targetItem.system.activities?.get(targetActivityId);
      console.log(targetActivity)
    } else {
      targetActivity = this.item.system.activities?.get(targetActivityId);
    }
    if ( !targetActivity ) ui.notifications.error("DND5E.FORWARD.Warning.NoActivity");

    const usageConfig = foundry.utils.mergeObject({
      cause: {
        activity: this.relativeUUID
      },
      consume: {
        resources: false,
        spellSlot: false
      },
    }, usage);

    return targetActivity.use(usageConfig, dialog, message);
  }
}
