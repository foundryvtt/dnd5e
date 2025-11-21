/**
 * @typedef DifficultTerrainRegionBehaviorSystemData
 * @property {boolean} magical                  This difficult terrain is caused by magic.
 * @property {Set<string>} types                Types of difficult terrain represented.
 * @property {Set<number>} ignoredDispositions  Token dispositions that won't be affected by this difficult terrain.
 */

/**
 * @typedef RotateAreaRegionBehaviorSystemData
 * @property {object} time
 * @property {number} time.value                      Amount of time over which rotation occurs.
 * @property {RotateAreaSpeedMode} time.mode          How the time value corresponds to rotation distance.
 * @property {RotateAreaDocumentLinks} tiles          Tiles that are rotated with the area.
 * @property {RotateAreaDocumentLinks} walls          Walls that are rotated with the area.
 * @property {boolean} walls.link                     Also rotate any walls linked to the explicitly specified walls.
 * @property {RotateAreaDocumentLinks} lights         Ambient lights that are rotated with the area.
 * @property {RotateAreaDocumentLinks} regions        Other regions that are rotated with the area.
 * @property {RotateAreaDocumentLinks} sounds         Ambient sounds that are rotated with the area.
 * @property {RotateAreaDirectionMode} directionMode  Direction to rotate the area when moving to next position.
 * @property {RotateAreaPositionData[]} positions     Pre-defined stopping points for the rotation.
 * @property {object} status
 * @property {Degrees} status.angle                   Current angle relative to start position.
 * @property {number} status.position                 Index of the current position.
 * @property {boolean} status.rotating                Is the region currently rotating?
 */

/**
 * @typedef {"cw"|"ccw"|"short"|"long"} RotateAreaDirectionMode
 */

/**
 * @typedef RotateAreaDocumentLinks
 * @property {Set<string>} ids  IDs in the same scene for the linked documents.
 */

/**
 * @typedef RotateAreaPositionData
 * @property {Degrees} angle  Angle for this position in degrees.
 */

/**
 * @typedef {"fixed"|"variable"} RotateAreaSpeedMode
 */

/**
 * @typedef {number} Degrees
 */

/**
 * @typedef Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {number} Radians
 */

/**
 * @typedef Size
 * @property {number} width
 * @property {number} height
 */
