export default class ActorSpellSlotsConfig extends DocumentSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "dialog"],
      template: "systems/dnd5e/templates/apps/spell-slots-config.hbs",
      width: 450,
      height: "auto",
      sheetConfig: false,
      submitOnClose: true,
      submitOnChange: true,
      closeOnSubmit: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    return `${game.i18n.localize("DND5E.SpellSlotsConfig")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options={}) {
    const source = this.document._source.system.spells;
    const { spells } = this.document.system;
    const overrides = Array.fromRange(Object.keys(CONFIG.DND5E.spellLevels).length - 1, 1).map(level => ({
      value: source[`spell${level}`]?.override,
      label: CONFIG.DND5E.spellLevels[level],
      name: `system.spells.spell${level}.override`,
      placeholder: spells[`spell${level}`]?.max ?? 0
    }));
    if ( spells.pact?.level ) overrides.push({
      label: CONFIG.DND5E.spellPreparationModes.pact,
      value: source.pact.override,
      name: "system.spells.pact.override",
      placeholder: spells.pact.max ?? 0
    });
    return { overrides };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderOuter() {
    const html = await super._renderOuter();
    const header = html[0].querySelector(".window-header");
    header.querySelectorAll(".header-button").forEach(btn => {
      const label = btn.querySelector(":scope > i").nextSibling;
      btn.dataset.tooltip = label.textContent;
      btn.setAttribute("aria-label", label.textContent);
      label.remove();
    });
    return html;
  }
}
