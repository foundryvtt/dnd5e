export class DeleteConfirmationDialog extends Dialog {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/delete-confirmation-dialog.html",
      jQuery: false
    });
  }

  /* -------------------------------------------- */

  static createDialog(item, context={}) {
    return new Promise((resolve, reject) => {
      const dialog = new this({
        title: `${game.i18n.localize("DND5E.AdvancementDeleteConfirmationTitle")}: ${item.name}`,
        buttons: {
          delete: {
            icon: '<i class="fas fa-trash"></i>',
            label: game.i18n.localize("Delete"),
            callback: html => {
              const checkbox = html.querySelector('input[name="apply-advancement"]');
              context.skipAdvancement = !checkbox.checked;
              resolve(context);
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
