import BasePlacement from "./api/base-placement.mjs";

/**
 * @import { TokenPlacementConfiguration, TokenPlacementData } from "./_types.mjs";
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
    const base = this.config.origin?.elevation ?? canvas.level.elevation.base; // Use the summoner's elevation.
    await canvas.tokens.placeTokens(this.config.tokens.map(t => ({
      ...t.toObject(), elevation: base, level: canvas.level.id
    })), {
      create: false,
      onChange: ({ document, preview }) => {
        let elevation = base;
        // Don't summon a summon in mid-air so it immediately falls, find the closest surface on or below the
        // summoner's elevation.
        if ( canvas.scene.getSurfaces({ type: "move" }).length ) {
          const position = { ...document._source, elevation: base };
          ({elevation=base } = document._findSupportingSurface({ position }) ?? {});
        }
        if ( elevation === document._source.elevation ) return;
        document.updateSource({ elevation });
        preview.renderFlags.set({ refreshElevation: true });
      },
      preConfirm: ({ document, index }) => {
        const actorId = this.config.tokens[index].parent.id;
        uniqueTokens.set(actorId, (uniqueTokens.get(actorId) ?? -1) + 1);
        results.push({
          x: document.x, y: document.y, elevation: document.elevation, level: document.level,
          rotation: document.rotation,
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
