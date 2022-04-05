/**
 * Dialog to confirm the deletion of an embedded item with advancement.
 * @extends {Dialog}
 */
export class DeleteConfirmationDialog extends Dialog {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/delete-confirmation-dialog.html",
      jQuery: false
    });
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the delete confirmation dialog.
   * @param {Item5e} item              Item to be deleted.
   * @returns {Promise<boolean|null>}  Resolves with whether advancements should be unapplied. Rejects with null.
   */
  static createDialog(item) {
    return new Promise((resolve, reject) => {
      const dialog = new this({
        title: `${game.i18n.localize("DND5E.AdvancementDeleteConfirmationTitle")}: ${item.name}`,
        buttons: {
          delete: {
            icon: '<i class="fas fa-trash"></i>',
            label: game.i18n.localize("Delete"),
            callback: html => {
              const checkbox = html.querySelector('input[name="apply-advancement"]');
              resolve(checkbox.checked);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("Cancel"),
            callback: html => reject(null)
          }
        },
        default: "delete",
        close: () => reject(null)
      });
      dialog.render(true);
    });
  }

}
