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
    context.overrides = Array.fromRange(Object.keys(CONFIG.DND5E.spellLevels).length - 1, 1).map(level => ({
      value: source[`spell${level}`]?.override,
      label: CONFIG.DND5E.spellLevels[level],
      name: `system.spells.spell${level}.override`,
      placeholder: spells[`spell${level}`]?.max ?? 0
    }));

    for ( const k of Object.keys(CONFIG.DND5E.spellcastingTypes) ) {
      const hasSpell = this.document.items.some(i => i.type === "spell" && i.system.preparation.mode === k);
      if ( parseInt(spells[k]?.level) || hasSpell ) context.overrides.push({
        label: CONFIG.DND5E.spellPreparationModes[k].label,
        value: source[k]?.override,
        name: `system.spells.${k}.override`,
        placeholder: spells[k]?.max ?? 0
      });
    }

    return context;
  }
}
