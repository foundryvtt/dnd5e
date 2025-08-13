import ActiveEffect5e from "../../documents/active-effect.mjs";

const { BooleanField, NumberField, SetField, StringField } = foundry.data.fields;

/**
 * The data model for a region behavior that represents an area of antimagic.
 */
export default class AntimagicRegionBehaviorType extends foundry.data.regionBehaviors.RegionBehaviorType {

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.REGIONBEHAVIORS.ANTIMAGIC"];

  /* ---------------------------------------- */

  /** @override */
  static defineSchema() {
    return {};
  }

  /* ---------------------------------------- */

  /**
   * Called when a token enters the anti-magic region.
   * @param {RegionTokenEnterEvent} event
   * @this {AntimagicRegionBehaviorType}
   */
  static async #onTokenEnter(event) {
    if ( (event.user !== game.user) || event.data.token.actor.effects.has(ActiveEffect5e.ID.ANTIMAGIC) ) return;
    await ActiveEffect.implementation.create({
      ...CONFIG.DND5E.antimagic,
      _id: ActiveEffect5e.ID.ANTIMAGIC,
      name: game.i18n.localize(CONFIG.DND5E.antimagic.name),
      statuses: ["antimagic"]
    }, { parent: event.data.token.actor, keepId: true });
  }

  /* ---------------------------------------- */

  /**
   * Called when a token leaves the anti-magic region.
   * @param {RegionTokenExitEvent} event
   * @this {AntimagicRegionBehaviorType}
   */
  static async #onTokenExit(event) {
    if ( (event.user !== game.user) || !event.data.token.actor.effects.has(ActiveEffect5e.ID.ANTIMAGIC) ) return;
    await event.data.token.actor.effects.get(ActiveEffect5e.ID.ANTIMAGIC).delete();
  }

  /* ---------------------------------------- */

  /** @override */
  static events = {
    [CONST.REGION_EVENTS.TOKEN_ENTER]: this.#onTokenEnter,
    [CONST.REGION_EVENTS.TOKEN_EXIT]: this.#onTokenExit
  };
}
