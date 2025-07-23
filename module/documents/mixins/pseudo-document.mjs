/**
 * A mixin which extends a DataModel to provide behavior shared between activities & advancements.
 * @template {DataModel} T
 * @param {typeof T} Base  The base DataModel to be mixed.
 * @returns {typeof PseudoDocument}
 * @mixin
 */
export default function PseudoDocumentMixin(Base) {
  class PseudoDocument extends Base {
    constructor(data, { parent=null, ...options }={}) {
      if ( parent instanceof Item ) parent = parent.system;
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
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    /**
     * Configuration information for PseudoDocuments.
     *
     * @typedef PseudoDocumentsMetadata
     * @property {string} name        Base type name of this PseudoDocument (e.g. "Activity", "Advancement").
     * @property {string} label       Localized name for this PseudoDocument type.
     */

    /**
     * Configuration information for PseudoDocuments.
     * @type {PseudoDocumentsMetadata}
     */
    get metadata() {
      return this.constructor.metadata;
    }

    /* -------------------------------------------- */

    /**
     * Configuration object that defines types.
     * @type {object}
     */
    static get documentConfig() {
      return CONFIG.DND5E[`${this.documentName.toLowerCase()}Types`];
    }

    get documentConfig() {
      return this.constructor.documentConfig;
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
     * Lazily obtain a Application instance used to configure this PseudoDocument, or null if no sheet is available.
     * @type {Application|ApplicationV2|null}
     */
    get sheet() {
      const cls = this.constructor.metadata.sheetClass ?? this.constructor.metadata.apps?.config;
      if ( !cls ) return null;
      if ( !this.constructor._sheets.has(this.uuid) ) {
        let sheet;
        if ( Application.isPrototypeOf(cls) ) sheet = new cls(this);
        else sheet = new cls({ document: this });
        this.constructor._sheets.set(this.uuid, sheet);
      }
      return this.constructor._sheets.get(this.uuid);
    }

    /* -------------------------------------------- */
    /*  Display Methods                             */
    /* -------------------------------------------- */

    /**
     * Render all the Application instances which are connected to this PseudoDocument.
     * @param {ApplicationRenderOptions} [options]  Rendering options.
     */
    render(options) {
      for ( const app of this.constructor._apps.get(this.uuid) ?? [] ) {
        app.render({ window: { title: app.title }, ...options });
      }
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
     * Update this PseudoDocument.
     * @param {object} updates             Updates to apply to this PseudoDocument.
     * @param {object} [options={}]        Additional context which customizes the update workflow.
     * @returns {Promise<PseudoDocument>}  This PseudoDocument after updates have been applied.
     */
    async update(updates, options={}) {
      const result = await this.item[`update${this.documentName}`](this.id, updates, options);
      this.render();
      return result;
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
     * @param {object} [options={}]        Additional context which customizes the deletion workflow.
     * @returns {Promise<PseudoDocument>}  The deleted PseudoDocument instance.
     */
    async delete(options={}) {
      return await this.item[`delete${this.documentName}`](this.id, options);
    }

    /* -------------------------------------------- */

    /**
     * Present a Dialog form to confirm deletion of this PseudoDocument.
     * @param {object} [options]           Positioning and sizing options for the resulting dialog.
     * @returns {Promise<PseudoDocument>}  A Promise which resolves to the deleted PseudoDocument.
     */
    async deleteDialog(options={}) {
      const type = game.i18n.localize(this.metadata.label);
      return foundry.applications.api.Dialog.confirm({
        window: { title: `${game.i18n.format("DOCUMENT.Delete", { type })}: ${this.name || this.title}` },
        content: `<p><strong>${game.i18n.localize("AreYouSure")}</strong> ${game.i18n.format("SIDEBAR.DeleteWarning", {
          type
        })}</p>`,
        yes: { callback: this.delete.bind(this) },
        ...options
      });
    }

    /* -------------------------------------------- */

    /**
     * Serialize salient information for this PseudoDocument when dragging it.
     * @returns {object}  An object of drag data.
     */
    toDragData() {
      const dragData = { type: this.documentName, data: this.toObject() };
      if ( this.id ) dragData.uuid = this.uuid;
      return dragData;
    }

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /**
     * Spawn a dialog for creating a new Activity.
     * @param {object} [data]  Data to pre-populate the Activity with.
     * @param {object} context
     * @param {Item5e} context.parent        A parent for the Activity.
     * @param {string[]|null} [context.types]  A list of types to restrict the choices to, or null for no restriction.
     * @returns {Promise<PseudoDocument|null>}
     */
    static async createDialog(data={}, { parent, types=null, ...options }={}) {
      types ??= this._createDialogTypes(parent);
      if ( !types.length || !parent ) return null;

      const label = game.i18n.localize(`DOCUMENT.DND5E.${this.documentName}`);
      const title = game.i18n.format("DOCUMENT.Create", { type: label });
      let type = data.type;

      if ( !types.includes(type) ) type = types[0];
      const content = await foundry.applications.handlebars.renderTemplate(
        "systems/dnd5e/templates/apps/document-create.hbs",
        {
          name, type,
          types: types.map(t => {
            const data = this._createDialogData(t, parent);
            data.svg = data.icon?.endsWith(".svg");
            return data;
          }).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
        }
      );
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
          if ( !form.checkValidity() ) {
            throw new Error(game.i18n.format("DOCUMENT.DND5E.Warning.SelectType", { name: label }));
          }
          const fd = new foundry.applications.ux.FormDataExtended(form);
          const createData = foundry.utils.mergeObject(data, fd.object, { inplace: false });
          if ( !createData.name?.trim() ) delete createData.name;
          // TODO: Temp patch until advancement data is migrated (https://github.com/foundryvtt/dnd5e/issues/5782)
          else if ( this.documentName === "Advancement" ) createData.title = createData.name;
          parent[`create${this.documentName}`](createData.type, createData);
        },
        rejectClose: false,
        options: { ...options, jQuery: false, width: 350, classes: ["dnd5e2", "create-document", "dialog"] }
      });
    }

    /* -------------------------------------------- */

    /**
     * Prepare the data needed for the creation dialog.
     * @param {string} type  Specific type of the PseudoDocument to prepare.
     * @param {Item5e} parent  Parent document within which this PseudoDocument will be created.
     * @returns {{ type: string, label: string, icon: string, [hint]: string, [disabled]: boolean }}
     * @protected
     */
    static _createDialogData(type, parent) {
      const label = this.documentConfig[type]?.documentClass?.metadata?.title;
      return {
        type,
        label: game.i18n.has(label) ? game.i18n.localize(label) : type,
        icon: this.documentConfig[type]?.documentClass?.metadata?.img
      };
    }

    /* -------------------------------------------- */

    /**
     * Prepare default list of types if none are specified.
     * @param {Item5e} parent  Parent document within which this PseudoDocument will be created.
     * @returns {string[]}
     * @protected
     */
    static _createDialogTypes(parent) {
      return Object.keys(this.documentConfig);
    }
  }
  return PseudoDocument;
}
