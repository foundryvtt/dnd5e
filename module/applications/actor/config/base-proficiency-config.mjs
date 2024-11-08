import * as Trait from "../../../documents/actor/trait.mjs";
import BaseConfigSheet from "../api/base-config-sheet.mjs";

/**
 * Base application for configuring an actor's abilities, skills, or tools.
 */
export default class BaseProficiencyConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    key: null,
    trait: null,
    position: {
      width: 500
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Configuration data for the ability being edited.
   * @type {object}
   * @abstract
   */
  get propertyConfig() {
    return {};
  }

  /* -------------------------------------------- */

  /**
   * Label for the specific skill or tool being configured.
   * @type {string}
   */
  get propertyLabel() {
    return Trait.keyLabel(this.options.key, { trait: this.options.trait });
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("DND5E.ABILITY.Configure.Title", { ability: this.propertyLabel });
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    options.uniqueId = `${options.trait}-${options.key}-${options.document.uuid}`.replace(/\./g, "-");
    return options;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const source = this.document.system._source;
    const keyPath = Trait.actorKeyPath(this.options.trait).replace("system.", "");

    context.data = foundry.utils.getProperty(source, `${keyPath}.${this.options.key}`) ?? {};
    context.fields = this.document.system.schema.getField(keyPath).model.fields;
    context.label = this.propertyLabel;
    context.prefix = `system.${keyPath}.${this.options.key}.`;

    if ( this.document.system.bonuses?.abilities ) context.global = {
      data: source.bonuses?.abilities ?? {},
      fields: this.document.system.schema.fields.bonuses.fields.abilities.fields
    };

    return context;
  }
}
