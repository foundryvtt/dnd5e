import { getPluralRules } from "../../utils.mjs";
import Dialog5e from "../api/dialog.mjs";
import { createCheckboxInput } from "../fields.mjs";

const { BooleanField } = foundry.data.fields;

/**
 * Dialog presented post-quickstart to allow for running import actions.
 */
export default class AdventureQuickstartDialog extends Dialog5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    adventures: [],
    buttons: [{
      action: "launch",
      label: "DND5E.ADVENTURE.Action.Launch",
      icon: "fa-solid fa-play",
      default: true
    }],
    classes: ["adventure-quickstart"],
    form: {
      closeOnSubmit: true,
      handler: AdventureQuickstartDialog.#handleFormSubmission
    },
    position: {
      width: 420
    },
    window: {
      title: "DND5E.ADVENTURE.Action.Configure",
      icon: "fa-solid fa-compass"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContentContext(context, options) {
    await super._prepareContentContext(context, options);

    const importActions = {};
    for ( const adventure of this.options.adventures ) {
      for ( const action of adventure.importActions ) {
        if ( !action.quickstartHandler || (action.id in importActions) ) continue;
        importActions[action.id] = {
          field: new BooleanField(),
          input: createCheckboxInput,
          label: action.label,
          name: action.id,
          value: action.default
        };
      }
    }

    context.content = await foundry.applications.handlebars.renderTemplate(
      "systems/dnd5e/templates/shared/fields/formlist.hbs",
      { actions: { legend: "ADVENTURE.ImportHeaderOptions", fields: Object.values(importActions) } }
    );

    return context;
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Handle submission of the dialog.
   * @this {AdventureQuickstartDialog}
   * @param {SubmitEvent} event          The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   * @returns {Promise}
   */
  static async #handleFormSubmission(event, form, formData) {
    const button = this.element.querySelector('[data-action="launch"]');
    button.disabled = true;
    button.querySelector("i").className = "fa-solid fa-spinner fa-spin-pulse";

    const adventureImports = game.settings.get("core", "adventureImports");
    const importActions = {};
    for ( const adventure of this.options.adventures ) {
      for ( const action of adventure.importActions ) {
        if ( !(action.id in formData.object) ) continue;
        if ( formData.object[action.id] ) {
          importActions[action.id] ??= { adventures: [], handler: action.quickstartHandler };
          importActions[action.id].adventures.push({ adventure, config: action });
        }
        foundry.utils.setProperty(
          adventureImports[adventure.uuid].options, `actions.${action.id}`, formData.object[action.id]
        );
      }
    }

    for ( const { adventures, handler } of Object.values(importActions) ) await handler(adventures);
    await game.settings.set("core", "adventureImports", adventureImports);

    const pr = getPluralRules();
    ui.notifications.success(`DND5E.ADVENTURE.Finished.${pr.select(this.options.adventures.length)}`, {
      format: { adventure: this.options.adventures[0].name, number: this.options.adventures.length }
    });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Run during the setup hook to present post-quickstart dialogs for each quickstarted adventure.
   */
  static async handleQuickstart() {
    if ( !game.user.isGM ) return;

    let adventures = Object.entries(game.settings.get("core", "adventureImports"))
      .filter(([, { quickstart={} }]) => quickstart.quickstarted && !quickstart.postImport)
      .map(([uuid]) => fromUuid(uuid));
    if ( !adventures.length ) return;
    adventures = (await Promise.all(adventures)).filter(_ => _);

    try {
      const dialog = new AdventureQuickstartDialog({ adventures });
      const { promise, resolve } = Promise.withResolvers();
      dialog.addEventListener("close", () => resolve());
      dialog.render({ force: true });
      await promise;
    } finally {
      const adventureImports = game.settings.get("core", "adventureImports");
      adventures.forEach(a => adventureImports[a.uuid].quickstart.postImport = true);
      await game.settings.set("core", "adventureImports", adventureImports);
    }
  }
}
