const { BooleanField } = foundry.data.fields;

/**
 * Extension of terrain data with support for 5e concepts.
 */
export default class TerrainData5e extends foundry.data.TerrainData {

  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      difficultTerrain: new BooleanField()
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static getMovementCostFunction(token, options) {
    return token.actor?.system.isCreature
      ? super.getMovementCostFunction(token, options)
      : (_from, _to, distance) => distance;
  }

  /* -------------------------------------------- */

  /** @override */
  static resolveTerrainEffects(effects) {
    const noAutomation = game.settings.get("dnd5e", "disableMovementAutomation");
    let data = super.resolveTerrainEffects(effects);
    if ( noAutomation || !effects.some(e => e.name === "difficultTerrain") ) return data;
    if ( !data ) return new this({ difficulty: 2, difficultTerrain: true });

    let difficulty = data.difficulty + 1;
    if ( !Number.isFinite(difficulty) ) difficulty = null;
    data.updateSource({ difficulty, difficultTerrain: true });
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  equals(other) {
    if ( !(other instanceof TerrainData5e) ) return false;
    return (this.difficulty === other.difficulty)
      && (this.difficultTerrain === other.difficultTerrain);
  }
}
