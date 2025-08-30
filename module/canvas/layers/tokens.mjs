export default class TokenLayer5e extends foundry.canvas.layers.TokenLayer {
  /**
   * Determine whether the provided grid space is being occupied by a token which should block the provided token
   * @param {GridOffset3D} gridSpace            The grid space to check
   * @param {Token5e} token                     The token being moved
   * @param {object} [options]                  Additional options
   * @param {boolean} [options.preview=false]   Whether the movement in question is previewed
   * @returns {boolean} Whether the moving token should be blocked
   */
  isOccupiedGridSpaceBlocking(gridSpace, token, { preview=false }={}) {
    const found = this.#getRelevantOccupyingTokens(gridSpace, token, { preview });
    const tokenSize = CONFIG.DND5E.actorSizes[token.actor?.system.traits?.size]?.numerical ?? 2;
    const modernRules = game.settings.get("dnd5e", "rulesVersion") === "modern";
    const halflingNimbleness = token.actor?.getFlag("dnd5e", "halflingNimbleness");
    return found.some(t => {
      // Only creatures block movement.
      if ( !t.actor?.system.isCreature ) return false;

      // Friendly tokens never block movement
      if ( token.document.disposition === t.document.disposition ) return false;

      // If creature has any statuses that should never block movement, don't block movement
      if ( t.actor.statuses.intersects(CONFIG.DND5E.neverBlockStatuses) ) return false;

      const occupiedSize = CONFIG.DND5E.actorSizes[t.actor.system.traits.size]?.numerical ?? 2;
      // In modern rules, Tiny creatures can be moved through
      if ( modernRules && (occupiedSize === 0) ) return false;

      // Halfling Nimbleness means no larger creature can block
      if ( halflingNimbleness && (occupiedSize > tokenSize) ) return false;

      // A size difference of less than 2 should block
      return Math.abs(tokenSize - occupiedSize) < 2;
    });
  }

  /* -------------------------------------------- */

  /**
   * Determine whether the provided grid space is being occupied by a token which should at least cause difficult
   * terrain for the provided token
   * @param {GridOffset3D} gridSpace            The grid space to check
   * @param {Token5e} token                     The token being moved
   * @param {object} [options]                  Additional options
   * @param {boolean} [options.preview=false]   Whether the movement in question is previewed
   * @returns {boolean} Whether the moving token should suffer difficult terrain
   */
  isOccupiedGridSpaceDifficult(gridSpace, token, { preview=false }={}) {
    const found = this.#getRelevantOccupyingTokens(gridSpace, token, { preview });
    const modernRules = game.settings.get("dnd5e", "rulesVersion") === "modern";
    return found.some(t => {
      // Only consider creatures as difficult terrain for now.
      if ( !t.actor?.system.isCreature ) return false;

      const friendlyToken = token.document.disposition === t.document.disposition;

      // In modern rules, friendly tokens are not difficult terrain
      if ( modernRules && friendlyToken ) return false;
      const occupiedSize = CONFIG.DND5E.actorSizes[t.actor?.system.traits.size]?.numerical ?? 2;

      // In modern rules, Tiny creatures are not difficult terrain
      if ( modernRules && (occupiedSize === 0) ) return false;

      // Any token which has not been filtered out by this point should at least be difficult terrain, if not blocking
      return true;
    });
  }

  /* -------------------------------------------- */

  /**
   * Determine the set of tokens occupying the provided grid space which may be relevant for blocking/difficult terrain
   * considerations
   * @param {GridOffset3D} gridSpace            The grid space to check
   * @param {Token5e} token                     The token being moved
   * @param {object} [options]                  Additional options
   * @param {boolean} [options.preview=false]   Whether the movement in question is previewed
   * @returns {Set<Token5e>} The set of potentially relevant tokens occupying the provided grid space
   */
  #getRelevantOccupyingTokens(gridSpace, token, { preview=false }={}) {
    const grid = canvas.grid;
    if ( grid.isGridless ) return [];
    const topLeft = grid.getTopLeftPoint(gridSpace);
    const rect = new PIXI.Rectangle(topLeft.x, topLeft.y, grid.sizeX, grid.sizeY);
    const lowerElevation = gridSpace.k * grid.distance;
    const upperElevation = (gridSpace.k + 1) * grid.distance;
    return game.canvas.tokens.quadtree.getObjects(rect, {
      collisionTest: ({ t }) => {
        // Ignore self
        if ( t === token ) return false;

        // Ignore tokens when moving together
        if ( canvas.tokens.controlled.includes(t) ) return false;

        // Always ignore hidden tokens
        if ( t.document.hidden ) return false;

        // If preview movement, don't reveal blocked or difficult terrain for non-visible tokens
        if ( preview && !t.visible ) return false;

        // Always ignore secret tokens
        if ( t.document.disposition === CONST.TOKEN_DISPOSITIONS.SECRET ) return false;

        // Ignore different elevation
        const occupiedElevation = t.document._source.elevation;
        if ( (occupiedElevation < lowerElevation) || (occupiedElevation >= upperElevation) ) return false;

        // Ensure space is actually occupied, not merely touching border of rectangle
        const gridSpaces = t.document.getOccupiedGridSpaceOffsets(t.document._source);
        return gridSpaces.some(coord => (coord.i === gridSpace.i) && (coord.j === gridSpace.j));
      }
    });
  }
}
