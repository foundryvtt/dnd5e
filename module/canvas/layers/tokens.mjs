export default class TokenLayer5e extends foundry.canvas.layers.TokenLayer {
  /**
   * Determine whether the provided grid space is being occupied by a token which should block the provided token
   * @param {GridOffset3D} gridSpace  The grid space to check
   * @param {Token5e} token           The token being moved
   * @returns {boolean} Whether the moving token should be blocked
   */
  isOccupiedGridSpaceBlocking(gridSpace, token) {
    const found = this._getRelevantOccupyingTokens(gridSpace, token);
    const tokenSize = CONFIG.DND5E.actorSizes[token.actor?.system.traits.size]?.numerical ?? 2;
    const modernRules = game.settings.get("dnd5e", "rulesVersion") === "modern";
    const halflingNimbleness = token.actor?.getFlag("dnd5e", "halflingNimbleness");
    return found.some(t => {
      // Friendly tokens never block movement
      if ( token.document.disposition === t.document.disposition ) return false;

      // Dead creatures never block movement, as they are objects
      if ( t.actor?.statuses.has("dead") ) return false;

      const occupiedSize = CONFIG.DND5E.actorSizes[t.actor?.system.traits.size]?.numerical ?? 2;
      // In modern rules, Tiny creatures can be moved through
      if ( modernRules && occupiedSize === 0 ) return false;

      // In modern rules, Incapacitated creatures can be moved through
      if ( modernRules && t.actor?.statuses.has("incapacitated") ) return false;

      // Halfling Nimbleness means no larger creature can block
      if ( halflingNimbleness && occupiedSize > tokenSize ) return false;

      // A size difference of less than 2 should block (adjust for Halfling Nimbleness)
      return (Math.abs(tokenSize - occupiedSize) < 2);
    });
  }

  /**
   * Determine whether the provided grid space is being occupied by a token which should cause difficult terrain for
   * the provided token
   * @param {GridOffset3D} gridSpace  The grid space to check
   * @param {Token5e} token           The token being moved
   * @returns {boolean} Whether the moving token should suffer difficult terrain
   */
  isOccupiedGridSpaceDifficult(gridSpace, token) {
    const found = this._getRelevantOccupyingTokens(gridSpace, token);
    const tokenSize = CONFIG.DND5E.actorSizes[token.actor?.system.traits.size]?.numerical ?? 2;
    const modernRules = game.settings.get("dnd5e", "rulesVersion") === "modern";
    const halflingNimbleness = token.actor?.getFlag("dnd5e", "halflingNimbleness");
    return found.some(t => {
      const friendlyToken = token.document.disposition === t.document.disposition;

      // In modern rules, friendly tokens are not difficult terrain
      if ( modernRules && friendlyToken ) return false;
      const occupiedSize = CONFIG.DND5E.actorSizes[t.actor?.system.traits.size]?.numerical ?? 2;

      // In modern rules, Tiny creatures are not difficult terrain
      if ( modernRules && occupiedSize === 0 ) return false;

      // Halfling Nimbleness means a creature 1 size greater (normally would block) causes difficult terrain
      if ( halflingNimbleness && occupiedSize === tokenSize + 1 ) return true;

      // Tokens which may normally have blocked movement should still be considered difficult terrain
      const mayHaveBlocked = modernRules && t.actor?.statuses.has("incapacitated");

      // Friendly means legacy, therefore difficult. A size difference of 2 or more is difficult terrain regardless of
      // ruleset. Modern ruleset incapacitated tokens should still be difficult even if within one size category.
      // Dead creatures (objects) may be difficult terrain, for now that is the default treatment.
      return friendlyToken || Math.abs(tokenSize - occupiedSize) >= 2 || mayHaveBlocked || t.actor?.statuses.has("dead");
    });
  }

  /**
   * Determine the set of tokens occupying the provided grid space which may be relevant for blocking/difficult terrain
   * considerations
   * @param {GridOffset3D} gridSpace  The grid space to check
   * @param {Token5e} token           The token being moved
   * @returns {Set<Token5e>} The set of potentially relevant tokens occupying the provided grid space
   * @private
   */
  _getRelevantOccupyingTokens(gridSpace, token) {
    const grid = canvas.grid;
    const topLeft = grid.getTopLeftPoint(gridSpace);
    const rect = new PIXI.Rectangle(topLeft.x, topLeft.y, grid.sizeX, grid.sizeY);
    const found = game.canvas.tokens.quadtree.getObjects(rect);
    return found.filter(t => {
      // Ignore self
      if ( t === token ) return false;

      // Ignore different elevation
      const { k: occupiedElevation } = grid.getOffset(t.document);
      if ( occupiedElevation !== gridSpace.k ) return false;

      // Ensure space is actually occupied, not merely touching border of rectangle
      const gridSpaces = t.document.getOccupiedGridSpaceOffsets().map(coord => grid.getTopLeftPoint(coord));
      return gridSpaces.some(coord => coord.x === topLeft.x && coord.y === topLeft.y);
    });
  }
}
