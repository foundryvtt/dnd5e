import { formatCR, simplifyBonus } from "../../utils.mjs";
import ActivityUsageDialog from "./activity-usage-dialog.mjs";

const { StringField } = foundry.data.fields;

/**
 * Dialog for configuring the usage of the transform activity.
 */
export default class TransformUsageDialog extends ActivityUsageDialog {

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    creation: {
      template: "systems/dnd5e/templates/activity/transform-usage-creation.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareCreationContext(context, options) {
    context = await super._prepareCreationContext(context, options);

    const profiles = this.activity.availableProfiles;
    if ( this._shouldDisplay("create.transform") && (profiles.length > 1) ) {
      const rollData = this.activity.getRollData();
      let options = profiles.map(profile => ({
        value: profile._id, label: this.getProfileLabel(profile, rollData)
      }));
      context.hasCreation = true;
      context.transformFields = [{
        field: new StringField({
          required: true, blank: false, label: game.i18n.localize("DND5E.TRANSFORM.Profile.Label")
        }),
        name: "transform.profile",
        value: this.config.transform?.profile,
        options
      }];
    } else if ( profiles.length ) {
      context.transformProfile = profiles[0]._id;
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Determine the label for a profile in the ability use dialog.
   * @param {SummonsProfile} profile  Profile for which to generate the label.
   * @param {object} rollData         Roll data used to prepare the count.
   * @returns {string}
   */
  getProfileLabel(profile, rollData) {
    if ( profile.name ) return profile.name;
    switch ( this.activity.transform.mode ) {
      case "cr":
        const cr = simplifyBonus(profile.cr, rollData);
        return game.i18n.format("DND5E.TRANSFORM.Profile.ChallengeRatingLabel", { cr: formatCR(cr) });
      default:
        const doc = fromUuidSync(profile.uuid);
        if ( doc ) return doc.name;
    }
    return "—";
  }
}
