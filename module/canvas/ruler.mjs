export default class TokenRuler5e extends foundry.canvas.placeables.tokens.TokenRuler {
  refresh({passedWaypoints, pendingWaypoints, plannedMovement}) {
    for (const movement of Object.values(plannedMovement)) {

      // Show distance of furthest possible waypoint
      if (movement.foundPath?.length) movement.foundPath.at(-1).explicit = true;

      // Currently, infinite-cost waypoints come through socketing as null-cost. This fixes that
      for (const waypoint of movement.unreachableWaypoints ?? []) {
        waypoint.cost ??= Infinity;
      }
    }
    return super.refresh({passedWaypoints, pendingWaypoints, plannedMovement});
  }
}
