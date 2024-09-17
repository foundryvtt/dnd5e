import AbilityConfig from "../config/ability-config.mjs";

/**
 * A simple form to set save throw configuration for a given ability score.
 *
 * @param {Actor5e} actor               The Actor instance being displayed within the sheet.
 * @param {ApplicationOptions} options  Additional application configuration options.
 * @param {string} abilityId            The ability key as defined in CONFIG.DND5E.abilities.
 */
export default class ActorAbilityConfig extends AbilityConfig {
  constructor(actor, options, abilityId) {
    foundry.utils.logCompatibilityWarning(
      "The `ActorAbilityConfig` application has been deprecated and replaced with `AbilityConfig`.",
      { since: "DnD5e 4.1", until: "DnD5e 4.3" }
    );
    super({ ...options, document: actor, ability: abilityId });
  }
}
