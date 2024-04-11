import SpellListJournalPageData from "../../data/journal/spells.mjs";
import { linkForUuid, sortObjectEntries } from "../../utils.mjs";
import Items5e from "../../data/collection/items-collection.mjs";

/**
 * Journal entry page the displays a list of spells for a class, subclass, background, or something else.
 */
export default class JournalSpellListPageSheet extends JournalPageSheet {

  /** @inheritDoc */
  static get defaultOptions() {
    const options = foundry.utils.mergeObject(super.defaultOptions, {
      dragDrop: [{dropSelector: "form"}],
      submitOnChange: true,
      width: 700,
      displayAsTable: false,
      embedRendering: false,
      grouping: null
    });
    options.classes.push("spells");
    return options;
  }

  /* -------------------------------------------- */

  /**
   * Different ways in which spells can be grouped on the sheet.
   * @type {Record<string, string>}
   */
  static get GROUPING_MODES() {
    return SpellListJournalPageData.GROUPING_MODES;
  }

  /* -------------------------------------------- */

  /**
   * Currently selected grouping mode.
   * @type {string|null}
   */
  grouping = null;

  /* -------------------------------------------- */

  /** @inheritDoc */
  get template() {
    if ( this.options.displayAsTable ) return "systems/dnd5e/templates/journal/page-spell-list-table.hbs";
    return `systems/dnd5e/templates/journal/page-spell-list-${this.isEditable ? "edit" : "view"}.hbs`;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = super.getData(options);
    context.CONFIG = CONFIG.DND5E;
    context.system = context.document.system;
    context.embedRendering = this.options.embedRendering ?? false;

    context.title = Object.fromEntries(Array.fromRange(4, 1).map(n => [`level${n}`, context.data.title.level + n - 1]));

    context.description = await TextEditor.enrichHTML(context.system.description.value, {
      async: true, relativeTo: this
    });
    if ( context.description === "<p></p>" ) context.description = "";

    context.GROUPING_MODES = this.constructor.GROUPING_MODES;
    context.grouping = this.grouping || this.options.grouping || context.system.grouping;

    context.spells = await this.prepareSpells(context.grouping);

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
          section = context.sections[school] ??= { header: CONFIG.DND5E.spellSchools[school]?.label, spells: [] };
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

    if ( this.options.displayAsTable ) Object.values(context.sections).forEach(section => {
      const spells = section.spells.map(s => linkForUuid(s.uuid));
      section.spellList = game.i18n.getListFormatter({ type: "unit" }).format(spells);
    });

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Load indices with necessary information for spells.
   * @param {string} grouping  Grouping mode to respect.
   * @returns {object[]}
   */
  async prepareSpells(grouping) {
    let fields;
    switch ( grouping ) {
      case "level": fields = ["system.level"]; break;
      case "school": fields = ["system.school"]; break;
      default: fields = []; break;
    }

    let collections = new Collection();
    for ( const uuid of this.document.system.spells ) {
      const { collection } = foundry.utils.parseUuid(uuid);
      if ( collection && !collections.has(collection) ) {
        if ( collection instanceof Items5e ) collections.set(collection, collection);
        else collections.set(collection, collection.getIndex({ fields }));
      }
    }

    return (await Promise.all(collections.values()))
      .flatMap(c => c.filter(s => this.document.system.spells.has(s.uuid)))
      .sort((lhs, rhs) => lhs.name.localeCompare(rhs.name, game.i18n.lang));
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(jQuery) {
    super.activateListeners(jQuery);
    const [html] = jQuery;

    html.querySelector('[name="grouping"]')?.addEventListener("change", event => {
      this.grouping = (event.target.value === this.document.system.grouping) ? null : event.target.value;
      this.object.parent.sheet.render();
    });
    html.querySelectorAll(".item-delete").forEach(e => {
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
    const spellSet = this.document.system.spells.filter(s => s !== uuidToDelete);
    await this.document.update({"system.spells": Array.from(spellSet)});
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    let spells;
    switch ( data?.type ) {
      case "Folder":
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
