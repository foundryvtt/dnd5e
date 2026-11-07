import CompendiumTOCConfig from "./config/compendium-toc-config.mjs";
import TableOfContentsMixin from "./table-of-contents-mixin.mjs";

const { Compendium } = foundry.applications.sidebar.apps;

/**
 * Compendium that renders pages as a table of contents.
 */
export default class TableOfContentsCompendium extends TableOfContentsMixin(Compendium) {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      configureTableOfContents: TableOfContentsCompendium.#onConfigureTableOfContents
    },
    window: {
      controls: [
        {
          action: "configureTableOfContents",
          icon: "fa-solid fa-bars-staggered",
          label: "DND5E.TABLEOFCONTENTS.Action.Configure",
          visible: TableOfContentsCompendium.#canConfigureTableOfContents
        }
      ]
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  _configureRenderParts(options) {
    // Skip normal compendium render parts logic.
    return foundry.utils.deepClone(this.constructor.PARTS);
  }

  /* -------------------------------------------- */

  /** @override */
  _createContextMenus() {
    this._createContextMenu(this._getEntryContextOptions, "[data-entry-id]", { fixed: true });
  }

  /* -------------------------------------------- */

  /** @override */
  async _getEntries() {
    return this.collection.getDocuments();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    new CONFIG.ux.DragDrop({
      dragSelector: "[data-document-id]",
      dropSelector: "article",
      permissions: {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this)
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.dataset.compendiumId = this.collection.metadata.id;
    return frame;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Whether it's possible to configure the table of contents.
   * @this {TableOfContentsCompendium}
   * @returns {boolean}
   */
  static #canConfigureTableOfContents() {
    return !this.collection.locked && this.collection.testUserPermission(game.user, "OWNER");
  }

  /* -------------------------------------------- */

  /**
   * Handle opening the configuration application.
   * @this {TableOfContentsCompendium}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #onConfigureTableOfContents(event, target) {
    new CompendiumTOCConfig({ compendium: this.collection }).render({ force: true });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDragStart(event) {
    let dragData;
    if ( ui.context ) ui.context.close({animate: false});
    dragData = this._getEntryDragData(event.target.dataset.documentId);
    if ( !dragData ) return;
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Prepare information on all entries in the provided compendium for configuring table of contents.
   * @param {CompendiumCollection} compendium
   * @returns { chapterOptions: FormSelectOption[], counts: Record<string, number> }
   */
  static async _getEntryBreakdown(compendium) {
    const docs = await compendium.getIndex({
      fields: ["flags.dnd5e.type", "flags.dnd5e.append", "flags.dnd5e.position"]
    });

    const counts = {};
    const chapterOptions = docs
      .reduce((arr, doc) => {
        const flags = doc.flags.dnd5e ?? {};
        if ( flags.type ) {
          counts[`${flags.type}-${flags.position ?? 0}`] ??= 0;
          counts[`${flags.type}-${flags.position ?? 0}`] += 1;
        }
        if ( (flags.type === "appendix") || (flags.type === "chapter") ) {
          const sort = TableOfContentsCompendium.TYPES[flags.type] + (flags.position ?? 0);
          arr.push({ label: _loc("DND5E.TABLEOFCONTENTS.Special.After", { chapter: doc.name }), sort });
        }
        return arr;
      }, [{ value: null, label: _loc("DND5E.TABLEOFCONTENTS.Special.End"), rule: true }])
      .sort((lhs, rhs) => lhs.sort - rhs.sort)
      .map((option, value) => ({ ...option, value: option.value === null ? null : value }));

    return { chapterOptions, counts };
  }
}
