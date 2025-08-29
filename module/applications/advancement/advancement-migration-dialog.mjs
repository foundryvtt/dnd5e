import Dialog5e from "../api/dialog.mjs";

/**
 * Dialog to select which new advancements should be added to an item.
 */
export default class AdvancementMigrationDialog extends Dialog5e {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["advancement-migration"],
    actions: {
      complete: AdvancementMigrationDialog.#onComplete
    },
    advancements: [],
    position: {
      width: 500
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Result of the migration dialog.
   * @type {Advancement[]|null}
   */
  result = null;

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle clicking the migrate button.
   * @this {AdvancementMigrationDialog}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #onComplete(event, target) {
    const formData = new foundry.applications.ux.FormDataExtended(this.element.querySelector("form"));
    this.result = this.options.advancements.filter(a => formData.object[a.id]);
    this.close();
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the migration dialog.
   * @param {Item5e} item                    Item to which the advancements are being added.
   * @param {Advancement[]} advancements     New advancements that should be displayed in the prompt.
   * @returns {Promise<Advancement[]>}       Resolves with the advancements that should be added, if any.
   * @throws
   */
  static async createDialog(item, advancements) {
    const advancementContext = advancements.map(a => ({
      id: a.id, icon: a.icon, svg: a.icon?.endsWith(".svg"), title: a.title,
      summary: a.levels.length === 1 ? a.summaryForLevel(a.levels[0]) : ""
    }));
    const { promise, resolve, reject } = Promise.withResolvers();
    const dialog = new this({
      advancements,
      buttons: [
        {
          action: "complete",
          default: true,
          icon: "fa-solid fa-check",
          label: game.i18n.localize("DND5E.ADVANCEMENT.Migration.Action.Confirm")
        }
      ],
      content: await foundry.applications.handlebars.renderTemplate(
        "systems/dnd5e/templates/advancement/advancement-migration-dialog.hbs",
        { item, advancements: advancementContext }
      ),
      rejectClose: false,
      window: {
        title: game.i18n.localize("DND5E.ADVANCEMENT.Migration.Title"),
        subtitle: item.name
      }
    });
    dialog.addEventListener("close", () => dialog.result ? resolve(dialog.result) : reject(null), { once: true });
    dialog.render({ force: true });
    return promise;
  }

}
