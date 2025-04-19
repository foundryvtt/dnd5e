import Dialog5e from "../../api/dialog.mjs";

const { BooleanField } = foundry.data.fields;

/**
 * Dialog with shared resting functionality.
 */
export default class BaseRestDialog extends Dialog5e {
  constructor(options={}) {
    super(options);
    this.actor = options.document;
    this.#config = options.config;
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["rest"],
    config: null,
    document: null,
    form: {
      handler: BaseRestDialog.#handleFormSubmission
    },
    position: {
      width: 380
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The actor being rested.
   * @type {Actor5e}
   */
  actor;

  /* -------------------------------------------- */

  /**
   * The rest configuration.
   * @type {RestConfiguration}
   */
  #config;

  get config() {
    return this.#config;
  }

  /* -------------------------------------------- */

  /**
   * Should the user be prompted as to whether a new day has occurred?
   * @type {boolean}
   */
  get promptNewDay() {
    const duration = CONFIG.DND5E.restTypes[this.config.type]
      ?.duration?.[game.settings.get("dnd5e", "restVariant")] ?? 0;
    // Only prompt if rest is longer than 10 minutes and less than 24 hours
    return (duration > 10) && (duration < 1440);
  }

  /* -------------------------------------------- */

  /**
   * Was the rest button pressed?
   * @type {boolean}
   */
  #rested = false;

  get rested() {
    return this.#rested;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = {
      ...await super._prepareContext(options),
      actor: this.actor,
      config: this.config,
      fields: [],
      result: this.result,
      hd: this.actor.system.attributes?.hd,
      hp: this.actor.system.attributes?.hp,
      isGroup: this.actor.type === "group",
      variant: game.settings.get("dnd5e", "restVariant")
    };
    if ( this.promptNewDay ) context.fields.push({
      field: new BooleanField({
        label: game.i18n.localize("DND5E.REST.NewDay.Label"),
        hint: game.i18n.localize("DND5E.REST.NewDay.Hint")
      }),
      input: context.inputs.createCheckboxInput,
      name: "newDay",
      value: context.config.newDay
    });
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle submission of the dialog using the form buttons.
   * @this {BaseRestDialog}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
  static async #handleFormSubmission(event, form, formData) {
    foundry.utils.mergeObject(this.config, formData.object);
    this.#rested = true;
    await this.close();
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * A helper to handle displaying and responding to the dialog.
   * @param {Actor5e} actor              The actor that is resting.
   * @param {RestConfiguration}  config  Configuration information for the rest.
   * @returns {Promise<RestConfiguration>}
   */
  static async configure(actor, config) {
    return new Promise((resolve, reject) => {
      const app = new this({
        config,
        buttons: [
          {
            default: true,
            icon: "fa-solid fa-bed",
            label: game.i18n.localize("DND5E.REST.Label"),
            name: "rest",
            type: "submit"
          }
        ],
        document: actor
      });
      app.addEventListener("close", () => app.rested ? resolve(app.config) : reject(), { once: true });
      app.render({ force: true });
    });
  }
}
