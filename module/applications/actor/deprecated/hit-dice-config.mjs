import HitDiceConfig from "../config/hit-dice-config.mjs";

/**
 * A simple form to set actor hit dice amounts.
 */
export default class ActorHitDiceConfig extends HitDiceConfig {
  constructor(actor, options) {
    foundry.utils.logCompatibilityWarning(
      "The `ActorHitDiceConfig` application has been deprecated and replaced with `HitDiceConfig`.",
      { since: "DnD5e 4.1", until: "DnD5e 4.3" }
    );
    super({ ...options, document: actor });
  }
}
