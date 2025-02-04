import SpellSlotsConfig from "../config/spell-slots-config.mjs";

export default class ActorSpellSlotsConfig extends SpellSlotsConfig {
  constructor(actor, options, abilityId) {
    foundry.utils.logCompatibilityWarning(
      "The `ActorSpellSlotsConfig` application has been deprecated and replaced with `SpellSlotsConfig`.",
      { since: "DnD5e 4.1", until: "DnD5e 4.3" }
    );
    super({ ...options, document: actor });
  }
}
