export default class TokenRuler5e extends foundry.canvas.placeables.tokens.TokenRuler {
  /** @inheritDoc */
  _getWaypointStyle(waypoint) {
    if ( !waypoint.explicit && waypoint.next && waypoint.previous && waypoint.actionConfig.visualize
      && waypoint.next.actionConfig.visualize && (waypoint.action === waypoint.next.action)
      && (waypoint.unreachable || !waypoint.next.unreachable) ) return { radius: 0 };
    const user = game.users.get(waypoint.userId);
    const scale = canvas.dimensions.uiScale;
    const style = {radius: 6 * scale, color: user?.color ?? 0x000000, alpha: waypoint.explicit ? 1 : 0.5};
    return this.#getSpeedBasedStyle(waypoint, style);
  }

  /* -------------------------------------------- */

  /** @override */
  _getWaypointLabelContext(waypoint, state) {
    const { index, elevation, explicit, next, previous, ray } = waypoint;
    state.hasElevation ||= (elevation !== 0);
    if ( !previous ) {
      state.previousElevation = elevation;
      return;
    }
    if ( !explicit && next && waypoint.actionConfig.visualize && next.actionConfig.visualize
      && (waypoint.action === next.action) && (waypoint.unreachable || !waypoint.next.unreachable) ) return;
    if ( (ray.distance === 0) && (elevation === previous.elevation) ) return;

    // Prepare data structure
    const context = {
      action: waypoint.actionConfig,
      cssClass: [
        waypoint.hidden ? "secret" : "",
        waypoint.next ? "" : "last",
        explicit ? "" : "nonexplicit"
      ].filterJoin(" "),
      secret: waypoint.hidden,
      units: canvas.grid.units,
      uiScale: canvas.dimensions.uiScale,
      position: { x: ray.B.x, y: ray.B.y + (next ? 0 : 0.5 * this.token.h) + (16 * canvas.dimensions.uiScale) }
    };

    // Segment Distance
    context.distance = { total: waypoint.measurement.distance.toNearest(0.01).toLocaleString(game.i18n.lang) };
    if ( index >= 2 ) context.distance.delta = waypoint.measurement.backward.distance.toNearest(0.01).signedString();

    // Segment Cost
    const cost = waypoint.measurement.cost;
    const deltaCost = waypoint.cost;
    context.cost = {
      total: Number.isFinite(cost) ? cost.toNearest(0.01).toLocaleString(game.i18n.lang) : "∞",
      units: canvas.grid.units
    };
    if ( index >= 2 ) context.cost.delta = Number.isFinite(deltaCost) ? deltaCost.toNearest(0.01).signedString() : "∞";

    // Elevation
    const deltaElevation = elevation - state.previousElevation;
    context.elevation = { total: elevation, icon: "fa-solid fa-arrows-up-down", hidden: !state.hasElevation };
    if ( deltaElevation !== 0 ) context.elevation.delta = deltaElevation.signedString();
    state.previousElevation = elevation;

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  _getSegmentStyle(waypoint) {
    const style = super._getSegmentStyle(waypoint);
    return this.#getSpeedBasedStyle(waypoint, style);
  }

  /* -------------------------------------------- */

  /** @override */
  _getGridHighlightStyle(waypoint, offset) {
    const style = super._getGridHighlightStyle(waypoint, offset);
    return this.#getSpeedBasedStyle(waypoint, style);
  }

  /* -------------------------------------------- */

  /**
   * Modify segment or grid-highlighting style based on movement speed
   * @param {TokenRulerWaypoint} waypoint The waypoint
   * @param {object} style                The default styling of the segment/grid-highlight
   * @returns {object} The adjusted style, or existing style if no adjustment is necessary
   */
  #getSpeedBasedStyle(waypoint, style) {
    // If movement automation disabled, or if showing a different client's measurement, use default style
    const noAutomation = game.settings.get("dnd5e", "disableMovementAutomation");
    const isSameClient = game.user.id in this.token._plannedMovement;
    if ( noAutomation || !isSameClient || CONFIG.Token.movement.actions[waypoint.action]?.teleport ) return style;

    // Get actor's movement speed for currently selected token movement action
    const movement = this.token.actor?.system.attributes?.movement;
    if ( !movement || !this.token.actor?.system.isCreature ) return style;
    let currActionSpeed = movement[waypoint.action] ?? 0;

    // If current action can fall back to walk, treat "max" speed as maximum between current & walk
    if ( CONFIG.DND5E.movementTypes[waypoint.action]?.walkFallback
      || !CONFIG.DND5E.movementTypes[waypoint.action] ) {
      currActionSpeed = Math.max(currActionSpeed, movement.walk);
    }

    // Color `normal` if <= max speed, else `double` if <= double max speed, else `triple`
    const { normal, double, triple } = CONFIG.DND5E.tokenRulerColors;
    const increment = (waypoint.measurement.cost - .1) / currActionSpeed;
    if ( increment <= 1 ) style.color = normal;
    else if ( increment <= 2 ) style.color = double;
    else style.color = triple;
    return style;
  }
}
