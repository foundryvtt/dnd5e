/**
 * Journal entry page the displays a list of spells for a class, subclass, background, or something else.
 */
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

  /**
   * The table of contents for this JournalSpellListPageSheet.
   * @type {Object<JournalEntryPageHeading>}
   */
  toc = {};

  /* -------------------------------------------- */

  get template() {
    return `systems/dnd5e/templates/journal/page-spell-list-${this.isEditable ? "edit" : "view"}.hbs`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options) {
    const context = super.getData(options);
    context.CONFIG = CONFIG.DND5E;
    context.system = context.document.system;

    context.title = {
      level1: context.data.title.level,
      level2: context.data.title.level + 1,
      level3: context.data.title.level + 2,
      level4: context.data.title.level + 3
    };
    context.spellLevels = {};
    context.spells = [];

    context.spells = await Promise.all(context.system.spells.map(async s => {
      return { ...s, document: await fromUuid(s.uuid) };
    }));
    context.spells.sort((a, b) => a.document.name.localeCompare(b.document.name));
    for ( const spell of context.spells ) {
      const level = spell.document.system.level;
      context.spellLevels[level] ??= { header: CONFIG.DND5E.spellLevels[level], spells: [] };
      context.spellLevels[level].spells.push(spell);
    }

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _renderInner(...args) {
    const html = await super._renderInner(...args);
    this.toc = JournalEntryPage.implementation.buildTOC(html.get());
    return html;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html[0].querySelectorAll(".item-delete").forEach(e => {
      e.addEventListener("click", this._onDeleteItem.bind(this));
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting a dropped spell.
   * @param {Event} event  This triggering click event.
   * @returns {JournalSpellListPageSheet}
   */
  _onDeleteItem(event) {
    event.preventDefault();
    const uuidToDelete = event.currentTarget.closest("[data-item-uuid]")?.dataset.itemUuid;
    if ( !uuidToDelete ) return this;
    const spellSet = this.document.system.spells.filter(s => s.uuid !== uuidToDelete);
    return this.document.update({"system.spells": Array.from(spellSet)});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    if ( !data || (data.type !== "Item") ) return false;

    const item = await Item.implementation.fromDropData(data);
    if ( item.type !== "spell" ) return false;

    const spellSet = this.document.system.spells;
    if ( spellSet.find(s => s.uuid === item.uuid) ) return false;
    spellSet.add({uuid: item.uuid});
    this.document.update({"system.spells": Array.from(spellSet)});
    this.render(); // TODO: Shouldn't need to explicitly render this
  }
}
