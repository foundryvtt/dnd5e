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

    for ( const [k, v] of Object.entries(CONFIG.DND5E.spellcasting) ) {
      if ( !v.static && v.separate ) {
        for ( let i = 1; i <= maxSpellLevel; i++ ) {
          // Special handling for regular spell slots for backwards compatibility.
          context.overrides.push({
            label: `${v.label} (${i.ordinalString()})`,
            name: `system.spells.${k}${i}.override`,
            placeholder: spells[`${k}${i}`]?.max ?? 0,
            value: source[`${k}${i}`]?.override
          });
        }
      } else if ( !v.static ) {
        context.overrides.push({
          label: v.label,
          name: `system.spells.${k}.override`,
          placeholder: spells[k]?.max ?? 0,
          value: source[k]?.override
        });
      }
    }

    return context;
  }
}
