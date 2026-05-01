import { createIdentifierInput } from "../../applications/fields.mjs";

/**
 * @import { IdentifierFieldOptions } from "./_types.mjs";
 */

/**
 * Special case StringField that includes automatic validation for identifiers.
 *
 * @param {IdentifierFieldOptions} options  Options which configure the behavior of the field.
 */
export default class IdentifierField extends foundry.data.fields.StringField {
  /** @inheritDoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      allowType: false,
      types: null
    });
  }

  /* -------------------------------------------- */
  /*  Field Validation                            */
  /* -------------------------------------------- */

  /** @override */
  _validateType(value) {
    if ( !dnd5e.utils.validators.isValidIdentifier(value, { allowType: this.allowType }) ) {
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
