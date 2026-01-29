import Dialog5e from "../../applications/api/dialog.mjs";

const { StringField } = foundry.data.fields;

/**
 * A dialog for resolving bastion attacks.
 */
export default class BastionAttackDialog extends Dialog5e {
  constructor({ actor, ...options }={}) {
    super(options);
    this.#actor = actor;
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["bastion-attack"],
    window: {
      title: "DND5E.Bastion.Attack.Title",
      icon: "fas fa-chess-rook"
    },
    form: {
      handler: BastionAttackDialog.#handleFormSubmission
    },
    position: {
      width: 420
    },
    buttons: [{
      action: "resolve",
      label: "DND5E.Bastion.Attack.Resolve",
      icon: "fas fa-dice",
      default: true
    }]
  };

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/apps/bastion-attack-dialog.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The Actor whose bastion is being attacked.
   * @type {Actor5e}
   */
  #actor;

  /* -------------------------------------------- */

  /**
   * The bastion attack formula.
   * @type {string|null}
   */
  get formula() {
    return this.#formula;
  }

  #formula = null;

  /* -------------------------------------------- */

  /** @override */
  get subtitle() {
    return this.#actor.name;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContentContext(context, options) {
    context = await super._prepareContentContext(context, options);
    context.formula = {
      field: new StringField({ initial: "", label: "DND5E.Formula" }),
      name: "formula"
    };
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Handle submission of the dialog.
   * @this {BastionAttackDialog}
   * @param {SubmitEvent} event          The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   * @returns {Promise}
   */
  static #handleFormSubmission(event, form, formData) {
    this.#formula = formData.object.formula;
    return this.close({ dnd5e: { submitted: true } });
  }

  /* -------------------------------------------- */

  /** @override */
  _onClose(options={}) {
    if ( !options.dnd5e?.submitted ) this.#formula = null;
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Create the bastion attack prompt.
   * @param {Actor5e} actor      The Actor whose bastion is being attacked.
   * @returns {Promise<string>}  A promise that resolves to the input bastion attack formula.
   */
  static prompt(actor) {
    return new Promise(resolve => {
      const dialog = new this({ actor });
      dialog.addEventListener("close", () => resolve(dialog.formula), { once: true });
      dialog.render({ force: true });
    });
  }
}
