import { getPluralLocalizationKey } from "../utils.mjs";
import Application5e from "./api/application.mjs";
import { createCheckboxInput } from "./fields.mjs";
import BaseSettingsConfig from "./settings/base-settings.mjs";

const { BooleanField, StringField } = foundry.data.fields;

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
    adventures: [],
    classes: ["welcome", "standard-form"],
    form: {
      handler: WelcomeScreen.#handleFormSubmission
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

  /**
   * Links provided to the localized text.
   * @type {Record<string, string>}
   */
  static LINKS = {
    changes: "https://github.com/foundryvtt/dnd5e/releases/latest",
    discord: "https://discord.gg/foundryvtt",
    issues: "https://github.com/foundryvtt/dnd5e/issues",
    marketplace: "https://www.foundryvtt.store/systems/dnd5e",
    wiki: "https://github.com/foundryvtt/dnd5e/wiki"
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
        { id: "main", icon: "fa-brands fa-d-and-d" },
        { id: "modules", icon: "fa-solid fa-books" }
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
   * @type {Record<string, Record<string, OfficialModuleListing>>}
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

    const bullets = ["Changes", "Documentation", "Content", "Bugs"]
      .map(k => `<li>${_loc(`DND5E.WELCOME.Message.${k}`, WelcomeScreen.LINKS)}</li>`)
      .join("");
    context.message = `${_loc("DND5E.WELCOME.Message.Introduction")}<ul>${bullets}</ul>`;

    const calendar = BaseSettingsConfig.createSettingField("calendar");
    calendar.field = new StringField({ ...calendar.field.options, blank: true });
    if ( !dnd5e.settings.calendarConfig.enabled ) calendar.value = "";
    context.fields = [
      BaseSettingsConfig.createSettingField("rulesVersion"),
      calendar,
      {
        field: new BooleanField(),
        hint: _loc("DND5E.Bastion.FIELDS.enabled.hint"),
        input: createCheckboxInput,
        label: _loc("DND5E.Bastion.FIELDS.enabled.label"),
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

    const importActions = {};
    for ( const adventure of this.options.adventures ) {
      for ( const action of adventure.importActions ) {
        if ( action.silent || !action.quickstartHandler || (action.id in importActions) ) continue;
        importActions[action.id] = {
          field: new BooleanField(),
          input: createCheckboxInput,
          label: action.label,
          name: `actions.${action.id}`,
          value: action.default
        };
      }
    }
    context.importActions = Object.values(importActions);

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
    context.moreMessage = _loc("DND5E.WELCOME.Message.MoreContent", WelcomeScreen.LINKS);
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
  static async #handleFormSubmission(event, form, formData) {
    if ( !game.user.isGM ) return;

    const { actions, modules={}, ...settings } = foundry.utils.expandObject(formData.object);
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
      const sourceBook = settings.rulesVersion === "modern" ? "SRD 5.2" : "SRD 5.1";
      const disabledSources = game.system.packs.reduce((sources, pack) => {
        const book = pack.flags?.dnd5e?.sourceBook;
        if ( book && (book !== sourceBook) ) sources.add(pack.id);
        return sources;
      }, new Set());
      const moduleData = await this.getModules();
      for ( const [id, enabled] of Object.entries(modules) ) {
        for ( const category of Object.values(moduleData) ) {
          if ( !enabled || !category[id]?.disabledSources?.length ) continue;
          category[id].disabledSources.forEach(id => disabledSources.add(`dnd5e.${id}`));
        }
      }
      if ( modules["dnd-players-handbook"] && modules["dnd-dungeon-masters-guide"] ) {
        disabledSources.add("dnd5e.equipment24");
      }
      await game.settings.set("dnd5e", "packSourceConfiguration",
        Object.fromEntries(game.system.packs.map(p => [p.id, !disabledSources.has(p.id)]))
      );
      await game.settings.set("dnd5e", "firstRun", false);
    }

    if ( !foundry.utils.isEmpty(actions) ) {
      await this.#handleAdventureImportActions(foundry.utils.flattenObject(actions));
    }

    if ( requiresClientReload || requiresWorldReload ) {
      foundry.applications.settings.SettingsConfig.reloadConfirm({ world: requiresWorldReload });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle submission of the dialog.
   * @param {object} actions  Actions object from the form submission.
   * @returns {Promise}
   */
  async #handleAdventureImportActions(actions) {
    const adventureImports = game.settings.get("core", "adventureImports");
    const importActions = {};
    for ( const adventure of this.options.adventures ) {
      for ( const action of adventure.importActions ) {
        if ( !action.quickstartHandler || !((action.id in actions) || action.silent) ) continue;
        importActions[action.id] ??= { adventures: [], handler: action.quickstartHandler };
        importActions[action.id].adventures.push({ adventure, config: action });
        foundry.utils.setProperty(
          adventureImports[adventure.uuid].options, `actions.${action.id}`, actions[action.id] ?? {}
        );
      }
    }

    for ( const { adventures, handler } of Object.values(importActions) ) await handler(adventures);
    await game.settings.set("core", "adventureImports", adventureImports);

    ui.notifications.success(
      getPluralLocalizationKey(this.options.adventures.length, pr => `DND5E.ADVENTURE.Finished.${pr}`),
      { format: { adventure: this.options.adventures[0].name, number: this.options.adventures.length } }
    );
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve listing of official modules to display.
   * @returns {Promise<Record<string, OfficialModuleListing>>}
   */
  async getModules() {
    if ( WelcomeScreen.#modules ) return WelcomeScreen.#modules;

    const local = await fetch(LOCAL_PATH).then(r => r.json());
    let remote;
    try { remote = await fetch(REMOTE_PATH).then(r => r.json()); } catch {}

    for ( const [section, modules] of Object.entries(local) ) {
      for ( const [id, data] of Object.entries(modules) ) {
        data.img = `systems/dnd5e/ui/official/products/${id}.webp`;
      }
      for ( const [id, data] of Object.entries(remote?.[section] ?? {}) ) {
        if ( !(id in modules) ) modules[id] = {
          ...data,
          img: `https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/ui/official/products/${id}.webp`
        };
      }
    }

    WelcomeScreen.#modules = local;
    return WelcomeScreen.#modules;
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Determine whether the welcome dialog needs to be displayed (either the first run of the world or there are
   * unresolved adventure post-import actions).
   */
  static async presentScreen() {
    if ( !game.user.isGM ) return;

    const adventures = (await Promise.all(Object.entries(game.settings.get("core", "adventureImports"))
      .filter(([, { quickstart={} }]) => quickstart.quickstarted && !quickstart.postImport)
      .map(([uuid]) => fromUuid(uuid)))).filter(_ => _);

    if ( !adventures.length && !dnd5e.settings.firstRun ) return;

    try {
      const dialog = new WelcomeScreen({ adventures });
      const { promise, resolve } = Promise.withResolvers();
      dialog.addEventListener("close", () => resolve());
      dialog.render({ force: true });
      await promise;
    } finally {
      const adventureImports = game.settings.get("core", "adventureImports");
      adventures.forEach(a => adventureImports[a.uuid].quickstart.postImport = true);
      await game.settings.set("core", "adventureImports", adventureImports);
    }
  }
}
