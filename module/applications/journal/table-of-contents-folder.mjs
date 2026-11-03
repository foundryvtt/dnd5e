import TableOfContentsCompendium from "./table-of-contents.mjs";
import TableOfContentsMixin from "./table-of-contents-mixin.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * A view of a folder as a table of contents.
 */
export default class TableOfContentsFolder extends TableOfContentsMixin(HandlebarsApplicationMixin(ApplicationV2)) {

  /** @override */
  static DEFAULT_OPTIONS = {
    folder: null
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The folder represented.
   * @type {Folder}
   */
  get folder() {
    return this.options.folder;
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return this.folder.name;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _getEntries() {
    return [this.folder, ...this.folder.getSubfolders(true)].flatMap(f => f.contents).filter(e => e.visible);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    options.id = `table-of-contents-folder-${options.folder.id}`;
    return options;
  }

  /* -------------------------------------------- */
  /*  Hooks                                       */
  /* -------------------------------------------- */

  /**
   * Add the table of contents context menu option.
   * @param {DocumentDirectory} app       The sidebar tab.
   * @param {ContextMenuEntry[]} entries  The context menu options.
   */
  static addFolderContextOptions(app, entries) {
    if ( !(app instanceof foundry.applications.sidebar.tabs.JournalDirectory) ) return;
    const getFolder = header => fromUuidSync(header.closest(".directory-item").dataset.uuid);
    entries.push({
      label: "DND5E.TABLEOFCONTENTS.Title",
      icon: "fa-solid fa-book-open",
      group: "system",
      visible: header => {
        const folder = getFolder(header);
        return folder?.getFlag("dnd5e", "display") === "table-of-contents";
      },
      onClick: (event, header) => {
        const folder = getFolder(header);
        const toc = foundry.applications.instances.get(`table-of-contents-folder-${folder.id}`)
          ?? new TableOfContentsFolder({ folder });
        toc.render({ force: true });
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * When using 'importAll' on a table of contents pack, flag the top-level folder as being capable of rendering as a
   * table of contents also.
   */
  static patchImportAll() {
    const { CompendiumCollection } = foundry.documents.collections;
    const { importAll } = CompendiumCollection.prototype;
    CompendiumCollection.prototype.importAll = async function(options={}) {
      if ( (this.applicationClass !== TableOfContentsCompendium) || options.folderId ) {
        return importAll.call(this, options);
      }
      const folder = await Folder.implementation.create({
        name: options.folderName || this.title,
        type: this.documentName,
        color: this.folder?.color ?? null,
        flags: { dnd5e: { display: "table-of-contents" } }
      });
      return importAll.call(this, { ...options, folderId: folder.id });
    };
  }
}

TableOfContentsFolder.patchImportAll();
