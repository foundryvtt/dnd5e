import BaseConfigSheet from "../api/base-config-sheet.mjs";

/**
 * Configuration application for an NPC's treasure categories.
 */
export default class TreasureConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["treasure-config"],
    position: {
      width: 400
    }
  };

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/actors/config/treasure-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.Treasure.Configuration.Title");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const config = CONFIG.DND5E.treasure;
    const { details } = this.document.system._source;
    const any = details.treasure.value.includes("any");
    context.treasure = [
      { label: config.any.label, name: "any", checked: any },
      ...Object.entries(config).reduce((arr, [key, { label }]) => {
        if ( key === "any" ) return arr;
        arr.push({ label, name: key, checked: any || details.treasure.value.includes(key), disabled: any });
        return arr;
      }, []).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
    ];
    return context;
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @override */
  _processFormData(event, form, formData) {
    return foundry.utils.expandObject({
      "system.details.treasure.value": Object.entries(formData.object).filter(([, v]) => v).map(([k]) => k)
    });
  }
}
