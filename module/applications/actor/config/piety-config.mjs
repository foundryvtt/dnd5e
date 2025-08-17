import BaseConfigSheet from "../api/base-config-sheet.mjs";

/**
 * Configuration application for an actor's piety attribute.
 */
export default class PietyConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    position: {
      width: 420
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/actors/config/piety-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.PIETY.Configure");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const source = this.document.system._source;

    context.data = source.attributes.piety;
    context.fields = this.document.system.schema.getField("attributes.piety").fields;
    context.deityOptions = Object.entries(CONFIG.DND5E.deities).map(([k, v]) => ({ value: k, label: v.label }));

    if (context.data.deity && !(context.data.deity in CONFIG.DND5E.deities)) {
      context.deityOptions.unshift({ value: context.data.deity, label: context.data.deity });
    }

    return context;
  }
}
