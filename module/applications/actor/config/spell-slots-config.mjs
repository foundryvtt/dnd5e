import BaseConfigSheet from "../api/base-config-sheet.mjs";

/**
 * Configuration application for overriding actor spell slots.
 */
export default class SpellSlotsConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    position: {
      width: 450
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/actors/config/spell-slots-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.SpellSlotsConfig");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    const { spells } = this.document.system;
    const source = this.document._source.system.spells;
    const maxLevel = Object.keys(CONFIG.DND5E.spellLevels).length - 1;
    const spellcastingMethods = new Set([
      "spell",
      ...Object.values(this.document.spellcastingClasses).map(cls => {
        return cls.system.spellcasting.type;
      }),
      ...this.document.itemTypes.spell.map(s => s.system.method)
    ]);

    const models = Object.entries(CONFIG.DND5E.spellcasting).sort(([a]) => a === "spell" ? -1 : 0);
    context.overrides = models.reduce((arr, [method, model]) => {
      if ( !model.slots ) return arr;
      for ( let i = model.isSingleLevel ? maxLevel : 1; i <= maxLevel; i++ ) {
        const key = model.getSpellSlotKey(i);
        const value = source[key]?.override;
        if ( !value && !spellcastingMethods.has(method) ) continue;
        arr.push({
          value,
          label: model.isSingleLevel
            ? game.i18n.localize(`DND5E.SPELLCASTING.METHODS.${method.capitalize()}.abbr`)
            : model.getLabel({ level: i }),
          name: `system.spells.${key}.override`,
          placeholder: spells[key]?.max ?? 0
        });
      }
      return arr;
    }, []);

    return context;
  }
}
