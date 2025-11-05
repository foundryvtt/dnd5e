/**
 * Extend the base Token class to implement additional system-specific logic.
 */
export default class Token5e extends foundry.canvas.placeables.Token {

  /**
   * Update the token ring when this token is targeted.
   * @param {User5e} user         The user whose targeting has changed.
   * @param {Token5e} token       The token that was targeted.
   * @param {boolean} targeted    Is the token targeted or not?
   */
  static onTargetToken(user, token, targeted) {
    if ( !targeted ) return;
    if ( !token.hasDynamicRing ) return;
    const color = Color.from(user.color);
    token.ring.flashColor(color, { duration: 500, easing: token.ring.constructor.easeTwoPeaks });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  findMovementPath(waypoints, options) {

    // Normal behavior if movement automation is disabled or this actor is not a creature or cannot block
    if ( game.settings.get("dnd5e", "disableMovementAutomation") || !this.document.actor?.system.isCreature
      || this.document.actor.statuses.intersects(CONFIG.DND5E.neverBlockStatuses) ) {
      return super.findMovementPath(waypoints, options);
    }

    // Get all grid spaces as waypoints so that running into a blocking token stops us immediately before it
    waypoints = this.document.getCompleteMovementPath(waypoints);

    // Drop all intermediate waypoints except those immediately before a blocking token
    const grid = this.document.parent.grid;
    waypoints = waypoints.filter((waypoint, i) => {
      return !waypoint.intermediate || this.layer.isOccupiedGridSpaceBlocking(grid.getOffset(waypoints[i + 1]), this);
    });
    return super.findMovementPath(waypoints, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getDragConstrainOptions() {
    const unconstrainedMovement = game.user.isGM
      && ui.controls.controls.tokens.tools.unconstrainedMovement.active;
    return { ...super._getDragConstrainOptions(), ignoreTokens: unconstrainedMovement };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getMovementCostFunction(options) {
    const costFunction = super._getMovementCostFunction(options);
    if ( game.settings.get("dnd5e", "disableMovementAutomation") ) return costFunction;

    const ignoredDifficultTerrain = this.actor?.system.attributes?.movement?.ignoredDifficultTerrain ?? new Set();
    const ignoreDifficult = ["all", "nonmagical"].some(i => ignoredDifficultTerrain.has(i));
    const preview = options?.preview && canvas.visibility.tokenVision && !game.user.isGM;
    return (from, to, distance, segment) => {
      const cost = costFunction(from, to, distance, segment);

      // Terrain already difficult, no stacking
      if ( segment.terrain?.difficultTerrain ) return cost;

      // If ignoring all/nonmagical, don't consider tokens difficult terrain
      if ( ignoreDifficult ) return cost;

      // Check difficult due to occupied tokens
      if ( !this.layer.isOccupiedGridSpaceDifficult(to, this, {preview}) ) return cost;

      // Difficult terrain due to occupied grid space
      return cost + distance;
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  constrainMovementPath(waypoints, options) {
    let { preview=false, ignoreTokens=false } = options; // Custom constrain option to ignore tokens

    ignoreTokens ||= game.settings.get("dnd5e", "disableMovementAutomation");
    ignoreTokens ||= !this.actor?.system.isCreature;
    ignoreTokens ||= this.actor?.statuses?.intersects(CONFIG.DND5E.neverBlockStatuses);

    // Ignore tokens if path contains resize
    ignoreTokens ||= waypoints.some(w => (w.width !== waypoints[0].width) || (w.height !== waypoints[0].height));

    if ( ignoreTokens ) return super.constrainMovementPath(waypoints, options);

    // Ignore preview if token vision is disabled or the current user is a GM
    if ( !canvas.visibility.tokenVision || game.user.isGM ) preview = false;

    let path = waypoints;
    let constrained = false;

    for ( let k = 0; k < 10; k++ ) {

      // Apply blocking constraints
      const completePath = this.document.getCompleteMovementPath(path);
      let blockedIndex;
      for ( let i = 1; i < completePath.length; i++ ) {
        const waypoint = completePath[i];
        const occupiedGridSpaces = this.document.getOccupiedGridSpaceOffsets(waypoint);
        const elevationOffset = Math.floor((waypoint.elevation / canvas.grid.distance) + 1e-8);
        if ( occupiedGridSpaces.some(space =>
          this.layer.isOccupiedGridSpaceBlocking({...space, k: elevationOffset}, this, {preview}))
        ) {
          blockedIndex = i;
          break;
        }
      }
      const blocked = blockedIndex >= 1;
      if ( blocked ) {
        path = completePath.slice(0, blockedIndex - 1).filter(waypoint => !waypoint.intermediate);
        path.push(completePath.at(blockedIndex - 1));
        constrained = true;
      }

      // Test wall/cost constraints in the first iteration always and in later
      // iterations only if the path changed due to blocking
      if ( (k === 0) || blocked ) {
        const [constrainedPath, wasConstrained] = super.constrainMovementPath(path, options);
        path = constrainedPath;
        if ( !wasConstrained ) return [path, constrained]; // No change: path is valid
        constrained = true;
      }

      // In a later iteration if there was no change due to blocking, we found a valid path
      else if ( !blocked ) return [path, constrained];
    }

    // After 10 failed attempts to find a valid path, remove the last waypoints and constrain this path
    [path] = this.constrainMovementPath(waypoints.slice(0, -1), options);
    return [path, true];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _drawBar(number, bar, data) {
    if ( data.attribute === "attributes.hp" ) return this._drawHPBar(number, bar, data);
    return super._drawBar(number, bar, data);
  }

  /* -------------------------------------------- */

  /**
   * Specialized drawing function for HP bars.
   * @param {number} number      The Bar number
   * @param {PIXI.Graphics} bar  The Bar container
   * @param {object} data        Resource data for this bar
   * @private
   */
  _drawHPBar(number, bar, data) {

    // Extract health data
    let {value, max, effectiveMax, temp, tempmax} = this.document.actor.system.attributes.hp;
    temp = Number(temp || 0);
    tempmax = Number(tempmax || 0);

    // Differentiate between effective maximum and displayed maximum
    effectiveMax = Math.max(0, effectiveMax);
    let displayMax = max + (tempmax > 0 ? tempmax : 0);

    // Allocate percentages of the total
    const tempPct = Math.clamp(temp, 0, displayMax) / displayMax;
    const colorPct = Math.clamp(value, 0, effectiveMax) / displayMax;
    const hpColor = dnd5e.documents.Actor5e.getHPColor(value, effectiveMax);

    // Determine colors to use
    const blk = 0x000000;
    const c = CONFIG.DND5E.tokenHPColors;

    // Determine the container size (logic borrowed from core)
    let s = canvas.dimensions.uiScale;
    const bw = this.w;
    const bh = 8 * (this.document.height >= 2 ? 1.5 : 1) * s;
    const bs = s;
    const bs1 = bs + s;

    // Overall bar container
    bar.clear();
    bar.beginFill(blk, 0.5).lineStyle(bs, blk, 1.0).drawRoundedRect(0, 0, bw, bh, 3 * s);

    // Temporary maximum HP
    if (tempmax > 0) {
      const pct = max / effectiveMax;
      bar.beginFill(c.tempmax, 1.0).lineStyle(1, blk, 1.0).drawRoundedRect(pct * bw, 0, (1 - pct) * bw, bh, 2 * s);
    }

    // Maximum HP penalty
    else if (tempmax < 0) {
      const pct = (max + tempmax) / max;
      bar.beginFill(c.negmax, 1.0).lineStyle(1, blk, 1.0).drawRoundedRect(pct * bw, 0, (1 - pct) * bw, bh, 2 * s);
    }

    // Health bar
    bar.beginFill(hpColor, 1.0).lineStyle(bs, blk, 1.0).drawRoundedRect(0, 0, colorPct * bw, bh, 2 * s);

    // Temporary hit points
    if ( temp > 0 ) {
      bar.beginFill(c.temp, 1.0).lineStyle(0).drawRoundedRect(bs1, bs1, (tempPct * bw) - (2 * bs1), bh - (2 * bs1), s);
    }

    // Set position
    let posY = (number === 0) ? (this.h - bh) : 0;
    bar.position.set(0, posY);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onApplyStatusEffect(statusId, active) {
    const applicableEffects = [CONFIG.specialStatusEffects.DEFEATED, CONFIG.specialStatusEffects.INVISIBLE];
    if ( applicableEffects.includes(statusId) && this.hasDynamicRing ) {
      this.renderFlags.set({refreshRingVisuals: true});
    }
    super._onApplyStatusEffect(statusId, active);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _configureFilterEffect(statusId, active) {
    if ( (statusId === CONFIG.specialStatusEffects.INVISIBLE) && this.hasDynamicRing ) active = false;
    return super._configureFilterEffect(statusId, active);
  }

  /* -------------------------------------------- */

  /** @override */
  getRingColors() {
    return this.document.getRingColors();
  }

  /* -------------------------------------------- */

  /** @override */
  getRingEffects() {
    return this.document.getRingEffects();
  }
}
