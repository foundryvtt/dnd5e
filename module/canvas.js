/**
 * Override the default Grid measurement function to add additional distance for subsequent diagonal moves
 * See BaseGrid.measureDistance for more details
 *
 * @param p0 {Object}     The starting position
 * @param p1 {Object}     The ending position
 * @returns {Number}      The traveled distance for the move
 */
export const measureDistance = function(p0, p1) {
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
