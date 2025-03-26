import { createIdentifierInput } from "../../applications/fields.mjs";

/**
 * @typedef {StringFieldOptions} IdentifierFieldOptions
 * @property {string[]} [types=null]  Item types that can be represented by this identifier.
 */

/**
 * Special case StringField that includes automatic validation for identifiers.
 */
export default class IdentifierField extends foundry.data.fields.StringField {

  /** @inheritDoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      types: null
    });
  }

  /* -------------------------------------------- */
  /*  Field Validation                            */
  /* -------------------------------------------- */

  /** @override */
  _validateType(value) {
    if ( !dnd5e.utils.validators.isValidIdentifier(value) ) {
      throw new Error(game.i18n.localize("DND5E.IdentifierError"));
    }
  }

  /* -------------------------------------------- */
  /*  Form Field Integration                      */
  /* -------------------------------------------- */

  /** @override */
  _toInput(config) {
    if ( this.types?.length ) config.types ??= this.types;
    if ( foundry.utils.getType(config.types) === "string" ) config.types = config.types.split(",");
    return createIdentifierInput(config);
  }
}
