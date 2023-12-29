/**
 * Actors sidebar with added support for the primary party.
 */
export default class ActorDirectory5e extends ActorDirectory {
  /** @inheritdoc */
  async _render(...args) {
    await super._render(...args);

    const primaryParty = game.settings.get("dnd5e", "primaryParty")?.actor;
    if ( primaryParty ) {
      const element = this._element[0]?.querySelector(`[data-entry-id="${primaryParty.id}"]`);
      element?.classList.add("primary-party");
    }
  }
}
