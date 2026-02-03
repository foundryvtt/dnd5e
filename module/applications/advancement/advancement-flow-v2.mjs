import Application5e from "../api/application.mjs";

/**
 * Base class for the advancement interface displayed by the advancement prompt that should be subclassed by
 * individual advancement types.
 */
export default class AdvancementFlow extends Application5e {
  constructor(options, advancementId, level, _options={}) {
    if ( options instanceof Item ) {
      foundry.utils.logCompatibilityWarning(
        "`AdvancementFlowV2` instances should be created with the advancement and level passed to the options object.",
        { since: "DnD5e 5.2", until: "DnD5e 5.4" }
      );
      options = { document: options.advancement?.get(advancementId), level, ..._options };
    }
    super(options);
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["advancement", "flow"],
    tag: "form",
    window: {
      frame: false,
      positioned: false
    },
    actions: {
      viewItem: AdvancementFlow.#viewItem
    },
    form: {
      handler: AdvancementFlow.#handleForm,
      submitOnChange: true
    },
    document: null,
    level: null
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {
      template: "systems/dnd5e/templates/advancement/advancement-flow-header.hbs"
    },
    content: {
      template: "systems/dnd5e/templates/advancement/advancement-flow-summary.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The Advancement object this flow modifies.
   * @type {Advancement|null}
   */
  get advancement() {
    return this.options.document ?? null;
  }

  /* -------------------------------------------- */

  /**
   * The item that houses the Advancement.
   * @type {Item5e}
   */
  get item() {
    return this.advancement.item;
  }

  /* -------------------------------------------- */

  /**
   * Level for which to configure this flow.
   * @type {number}
   */
  get level() {
    return this.options.level;
  }

  /* -------------------------------------------- */

  /**
   * The manager running this flow.
   * @type {AdvancementManager|void}
   */
  manager;

  /* -------------------------------------------- */

  /**
   * Data retained by the advancement manager during a reverse step. If restoring data using Advancement#restore,
   * this data should be used when displaying the flow's form.
   * @type {object|null}
   */
  retainedData = null;

  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    return this.advancement.title;
  }

  /* -------------------------------------------- */
  /*  Initialization                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    options.uniqueId = `actor-${options.document.item.id}-advancement-${options.document.id}-${options.level}`;
    return options;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    return {
      ...await super._prepareContext(options),
      advancement: this.advancement
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "content": return this._prepareContentContext(context, options);
      case "header": return this._prepareHeaderContext(context, options);
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the flow contents.
   * @param {Partial<ApplicationRenderContext>} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options            Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareContentContext(context, options) {
    context.summary = this.advancement.summaryForLevel(this.level);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the flow header.
   * @param {Partial<ApplicationRenderContext>} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options            Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareHeaderContext(context, options) {
    context.title = this.title;
    context.hint = this.advancement.hint;
    return context;
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    Object.assign(this.element.dataset, {
      id: this.advancement.id,
      level: this.level,
      type: this.advancement.constructor.typeName
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    if ( this.manager?.rendered ) this.manager?.setPosition();
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle clicking on an item to open its sheet.
   * @this {SubclassFlow}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #viewItem(event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    const item = await fromUuid(uuid);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Handle submission of the form.
   * @this {AdvancementFlow}
   * @param {Event} event                Triggering event.
   * @param {HTMLFormElement} form       Form being handled.
   * @param {FormDataExtended} formData  Data for the form.
   */
  static async #handleForm(event, form, formData) {
    await this._handleForm(event, form, formData);
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle submission of the form.
   * @param {Event} event                Triggering event.
   * @param {HTMLFormElement} form       Form being handled.
   * @param {FormDataExtended} formData  Data for the form.
   * @protected
   */
  async _handleForm(event, form, formData) {
    await this.advancement.apply(this.level, formData.object);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve automatic application data from the advancement, if supported.
   * @returns {Promise<object|false>}  Data to pass to the apply method, or `false` if user intervention required.
   */
  async getAutomaticApplicationValue() {
    return this.advancement.automaticApplicationValue(this.level);
  }

  /* -------------------------------------------- */

  /**
   * Set the retained data for this flow. This method gives the flow a chance to do any additional prep
   * work when the data is initially retained.
   * @param {object} data  Retained data associated with this flow.
   */
  async retainData(data) {
    this.retainedData = data;
  }
}
