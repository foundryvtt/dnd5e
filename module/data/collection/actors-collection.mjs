/**
 * Custom actors collection.
 */
export default class Actors5e extends foundry.documents.collections.Actors {
  /**
   * The primary party.
   * @type {Actor5e|null}
   */
  get party() {
    return game.settings.get("dnd5e", "primaryParty")?.actor ?? null;
  }
}
