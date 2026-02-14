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
   * @param {Item5e} item  Item to be deleted.
   * @returns {Promise<boolean|null>}  Resolves with whether advancements should be unapplied. Rejects with null.
   */
  static forDelete(item) {
    return this.createDialog(
      item,
      game.i18n.localize("DND5E.ADVANCEMENT.Deletion.Delete.Title"),
      game.i18n.localize("DND5E.ADVANCEMENT.Deletion.Delete.Message"),
      {
        icon: "fa-solid fa-trash",
        label: game.i18n.localize("Delete")
      }
    );
  }

  /* -------------------------------------------- */

  /**
   * A helper function that displays the dialog prompting for leveling down.
   * @param {Item5e} item  The class whose level is being changed.
   * @returns {Promise<boolean|null>}  Resolves with whether advancements should be unapplied. Rejects with null.
   */
  static forLevelDown(item) {
    return this.createDialog(
      item,
      game.i18n.localize("DND5E.ADVANCEMENT.Deletion.LevelDown.Title"),
      game.i18n.localize("DND5E.ADVANCEMENT.Deletion.LevelDown.Message"),
      {
        icon: "fa-solid fa-sort-numeric-down-alt",
        label: game.i18n.localize("DND5E.LevelActionDecrease")
      }
    );
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the confirmation dialog.
   * @param {Item5e} item              Item to be changed.
   * @param {string} title             Localized dialog title.
   * @param {string} message           Localized dialog message.
   * @param {object} continueButton    Object containing label and icon for the action button.
   * @returns {Promise<boolean|null>}  Resolves with whether advancements should be unapplied. Rejects with null.
   */
  static createDialog(item, title, message, continueButton) {
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
      dialog.render({ force: true });
    });
  }

}
