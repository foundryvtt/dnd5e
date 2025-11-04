/**
 * Special case StringField that includes automatic validation for identifiers.
 */
export default class IdentifierField extends foundry.data.fields.StringField {
  /** @inheritDoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      allowType: false
    });
  }

  /* -------------------------------------------- */

  /** @override */
  _validateType(value) {
    if ( !dnd5e.utils.validators.isValidIdentifier(value, { allowType: this.allowType }) ) {
      throw new Error(game.i18n.localize("DND5E.IdentifierError"));
    }
  }
}
