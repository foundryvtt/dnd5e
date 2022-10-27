import { sortObjectEntries } from "../../utils.mjs";

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
   * Different ways in which spells can be grouped on the sheet.
   * @enum {string}
   */
  static GROUPING_MODES = {
    none: "JOURNALETNRYPAGE.DND5E.SpellList.GroupingNone",
    alphabetical: "JOURNALETNRYPAGE.DND5E.SpellList.GroupingAlphabetical",
    level: "JOURNALETNRYPAGE.DND5E.SpellList.GroupingLevel",
    school: "JOURNALETNRYPAGE.DND5E.SpellList.GroupingSchool"
  }

  /* -------------------------------------------- */

  /**
   * Currently selected grouping mode.
   * @type {string|null}
   */
  grouping = null;

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

    context.title = Object.fromEntries(Array.fromRange(4, 1).map(n => [`level${n}`, context.data.title.level + n - 1]));

    context.description = await TextEditor.enrichHTML(context.system.description.value, {
      async: true, relativeTo: this
    });
    if ( context.description === "<p></p>" ) context.description = "";

    context.GROUPING_MODES = this.constructor.GROUPING_MODES;
    context.grouping = this.grouping || context.system.grouping;

    context.spells = await Promise.all(context.system.spells.map(fromUuid));
    context.spells.sort((a, b) => a.name.localeCompare(b.name));

    context.sections = {};
    for ( const spell of context.spells ) {
      let section;
      switch ( context.grouping ) {
        case "level":
          const level = spell.system.level;
          section = context.sections[level] ??= { header: CONFIG.DND5E.spellLevels[level], spells: [] };
          break;
        case "school":
          const school = spell.system.school;
          section = context.sections[school] ??= { header: CONFIG.DND5E.spellSchools[school], spells: [] };
          break;
        case "alphabetical":
          const letter = spell.name.slice(0, 1).toLowerCase();
          section = context.sections[letter] ??= { header: letter.toUpperCase(), spells: [] };
          break;
        default:
          continue;
      }
      section.spells.push(spell);
    }
    if ( context.grouping === "school" ) context.sections = sortObjectEntries(context.sections, "header");

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
    html.find("[name='grouping']")?.change(this._onChangeGrouping.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Respond to changes to the manual grouping mode.
   * @param {Event} event  This triggering change event.
   */
  _onChangeGrouping(event) {
    this.grouping = (event.target.value === this.document.system.grouping) ? null : event.target.value;
    this.object.parent.sheet.render();
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
    const spellSet = this.document.system.spells.filter(s => s !== uuidToDelete);
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

    const spellUuids = this.document.system.spells;
    spells = spells.filter(item => (item.type === "spell") && !spellUuids.has(item.uuid));
    if ( !spells.length ) return false;

    spells.forEach(i => spellUuids.add(i.uuid));
    await this.document.update({"system.spells": Array.from(spellUuids)});
    this.render();
  }

}
