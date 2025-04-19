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

    const source = this.document._source.system.spells;
    const { spells } = this.document.system;
    const maxSpellLevel = Object.keys(CONFIG.DND5E.spellLevels).length - 1;
    context.overrides = [];

    for ( const v of Object.values(CONFIG.DND5E.spellcasting) ) {
      if ( v.isStatic ) continue;
      const overrides = [];
      if ( v.separate ) {
        for ( let i = 1; i <= maxSpellLevel; i++ ) {
          const key = v.spellSlotKey(i);
          overrides.push({
            label: v.spellSlotLabel(i),
            name: `system.spells.${key}.override`,
            placeholder: spells[key]?.max ?? 0,
            value: source[key]?.override
          });
        }
      } else {
        overrides.push({
          label: v.spellSlotLabel(spells[v.key].level, true),
          name: `system.spells.${v.key}.override`,
          placeholder: spells[v.key]?.max ?? 0,
          value: source[v.key]?.override
        });
      }
      context.overrides.push(overrides);
    }

    return context;
  }
}
