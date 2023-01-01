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
    for ( const module of game.modules ) {
      const flags = module.flags?.[module.id];
      const artPath = this.constructor.getModuleArtPath(module);
      if ( !artPath ) continue;
      try {
        const mapping = await foundry.utils.fetchJsonWithTimeout(artPath);
        await this.#parseArtMapping(module.id, mapping, flags["dnd5e-art-credit"]);
      } catch( e ) {
        console.error(e);
      }
    }

    // Load system mapping.
    try {
      const mapping = await foundry.utils.fetchJsonWithTimeout("systems/dnd5e/json/fa-token-mapping.json");
      const credit = `
        <em>
          Token artwork by
          <a href="https://www.forgotten-adventures.net/" target="_blank" rel="noopener">Forgotten Adventures</a>.
        </em>
      `;
      await this.#parseArtMapping(game.system.id, mapping, credit);
    } catch( e ) {
      console.error(e);
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
      template: "systems/dnd5e/templates/apps/module-art-config.html",
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
    for ( const module of game.modules ) {
      if ( !ModuleArt.getModuleArtPath(module) ) continue;
      const settings = this.object[module.id] ?? {portraits: true, tokens: true};
      context.config.push({label: module.title, id: module.id, ...settings});
    }
    context.config.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
    context.config.unshift({label: game.system.title, id: game.system.id, ...this.object.dnd5e});
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    await game.settings.set("dnd5e", "moduleArtConfiguration", foundry.utils.expandObject(formData));
    return SettingsConfig.reloadConfirm({world: true});
  }
}
