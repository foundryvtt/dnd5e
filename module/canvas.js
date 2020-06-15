/** @override */
export const measureDistances = function(segments, options={}) {
  if ( !options.gridSpaces ) return BaseGrid.prototype.measureDistances.call(this, segments, options);

  // Track the total number of diagonals
  let nDiagonal = 0;
  const rule = this.parent.diagonalRule;
  const d = canvas.dimensions;

  // Iterate over measured segments
  return segments.map(s => {
    let r = s.ray;

    // Determine the total distance traveled
    let nx = Math.abs(Math.ceil(r.dx / d.size));
    let ny = Math.abs(Math.ceil(r.dy / d.size));

    // Determine the number of straight and diagonal moves
    let nd = Math.min(nx, ny);
    let ns = Math.abs(ny - nx);
    nDiagonal += nd;

    // Alternative DMG Movement
    if (rule === "5105") {
      let nd10 = Math.floor(nDiagonal / 2) - Math.floor((nDiagonal - nd) / 2);
      let spaces = (nd10 * 2) + (nd - nd10) + ns;
      return spaces * canvas.dimensions.distance;
    }

    // Euclidean Measurement
    else if (rule === "EUCL") {
      return Math.round(Math.hypot(nx, ny) * canvas.scene.data.gridDistance);
    }

    // Standard PHB Movement
    else return (ns + nd) * canvas.scene.data.gridDistance;
  });
};

/* -------------------------------------------- */

/**
 * Hijack Token health bar rendering to include temporary and temp-max health in the bar display
 * TODO: This should probably be replaced with a formal Token class extension
 */
const _TokenGetBarAttribute = Token.prototype.getBarAttribute;
export const getBarAttribute = function(...args) {
  const data = _TokenGetBarAttribute.bind(this)(...args);
  if ( data && (data.attribute === "attributes.hp") ) {
    data.value += parseInt(getProperty(this.actor.data, "data.attributes.hp.temp") || 0);
    data.max += parseInt(getProperty(this.actor.data, "data.attributes.hp.tempmax") || 0);
  }
  return data;
};
