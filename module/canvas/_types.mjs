/**
 * @typedef BasePlacementConfiguration
 * @property {TokenDocument} [origin]   Token that is the origin point of the placement.
 * @property {object[]} placements      Configuration data for individual placements.
 */

/**
 * @typedef BasePlacementData
 * @property {object} index
 * @property {number} index.total             Index of the placement across all placements.
 * @property {number} index.unique            Index of the placement across placements with the same unique data.
 * @property {number} x
 * @property {number} y
 * @property {number} elevation
 * @property {number} rotation
 */

/* -------------------------------------------- */

/**
 * @typedef {BasePlacementConfiguration} TemplatePlacementConfiguration
 * @property {number} color                                      Color to use when creating the template.
 * @property {TemplatePlacementShapeConfiguration[]} placements  Configuration data for individual placements.
 */

/**
 * @typedef TemplatePlacementShapeConfiguration
 * @property {string} type      Shape type to use as the basis for the template.
 * @property {number} size      Primary dimension of the template, converted into unit used for scene.
 * @property {number} [width]   Width of the shape if relevant to shape type.
 * @property {number} [height]  Height of the shape if relevant to shape type.
 */

/**
 * @typedef {BaseShapeData} TemplatePlacementData
 */

/* -------------------------------------------- */

/**
 * @typedef {Omit<BasePlacementConfiguration, "placements">} TokenPlacementConfiguration
 * @property {PrototypeToken[]} tokens  Prototype token information for rendering.
 */

/**
 * @typedef {BasePlacementData} TokenPlacementData
 * @property {PrototypeToken} prototypeToken
 */
