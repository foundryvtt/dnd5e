import simplifyRollFormula from "../../dice/simplify-roll-formula.mjs";
import { formatCR, simplifyBonus } from "../../utils.mjs";
import ActivityUsageDialog from "./activity-usage-dialog.mjs";

const { BooleanField, StringField } = foundry.data.fields;

/**
 * Dialog for configuring the usage of the summon activity.
 */
export default class SummonUsageDialog extends ActivityUsageDialog {

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    creation: {
      template: "systems/dnd5e/templates/activity/summon-usage-creation.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareCreationContext(context, options) {
    context = await super._prepareCreationContext(context, options);

    const profiles = this.activity.availableProfiles;
    if ( this._shouldDisplay("create.summons") && (profiles.length || (this.activity.creatureSizes.size > 1)
      || (this.activity.creatureTypes.size > 1)) ) {
      context.hasCreation = true;
      context.summonsFields = [];

      if ( !foundry.utils.hasProperty(this.options.display, "create.summons") ) context.summonsFields.push({
        field: new BooleanField({ label: game.i18n.localize("DND5E.SUMMON.Action.Place") }),
        name: "create.summons",
        value: this.config.create?.summons,
        input: context.inputs.createCheckboxInput
      });

      if ( this.config.create?.summons ) {
        const rollData = this.activity.getRollData();
        if ( profiles.length > 1 ) {
          let options = profiles.map(profile => ({
            value: profile._id, label: this.getProfileLabel(profile, rollData)
          }));
          if ( options.every(o => o.label.startsWith("1 × ")) ) {
            options = options.map(({ value, label }) => ({ value, label: label.replace("1 × ", "") }));
          }
          context.summonsFields.push({
            field: new StringField({
              required: true, blank: false, label: game.i18n.localize("DND5E.SUMMON.Profile.Label")
            }),
            name: "summons.profile",
            value: this.config.summons?.profile,
            options
          });
        } else context.summonsProfile = profiles[0]._id;

        if ( this.activity.creatureSizes.size > 1 ) context.summonsFields.push({
          field: new StringField({ label: game.i18n.localize("DND5E.Size") }),
          name: "summons.creatureSize",
          value: this.config.summons?.creatureSize,
          options: Array.from(this.activity.creatureSizes)
            .map(value => ({ value, label: CONFIG.DND5E.actorSizes[value]?.label }))
            .filter(k => k)
        });

        if ( this.activity.creatureTypes.size > 1 ) context.summonsFields.push({
          field: new StringField({ label: game.i18n.localize("DND5E.CreatureType") }),
          name: "summons.creatureType",
          value: this.config.summons?.creatureType,
          options: Array.from(this.activity.creatureTypes)
            .map(value => ({ value, label: CONFIG.DND5E.creatureTypes[value]?.label }))
            .filter(k => k)
        });
      }
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
    let label;
    if ( profile.name ) label = profile.name;
    else {
      switch ( this.activity.summon.mode ) {
        case "cr":
          const cr = simplifyBonus(profile.cr, rollData);
          label = game.i18n.format("DND5E.SUMMON.Profile.ChallengeRatingLabel", { cr: formatCR(cr) });
          break;
        default:
          const doc = fromUuidSync(profile.uuid);
          if ( doc ) label = doc.name;
          break;
      }
    }
    label ??= "—";

    let count = simplifyRollFormula(Roll.replaceFormulaData(profile.count ?? "1", rollData));
    if ( Number.isNumeric(count) ) count = parseInt(count);
    if ( count ) label = `${count} × ${label}`;

    return label;
  }
}
