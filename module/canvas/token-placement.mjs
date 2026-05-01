import BasePlacement from "./api/base-placement.mjs";

/**
 * @import { TokenPlacementConfiguration, TokenPlacementData } from "./types.mjs";
 */

/**
 * Class responsible for placing one or more tokens onto the scene.
 * @extends BasePlacement<TokenPlacementConfiguration, TokenPlacementData>
 */
export default class TokenPlacement extends BasePlacement {

  /* -------------------------------------------- */
  /*  Placement                                   */
  /* -------------------------------------------- */

  /** @override*/
  async _place() {
    const results = [];
    const uniqueTokens = new Map();
    await canvas.tokens.placeTokens(this.config.tokens.map(t => t.toObject()), {
      create: false,
      preConfirm: ({ document, index }) => {
        const actorId = this.config.tokens[index].parent.id;
        uniqueTokens.set(actorId, (uniqueTokens.get(actorId) ?? -1) + 1);
        results.push({
          x: document.x, y: document.y, elevation: document.elevation, rotation: document.rotation,
          prototypeToken: this.config.tokens[index],
          index: { total: index, unique: uniqueTokens.get(actorId) }
        });
      }
    });
    return results;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Adjust the appended number on an unlinked token to account for multiple placements.
   * @param {TokenDocument|object} tokenDocument  Document or data object to adjust.
   * @param {TokenPlacementData} placement        Placement data associated with this token document.
   */
  static adjustAppendedNumber(tokenDocument, placement) {
    const regex = new RegExp(/\((\d+)\)$/);
    const match = tokenDocument.name?.match(regex);
    if ( !match ) return;
    const name = tokenDocument.name.replace(regex, `(${Number(match[1]) + placement.index.unique})`);
    if ( tokenDocument instanceof TokenDocument ) tokenDocument.updateSource({ name });
    else tokenDocument.name = name;
  }
}
