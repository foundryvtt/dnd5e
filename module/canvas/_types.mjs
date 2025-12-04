/**
 * Configuration information for a token placement operation.
 *
 * @typedef TokenPlacementConfiguration
 * @property {TokenDocument} [origin]   Token that is the origin point of the placement.
 * @property {PrototypeToken[]} tokens  Prototype token information for rendering.
 */

/**
 * Data for token placement on the scene.
 *
 * @typedef TokenPlacementData
 * @property {PrototypeToken} prototypeToken
 * @property {object} index
 * @property {number} index.total             Index of the placement across all placements.
 * @property {number} index.unique            Index of the placement across placements with the same original token.
 * @property {number} x
 * @property {number} y
 * @property {number} elevation
 * @property {number} rotation
 */
