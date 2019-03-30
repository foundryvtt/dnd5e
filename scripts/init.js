
/**
 * Activate certain behaviors on FVTT ready hook
 */
Hooks.once("init", () => {

  /**
   * Register diagonal movement rule setting
   */
  game.settings.register("dnd5e", "diagonalMovement", {
    name: "Diagonal Movement Rule",
    hint: "Configure which diagonal movement rule should be used for games within this system.",
    scope: "world",
    config: true,
    default: "555",
    type: String,
    choices: {
      "555": "Player's Handbook (5/5/5)",
      "5105": "Dungeon Master's Guide (5/10/5)"
    },
    onChange: rule => canvas.grid.diagonalRule = rule
  });
});


/**
 * Activate certain behaviors on Canvas Initialization hook
 */
Hooks.on("canvasInit", () => {

  // Apply the current setting
  canvas.grid.diagonalRule = game.settings.get("dnd5e", "diagonalMovement");

  /**
   * Override default Grid measurement
   */
  SquareGrid.prototype.measureDistance = function(p0, p1) {
    let gs = canvas.dimensions.size,
        ray = new Ray(p0, p1),
        nx = Math.abs(Math.ceil(ray.dx / gs)),
        ny = Math.abs(Math.ceil(ray.dy / gs));

    // Get the number of straight and diagonal moves
    let nDiagonal = Math.min(nx, ny),
        nStraight = Math.abs(ny - nx);

    // Alternative DMG Movement
    if ( this.diagonalRule === "5105" ) {
      let nd10 = Math.floor(nDiagonal / 2);
      let spaces = (nd10 * 2) + (nDiagonal - nd10) + nStraight;
      return spaces * canvas.dimensions.distance;
    }

    // Standard PHB Movement
    else return (nStraight + nDiagonal) * canvas.scene.data.gridDistance;
  }
});
