import Dialog5e from "./api/dialog.mjs";

/**
 * System specific document creation dialog with support for icons and hints for each document type.
 */
export default class CreateDocumentDialog extends Dialog5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["create-document"],
    createData: {},
    createOptions: {},
    documentType: null,
    folders: null,
    form: {
      handler: CreateDocumentDialog.#handleFormSubmission
    },
    position: {
      width: 350
    },
    types: null
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/apps/document-create.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Name of type of document being created.
   * @type {string}
   */
  get documentName() {
    return this.options.documentType.documentName;
  }

  /* -------------------------------------------- */

  /**
   * Type of document being created.
   * @type {typeof Document|typeof PseudoDocument}
   */
  get documentType() {
    return this.options.documentType;
  }

  /* -------------------------------------------- */

  /**
   * The form was submitted.
   * @type {boolean}
   */
  #submitted = false;

  get submitted() {
    return this.#submitted;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContentContext(context, options) {
    const { pack, parent } = this.options.createOptions;

    let collection;
    if ( !parent ) {
      if ( pack ) collection = game.packs.get(pack);
      else collection = game.collections.get(this.documentName);
    }
    context.folders = this.options.folders ?? collection?._formatFolderSelectOptions() ?? [];
    context.hasFolders = !!context.folders.length;
    context.folders.unshift({ id: "", name: game.i18n.localize("DOCUMENT.Folder"), rule: true });

    context.name = this.options.createData.name;
    context.folder = this.options.createData.folder;

    context.types = [];
    context.hasTypes = false;
    let defaultType = this.options.createData.type
      ?? this.documentType.defaultType
      ?? CONFIG[this.documentName]?.defaultType;
    const TYPES = this.documentType._createDialogTypes?.(parent) ?? this.documentType.TYPES;
    if ( TYPES?.length > 1 ) {
      if ( this.options.types?.length === 0 ) throw new Error("The array of sub-types to restrict to must not be empty");

      for ( const type of TYPES ) {
        if ( type === CONST.BASE_DOCUMENT_TYPE ) continue;
        if ( this.options.types && !this.options.types.includes(type) ) continue;
        const typeData = { selected: type === defaultType, type };
        if ( this.documentType._createDialogData ) {
          Object.assign(typeData, this.documentType._createDialogData(type, parent));
        } else {
          const label = CONFIG[this.documentName]?.typeLabels?.[type];
          Object.assign(typeData, {
            icon: this.documentType.getDefaultArtwork?.({ type })?.img ?? this.documentType.DEFAULT_ICON,
            label: label && game.i18n.has(label) ? game.i18n.localize(label) : type
          });
        }
        context.types.push(typeData);
      }
      if ( !context.types.length ) throw new Error("No document types were permitted to be created");

      context.types.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
      context.hasTypes = true;

      // Some dialogs may restrict types, resulting in nothing pre-selected.
      if (!context.types.some(t => t.selected)) {
        context.types[0].selected = true;
        defaultType = context.types[0].type;
      }

      // Apply default name of documents.
      context.defaultName = this.documentType.defaultName({ type: defaultType, pack, parent });
    }

    return context;
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const folder = this.element.querySelector('[name="folder"]');
    if ( folder ) this.element.querySelector(".form-footer").prepend(folder);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);

    if (event.target.name === "type") {
      const name = this.element.querySelector('[name="name"]');
      const { pack, parent } = this.options.createOptions;
      name.placeholder = this.documentType.defaultName({ type: event.target.value, pack, parent });
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle submission of the dialog using the form buttons.
   * @this {CreateDocumentDialog}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
  static async #handleFormSubmission(event, form, formData) {
    if ( !form.checkValidity() ) throw new Error(game.i18n.format("DOCUMENT.DND5E.Warning.SelectType", {
      name: game.i18n.localize(this.documentType.metadata.label ?? `DOCUMENT.DND5E.${this.documentType.documentName}`)
    }));
    foundry.utils.mergeObject(this.options.createData, formData.object);
    this.#submitted = true;
    if ( CONFIG[this.documentName] ) CONFIG[this.documentName].defaultType = this.options.createData.type;
    else this.documentType.defaultType = this.options.createData.type;
    await this.close();
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Prompt user for document creation.
   * @param {typeof Document|typeof PseudoDocument} documentType  Type of document to be created.
   * @param {object} [data={}]                                    Document creation data.
   * @param {DatabaseCreateOperation} [createOptions={}]          Document creation options.
   * @param {object} [dialogOptions={}]                           Options forwarded to dialog.
   * @param {object} [dialogOptions.ok={}]                        Options for the OK button.
   * @returns {Promise<Document>}
   */
  static async prompt(documentType, data={}, { folders, types, ...createOptions }={}, { ok={}, ...config }={}) {
    const label = game.i18n.localize(documentType.metadata.label ?? `DOCUMENT.DND5E.${documentType.documentName}`);
    const title = game.i18n.format("DOCUMENT.Create", { type: label });

    foundry.utils.mergeObject(config, {
      createOptions, documentType, folders, types,
      createData: data,
      window: { title }
    });
    config.buttons ??= [];
    config.buttons.unshift(foundry.utils.mergeObject({
      action: "ok", label: title, icon: "fa-solid fa-check", default: true
    }, ok));

    const { promise, resolve } = Promise.withResolvers();
    const dialog = new this(config);
    dialog.addEventListener("close", event => {
      if ( !dialog.submitted ) return;
      const { createData, createOptions } = dialog.options;
      if ( !createData.folder ) delete createData.folder;
      if ( !createData.name?.trim() ) createData.name = documentType.defaultName?.({
        type: createData.type, parent: createOptions.parent, pack: createOptions.pack
      });
      // TODO: Temp patch until advancement data is migrated (https://github.com/foundryvtt/dnd5e/issues/5782)
      else if ( documentType.documentName === "Advancement" ) createData.title = createData.name;

      createOptions.renderSheet ??= true;
      if ( foundry.utils.isSubclass(documentType, foundry.abstract.Document) ) {
        resolve(documentType.create(createData, createOptions));
      } else {
        resolve(createOptions.parent[`create${documentType.documentName}`](createData.type, createData, createOptions));
      }
    });
    dialog.render({ force: true });
    return promise;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Handle migrating options for `createDialog` to the V13 API.
   * @param {object} createOptions
   * @param {object} dialogOptions
   */
  static migrateOptions(createOptions, dialogOptions) {
    const applicationOptions = {
      top: "position", left: "position", width: "position", height: "position", scale: "position", zIndex: "position",
      title: "window", id: "", classes: "", jQuery: ""
    };

    for ( const [k, v] of Object.entries(createOptions) ) {
      if ( k in applicationOptions ) {
        foundry.utils.logCompatibilityWarning("The ClientDocument.createDialog signature has changed. "
          + "It now accepts database operation options in its second parameter, "
          + "and options for DialogV2.prompt in its third parameter.", { since: 13, until: 15, once: true });
        const dialogOption = applicationOptions[k];
        if ( dialogOption ) foundry.utils.setProperty(dialogOptions, `${dialogOption}.${k}`, v);
        else dialogOptions[k] = v;
        delete createOptions[k];
      }
    }
  }
}
