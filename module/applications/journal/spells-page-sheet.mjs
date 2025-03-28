import parseUuid from "../../parse-uuid.mjs";
import { linkForUuid, sortObjectEntries } from "../../utils.mjs";
import Items5e from "../../data/collection/items-collection.mjs";
import SpellsUnlinkedConfig from "./spells-unlinked-config.mjs";

/**
 * Journal entry page the displays a list of spells for a class, subclass, background, or something else.
 */
export default class JournalSpellListPageSheet extends (foundry.appv1?.sheets?.JournalPageSheet ?? JournalPageSheet) {

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
    return dnd5e.dataModels.journal.SpellListJournalPageData.GROUPING_MODES;
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

    context.description = await TextEditor.enrichHTML(context.system.description.value, { relativeTo: this });
    if ( context.description === "<p></p>" ) context.description = "";

    context.GROUPING_MODES = this.constructor.GROUPING_MODES;
    context.grouping = this.grouping || this.options.grouping || context.system.grouping;

    context.spells = await this.prepareSpells(context.grouping);

    context.sections = {};
    for ( const data of context.spells ) {
      const spell = data.spell ?? data.unlinked;
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
      section.spells.push(data);
    }
    if ( context.grouping === "school" ) context.sections = sortObjectEntries(context.sections, "header");

    if ( this.options.displayAsTable ) Object.values(context.sections).forEach(section => {
      const spells = section.spells.map(s => linkForUuid(s.spell?.uuid)).filter(_ => _);
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

    const unlinkedData = {};
    const uuids = new Set(this.document.system.spells);
    for ( const unlinked of this.document.system.unlinkedSpells ) {
      if ( unlinked.source.uuid ) {
        uuids.add(unlinked.source.uuid);
        unlinkedData[unlinked.source.uuid] = unlinked;
      }
    }

    let collections = new Collection();
    const remappedUuids = new Set();
    for ( const baseUuid of uuids ) {
      const { collection, uuid } = parseUuid(baseUuid);
      remappedUuids.add(uuid);
      if ( collection && !collections.has(collection) ) {
        if ( collection instanceof Items5e ) collections.set(collection, collection);
        else collections.set(collection, collection.getIndex({ fields }));
      } else if ( !collection ) uuids.delete(baseUuid);
    }

    const spells = (await Promise.all(collections.values())).flatMap(c => c.filter(s => remappedUuids.has(s.uuid)));

    for ( const unlinked of this.document.system.unlinkedSpells ) {
      if ( !uuids.has(unlinked.source.uuid) ) spells.push({ unlinked });
    }

    return spells
      .map(spell => {
        const data = spell.unlinked ? spell : { spell };
        data.unlinked ??= unlinkedData[data.spell?.uuid];
        data.name = data.spell?.name ?? data.unlinked?.name ?? "";
        if ( data.spell ) {
          data.display = linkForUuid(data.spell.uuid, {
            tooltip: '<section class="loading"><i class="fas fa-spinner fa-spin-pulse"></i></section>'
          });
        } else {
          data.display = `<span class="unlinked-spell"
            data-tooltip="${data.unlinked.source.label}">${data.unlinked.name ?? "—"}*</span>`;
        }
        return data;
      })
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
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
    html.querySelectorAll("[data-action]").forEach(e => {
      e.addEventListener("click", this._onAction.bind(this));
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _canDragDrop() {
    return this.isEditable;
  }

  /* -------------------------------------------- */

  /**
   * Handle performing an action.
   * @param {PointerEvent} event  This triggering click event.
   */
  async _onAction(event) {
    event.preventDefault();
    const { action } = event.target.dataset;

    const { itemUuid, unlinkedId } = event.target.closest(".item")?.dataset ?? {};
    switch ( action ) {
      case "add-unlinked":
        await this.document.update({"system.unlinkedSpells": [...this.document.system.unlinkedSpells, {}]});
        const id = this.document.toObject().system.unlinkedSpells.pop()._id;
        new SpellsUnlinkedConfig({ document: this.document, unlinkedId: id }).render(true);
        break;
      case "delete":
        if ( itemUuid ) {
          const spellSet = this.document.system.spells.filter(s => s !== itemUuid);
          await this.document.update({"system.spells": Array.from(spellSet)});
        } else if ( unlinkedId ) {
          const unlinkedSet = this.document.system.unlinkedSpells.filter(s => s._id !== unlinkedId);
          await this.document.update({"system.unlinkedSpells": Array.from(unlinkedSet)});
        }
        this.render();
        break;
      case "edit-unlinked":
        if ( unlinkedId ) new SpellsUnlinkedConfig({ document: this.document, unlinkedId }).render(true);
        break;
    }
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
