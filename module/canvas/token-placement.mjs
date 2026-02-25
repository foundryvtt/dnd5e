import BasePlacement from "./api/base-placement.mjs";

/**
 * @import { TokenPlacementConfiguration, TokenPlacementData } from "./types.mjs";
 */

/**
 * Class responsible for placing one or more tokens onto the scene.
 * @extends BasePlacement<TokenPlacementConfiguration, TokenPlacementData>
 */
export default class TokenPlacement extends BasePlacement {

  /** @override */
  static get placeableLayer() {
    return canvas.tokens;
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get _placementConfigs() {
    return this.config.tokens;
  }

  /* -------------------------------------------- */
  /*  Placement                                   */
  /* -------------------------------------------- */

  /** @override */
  _createPlacementData(prototypeToken) {
    return {
      prototypeToken, x: 0, y: 0,
      elevation: this.config.origin?.elevation ?? 0,
      rotation: prototypeToken.rotation ?? 0
    };
  }

  /* -------------------------------------------- */

  /** @override */
  _createPreviewData(prototypeToken) {
    const tokenData = prototypeToken.toObject();
    tokenData.sight.enabled = false;
    tokenData._id = foundry.utils.randomID();
    if ( tokenData.randomImg ) tokenData.texture.src = prototypeToken.actor.img;
    return tokenData;
  }

  /* -------------------------------------------- */

  /** @override */
  _getUniqueId(placementData) {
    return placementData.prototypeToken.parent.id;
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
