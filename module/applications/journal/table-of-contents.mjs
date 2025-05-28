/**
 * Compendium that renders pages as a table of contents.
 */
export default class TableOfContentsCompendium extends foundry.applications.sidebar.apps.Compendium {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["table-of-contents"],
    window: {
      resizable: true,
      contentTag: "article"
    },
    position: {
      width: 800,
      height: 950
    },
    actions: {
      activateEntry: this.prototype._onClickLink
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    article: {
      root: true,
      template: "systems/dnd5e/templates/journal/table-of-contents.hbs"
    }
  };

  /* -------------------------------------------- */

  /**
   * Position of pages based on type.
   * @enum {number}
   */
  static TYPES = {
    chapter: 0,
    appendix: 100
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
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const documents = await this.collection.getDocuments();

    context.chapters = [];
    const specialEntries = [];
    for ( const entry of documents ) {
      const flags = entry.flags?.dnd5e;
      if ( !flags ) continue;
      const type = flags.type ?? "chapter";

      if ( type === "header" ) {
        const page = entry.pages.contents[0];
        context.header = {
          title: flags.title ?? page?.name,
          content: page?.text.content
        };
        continue;
      }

      const data = {
        type, flags,
        id: entry.id,
        name: flags.title ?? entry.name,
        pages: Array.from(entry.pages).map(({ flags, id, name, sort }) => ({
          id, sort, flags,
          name: flags.dnd5e?.title ?? name,
          entryId: entry.id
        }))
      };

      if ( type === "special" ) {
        data.showPages = flags.showPages ?? !flags.append;
        specialEntries.push(data);
      } else {
        data.order = (this.constructor.TYPES[type] ?? 200) + (flags.position ?? 0);
        data.showPages = (flags.showPages !== false) && ((flags.showPages === true) || (type === "chapter"));
        context.chapters.push(data);
      }
    }

    context.chapters.sort((lhs, rhs) => lhs.order - rhs.order);
    for ( const entry of specialEntries ) {
      const append = entry.flags.append;
      const order = entry.flags.order;
      if ( append && (append <= context.chapters.length) ) {
        context.chapters[append - 1].pages.push({ ...entry, sort: order, entry: true });
      } else {
        context.chapters.push(entry);
      }
    }

    for ( const chapter of context.chapters ) {
      chapter.pages = chapter.pages
        .filter(p => !p.flags.tocHidden && (chapter.showPages || p.entry))
        .sort((lhs, rhs) => lhs.sort - rhs.sort);
      for ( const page of chapter.pages ) {
        if ( page.pages ) page.pages.sort((lhs, rhs) => lhs.sort - rhs.sort);
      }
    }

    return context;
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
   * Handle clicking a link to a journal entry or page.
   * @param {PointerEvent} event  The triggering click event.
   * @param {HTMLElement} target  The action target.
   * @protected
   */
  async _onClickLink(event, target) {
    const entryId = target.closest("[data-entry-id]")?.dataset.entryId;
    if ( !entryId ) return;
    const entry = await this.collection.getDocument(entryId);
    entry?.sheet.render(true, {
      pageId: target.closest("[data-page-id]")?.dataset.pageId
    });
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
}
