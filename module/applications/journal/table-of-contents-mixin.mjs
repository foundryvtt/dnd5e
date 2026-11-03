/**
 * Provides table of contents rendering.
 * @param {typeof ApplicationV2} Base
 * @returns {typeof TableOfContents}
 */
export default function TableOfContentsMixin(Base) {
  return class TableOfContents extends Base {
    /** @override */
    static DEFAULT_OPTIONS = {
      actions: {
        activateEntry: this.prototype._onClickLink
      },
      classes: ["table-of-contents"],
      position: {
        width: 800,
        height: 950
      },
      window: {
        contentTag: "article",
        resizable: true
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

    /**
     * Options allowed for entry types.
     * @type {FormSelectOption[]}
     */
    static TYPE_OPTIONS = [
      { value: "chapter", label: "DND5E.TABLEOFCONTENTS.Type.Chapter" },
      { value: "appendix", label: "DND5E.TABLEOFCONTENTS.Type.Appendix" },
      { value: "header", label: "DND5E.TABLEOFCONTENTS.Type.Header" },
      { value: "special", label: "DND5E.TABLEOFCONTENTS.Type.Special" }
    ];

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * The table of contents entries.
     * @returns {Promise<JournalEntry[]>}
     * @abstract
     */
    async _getEntries() {
      throw new Error("The _getEntries method must be implemented by a subclass.");
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const documents = await this._getEntries();

      context.chapters = [];
      const specialEntries = [];
      for ( const entry of documents ) {
        const flags = entry.flags?.dnd5e;
        if ( !flags ) continue;
        const keys = Object.keys(flags);
        if ( flags.tocHidden || !keys.length || ((keys.length === 1) && (keys[0] === "navigation")) ) continue;
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
          uuid: entry.uuid,
          name: flags.title ?? entry.name,
          pages: Array.from(entry.pages).map(({ flags, id, name, sort }) => ({
            id, sort, flags,
            name: flags.dnd5e?.title ?? name,
            entryId: entry.id,
            entryUuid: entry.uuid
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
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * Handle clicking a link to a journal entry or page.
     * @param {PointerEvent} event  The triggering click event.
     * @param {HTMLElement} target  The action target.
     * @protected
     */
    async _onClickLink(event, target) {
      const entryUuid = target.closest("[data-entry-uuid]")?.dataset.entryUuid;
      if ( !entryUuid ) return;
      const entry = await fromUuid(entryUuid);
      entry?.sheet.render(true, {
        pageId: target.closest("[data-page-id]")?.dataset.pageId
      });
    }
  };
}
