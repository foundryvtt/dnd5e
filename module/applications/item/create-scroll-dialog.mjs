import Dialog5e from "../api/dialog.mjs";

const { NumberField, StringField } = foundry.data.fields;

/**
 * Application for configuration spell scroll creation.
 */
export default class CreateScrollDialog extends Dialog5e {
  constructor(options={}) {
    super(options);
    this.#config = options.config;
    this.#spell = options.spell;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["create-scroll"],
    window: {
      title: "DND5E.Scroll.CreateScroll",
      icon: "fa-solid fa-scroll"
    },
    form: {
      handler: CreateScrollDialog.#handleFormSubmission
    },
    position: {
      width: 420
    },
    buttons: [{
      action: "create",
      label: "DND5E.Scroll.CreateScroll",
      icon: "fa-solid fa-check",
      default: true
    }],
    config: null,
    spell: null
  };

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/apps/spell-scroll-dialog.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Configuration options for scroll creation.
   * @type {SpellScrollConfiguration}
   */
  #config;

  get config() {
    return this.#config;
  }

  /* -------------------------------------------- */

  /**
   * Spell from which the scroll will be created.
   * @type {Item5e|object}
   */
  #spell;

  get spell() {
    return this.#spell;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the content section.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareContentContext(context, options) {
    context.anchor = this.spell instanceof Item ? this.spell.toAnchor().outerHTML : `<span>${this.spell.name}</span>`;
    context.config = this.config;
    context.fields = [{
      field: new StringField({
        required: true, blank: false,
        label: game.i18n.localize("DND5E.Scroll.Explanation.Label"),
        hint: game.i18n.localize("DND5E.Scroll.Explanation.Hint")
      }),
      name: "explanation",
      options: [
        { value: "full", label: game.i18n.localize("DND5E.Scroll.Explanation.Complete") },
        { value: "reference", label: game.i18n.localize("DND5E.Scroll.Explanation.Reference") },
        { value: "none", label: game.i18n.localize("DND5E.None") }
      ],
      value: this.config.explanation ?? "reference"
    }, {
      field: new NumberField({ label: game.i18n.localize("DND5E.SpellLevel") }),
      name: "level",
      options: Object.entries(CONFIG.DND5E.spellLevels)
        .map(([value, label]) => ({ value, label }))
        .filter(l => Number(l.value) >= this.spell.system.level),
      value: this.config.level ?? this.spell.system.level
    }];
    context.values = {
      bonus: new NumberField({ label: game.i18n.localize("DND5E.BonusAttack") }),
      dc: new NumberField({ label: game.i18n.localize("DND5E.Scroll.SaveDC") })
    };
    context.valuePlaceholders = {};
    for ( const level of Array.fromRange(this.config.level + 1).reverse() ) {
      context.valuePlaceholders = CONFIG.DND5E.spellScrollValues[level];
      if ( context.valuePlaceholders ) break;
    }
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle submission of the dialog using the form buttons.
   * @this {CreateScrollDialog}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
  static async #handleFormSubmission(event, form, formData) {
    foundry.utils.mergeObject(this.#config, formData.object);
    this.#config.level = Number(this.#config.level);
    await this.close({ dnd5e: { submitted: true } });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    const formData = new foundry.applications.ux.FormDataExtended(this.form);
    foundry.utils.mergeObject(this.#config, formData.object);
    this.#config.level = Number(this.#config.level);
    this.render({ parts: ["content"] });
  }

  /* -------------------------------------------- */

  /** @override */
  _onClose(options={}) {
    if ( !options.dnd5e?.submitted ) this.#config = null;
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Display the create spell scroll dialog.
   * @param {Item5e|object} spell              The spell or item data to be made into a scroll.
   * @param {SpellScrollConfiguration} config  Configuration options for scroll creation.
   * @param {object} [options={}]              Additional options for the application.
   * @returns {Promise<object|null>}           Form data object with results of the dialog.
   */
  static async create(spell, config, options={}) {
    return new Promise(resolve => {
      const dialog = new this({ spell, config, ...options });
      dialog.addEventListener("close", event => resolve(dialog.config), { once: true });
      dialog.render({ force: true });
    });
  }
}
