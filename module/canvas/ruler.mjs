export default class TokenRuler5e extends foundry.canvas.placeables.tokens.TokenRuler {
  /** @inheritdoc */
  _getWaypointStyle(waypoint) {
    let modifiedWaypoint = waypoint;
    if ( !waypoint.unreachable && waypoint.next?.unreachable ) {
      modifiedWaypoint = { ...waypoint, explicit: true };
    }
    return super._getWaypointStyle(modifiedWaypoint);
  }

  /** @inheritdoc */
  _getWaypointLabelContext(waypoint, state) {
    let modifiedWaypoint = waypoint;
    if ( !waypoint.unreachable && waypoint.next?.unreachable ) {
      modifiedWaypoint = { ...waypoint, explicit: true };
    }
    return super._getWaypointLabelContext(modifiedWaypoint, state);
  }
}
