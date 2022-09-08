export default class JournalSpellListPageSheet extends JournalPageSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    const options = foundry.utils.mergeObject(super.defaultOptions, {
      dragDrop: [{dropSelector: ".drop-target"}],
      submitOnChange: true
    });
    options.classes.push("spellList");
    return options;
  }

  /* -------------------------------------------- */

  get template() {
    return `systems/dnd5e/templates/journal/page-spell-list-${this.isEditable ? "edit" : "view"}.hbs`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options) {
    const context = super.getData(options);
    context.system = context.document.system;

    context.title = {
      level1: context.data.title.level,
      level2: context.data.title.level + 1,
      level3: context.data.title.level + 2,
      level4: context.data.title.level + 3
    };
    context.spellLevels = {};

    const spells = await Promise.all(context.system.spells.map(async s => {
      return { ...s, document: await fromUuid(s.uuid) };
    }));
    for ( const spell of spells ) {
      const level = spell.document.system.level;
      context.spellLevels[level] ??= { header: CONFIG.DND5E.spellLevels[level], spells: [] };
      context.spellLevels[level].spells.push(spell);
    }

    return context;
  }

}
