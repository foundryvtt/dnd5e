export default class TokenRuler5e extends foundry.canvas.placeables.tokens.TokenRuler {
  /** @inheritdoc */
  _getWaypointStyle(waypoint) {
    if ( !waypoint.explicit && waypoint.next && waypoint.previous && waypoint.actionConfig.visualize
      && waypoint.next.actionConfig.visualize && (waypoint.action === waypoint.next.action)
      && (waypoint.unreachable || !waypoint.next.unreachable) ) return {radius: 0};
    const user = game.users.get(waypoint.userId);
    const scale = canvas.dimensions.uiScale;
    return {radius: 6 * scale, color: user?.color ?? 0x000000, alpha: waypoint.explicit ? 1 : 0.5};
  }

  /** @override */
  _getWaypointLabelContext(waypoint, state) {
    const {index, elevation, explicit, next, previous, ray} = waypoint;
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
      position: {x: ray.B.x, y: ray.B.y + (next ? 0 : 0.5 * this.token.h) + (16 * canvas.dimensions.uiScale)}
    };

    // Segment Distance
    context.distance = {total: waypoint.measurement.distance.toNearest(0.01).toLocaleString(game.i18n.lang)};
    if ( index >= 2 ) context.distance.delta = waypoint.measurement.backward.distance.toNearest(0.01).signedString();

    // Segment Cost
    const cost = waypoint.measurement.cost;
    const deltaCost = waypoint.cost;
    context.cost = {total: Number.isFinite(cost) ? cost.toNearest(0.01).toLocaleString(game.i18n.lang) : "∞", units: canvas.grid.units};
    if ( index >= 2 ) context.cost.delta = Number.isFinite(deltaCost) ? deltaCost.toNearest(0.01).signedString() : "∞";

    // Elevation
    const deltaElevation = elevation - state.previousElevation;
    context.elevation = {total: elevation, icon: "fa-solid fa-arrows-up-down", hidden: !state.hasElevation};
    if ( deltaElevation !== 0 ) context.elevation.delta = deltaElevation.signedString();
    state.previousElevation = elevation;

    return context;
  }
}
