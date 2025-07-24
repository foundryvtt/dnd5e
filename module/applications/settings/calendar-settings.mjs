import { CalendarConfigSetting, CalendarPreferencesSetting } from "../../data/settings/calendar-setting.mjs";
import { createCheckboxInput } from "../fields.mjs";
import BaseSettingsConfig from "./base-settings.mjs";

const { BooleanField } = foundry.data.fields;

/**
 * An application for configuring calendar settings.
 */
export default class CalendarSettingsConfig extends BaseSettingsConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    window: {
      title: "DND5E.CALENDAR.Configuration.Label"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/settings/base-config.hbs"
    },
    preferences: {
      template: "systems/dnd5e/templates/settings/calendar-preferences.hbs"
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if ( !game.user.isGM ) delete parts.config;
    return parts;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "config": return this._prepareConfigContext(context, options);
      case "preferences": return this._preparePreferencesContext(context, options);
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the DM configuration section
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareConfigContext(context, options) {
    const data = game.settings.get("dnd5e", "calendarConfig");
    context.fields = Object.entries(CalendarConfigSetting.schema.fields)
      .filter(([name]) => name !== "buttons")
      .map(([name, field]) => ({
        field,
        input: field instanceof BooleanField ? createCheckboxInput : undefined,
        name: `calendarConfig.${name}`,
        value: data[name]
      }));
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the player preferences section
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _preparePreferencesContext(context, options) {
    const data = game.settings.get("dnd5e", "calendarPreferences");
    const fields = CalendarPreferencesSetting.schema.fields;
    context.fields = [
      {
        field: fields.visible,
        input: createCheckboxInput,
        name: "calendarPreferences.visible",
        value: data.visible
      },
      {
        field: fields.formatters.fields.date,
        name: "calendarPreferences.formatters.date",
        options: CONFIG.DND5E.calendar.formatters,
        value: data.formatters.date
      },
      {
        field: fields.formatters.fields.time,
        name: "calendarPreferences.formatters.time",
        options: CONFIG.DND5E.calendar.formatters,
        value: data.formatters.time
      }
    ];
    context.showMessage = !game.settings.get("dnd5e", "calendarConfig")?.enabled;
    context.disabled = context.showMessage && !game.user.isGM;
    return context;
  }
}
