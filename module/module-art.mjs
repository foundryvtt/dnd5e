/**
 * @typedef {object} ModuleArtInfo
 * @property {string} actor         The path to the actor's portrait image.
 * @property {string|object} token  The path to the token image, or a richer object specifying additional token
 *                                  adjustments.
 */

/**
 * A class responsible for managing module-provided art in compendia.
 */
export default class ModuleArt {
  constructor() {
    /**
     * The stored map of actor UUIDs to their art information.
     * @type {Map<string, ModuleArtInfo>}
     */
    Object.defineProperty(this, "map", {value: new Map(), writable: false});
  }

  /* -------------------------------------------- */

  /**
   * Register any art mapping information included in active modules.
   * @returns {Promise<void>}
   */
  async registerModuleArt() {
    this.map.clear();
    for ( const module of game.modules ) {
      const artPath = module.flags?.[module.id]?.["dnd5e-art"];
      if ( !artPath || !module.active ) continue;
      try {
        const mapping = await foundry.utils.fetchJsonWithTimeout(artPath);
        await this.#parseArtMapping(mapping);
      } catch ( e ) {
        console.error(e);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Parse a provided module art mapping and store it for reference later.
   * @param {object} mapping  A mapping containing pack names, a list of actor IDs, and paths to the art provided by
   *                          the module for them.
   * @returns {Promise<void>}
   */
  async #parseArtMapping(mapping) {
    for ( const [packName, actors] of Object.entries(mapping) ) {
      const pack = game.packs.get(packName);
      if ( !pack ) continue;
      for ( const [actorId, info] of Object.entries(actors) ) {
        const entry = pack.index.get(actorId);
        if ( !entry ) continue;
        entry.img = info.actor;
        this.map.set(`Compendium.${packName}.${actorId}`, info);
      }
    }
  }
}
