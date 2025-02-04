import HitPointsConfig from "../config/hit-points-config.mjs";

/**
 * A form for configuring actor hit points and bonuses.
 */
export default class ActorHitPointsConfig extends HitPointsConfig {
  constructor(actor, options) {
    foundry.utils.logCompatibilityWarning(
      "The `ActorHitPointsConfig` application has been deprecated and replaced with `HitPointsConfig`.",
      { since: "DnD5e 4.1", until: "DnD5e 4.3" }
    );
    super({ ...options, document: actor });
  }
}
