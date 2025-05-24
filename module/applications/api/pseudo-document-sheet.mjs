import Application5e from "../api/application.mjs";

/**
 * Default sheet for activities.
 */
export default class PseudoDocumentSheet extends Application5e {
  constructor(options={}) {
    super(options);
    this.#documentId = options.document.id;
    this.#documentType = options.document.metadata.name;
    this.#item = options.document.item;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["pseudo-document", "sheet", "standard-form"],
    tag: "form",
    document: null,
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED,
    editPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    actions: {
      copyUuid: { handler: PseudoDocumentSheet.#onCopyUuid, buttons: [0, 2] }
    },
    form: {
      handler: PseudoDocumentSheet.#onSubmitForm,
      submitOnChange: true
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The PseudoDocument associated with this application.
   * @type {PseudoDocument}
   */
  get document() {
    return this.item.getEmbeddedDocument(this.#documentType, this.#documentId);
  }

  /**
   * ID of this PseudoDocument on the parent item.
   * @type {string}
   */
  #documentId;

  /**
   * Collection representing this PseudoDocument.
   * @type {string}
   */
  #documentType;

  /* -------------------------------------------- */

  /**
   * Is this PseudoDocument sheet visible to the current user?
   * @type {boolean}
   */
  get isVisible() {
    return this.item.testUserPermission(game.user, this.options.viewPermission);
  }

  /* -------------------------------------------- */

  /**
   * Is this PseudoDocument sheet editable by the current User?
   * This is governed by the editPermission threshold configured for the class.
   * @type {boolean}
   */
  get isEditable() {
    if ( game.packs.get(this.item.pack)?.locked ) return false;
    return this.item.testUserPermission(game.user, this.options.editPermission);
  }

  /* -------------------------------------------- */

  /**
   * Parent item to which this PseudoDocument belongs.
   * @type {Item5e}
   */
  #item;

  get item() {
    return this.#item;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    return {
      ...await super._prepareContext(options),
      document: this.document,
      editable: this.isEditable,
      options: this.options
    };
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @override */
  _canRender(options) {
    if ( !this.isVisible ) throw new Error(game.i18n.format("SHEETS.DocumentSheetPrivate", {
      type: game.i18n.localize(this.document.metadata.label)
    }));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.document.constructor._registerApp(this.document, this);
    this.item.apps[this.id] = this;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    if ( !this.isEditable ) this._disableFields();
  }

  /* -------------------------------------------- */

  /** @override */
  _onClose(_options) {
    this.document?.constructor._unregisterApp(this.document, this);
    delete this.item.apps[this.id];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";

    // Add document ID copy
    const copyLabel = game.i18n.localize("SHEETS.CopyUuid");
    const copyId = `<button type="button" class="header-control fa-solid fa-passport icon" data-action="copyUuid"
                            data-tooltip aria-label="${copyLabel}"></button>`;
    this.window.close.insertAdjacentHTML("beforebegin", copyId);

    return frame;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle click events to copy the UUID of this document to clipboard.
   * @this {PseudoDocumentSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   * @this {PseudoDocumentSheet}
   */
  static #onCopyUuid(event, target) {
    event.preventDefault();
    event.stopPropagation();
    if ( event.detail > 1 ) return;
    const id = event.button === 2 ? this.document.id : this.document.uuid;
    const type = event.button === 2 ? "id" : "uuid";
    const label = game.i18n.localize(this.document.metadata.label);
    game.clipboard.copyPlainText(id);
    ui.notifications.info(game.i18n.format("DOCUMENT.IdCopiedClipboard", { label, type, id }));
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Handle form submission.
   * @param {SubmitEvent} event          Triggering submit event.
   * @param {HTMLFormElement} form       The form that was submitted.
   * @param {FormDataExtended} formData  Data from the submitted form.
   */
  static async #onSubmitForm(event, form, formData) {
    const submitData = this._prepareSubmitData(event, formData);
    await this._processSubmitData(event, submitData);
  }

  /* -------------------------------------------- */

  /**
   * Perform any pre-processing of the form data to prepare it for updating.
   * @param {SubmitEvent} event          Triggering submit event.
   * @param {FormDataExtended} formData  Data from the submitted form.
   * @returns {object}
   */
  _prepareSubmitData(event, formData) {
    const submitData = foundry.utils.expandObject(formData.object);
    // Workaround for https://github.com/foundryvtt/foundryvtt/issues/11610
    this.element.querySelectorAll("fieldset legend :is(input, select, dnd5e-checkbox)").forEach(input => {
      foundry.utils.setProperty(submitData, input.name, input.value);
    });
    return submitData;
  }

  /* -------------------------------------------- */

  /**
   * Handle updating the PseudoDocument based on processed submit data.
   * @param {SubmitEvent} event  Triggering submit event.
   * @param {object} submitData  Prepared object for updating.
   */
  async _processSubmitData(event, submitData) {
    await this.document.update(submitData);
  }

  /* -------------------------------------------- */

  /**
   * Programmatically submit a PseudoDocumentSheet instance, providing additional data to be merged with form data.
   * @param {object} options
   * @param {object} [options.updateData]  Additional data merged with processed form data.
   */
  async submit({ updateData={} }={}) {
    if ( !this.options.form?.handler ) throw new Error(
      `The ${this.constructor.name} PseudoDocumentSheet does not support a single top-level form element.`
    );
    const event = new Event("submit", { cancelable: true });
    const formData = new foundry.applications.ux.FormDataExtended(this.element);
    const submitData = await this._prepareSubmitData(event, formData);
    foundry.utils.mergeObject(submitData, updateData, { inplace: true });
    await this._processSubmitData(event, submitData);
  }
}
