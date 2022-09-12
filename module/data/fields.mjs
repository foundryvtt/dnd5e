export class AdvancementDataField extends foundry.data.fields.ObjectField {
  constructor(advancementType, options={}) {
    super(options);
    this.advancementType = advancementType;
  }

  /** @inheritdoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {required: true});
  }

  getModel() {
    return this.advancementType.metadata?.dataModels?.[this.name];
  }

  getDefaults() {
    return this.advancementType.metadata?.defaults?.[this.name] ?? {};
  }

  _cleanType(value, options) {
    if ( !(typeof value === "object") ) value = {};

    // Use a defined DataModel
    const cls = this.getModel();
    if ( cls ) return cls.cleanData(value, options);
    if ( options.partial ) return value;

    // Use the defined defaults
    const defaults = this.getDefaults();
    return foundry.utils.mergeObject(defaults, value, {inplace: true});
  }

  initialize(value, model) {
    const cls = this.getModel();
    if ( cls ) return new cls(value, {parent: model});
    return foundry.utils.deepClone(value);
  }
}

/* -------------------------------------------- */

export class IdentifierField extends foundry.data.fields.StringField {

  /** @inheritdoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      validationError: "is not a valid Identifier string"
    });
  }

  /** @override */
  _cast(value) {
    return String(value).slugify({strict: true});
  }

  /** @override */
  _validateType(value) {
    if ( !dnd5e.utils.validators.isValidIdentifier(value) ) throw new Error(game.i18n.localize("DND5E.IdentifierError"));
  }

}
