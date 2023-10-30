/**
 * Mixin used to share some logic between Actor & Item documents.
 * @type {function(Class)}
 * @mixin
 */
export const DocumentMixin = Base => class extends Base {

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  async _preCreate(data, options, user) {
    let allowed = await super._preCreate(data, options, user);
    if ( allowed !== false ) allowed = await this.system._preCreate?.(data, options, user);
    return allowed;
  }

  /* -------------------------------------------- */

  async _preUpdate(changed, options, user) {
    let allowed = await super._preUpdate(changed, options, user);
    if ( allowed !== false ) allowed = await this.system._preUpdate?.(changed, options, user);
    return allowed;
  }

  /* -------------------------------------------- */

  async _preDelete(options, user) {
    let allowed = await super._preDelete(options, user);
    if ( allowed !== false ) allowed = await this.system._preDelete?.(options, user);
    return allowed;
  }

  /* -------------------------------------------- */

  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    this.system._onCreate?.(data, options, userId);
  }

  /* -------------------------------------------- */

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    this.system._onUpdate?.(changed, options, userId);
  }

  /* -------------------------------------------- */

  _onDelete(options, userId) {
    super._onDelete(options, userId);
    this.system._onDelete?.(options, userId);
  }
};
