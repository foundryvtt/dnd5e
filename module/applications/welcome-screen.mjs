import Application5e from "./api/application.mjs";
import { createCheckboxInput } from "./fields.mjs";
import BaseSettingsConfig from "./settings/base-settings.mjs";

const { BooleanField } = foundry.data.fields;

/**
 * @import { OfficialModuleListing } from "./_types.mjs";
 */

const REMOTE_PATH = "https://raw.githubusercontent.com/foundryvtt/dnd5e/refs/heads/publish-wiki/json/official-content.json";
const LOCAL_PATH = "systems/dnd5e/json/official-content.json";

/**
 * Application that appears when a world is first launched, displaying important links, rules settings, and
 * official content that can be quickly enabled.
 */
export default class WelcomeScreen extends Application5e {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["welcome", "standard-form"],
    form: {
      handler: WelcomeScreen.#onSubmitForm
    },
    position: {
      width: 720,
      top: 100
    },
    tag: "form",
    window: {
      icon: "fa-solid fa-handshake",
      title: "DND5E.WELCOME.Title"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    main: {
      template: "systems/dnd5e/templates/apps/welcome-main.hbs"
    },
    modules: {
      template: "systems/dnd5e/templates/apps/welcome-modules.hbs",
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static TABS = {
    sheet: {
      tabs: [
        { id: "main", icon: "fa-solid fa-face-grin" },
        { id: "modules", icon: "fa-solid fa-play" }
      ],
      initial: "main",
      labelPrefix: "DND5E.WELCOME.Tab"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Cached version of the module JSON.
   * @type {Promise<Record<string, OfficialModuleListing[]>|void>}
   */
  static #modules;

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "main": return this._prepareMainContext(context, options);
      case "modules": return this._prepareModulesContext(context, options);
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the main tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareMainContext(context, options) {
    context.tab = context.tabs.main;

    // TODO: Write welcome message and links
    context.message = "<p>Welcome text</p><ul><li>Important</li><li>Links</li></ul>";

    const calendar = BaseSettingsConfig.createSettingField("calendar");
    calendar.field.blank = true;
    if ( !dnd5e.settings.calendarConfig.enabled ) calendar.value = "";
    context.fields = [
      BaseSettingsConfig.createSettingField("rulesVersion"),
      calendar,
      {
        field: new BooleanField(),
        hint: _loc("DND5E.Bastion.Enabled.Hint"),
        input: createCheckboxInput,
        label: _loc("DND5E.Bastion.Enabled.Label"),
        name: "bastionConfiguration.enabled",
        value: dnd5e.settings.bastionConfiguration.enabled
      },
      {
        field: new BooleanField(),
        hint: _loc("DND5E.WELCOME.Settings.Metric.Hint"),
        input: createCheckboxInput,
        label: _loc("DND5E.WELCOME.Settings.Metric.Label"),
        name: "metric",
        value: dnd5e.settings.metricLengthUnits
          || dnd5e.settings.metricVolumeUnits
          || dnd5e.settings.metricWeightUnits
      }
    ];

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the modules tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareModulesContext(context, options) {
    context.tab = context.tabs.modules;
    context.modules = await this.getModules();
    if ( !context.modules ) return context;
    context.modules = foundry.utils.deepClone(context.modules);
    for ( const category of Object.values(context.modules) ) {
      for ( const [id, data] of Object.entries(category) ) {
        const config = game.modules.get(id);
        data.installed = !!config;
        data.enabled = config?.active === true;
      }
    }
    return context;
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    if ( (dnd5e.settings.metricLengthUnits !== dnd5e.settings.metricVolumeUnits)
      || (dnd5e.settings.metricLengthUnits !== dnd5e.settings.metricWeightUnits)
      || (dnd5e.settings.metricVolumeUnits !== dnd5e.settings.metricWeightUnits) ) {
      this.element.querySelector('[name="metric"]').setAttribute("indeterminate", "");
    }

    if ( !game.user.isGM ) this._disableFields();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preClose(options) {
    await super._preClose(options);
    await this.submit();
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Handle updating settings and enabled modules.
   * @this {WelcomeScreen}
   * @param {SubmitEvent} event          Triggering submit event.
   * @param {HTMLFormElement} form       The form that was submitted.
   * @param {FormDataExtended} formData  Data from the submitted form.
   */
  static async #onSubmitForm(event, form, formData) {
    if ( !game.user.isGM ) return;

    const { modules, ...settings } = foundry.utils.expandObject(formData.object);
    settings.calendarConfig = { enabled: settings.calendar !== "" };
    if ( settings.calendar === "" ) delete settings.calendar;
    if ( !this.element.querySelector('[name="metric"]').indeterminate ) {
      settings.metricLengthUnits = settings.metricVolumeUnits = settings.metricWeightUnits = settings.metric;
    }
    delete settings.metric;
    let { requiresClientReload, requiresWorldReload } = await BaseSettingsConfig.commitChanges(settings);

    const toggledModules = Object.entries(modules).reduce((map, [id, enabled]) => {
      if ( enabled !== game.modules.get(id)?.active ) map.set(id, enabled);
      return map;
    }, new Map());
    if ( toggledModules.size ) {
      requiresWorldReload = true;
      const moduleConfiguration = game.modules.values().reduce((obj, config) => {
        obj[config.id] = toggledModules.get(config.id) ?? config.active;
        return obj;
      }, {});
      await game.settings.set("core", "moduleConfiguration", moduleConfiguration);
    }

    if ( dnd5e.settings.firstRun ) {
      await game.settings.set("dnd5e", "firstRun", false);
      // TODO: If first run, adjust compendium browser filters to match rules version & enabled modules
    }

    if ( requiresClientReload || requiresWorldReload ) {
      foundry.applications.settings.SettingsConfig.reloadConfirm({ world: requiresWorldReload });
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve listing of official modules to display.
   * @returns {Promise<Record<string, OfficialModuleListing[]>>}
   */
  async getModules() {
    if ( WelcomeScreen.#modules ) return WelcomeScreen.#modules;

    const local = await fetch(LOCAL_PATH).then(r => r.json());
    let remote;
    try {
      remote = await fetch(REMOTE_PATH).then(r => r.json());
    } catch(err) {}

    for ( const [section, modules] of Object.entries(local) ) {
      for ( const [id, data] of Object.entries(modules) ) {
        data.img = `systems/dnd5e/ui/official/products/${id}.webp`;
      }
      for ( const [id, data] of Object.entries(remote?.[section]?.modules ?? {}) ) {
        if ( !(id in modules) ) modules[id] = {
          ...data,
          img: `https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/ui/official/products/${id}.webp`
        };
      }
    }

    WelcomeScreen.#modules = local;
    return WelcomeScreen.#modules;
  }
}
