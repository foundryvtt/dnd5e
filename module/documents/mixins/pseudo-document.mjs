/**
 * A mixin which extends a DataModel to provide a CRUD-layer similar to normal Documents.
 * @param {typeof DataModel} Base  The base DataModel to be mixed.
 * @returns {typeof PseudoDocument}
 * @mixin
 */
export default Base => class extends Base {
  constructor(data, { parent = null, ...options } = {}) {
    if (parent instanceof Item) parent = parent.system;
    super(data, { parent, ...options });
  }

  /* -------------------------------------------- */

  /**
   * Mapping of PseudoDocument UUID to the apps they should re-render.
   * @type {Map<string, Set<Application|ApplicationV2>>}
   * @internal
   */
  static _apps = new Map();

  /* -------------------------------------------- */

  /**
   * Existing sheets of a specific type for a specific document.
   * @type {Map<[PseudoDocument, typeof ApplicationV2], ApplicationV2>}
   */
  static _sheets = new Map();

  /* -------------------------------------------- */

  /** @inheritDoc */
  _initialize(options) {
    super._initialize(options);
    if ( !game._documentsReady ) return;
    return this.prepareData();
  }

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /**
   * Configuration information for PseudoDocuments.
   *
   * @typedef {object} PseudoDocumentsMetadata
   * @property {string} name        Base type name of this PseudoDocument (e.g. "Activity", "Advancement").
   * @property {string} collection  Location of the collection of pseudo documents within system data.
   */

  /**
   * Configuration information for PseudoDocuments.
   * @type {PseudoDocumentsMetadata}
   */
  static metadata = Object.freeze({});

  get metadata() {
    return this.constructor.metadata;
  }

  /* -------------------------------------------- */

  /**
   * The named collection to which this PseudoDocument belongs.
   * @type {string}
   */
  static get collectionName() {
    return this.metadata.collection;
  }

  get collectionName() {
    return this.constructor.collectionName;
  }

  /* -------------------------------------------- */

  /**
   * The canonical name of this PseudoDocument type, for example "Activity".
   * @type {string}
   */
  static get documentName() {
    return this.metadata.name;
  }

  get documentName() {
    return this.constructor.documentName;
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /**
   * Unique identifier for this PseudoDocument within its item.
   * @type {string}
   */
  get id() {
    return this._id;
  }

  /* -------------------------------------------- */

  /**
   * Unique ID for this PseudoDocument on an actor.
   * @type {string}
   */
  get relativeID() {
    return `${this.item.id}.${this.id}`;
  }

  /* -------------------------------------------- */

  /**
   * Globally unique identifier for this PseudoDocument.
   * @type {string}
   */
  get uuid() {
    return `${this.item.uuid}.${this.documentName}.${this.id}`;
  }

  /* -------------------------------------------- */

  /**
   * Item to which this PseudoDocument belongs.
   * @type {Item5e}
   */
  get item() {
    return this.parent.parent;
  }

  /* -------------------------------------------- */

  /**
   * Actor to which this PseudoDocument's item belongs, if the item is embedded.
   * @type {Actor5e|null}
   */
  get actor() {
    return this.item.parent ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Lazily obtain a ApplicationV2 instance used to configure this PseudoDocument, or null if no sheet is available.
   * @type {ApplicationV2|null}
   */
  get sheet() {
    // TODO: Implement when pseudo document sheet registration is set up
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /**
   * Render all of the Application instances which are connected to this PseudoDocument.
   * @param {boolean} [force=false]  Force rendering
   * @param {object} [context={}]    Optional context
   */
  render(force=false, context={}) {
    for ( const app of this.constructor._apps.get(this.uuid) ?? [] ) app.render(force, context);
  }

  /* -------------------------------------------- */

  /**
   * Register an application to respond to updates to a certain document.
   * @param {PseudoDocument} doc  Pseudo document to watch.
   * @param {Application} app     Application to update.
   * @internal
   */
  static _registerApp(doc, app) {
    if ( !this._apps.has(doc.uuid) ) this._apps.set(doc.uuid, new Set());
    this._apps.get(doc.uuid).add(app);
  }

  /* -------------------------------------------- */

  /**
   * Remove an application from the render registry.
   * @param {PseudoDocument} doc  Pseudo document being watched.
   * @param {Application} app     Application to stop watching.
   */
  static _unregisterApp(doc, app) {
    this._apps.get(doc?.uuid)?.delete(app);
  }

  /* -------------------------------------------- */
  /*  Editing Methods                             */
  /* -------------------------------------------- */

  /**
   * Remove unnecessary keys from the context before passing it through to the update.
   * @param {DocumentModificationContext} context
   * @returns {DocumentModificationContext}
   * @internal
   */
  static _clearedDocumentModificationContext(context) {
    context = foundry.utils.deepClone(context);
    delete context.parent;
    delete context.pack;
    delete context.keepId;
    delete context.keepEmbeddedIds;
    delete context.renderSheet;
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Validate that a PseudoDocument can be created.
   * @param {object} data                               Data for creating a single PseudoDocument.
   * @param {DocumentModificationContext} [context={}]  Additional context which customizes the creation workflow.
   * @throws
   */
  static _validateDocumentCreation(data, context) {}

  /* -------------------------------------------- */

  /**
   * Create multiple PseudoDocuments using provided input data.
   * Data is provided as an array of objects where each individual object becomes one new PseudoDocument.
   * See Foundry's Document#createDocuments documentation for more information.
   *
   * @param {object[]} data                             An array of data objects to create multiple PseudoDocuments.
   * @param {DocumentModificationContext} [context={}]  Additional context which customizes the creation workflow.
   * @returns {Promise<PseudoDocument[]>}               An array of created PseudoDocuments instances.
   */
  static async createDocuments(data=[], context={}) {
    if ( !context.parent ) throw new Error("Cannot create pseudo documents without a parent.");

    const updates = data.reduce((updates, data) => {
      if ( !context.keepId || !data._id ) data._id = foundry.utils.randomID();
      const cls = CONFIG[this.documentName].documentClasses[data.type];
      const createData = foundry.utils.deepClone(data);
      const created = new cls(data, { parent: context.parent });
      if ( created._preCreate?.(createData) !== false ) {
        updates[data._id] = created.toObject();
        this._validateDocumentCreation(data, context);
      }
      return updates;
    }, {});

    await context.parent.update(
      { [`system.${this.collectionName}`]: updates },
      this._clearedDocumentModificationContext(context)
    );
    const documents = Object.keys(updates).map(id => context.parent.getEmbeddedDocument(this.documentName, id));
    if ( context.renderSheet ) documents.forEach(d => d.sheet.render(true));
    return documents;
  }

  /* -------------------------------------------- */

  /**
   * Update multiple PseudoDocuments instances using provided differential data.
   * Data is provided as an array of objects where each individual object updates one existing PseudoDocuments.
   * See Foundry's Document#updateDocuments documentation for more information.
   *
   * @param {object[]} updates                          An array of differential data objects, each used to update
   *                                                    a single PseudoDocuments.
   * @param {DocumentModificationContext} [context={}]  Additional context which customizes the update workflow.
   * @returns {Promise<PseudoDocument[]>}               An array of updated PseudoDocuments instances.
   */
  static async updateDocuments(updates=[], context={}) {
    if ( !context.parent ) throw new Error("Cannot update pseudo documents without a parent.");

    updates = updates.reduce((updates, data) => {
      if ( !data._id ) throw new Error("ID must be provided when updating an pseudo document");
      const cls = CONFIG[this.documentName].documentClasses[
        data.type ?? context.parent.getEmbeddedDocument(this.documentName, data._id)?.type
      ];
      const removals = Object.entries(foundry.utils.flattenObject(data)).reduce((obj, [k, v]) => {
        if ( k.includes("-=") ) obj[k] = v;
        return obj;
      }, {});
      updates[data._id] = foundry.utils.mergeObject(
        cls?.cleanData(foundry.utils.expandObject(data), { partial: true }) ?? data,
        removals
      );
      return updates;
    }, {});

    await context.parent.update(
      { [`system.${this.collectionName}`]: updates },
      this._clearedDocumentModificationContext(context)
    );
    return Object.keys(updates).map(id => context.parent.getEmbeddedDocument(this.documentName, id));
  }

  /* -------------------------------------------- */

  /**
   * Delete one or multiple existing Documents using an array of provided ids.
   * Data is provided as an array of string ids for the PseudoDocuments to delete.
   * See Foundry's Document#deleteDocuments documentation for more information.
   *
   * @param {string[]} ids                              An array of string ids for the PseudoDocuments to be deleted.
   * @param {DocumentModificationContext} [context={}]  Additional context which customizes the deletion workflow.
   * @returns {Promise<PseudoDocument[]>}               An array of deleted PseudoDocument instances.
   */
  static async deleteDocuments(ids, context={}) {
    if ( !context.parent ) throw new Error("Cannot delete pseudo documents without a parent.");

    const { updates, documents } = ids.reduce(({ updates, documents }, id) => {
      documents.push(context.parent.getEmbeddedDocument(this.documentName, id));
      updates[`system.${this.collectionName}.-=${id}`] = null;
      return { updates, documents };
    }, { updates: {}, documents: [] }
    );

    await context.parent.update(updates, this._clearedDocumentModificationContext(context));
    return documents;
  }

  /* -------------------------------------------- */

  /**
   * Update this PseudoDocument.
   * @param {object} [data={}]                          Updates to apply to this PseudoDocument.
   * @param {DocumentModificationContext} [context={}]  Additional context which customizes the update workflow.
   * @returns {Promise<PseudoDocument>}                 This PseudoDocument after updates have been applied.
   */
  async update(data={}, context={}) {
    const updated = await this.item.updateEmbeddedDocuments(this.documentName, [{ ...data, _id: this.id }], context);
    if ( context.render !== false ) this.render();
    return updated.shift();
  }

  /* -------------------------------------------- */

  /**
   * Update this PseudoDocument's data on the item without performing a database commit.
   * @param {object} updates    Updates to apply to this PseudoDocument.
   * @returns {PseudoDocument}  This PseudoDocument after updates have been applied.
   */
  updateSource(updates) {
    super.updateSource(updates);
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Delete this PseudoDocument, removing it from the database.
   * @param {DocumentModificationContext} [context={}]  Additional context which customizes the deletion workflow.
   * @returns {Promise<PseudoDocument>}                 The deleted PseudoDocument instance.
   */
  async delete(context={}) {
    const deleted = await this.item.deleteEmbeddedDocuments(this.documentName, [this.id], context);
    return deleted.shift();
  }

  /* -------------------------------------------- */

  /**
   * Present a Dialog form to confirm deletion of this PseudoDocument.
   * @param {object} [options]           Positioning and sizing options for the resulting dialog.
   * @returns {Promise<PseudoDocument>}  A Promise which resolves to the deleted PseudoDocument.
   */
  async deleteDialog(options={}) {
    const type = game.i18n.localize(this.metadata.title);
    return Dialog.confirm({
      title: `${game.i18n.format("DOCUMENT.Delete", { type })}: ${this.name || this.title}`,
      content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${game.i18n.format("SIDEBAR.DeleteWarning", {
        type
      })}</p>`,
      yes: this.delete.bind(this),
      options: options
    });
  }

  /* -------------------------------------------- */

  /**
   * Serialize salient information for this PseudoDocument when dragging it.
   * @returns {object}  An object of drag data.
   */
  toDragData() {
    const dragData = { type: this.documentName, data: this.toObject() };
    if (this.id) dragData.uuid = this.uuid;
    return dragData;
  }

  /* -------------------------------------------- */
  /*  Importing and Exporting                     */
  /* -------------------------------------------- */

  /**
   * Spawn a dialog for creating a new Activity.
   * @param {object} [data]  Data to pre-populate the Activity with.
   * @param {object} [context]
   * @param {Item5e} [context.parent]        A parent for the Activity.
   * @param {string[]|null} [context.types]  A list of types to restrict the choices to, or null for no restriction.
   * @returns {Promise<Item5e|null>}
   */
  static async createDialog(data={}, { parent=null, types=null, ...options }={}) {
    types ??= CONFIG[this.documentName].documentTypes;
    if ( !types.length ) return null;

    const label = game.i18n.localize(`DOCUMENT.DND5E.${this.documentName}`);
    const title = game.i18n.format("DOCUMENT.Create", { type: label });
    let type = data.type || CONFIG[this.documentName].defaultType;

    if ( !types.includes(type) ) type = types[0];
    const content = await renderTemplate("systems/dnd5e/templates/apps/document-create.hbs", {
      name, type,
      types: types.reduce((arr, type) => {
        const label = CONFIG[this.documentName].documentClasses[type]?.metadata?.title;
        arr.push({
          type,
          label: game.i18n.has(label) ? game.i18n.localize(label) : type,
          icon: CONFIG[this.documentName].documentClasses[type]?.metadata?.img
        });
        return arr;
      }, []).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
    });
    return Dialog.prompt({
      title, content,
      label: title,
      render: html => {
        const app = html.closest(".app");
        const folder = app.querySelector("select");
        if ( folder ) app.querySelector(".dialog-buttons").insertAdjacentElement("afterbegin", folder);
        app.querySelectorAll(".window-header .header-button").forEach(btn => {
          const label = btn.innerText;
          const icon = btn.querySelector("i");
          btn.innerHTML = icon.outerHTML;
          btn.dataset.tooltip = label;
          btn.setAttribute("aria-label", label);
        });
        app.querySelector(".document-name").select();
      },
      callback: html => {
        const form = html.querySelector("form");
        const fd = new FormDataExtended(form);
        const createData = foundry.utils.mergeObject(data, fd.object, { inplace: false });
        if ( !createData.name?.trim() ) delete createData.name;
        return this.create(createData, { parent, renderSheet: true });
      },
      rejectClose: false,
      options: { ...options, jQuery: false, width: 350, classes: ["dnd5e2", "create-document", "dialog"] }
    });
  }

  /* -------------------------------------------- */

  /**
   * Create a content link for this PseudoDocument.
   * @param {object} [options]                  Additional options to configure how the link is constructed.
   * @param {Record<string>} [options.attrs]    Attributes to set on the link.
   * @param {Record<string>} [options.dataset]  Custom data- attributes to set on the link.
   * @param {string[]} [options.classes]        Additional classes to add to the link. The `content-link` class is added
   *                                            by default.
   * @param {string} [options.name]             A name to use for the Document, if different from the Document's name.
   * @param {string} [options.icon]             A font-awesome icon class to use as the icon, if different to the
   *                                            Document's configured sidebarIcon.
   * @returns {HTMLAnchorElement}
   */
  toAnchor({ attrs={}, dataset={}, classes=[], name, icon }={}) {
    // Build dataset
    const documentConfig = CONFIG[this.documentName];
    const documentName = game.i18n.localize(`DOCUMENT.DND5E.${this.documentName}`);
    let anchorIcon = icon ?? documentConfig.sidebarIcon ?? "fas fa-suitcase";
    dataset = foundry.utils.mergeObject(
      {
        uuid: this.uuid,
        id: this.id,
        type: this.documentName,
        pack: this.pack,
        tooltip: documentName
      },
      dataset
    );

    // Construct Link
    const a = document.createElement("a");
    a.classList.add("content-link", ...classes);
    Object.entries(attrs).forEach(([k, v]) => a.setAttribute(k, v));
    for (const [k, v] of Object.entries(dataset)) {
      if (v !== null) a.dataset[k] = v;
    }
    a.innerHTML = `<i class="${anchorIcon}"></i>${name ?? this.name ?? this.title}`;
    return a;
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking on a content link for this document.
   * @param {MouseEvent} event  The triggering click event.
   * @returns {any}
   * @protected
   */
  _onClickDocumentLink(event) {
    return this.sheet.render(true);
  }
};
