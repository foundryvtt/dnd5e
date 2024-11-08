import Application5e from "./api/application.mjs";

export default class BastionConfig extends Application5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["standard-form"],
    position: {
      width: 500
    },
    window: {
      title: "DND5E.Bastion.Configuration.Label"
    },
    form: {
      closeOnSubmit: true,
      handler: BastionConfig.#onCommitChanges
    }
  };

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/apps/bastion-config.hbs"
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.fields = BastionSetting.schema.fields;
    context.source = game.settings.get("dnd5e", "bastionConfiguration");
    context.buttons = [{ type: "submit", icon: "fas fa-save", label: "Save Changes" }];
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Commit settings changes.
   * @this {BastionConfig}
   * @param {SubmitEvent} event          The submission event.
   * @param {HTMLFormElement} form       The submitted form element.
   * @param {FormDataExtended} formData  The submitted form data.
   * @returns {Promise}
   */
  static #onCommitChanges(event, form, formData) {
    return game.settings.set("dnd5e", "bastionConfiguration", formData.object);
  }
}

/* -------------------------------------------- */

const { BooleanField, NumberField } = foundry.data.fields;

/**
 * A data model that represents the Bastion configuration options.
 */
export class BastionSetting extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      button: new BooleanField({
        required: true, label: "DND5E.Bastion.Button.Label", hint: "DND5E.Bastion.Button.Hint"
      }),
      duration: new NumberField({
        required: true, positive: true, integer: true, initial: 7, label: "DND5E.Bastion.Duration.Label"
      }),
      enabled: new BooleanField({
        required: true, label: "DND5E.Bastion.Enabled.Label", hint: "DND5E.Bastion.Enabled.Hint"
      })
    };
  }
}
