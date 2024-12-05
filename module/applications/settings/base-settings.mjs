import Application5e from "../api/application.mjs";
import { createCheckboxInput } from "../fields.mjs";

const { BooleanField, NumberField, StringField } = foundry.data.fields;

/**
 * Base application for configuring system settings.
 */
export default class BaseSettingsConfig extends Application5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["standard-form"],
    position: {
      width: 500
    },
    form: {
      closeOnSubmit: true,
      handler: BaseSettingsConfig.#onCommitChanges
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/settings/base-config.hbs"
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
    context.fields = [];
    context.buttons = [{ type: "submit", icon: "fas fa-save", label: "Save Changes" }];
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Create the field data for a specific setting.
   * @param {string} name  Setting key within the dnd5e namespace.
   * @returns {object}
   */
  createSettingField(name) {
    const setting = game.settings.settings.get(`dnd5e.${name}`);
    if ( !setting ) throw new Error(`Setting \`dnd5e.${name}\` not registered.`);
    const Field = { [Boolean]: BooleanField, [Number]: NumberField, [String]: StringField }[setting.type];
    if ( !Field ) throw new Error("Automatic field generation only available for Boolean, Number, or String types");
    const data = {
      field: new Field({ label: game.i18n.localize(setting.name), hint: game.i18n.localize(setting.hint) }),
      name,
      value: game.settings.get("dnd5e", name)
    };
    if ( setting.type === Boolean ) data.input = createCheckboxInput;
    if ( setting.choices ) data.options = Object.entries(setting.choices)
      .map(([value, label]) => ({ value, label: game.i18n.localize(label) }));
    return data;
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Commit settings changes.
   * @this {BaseSettingsConfig}
   * @param {SubmitEvent} event          The submission event.
   * @param {HTMLFormElement} form       The submitted form element.
   * @param {FormDataExtended} formData  The submitted form data.
   * @returns {Promise}
   */
  static async #onCommitChanges(event, form, formData) {
    for ( const [key, value] of Object.entries(foundry.utils.expandObject(formData.object)) ) {
      await game.settings.set("dnd5e", key, value);
    }
  }
}
