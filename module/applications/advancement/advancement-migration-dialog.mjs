/**
 * Dialog to select which new advancements should be added to an item.
 */
export default class AdvancementMigrationDialog extends Dialog {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement-migration", "dialog"],
      jQuery: false,
      width: 500
    });
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the migration dialog.
   * @param {Item5e} item                    Item to which the advancements are being added.
   * @param {Advancement[]} advancements     New advancements that should be displayed in the prompt.
   * @returns {Promise<Advancement[]|null>}  Resolves with the advancements that should be added, if any.
   */
  static createDialog(item, advancements) {
    const advancementContext = advancements.map(a => ({
      id: a.id, icon: a.icon, title: a.title,
      summary: a.levels.length === 1 ? a.summaryForLevel(a.levels[0]) : ""
    }));
    return new Promise(async (resolve, reject) => {
      const dialog = new this({
        title: `${game.i18n.localize("DND5E.AdvancementMigrationTitle")}: ${item.name}`,
        content: await renderTemplate(
          "systems/dnd5e/templates/advancement/advancement-migration-dialog.hbs",
          { item, advancements: advancementContext }
        ),
        buttons: {
          continue: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("DND5E.AdvancementMigrationConfirm"),
            callback: html => resolve(advancements.filter(a => html.querySelector(`[name="${a.id}"]`)?.checked))
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("Cancel"),
            callback: html => reject(null)
          }
        },
        default: "continue",
        close: () => reject(null)
      });
      dialog.render(true);
    });
  }

}
