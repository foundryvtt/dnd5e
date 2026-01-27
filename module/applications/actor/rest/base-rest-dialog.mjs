import { convertTime, filteredKeys } from "../../../utils.mjs";
import Dialog5e from "../../api/dialog.mjs";

const { BooleanField, NumberField, StringField } = foundry.data.fields;

/**
 * @import { RestConfiguration } from "../../../documents/_types.mjs";
 */

/**
 * Dialog with shared resting functionality.
 */
export default class BaseRestDialog extends Dialog5e {
  constructor(options={}) {
    super(options);
    this.actor = options.document;
    this.#config = options.config;
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      setDurationSunrise: BaseRestDialog.#onSetDurationSunrise
    },
    classes: ["rest"],
    config: null,
    document: null,
    form: {
      handler: BaseRestDialog.#handleFormSubmission
    },
    position: {
      width: 380
    },
    templates: ["systems/dnd5e/templates/actors/rest/rest-request.hbs"]
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The actor being rested.
   * @type {Actor5e}
   */
  actor;

  /* -------------------------------------------- */

  /**
   * The rest configuration.
   * @type {RestConfiguration}
   */
  #config;

  get config() {
    return this.#config;
  }

  /* -------------------------------------------- */

  /**
   * Duration of the rest in minutes.
   * @type {number}
   */
  get duration() {
    return this.config.duration ?? CONFIG.DND5E.restTypes[this.config.type]
      ?.duration?.[game.settings.get("dnd5e", "restVariant")] ?? 0;
  }

  /* -------------------------------------------- */

  /**
   * Is the resting actor a party?
   * @type {boolean}
   */
  get isPartyGroup() {
    return this.actor.type === "group";
  }

  /* -------------------------------------------- */

  /**
   * Should the user be prompted as to whether a new day has occurred?
   * @type {boolean}
   */
  get promptNewDay() {
    // Only prompt if rest is longer than 10 minutes and less than 24 hours
    return (this.duration > 10) && (this.duration < 1440);
  }

  /* -------------------------------------------- */

  /**
   * Was the rest button pressed?
   * @type {boolean}
   */
  #rested = false;

  get rested() {
    return this.#rested;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = {
      ...await super._prepareContext(options),
      actor: this.actor,
      config: this.config,
      fields: [],
      hitPoints: [],
      result: this.result,
      hd: this.actor.system.attributes?.hd,
      hp: this.actor.system.attributes?.hp,
      isGroup: this.isPartyGroup,
      variant: game.settings.get("dnd5e", "restVariant")
    };
    if ( this.promptNewDay ) context.fields.push({
      disabled: !!this.config.request,
      field: new BooleanField({
        label: game.i18n.localize("DND5E.REST.NewDay.Label"),
        hint: game.i18n.localize("DND5E.REST.NewDay.Hint")
      }),
      input: context.inputs.createCheckboxInput,
      name: "newDay",
      value: context.config.newDay
    });

    if ( context.isGroup && game.settings.get("dnd5e", "calendarConfig").enabled ) {
      const duration = convertTime(this.duration, "minute", { strict: false });
      context.duration = {
        fields: [
          {
            field: new NumberField({ min: 0 }),
            name: "duration.value",
            value: duration.value
          },
          {
            field: new StringField({ required: true, blank: false }),
            name: "duration.unit",
            options: Object.entries(CONFIG.DND5E.timeUnits)
              .filter(([, c]) => !c.combat)
              .map(([value, { label }]) => ({ value, label })),
            value: duration.unit
          }
        ],
        showSunriseButton: "sunrise" in game.time.calendar
      };
    }

    const rest = CONFIG.DND5E.restTypes[this.config.type];
    if ( "recoverTemp" in rest ) context.hitPoints.push({
      disabled: !!this.config.request,
      field: new BooleanField({
        label: game.i18n.localize("DND5E.REST.RecoverTempHP.Label")
      }),
      input: context.inputs.createCheckboxInput,
      name: "recoverTemp",
      value: context.config.recoverTemp
    });
    if ( "recoverTempMax" in rest ) context.hitPoints.push({
      disabled: !!this.config.request,
      field: new BooleanField({
        label: game.i18n.localize("DND5E.REST.RecoverTempMaxHP.Label"),
        hint: game.i18n.localize("DND5E.REST.RecoverTempMaxHP.Hint")
      }),
      input: context.inputs.createCheckboxInput,
      name: "recoverTempMax",
      value: context.config.recoverTempMax
    });

    if ( this.isPartyGroup ) {
      const restSettings = this.actor.getFlag("dnd5e", "restSettings") ?? {};
      context.request = [
        {
          field: new BooleanField({
            label: game.i18n.localize("DND5E.REST.Request.AutoRest.Label"),
            hint: game.i18n.localize("DND5E.REST.Request.AutoRest.Hint")
          }),
          name: "autoRest",
          input: context.inputs.createCheckboxInput,
          value: restSettings.autoRest
        },
        ...this.actor.system.members
          .filter(m => ["character", "npc"].includes(m.actor?.type))
          .map(m => ({
            field: new BooleanField({
              label: m.actor.name
            }),
            name: `targets.${m.actor.id}`,
            input: context.inputs.createCheckboxInput,
            value: restSettings.targets ? restSettings.targets?.has(m.actor.id) : true
          }))
      ];
    }

    context.showFields = context.fields.length || !!context.duration;

    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle submission of the dialog using the form buttons.
   * @this {BaseRestDialog}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
  static async #handleFormSubmission(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    if ( this.isPartyGroup ) {
      data.targets = filteredKeys(data.targets ?? {});
      this.actor.setFlag("dnd5e", "restSettings", data);
    }
    if ( foundry.utils.getType(data.duration) === "Object" ) {
      data.duration = convertTime(data.duration.value, data.duration.unit, { strict: false, to: "minute" }).value;
    }
    foundry.utils.mergeObject(this.config, data);
    this.#rested = true;
    await this.close();
  }

  /* -------------------------------------------- */

  /**
   * Handle setting the rest duration to end at the next sunrise.
   * @this {BaseRestDialog}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #onSetDurationSunrise(event, target) {
    const sunrise = Math.round(game.time.calendar.sunrise());
    const now = game.time.components.hour;
    const hoursUntilSunrise = sunrise - now + (now > sunrise ? game.time.calendar.days.hoursPerDay : 0);
    this.element.querySelector('[name="duration.value"]').value = hoursUntilSunrise;
    this.element.querySelector('[name="duration.unit"]').value = "hour";
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * A helper to handle displaying and responding to the dialog.
   * @param {Actor5e} actor              The actor that is resting.
   * @param {RestConfiguration}  config  Configuration information for the rest.
   * @returns {Promise<RestConfiguration>}
   */
  static async configure(actor, config) {
    return new Promise((resolve, reject) => {
      const app = new this({
        config,
        buttons: [
          {
            default: true,
            icon: "fa-solid fa-bed",
            label: game.i18n.localize("DND5E.REST.Label"),
            name: "rest",
            type: "submit"
          }
        ],
        document: actor
      });
      app.addEventListener("close", () => app.rested ? resolve(app.config) : reject(), { once: true });
      app.render({ force: true });
    });
  }
}
