export default class TokenLayer5e extends foundry.canvas.layers.TokenLayer {
  isOccupiedGridSpaceBlocking(waypoint, token) {
    const found = this._getRelevantOccupyingTokens(waypoint, token);
    const tokenSize = CONFIG.DND5E.actorSizes[token.actor?.system.traits.size]?.numerical ?? 2;
    const modernRules = game.settings.get("dnd5e", "rulesVersion") === "modern";
    const halflingNimbleness = token.actor?.getFlag("dnd5e", "halflingNimbleness");
    return found.some(t => {
      // Friendly tokens never block movement
      if ( token.document.disposition === t.document.disposition ) return false;

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

  isOccupiedGridSpaceDifficult(waypoint, token) {
    const found = this._getRelevantOccupyingTokens(waypoint, token);
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

      // Friendly means legacy, therefore difficult. Otherwise, a size difference of 2 or more is
      // difficult terrain regardless of ruleset
      return friendlyToken || Math.abs(tokenSize - occupiedSize) >= 2;
    });
  }

  _getRelevantOccupyingTokens(waypoint, token) {
    const grid = canvas.grid;
    const topLeft = grid.getTopLeftPoint(waypoint);
    const rect = new PIXI.Rectangle(topLeft.x, topLeft.y, grid.sizeX, grid.sizeY);
    const found = game.canvas.tokens.quadtree.getObjects(rect);
    return found.filter(t => {
      // Ignore self
      if ( t === token ) return false;

      // Ignore different elevation
      const { k: occupiedElevation } = grid.getOffset(t.document);
      if ( occupiedElevation !== waypoint.k ) return false;

      // Ensure space is actually occupied, not merely touching border of rectangle
      const gridSpaces = t.document.getOccupiedGridSpaceOffsets().map(coord => grid.getTopLeftPoint(coord));
      return gridSpaces.some(coord => coord.x === topLeft.x && coord.y === topLeft.y);
    });
  }
}
