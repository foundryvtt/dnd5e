import BaseConfigSheet from "../api/base-config-sheet.mjs";

/**
 * Configuration application for an actor's death saving throws.
 */
export default class DeathConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    ability: null,
    position: {
      width: 500
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/actors/config/death-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.DeathSaveConfigure");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const source = this.document.system._source;

    context.data = source.attributes?.death ?? {};
    context.fields = this.document.system.schema.getField("attributes.death").fields;

    if ( this.document.system.bonuses?.abilities ) context.global = {
      data: source.bonuses?.abilities ?? {},
      fields: this.document.system.schema.getField("bonuses.abilities").fields
    };

    return context;
  }
}
