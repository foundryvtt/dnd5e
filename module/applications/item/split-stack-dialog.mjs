import Dialog5e from "../api/dialog.mjs";

/**
 * Small dialog for splitting a stack of items into two.
 */
export default class SplitStackDialog extends Dialog5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    buttons: [{
      id: "split",
      label: "DND5E.SplitStack.Action",
      icon: "fa-solid fa-arrows-split-up-and-left"
    }],
    classes: ["split-stack"],
    document: null,
    form: {
      handler: SplitStackDialog.#handleFormSubmission
    },
    position: {
      width: 400
    },
    window: {
      title: "DND5E.SplitStack.Title"
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/apps/split-stack-dialog.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContentContext(context, options) {
    const total = this.options.document.system.quantity ?? 1;
    context.max = Math.max(1, total - 1);
    context.left = Math.ceil(total / 2);
    context.right = total - context.left;
    return context;
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Handle submission of the dialog.
   * @this {SplitStackDialog}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
  static async #handleFormSubmission(event, form, formData) {
    const right = formData.object.right ?? 0;
    const left = (this.options.document.system.quantity ?? 1) - right;
    if ( left === this.options.document.system.quantity ) return;
    await this.options.document.update({ "system.quantity": left }, { render: false });
    await this.options.document.clone({ "system.quantity": right }, { addSource: true, save: true });
    this.close();
  }
}
