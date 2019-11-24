/**
 * Measure the distance between two pixel coordinates
 * See BaseGrid.measureDistance for more details
 *
 * @param {Object} p0           The origin coordinate {x, y}
 * @param {Object} p1           The destination coordinate {x, y}
 * @param {boolean} gridSpaces  Enforce grid distance (if true) vs. direct point-to-point (if false)
 * @return {number}             The distance between p1 and p0
 */
export const measureDistance = function(p0, p1, {gridSpaces=true}={}) {
  if ( !gridSpaces ) return BaseGrid.prototype.measureDistance.bind(this)(p0, p1, {gridSpaces});
  let gs = canvas.dimensions.size,
      ray = new Ray(p0, p1),
      nx = Math.abs(Math.ceil(ray.dx / gs)),
      ny = Math.abs(Math.ceil(ray.dy / gs));

  // Get the number of straight and diagonal moves
  let nDiagonal = Math.min(nx, ny),
      nStraight = Math.abs(ny - nx);

  // Alternative DMG Movement
  if ( this.parent.diagonalRule === "5105" ) {
    let nd10 = Math.floor(nDiagonal / 2);
    let spaces = (nd10 * 2) + (nDiagonal - nd10) + nStraight;
    return spaces * canvas.dimensions.distance;
  }

  // Standard PHB Movement
  else return (nStraight + nDiagonal) * canvas.scene.data.gridDistance;
};

/* -------------------------------------------- */

/**
 * Hijack Token health bar rendering to include temporary and temp-max health in the bar display
 * TODO: This should probably be replaced with a formal Token class extension
 */
const _TokenGetBarAttribute = Token.prototype.getBarAttribute;
export const getBarAttribute = function(barName) {
  const data = _TokenGetBarAttribute.bind(this)(barName);
  if ( data.attribute === "attributes.hp" ) {
    data.value += parseInt(data['temp'] || 0);
    data.max += parseInt(data['tempmax'] || 0);
  }
  return data;
};
