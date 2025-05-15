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
      name,
      field: new Field({
        label: game.i18n.localize(setting.name), hint: game.i18n.localize(setting.hint), required: true, blank: false
      }),
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
   * This method processes the submitted form data, updates the settings, and determines if a reload is required.
   * @this {BaseSettingsConfig}
   * @param {SubmitEvent} event          The submission event.
   * @param {HTMLFormElement} form       The submitted form element.
   * @param {FormDataExtended} formData  The submitted form data.
   * @returns {Promise<void>}            Resolves once the settings are updated, or prompts for a reload if required.
   */
  static async #onCommitChanges(event, form, formData) {
    let requiresClientReload = false;
    let requiresWorldReload = false;
    for ( const [key, value] of Object.entries(foundry.utils.expandObject(formData.object)) ) {
      const setting = game.settings.settings.get(`dnd5e.${key}`);
      const current = game.settings.get("dnd5e", key, { document: true });
      const prior = current?._source?.value ?? current;
      const updated = await game.settings.set("dnd5e", key, value, { document: true });
      if ( prior === (updated?._source?.value ?? updated) ) continue;
      requiresClientReload ||= (setting.scope !== "world") && setting.requiresReload;
      requiresWorldReload ||= (setting.scope === "world") && setting.requiresReload;
    }
    if ( requiresClientReload || requiresWorldReload ) {
      return SettingsConfig.reloadConfirm({ world: requiresWorldReload });
    }
  }
}
