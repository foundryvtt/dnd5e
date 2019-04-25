
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

  /**
   * Register Initiative formula setting
   */
  function _set5eInitiative(tiebreaker) {
    const base = "1d20 + @abilities.dex.mod + @attributes.init.value",
          dex = "1d20 + @abilities.dex.mod + @attributes.init.value + (@abilities.dex.value / 100)";
    if ( tiebreaker ) {
      CONFIG.initiative = {
        formula: dex,
        decimals: 2
      }
    } else {
      CONFIG.initiative = {
        formula: base,
        decimals: 0
      }
    }
  }
  game.settings.register("dnd5e", "initiativeDexTiebreaker", {
    name: "Initiative Dexterity Tiebreaker",
    hint: "Append the raw Dexterity ability score to break ties in Initiative.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    onChange: enable => _set5eInitiative(enable)
  });
  _set5eInitiative(game.settings.get("dnd5e", "initiativeDexTiebreaker"));

  /**
   * Require Currency Carrying Weight
   */
  game.settings.register("dnd5e", "currencyWeight", {
    name: "Apply Currency Weight",
    hint: "Carried currency affects character encumbrance following the rules on PHB pg. 143.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  // Pre-load templates
  loadTemplates([
    "public/systems/dnd5e/templates/actors/actor-attributes.html",
    "public/systems/dnd5e/templates/actors/actor-abilities.html",
    "public/systems/dnd5e/templates/actors/actor-skills.html",
    "public/systems/dnd5e/templates/actors/actor-traits.html",
    "public/systems/dnd5e/templates/actors/actor-classes.html"
  ]);
});


/**
 * Activate certain behaviors on Canvas Initialization hook
 */
Hooks.on("canvasInit", () => {

  // Apply the current setting
  canvas.grid.diagonalRule = game.settings.get("dnd5e", "diagonalMovement");

  /* -------------------------------------------- */

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
    if ( this.parent.diagonalRule === "5105" ) {
      let nd10 = Math.floor(nDiagonal / 2);
      let spaces = (nd10 * 2) + (nDiagonal - nd10) + nStraight;
      return spaces * canvas.dimensions.distance;
    }

    // Standard PHB Movement
    else return (nStraight + nDiagonal) * canvas.scene.data.gridDistance;
  }
});
