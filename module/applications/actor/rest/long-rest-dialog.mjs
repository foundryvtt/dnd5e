import BaseRestDialog from "./base-rest-dialog.mjs";

const { BooleanField } = foundry.data.fields;

/**
 * Dialog for configuring a long rest.
 */
export default class LongRestDialog extends BaseRestDialog {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["long-rest"],
    window: {
      title: "DND5E.REST.Long.Label"
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/actors/rest/long-rest.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareFields(context, options) {
    await super._prepareFields(context, options);

    const { enabled, reminder } = dnd5e.settings.bastionConfiguration;
    const { enabled: calendarEnabled } = dnd5e.settings.calendarConfig;
    if ( game.user.isGM && context.isGroup && enabled && (!calendarEnabled || !reminder) ) context.fields.unshift({
      field: new BooleanField({ label: _loc(`DND5E.Bastion.Action.${calendarEnabled ? "Maintain" : "Advance"}`) }),
      input: context.inputs.createCheckboxInput,
      name: "advanceBastionTurn",
      value: context.config.advanceBastionTurn
    });
  }
}
