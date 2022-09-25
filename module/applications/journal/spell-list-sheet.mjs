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

    context.description = await TextEditor.enrichHTML(context.system.description.value, {
      async: true, relativeTo: this
    });

    context.spellLevels = {};
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
  async _onDeleteItem(event) {
    event.preventDefault();
    const uuidToDelete = event.currentTarget.closest("[data-item-uuid]")?.dataset.itemUuid;
    if ( !uuidToDelete ) return this;
    const spellSet = this.document.system.spells.filter(s => s.uuid !== uuidToDelete);
    await this.document.update({"system.spells": Array.from(spellSet)});
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    let spells;
    switch (data?.type) {
      case "Folder":
        if ( data.documentName !== "Item" ) return false;
        spells = (await Folder.implementation.fromDropData(data))?.contents;
        break;
      case "Item":
        spells = [await Item.implementation.fromDropData(data)];
        break;
      default: return false;
    }

    const spellCollection = this.document.system.spells;
    const spellUuids = new Set(spellCollection.map(s => s.uuid));
    spells = spells.filter(item => (item.type === "spell") && !spellUuids.has(item.uuid));
    if ( !spells.length ) return false;

    spells.forEach(i => spellCollection.add({uuid: i.uuid}));
    await this.document.update({"system.spells": Array.from(spellCollection)});
    this.render();
  }

}
