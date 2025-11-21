import Dialog5e from "../api/dialog.mjs";

const { NumberField, StringField } = foundry.data.fields;

/**
 * Dialog that allows setting the current date.
 */
export default class SetDateDialog extends Dialog5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    buttons: [{
      default: true,
      icon: "fa-regular fa-calendar-check",
      label: "Confirm",
      type: "submit"
    }],
    form: {
      handler: SetDateDialog.#onSubmitForm,
      closeOnSubmit: true
    },
    position: {
      width: 300
    },
    window: {
      title: "DND5E.CALENDAR.Action.SetDate"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/apps/set-date-dialog.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContentContext(context, options) {
    const { year, month, dayOfMonth } = game.time.components;
    context.fields = [
      {
        classes: "label-top",
        field: new NumberField({ integer: true }),
        label: game.i18n.localize("DND5E.CALENDAR.Component.Year"),
        name: "year",
        value: year + game.time.calendar.years.yearZero
      },
      {
        classes: "label-top",
        field: new NumberField({ required: true, blank: false }),
        label: game.i18n.localize("DND5E.CALENDAR.Component.Month"),
        name: "month",
        options: game.time.calendar.months.values
          .map(({ name }, value) => ({ value, label: game.i18n.localize(name) })),
        value: month
      },
      {
        classes: "label-top",
        field: new NumberField(),
        label: game.i18n.localize("DND5E.CALENDAR.Component.Day"),
        name: "day",
        value: dayOfMonth + 1
      }
    ];
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle form submission.
   * @this {SetDateDialog}
   * @param {SubmitEvent} event          Triggering submit event.
   * @param {HTMLFormElement} form       The form that was submitted.
   * @param {FormDataExtended} formData  Data from the submitted form.
   */
  static async #onSubmitForm(event, form, formData) {
    game.time.calendar.jumpToDate(formData.object);
  }
}
