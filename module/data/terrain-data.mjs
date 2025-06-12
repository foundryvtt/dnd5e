const { BooleanField } = foundry.data.fields;

/**
 * Extension of terrain data with support for 5e concepts.
 */
export default class TerrainData5e extends foundry.data.TerrainData {

  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      difficultTerrain: new BooleanField({ required: true })
    };
  }

  /* -------------------------------------------- */

  /** @override */
  static resolveTerrainEffects(effects) {
    let data = super.resolveTerrainEffects(effects);
    if ( !effects.some(e => e.name === "difficultTerrain") ) return data;
    if ( data ) data.updateSource({ difficultTerrain: true });
    else data = new this({ difficultTerrain: true });
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  static getMovementCostFunction(token, options) {
    return (from, to, distance, segment) => {
      let finalDistance = distance * (segment.terrain?.difficulty ?? 1);
      if ( segment.terrain?.difficultTerrain ) finalDistance += distance;
      return finalDistance;
    };
  }

  /* -------------------------------------------- */

  /** @override */
  equals(other) {
    if ( !(other instanceof TerrainData5e) ) return false;
    return (this.difficulty === other.difficulty)
      && (this.difficultTerrain === other.difficultTerrain);
  }
}
