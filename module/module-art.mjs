/**
 * @typedef {object} ModuleArtInfo
 * @property {string} actor         The path to the actor's portrait image.
 * @property {string|object} token  The path to the token image, or a richer object specifying additional token
 *                                  adjustments.
 */

/**
 * A class responsible for managing module-provided art in compendia.
 */
export class ModuleArt {
  constructor() {
    /**
     * The stored map of actor UUIDs to their art information.
     * @type {Map<string, ModuleArtInfo>}
     */
    Object.defineProperty(this, "map", {value: new Map(), writable: false});
  }

  /* -------------------------------------------- */

  /**
   * Set to true to temporarily prevent actors from loading module art.
   * @type {boolean}
   */
  suppressArt = false;

  /* -------------------------------------------- */

  /**
   * Register any art mapping information included in active modules.
   * @returns {Promise<void>}
   */
  async registerModuleArt() {
    this.map.clear();
    // Load art modules in reverse order so that higher-priority modules overwrite lower-priority ones.
    for ( const { id, mapping, credit } of this.constructor.getArtModules().reverse() ) {
      try {
        const json = await foundry.utils.fetchJsonWithTimeout(mapping);
        await this.#parseArtMapping(id, json, credit);
      } catch(e) {
        console.error(e);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Parse a provided module art mapping and store it for reference later.
   * @param {string} moduleId  The module ID.
   * @param {object} mapping   A mapping containing pack names, a list of actor IDs, and paths to the art provided by
   *                           the module for them.
   * @param {string} [credit]  An optional credit line to attach to the Actor's biography.
   * @returns {Promise<void>}
   */
  async #parseArtMapping(moduleId, mapping, credit) {
    let settings = game.settings.get("dnd5e", "moduleArtConfiguration")?.[moduleId];
    settings ??= {portraits: true, tokens: true};
    for ( const [packName, actors] of Object.entries(mapping) ) {
      const pack = game.packs.get(packName);
      if ( !pack ) continue;
      for ( let [actorId, info] of Object.entries(actors) ) {
        const entry = pack.index.get(actorId);
        if ( !entry || !(settings.portraits || settings.tokens) ) continue;
        if ( settings.portraits ) entry.img = info.actor;
        else delete info.actor;
        if ( !settings.tokens ) delete info.token;
        if ( credit ) info.credit = credit;
        const uuid = `Compendium.${packName}.${actorId}`;
        info = foundry.utils.mergeObject(this.map.get(uuid) ?? {}, info, {inplace: false});
        this.map.set(`Compendium.${packName}.${actorId}`, info);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * If a module provides art, return the path to is JSON mapping.
   * @param {Module} module  The module.
   * @returns {string|null}
   */
  static getModuleArtPath(module) {
    const flags = module.flags?.[module.id];
    const artPath = flags?.["dnd5e-art"];
    if ( !artPath || !module.active ) return null;
    return artPath;
  }

  /* -------------------------------------------- */

  /**
   * @typedef {object} ModuleArtDescriptor
   * @property {string} id        The module ID.
   * @property {string} label     The module title.
   * @property {string} mapping   The path to the art mapping file.
   * @property {string} [credit]  An optional credit line to attack to the Actor's biography.
   * @property {number} priority  The module's user-configured priority.
   */

  /**
   * Returns all currently configured art modules in priority order.
   * @returns {ModuleArtDescriptor[]}
   */
  static getArtModules() {
    const settings = game.settings.get("dnd5e", "moduleArtConfiguration");
    const unsorted = [];
    const configs = [{
      id: game.system.id,
      label: game.system.title,
      mapping: "systems/dnd5e/json/fa-token-mapping.json",
      priority: settings.dnd5e?.priority ?? CONST.SORT_INTEGER_DENSITY,
      credit: `
        <em>
          Token artwork by
          <a href="https://www.forgotten-adventures.net/" target="_blank" rel="noopener">Forgotten Adventures</a>.
        </em>      
      `
    }];

    for ( const module of game.modules ) {
      const flags = module.flags?.[module.id];
      const mapping = this.getModuleArtPath(module);
      if ( !mapping ) continue;
      const config = { id: module.id, label: module.title, credit: flags?.["dnd5e-art-credit"], mapping };
      configs.push(config);
      const priority = settings[module.id]?.priority;
      if ( priority === undefined ) unsorted.push(config);
      else config.priority = priority;
    }

    const maxPriority = Math.max(...configs.map(({ priority }) => priority ?? -Infinity));
    unsorted.forEach((config, i) => config.priority = maxPriority + ((i + 1) * CONST.SORT_INTEGER_DENSITY));
    configs.sort((a, b) => a.priority - b.priority);
    return configs;
  }
}

/**
 * A class responsible for allowing GMs to configure art provided by installed modules.
 */
export class ModuleArtConfig extends FormApplication {
  /** @inheritdoc */
  constructor(object={}, options={}) {
    object = foundry.utils.mergeObject(game.settings.get("dnd5e", "moduleArtConfiguration"), object, {inplace: false});
    super(object, options);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize("DND5E.ModuleArtConfigL"),
      id: "module-art-config",
      template: "systems/dnd5e/templates/apps/module-art-config.hbs",
      popOut: true,
      width: 600,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options={}) {
    const context = super.getData(options);
    context.config = [];
    for ( const config of ModuleArt.getArtModules() ) {
      const settings = this.object[config.id] ?? { portraits: true, tokens: true };
      context.config.push({ ...config, ...settings });
    }
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action]").on("click", this._onAction.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle priority increase or decrease actions.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onAction(event) {
    const action = event.currentTarget.dataset.action;
    const item = event.currentTarget.closest("[data-id]");
    const id = item.dataset.id;
    const configs = [];
    for ( const element of this.form.elements ) {
      const [id, key] = element.name.split(".");
      if ( key === "priority" ) configs.push({ id, priority: Number(element.value) });
    }
    const idx = configs.findIndex(config => config.id === id);
    if ( idx < 0 ) return;
    if ( (action === "increase") && (idx === 0) ) return;
    if ( (action === "decrease") && (idx === configs.length - 1) ) return;
    const sortBefore = action === "increase";
    const config = configs[idx];
    const target = configs[sortBefore ? idx - 1 : idx + 1];
    configs.splice(idx, 1);
    const updates = SortingHelpers.performIntegerSort(config, {
      target, sortBefore,
      siblings: configs,
      sortKey: "priority"
    });
    updates.forEach(({ target, update }) => this.form.elements[`${target.id}.priority`].value = update.priority);
    if ( action === "increase" ) item.previousElementSibling.insertAdjacentElement("beforebegin", item);
    else item.nextElementSibling.insertAdjacentElement("afterend", item);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    await game.settings.set("dnd5e", "moduleArtConfiguration", foundry.utils.expandObject(formData));
    return SettingsConfig.reloadConfirm({world: true});
  }
}
