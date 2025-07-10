import { linkForUuid, sortObjectEntries } from "../../utils.mjs";
import Items5e from "../../data/collection/items-collection.mjs";
import SpellsUnlinkedConfig from "./spells-unlinked-config.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;
const { JournalEntryPageHandlebarsSheet } = foundry.applications.sheets.journal;

/**
 * Journal entry page that displays a list of spells for a class, subclass, background, or something else.
 */
export default class JournalSpellListPageSheet extends JournalEntryPageHandlebarsSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["spells"],
    position: {
      width: 750
    },
    displayAsTable: false,
    embedRendering: false,
    grouping: null,
    actions: {
      addUnlinked: JournalSpellListPageSheet.#onAddUnlinked,
      delete: JournalSpellListPageSheet.#onDelete,
      editUnlinked: JournalSpellListPageSheet.#onEditUnlinked
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static EDIT_PARTS = {
    header: super.EDIT_PARTS.header,
    config: {
      classes: ["standard-form"],
      template: "systems/dnd5e/templates/journal/spell/config.hbs"
    },
    list: {
      classes: ["right", "spell-list"],
      template: "systems/dnd5e/templates/journal/spell/list.hbs"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static VIEW_PARTS = {
    content: {
      root: true,
      template: "systems/dnd5e/templates/journal/spell/view.hbs"
    }
  };

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
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if ( ("content" in parts) && this.options.displayAsTable ) {
      parts.content.template = "systems/dnd5e/templates/journal/spell/table.hbs";
    }
    return parts;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    if ( this.isView ) return;
    const left = document.createElement("div");
    left.classList.add("left", "flexcol", "standard-form");
    this.element.querySelector(".window-content").insertAdjacentElement("afterbegin", left);
    left.append(...this.element.querySelectorAll('[data-application-part="config"], [data-application-part="header"]'));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    new CONFIG.ux.DragDrop({
      permissions: { drop: this._canDragDrop.bind(this) },
      callbacks: { drop: this._onDrop.bind(this) }
    }).bind(this.element);
    if ( this.isView ) {
      this.element.querySelector('[name="grouping"]')?.addEventListener("change", this._onChangeGroup.bind(this));
    }

    // FIXME: Workaround for core bug.
    else if ( options.parts.includes("config") ) {
      const editor = foundry.applications.elements.HTMLProseMirrorElement.create({
        name: "system.description.value",
        value: this.document.system._source.description.value
      });
      this.element.querySelector('[data-application-part="config"]').append(editor);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.CONFIG = CONFIG.DND5E;
    context.system = context.document.system;
    context.embedRendering = this.options.embedRendering ?? false;

    context.description = await TextEditor.enrichHTML(context.system.description.value, { relativeTo: this.document });
    if ( context.description === "<p></p>" ) context.description = "";

    context.title = {
      ...context.title,
      ...Object.fromEntries(Array.fromRange(4, 1).map(n => [`level${n}`, context.title.level + n - 1]))
    };

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
   * @returns {Promise<object[]>}
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
      const { collection, uuid } = foundry.utils.parseUuid(baseUuid);
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

  /**
   * Handle adding an unlinked spell.
   * @this {JournalSpellListPageSheet}
   */
  static async #onAddUnlinked() {
    await this.document.update({ "system.unlinkedSpells": [...this.document.system.unlinkedSpells, {}] });
    const id = this.document.system._source.unlinkedSpells.at(-1)._id;
    new SpellsUnlinkedConfig({ document: this.document, unlinkedId: id }).render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting a spell.
   * @this {JournalSpellListPageSheet}
   * @param {PointerEvent} event  The originating event.
   * @param {HTMLElement} target  The action target.
   */
  static #onDelete(event, target) {
    const { itemUuid, unlinkedId } = target.closest(".item")?.dataset ?? {};
    if ( itemUuid ) {
      const spellSet = this.document.system.spells.filter(s => s !== itemUuid);
      this.document.update({ "system.spells": Array.from(spellSet) });
    } else if ( unlinkedId ) {
      const unlinkedSet = this.document.system.unlinkedSpells.filter(s => s._id !== unlinkedId);
      this.document.update({ "system.unlinkedSpells": Array.from(unlinkedSet) });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle editing an unlinked spell.
   * @this {JournalSpellListPageSheet}
   * @param {PointerEvent} event  The originating event.
   * @param {HTMLElement} target  The action target.
   */
  static #onEditUnlinked(event, target) {
    const { unlinkedId } = target.closest(".item")?.dataset ?? {};
    if ( unlinkedId ) new SpellsUnlinkedConfig({ document: this.document, unlinkedId }).render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle changing the grouping.
   * @param {Event} event  The triggering event.
   * @protected
   */
  _onChangeGroup(event) {
    this.grouping = (event.target.value === this.document.system.grouping) ? null : event.target.value;
    this.document.parent.sheet.render();
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _canDragDrop() {
    return this.isEditable;
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
  }
}
