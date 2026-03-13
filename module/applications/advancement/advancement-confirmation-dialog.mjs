import Dialog5e from "../api/dialog.mjs";

/**
 * Dialog to confirm the deletion of an embedded item with advancement or decreasing a class level.
 */
export default class AdvancementConfirmationDialog extends Dialog5e {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    actions: {
      cancel: AdvancementConfirmationDialog.#onComplete,
      complete: AdvancementConfirmationDialog.#onComplete
    },
    classes: ["advancement-deletion", "titlebar"],
    position: {
      width: 350
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/advancement/advancement-confirmation-dialog.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Result of the deletion dialog.
   * @type {boolean|null}
   */
  result = null;

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle clicking the migrate button.
   * @this {AdvancementConfirmationDialog}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #onComplete(event, target) {
    this.result = target.dataset.action === "cancel" ? null
      : this.element.querySelector('[name="apply-advancement"]').checked;
    this.close();
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * A helper function that displays the dialog prompting for an item deletion.
   * @param {Item5e} item                         Item to be deleted.
   * @param {object} [options={}]
   * @param {ApplicationV2} [options.sheet]       Sheet to render the dialog as a child of.
   * @returns {Promise<boolean|null>}  Resolves with whether advancements should be unapplied. Rejects with null.
   */
  static forDelete(item, { sheet }={}) {
    return this.createDialog({
      item, sheet,
      title: game.i18n.localize("DND5E.ADVANCEMENT.Deletion.Delete.Title"),
      message: game.i18n.localize("DND5E.ADVANCEMENT.Deletion.Delete.Message"),
      continueButton: {
        icon: "fa-solid fa-trash",
        label: game.i18n.localize("Delete")
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * A helper function that displays the dialog prompting for leveling down.
   * @param {Item5e} item                         The class whose level is being changed.
   * @param {object} [options={}]
   * @param {ApplicationV2} [options.sheet]       Sheet to render the dialog as a child of.
   * @returns {Promise<boolean|null>}  Resolves with whether advancements should be unapplied. Rejects with null.
   */
  static forLevelDown(item, { sheet }={}) {
    return this.createDialog({
      item, sheet,
      title: game.i18n.localize("DND5E.ADVANCEMENT.Deletion.LevelDown.Title"),
      message: game.i18n.localize("DND5E.ADVANCEMENT.Deletion.LevelDown.Message"),
      continueButton: {
        icon: "fa-solid fa-sort-numeric-down-alt",
        label: game.i18n.localize("DND5E.LevelActionDecrease")
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the confirmation dialog.
   * @param {object} config
   * @param {Item5e} config.item              Item to be changed.
   * @param {string} config.title             Localized dialog title.
   * @param {string} config.message           Localized dialog message.
   * @param {object} config.continueButton    Object containing label and icon for the action button.
   * @param {ApplicationV2} [config.sheet]    Sheet to render the dialog as a child of.
   * @returns {Promise<boolean|null>}  Resolves with whether advancements should be unapplied. Rejects with null.
   */
  static createDialog(config, _title, _message, _continueButton) {
    if ( config instanceof Item ) {
      foundry.utils.logCompatibilityWarning(
        "AdvancementConfirmationDialog.createDialog now takes a single config object rather than positional arguments.",
        { since: "DnD5e 5.3", until: "DnD5e 6.0" }
      );
      config = {
        item: config,
        title: _title,
        message: _message,
        continueButton: _continueButton
      };
    }
    const { item, title, message, continueButton, sheet } = config;
    return new Promise((resolve, reject) => {
      const dialog = new this({
        buttons: [
          foundry.utils.mergeObject(continueButton, {
            action: "complete",
            default: true,
            type: "button"
          }),
          {
            action: "cancel",
            icon: "fa-solid fa-times",
            label: game.i18n.localize("Cancel"),
            type: "button"
          }
        ],
        content: message,
        window: {
          title: `${title}: ${item.name}`
        }
      });
      dialog.addEventListener("close", () =>
        dialog.result === null ? reject(null) : resolve(dialog.result), { once: true });
      if ( sheet ) sheet._renderChild(dialog);
      else dialog.render({ force: true });
    });
  }

}
