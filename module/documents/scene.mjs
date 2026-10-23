/**
 * Extend the base Scene class to implement system-specific logic.
 */
export default class Scene5e extends foundry.documents.Scene {

  /* -------------------------------------------- */
  /*  Falling                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _invalidateSurfaces() {
    super._invalidateSurfaces();
    if ( !dnd5e.settings.disableFalling ) void this.#updateFalling();
  }

  /* -------------------------------------------- */

  /**
   * Re-evaluate the falling status of all tokens on the Scene.
   * @returns {Promise<void[]>}
   */
  #updateFalling() {
    const promises = [];
    for ( const token of this.tokens ) {
      const { actor } = token;
      if ( !actor || (actor.getFlag("dnd5e", "lastMovedToken") !== token.uuid) ) continue;
      if ( !game.user.isDesignated(u => u.active && actor.canUserModify(u, "update")) ) continue;
      promises.push(token.updateFalling());
    }
    return Promise.all(promises);
  }
}
