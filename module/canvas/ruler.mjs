export default class TokenRuler5e extends foundry.canvas.placeables.tokens.TokenRuler {
  /** @inheritdoc */
  _getWaypointStyle(waypoint) {
    let modifiedWaypoint = waypoint;
    if ( !waypoint.explicit && !waypoint.unreachable && waypoint.next?.unreachable ) {
      modifiedWaypoint = { ...waypoint, explicit: true };
    }
    const style = super._getWaypointStyle(modifiedWaypoint);
    if ( waypoint !== modifiedWaypoint ) style.alpha = (style.alpha ?? 1) * 0.5;
    return style;
  }

  /** @inheritdoc */
  _getWaypointLabelContext(waypoint, state) {
    let modifiedWaypoint = waypoint;
    if ( !waypoint.explicit && !waypoint.unreachable && waypoint.next?.unreachable ) {
      modifiedWaypoint = { ...waypoint, explicit: true };
    }
    return super._getWaypointLabelContext(modifiedWaypoint, state);
  }
}
