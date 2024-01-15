/**
 * Mixin used to share some logic between Actor & Item documents.
 * @type {function(Class)}
 * @mixin
 */
export const SystemDocumentMixin = Base => class extends Base {

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareData() {
    super.prepareData();
    if ( ("dnd5e" in this.flags) && this.system.metadata?.systemFlagsModel ) {
      this.flags.dnd5e = new this.system.metadata.systemFlagsModel(this._source.flags.dnd5e, { parent: this });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async setFlag(scope, key, value) {
    if ( (scope === "dnd5e") && this.system.metadata?.systemFlagsModel ) {
      let diff;
      const changes = foundry.utils.expandObject({ [key]: value });
      if ( this.flags.dnd5e ) diff = this.flags.dnd5e.updateSource(changes, { dryRun: true });
      else diff = new this.system.metadata.systemFlagsModel(changes, { parent: this }).toObject();
      return this.update({ flags: { dnd5e: diff } });
    }
    return super.setFlag(scope, key, value);
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /**
   * Perform preliminary operations before a Document of this type is created.
   * Pre-creation operations only occur for the client which requested the operation.
   * @param {object} data               The initial data object provided to the document creation request.
   * @param {object} options            Additional options which modify the creation request.
   * @param {User} user                 The User requesting the document creation.
   * @returns {Promise<boolean|void>}   A return value of false indicates the creation operation should be cancelled.
   * @see {Document#_preCreate}
   * @protected
   */
  async _preCreate(data, options, user) {
    let allowed = await super._preCreate(data, options, user);
    if ( allowed !== false ) allowed = await this.system._preCreate?.(data, options, user);
    return allowed;
  }

  /* -------------------------------------------- */

  /**
   * Perform preliminary operations before a Document of this type is updated.
   * Pre-update operations only occur for the client which requested the operation.
   * @param {object} changed            The differential data that is changed relative to the documents prior values
   * @param {object} options            Additional options which modify the update request
   * @param {documents.BaseUser} user   The User requesting the document update
   * @returns {Promise<boolean|void>}   A return value of false indicates the update operation should be cancelled.
   * @see {Document#_preUpdate}
   * @protected
   */
  async _preUpdate(changed, options, user) {
    let allowed = await super._preUpdate(changed, options, user);
    if ( allowed !== false ) allowed = await this.system._preUpdate?.(changed, options, user);
    return allowed;
  }

  /* -------------------------------------------- */

  /**
   * Perform preliminary operations before a Document of this type is deleted.
   * Pre-delete operations only occur for the client which requested the operation.
   * @param {object} options            Additional options which modify the deletion request
   * @param {documents.BaseUser} user   The User requesting the document deletion
   * @returns {Promise<boolean|void>}   A return value of false indicates the deletion operation should be cancelled.
   * @see {Document#_preDelete}
   * @protected
   */
  async _preDelete(options, user) {
    let allowed = await super._preDelete(options, user);
    if ( allowed !== false ) allowed = await this.system._preDelete?.(options, user);
    return allowed;
  }

  /* -------------------------------------------- */

  /**
   * Perform follow-up operations after a Document of this type is created.
   * Post-creation operations occur for all clients after the creation is broadcast.
   * @param {object} data               The initial data object provided to the document creation request
   * @param {object} options            Additional options which modify the creation request
   * @param {string} userId             The id of the User requesting the document update
   * @see {Document#_onCreate}
   * @protected
   */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    this.system._onCreate?.(data, options, userId);
  }

  /* -------------------------------------------- */

  /**
   * Perform follow-up operations after a Document of this type is updated.
   * Post-update operations occur for all clients after the update is broadcast.
   * @param {object} changed            The differential data that was changed relative to the documents prior values
   * @param {object} options            Additional options which modify the update request
   * @param {string} userId             The id of the User requesting the document update
   * @see {Document#_onUpdate}
   * @protected
   */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    this.system._onUpdate?.(changed, options, userId);
  }

  /* -------------------------------------------- */

  /**
   * Perform follow-up operations after a Document of this type is deleted.
   * Post-deletion operations occur for all clients after the deletion is broadcast.
   * @param {object} options            Additional options which modify the deletion request
   * @param {string} userId             The id of the User requesting the document update
   * @see {Document#_onDelete}
   * @protected
   */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    this.system._onDelete?.(options, userId);
  }
};
