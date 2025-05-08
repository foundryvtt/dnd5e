import CalendarData5e from "../../data/calendar/calendar-data.mjs";
import { formatTime } from "../../utils.mjs";
import BaseCalendarHUD from "./base-calendar-hud.mjs";

/**
 * @typedef CalendarHUDButton
 * @property {object} dataset
 * @property {Function} display
 * @property {string} label
 * @property {string} icon
 */

/**
 * Application for showing a date and time interface on the screen.
 */
export default class CalendarHUD extends BaseCalendarHUD {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    actions: {
      openCharacterSheet: CalendarHUD.#openCharacterSheet,
      openPartySheet: CalendarHUD.#openPartySheet
    },
    classes: ["faded-ui", "ui-control"]
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    startButtons: {
      classes: ["calendar-buttons"],
      template: "systems/dnd5e/templates/apps/calendar-buttons.hbs"
    },
    core: {
      classes: ["calendar-core"],
      template: "systems/dnd5e/templates/apps/calendar-core.hbs"
    },
    endButtons: {
      classes: ["calendar-buttons"],
      template: "systems/dnd5e/templates/apps/calendar-buttons.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    this._prepareButtonsContext(context, options);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the buttons that can be displayed around the calendar UI.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   */
  async _prepareButtonsContext(context, options) {
    const config = game.settings.get("dnd5e", "calendarConfig");

    context.startButtons = [
      {
        dataset: {
          action: "advanceTime",
          amount: "reverseShort"
        },
        display: game.user.isGM,
        label: game.i18n.format("DND5E.CALENDAR.Action.ReverseTime", {
          amount: formatTime(config.buttons.reverseShort.value, config.buttons.reverseShort.units).titleCase()
        }),
        icon: "fa-solid fa-angle-left"
      },
      {
        dataset: {
          action: "advanceTime",
          amount: "reverseFar"
        },
        display: game.user.isGM,
        label: game.i18n.format("DND5E.CALENDAR.Action.ReverseTime", {
          amount: formatTime(config.buttons.reverseFar.value, config.buttons.reverseFar.units).titleCase()
        }),
        icon: "fa-solid fa-angles-left"
      },
      {
        dataset: {
          action: "openCharacterSheet"
        },
        display: !!game.user.character,
        label: game.i18n.localize("DND5E.CALENDAR.Action.OpenCharacterSheet"),
        icon: "fa-solid fa-user"
      }
    ];

    context.endButtons = [
      {
        dataset: {
          action: "advanceTime",
          amount: "advanceShort"
        },
        display: game.user.isGM,
        label: game.i18n.format("DND5E.CALENDAR.Action.AdvanceTime", {
          amount: formatTime(config.buttons.advanceShort.value, config.buttons.advanceShort.units).titleCase()
        }),
        icon: "fa-solid fa-angle-right"
      },
      {
        dataset: {
          action: "advanceTime",
          amount: "advanceFar"
        },
        display: game.user.isGM,
        label: game.i18n.format("DND5E.CALENDAR.Action.AdvanceTime", {
          amount: formatTime(config.buttons.advanceFar.value, config.buttons.advanceFar.units).titleCase()
        }),
        icon: "fa-solid fa-angles-right"
      },
      {
        dataset: {
          action: "openPartySheet"
        },
        // TODO: Verify permission on group actor
        display: !!game.settings.get("dnd5e", "primaryParty")?.actor,
        label: game.i18n.localize("DND5E.CALENDAR.Action.OpenPartySheet"),
        icon: "fa-solid fa-users"
      }
    ];

    /**
     * A hook event that fires when preparing the buttons displayed around the calendar HUD. Buttons in each list
     * are sorted with those closest to the center first.
     * @function dnd5e.prepareCalendarButtons
     * @memberof hookEvents
     * @param {CalendarHUD} app                   The Calendar HUD application being rendered.
     * @param {CalendarHUDButton[]} startButtons  Buttons displayed before the calendar UI.
     * @param {CalendarHUDButton[]} endButtons    Buttons displayed after the calendar UI.
     */
    Hooks.callAll("dnd5e.prepareCalendarButtons", this, context.startButtons, context.endButtons);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "endButtons":
        context.buttons = context.endButtons;
        break;
      case "startButtons":
        context.buttons = context.startButtons.reverse();
        break;
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Adjust the date, time, and progress in the core part without a full re-render to allow animation.
   */
  async renderCore() {
    const prefs = game.settings.get("dnd5e", "calendarPreferences");
    const dateFormatter = CONFIG.DND5E.calendar.formatters.find(f => f.value === prefs.formatters.date);
    this.element.querySelector(".calendar-date").innerText = dateFormatter ? game.time.calendar.format(
      game.time.components, dateFormatter.formatter
    ) : "";
    const timeFormatter = CONFIG.DND5E.calendar.formatters.find(f => f.value === prefs.formatters.time);
    this.element.querySelector(".calendar-time").innerText = timeFormatter ? game.time.calendar.format(
      game.time.components, timeFormatter.formatter
    ) : "";

    const widget = this.element.querySelector(".calendar-widget");
    const getProgress = type => type in game.time.calendar ? game.time.calendar[type]()
      : CalendarData5e.prototype[type].call(game.time.calendar);
    widget.style.setProperty("--calendar-day-progress", getProgress("progressDay"));
    widget.style.setProperty("--calendar-night-progress", getProgress("progressNight"));
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    await this.renderCore();
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle opening the player's character sheet.
   * @this {CalendarHUD}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #openCharacterSheet(event, target) {
    game.user.character?.sheet.render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle opening the primary party's sheet.
   * @this {CalendarHUD}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #openPartySheet(event, target) {
    game.settings.get("dnd5e", "primaryParty")?.actor?.sheet.render({ force: true });
  }

  /* -------------------------------------------- */

  // TODO: Respond to updates to primary party
  // TODO: Respond to updates to player's character

  /** @override */
  static onUpdateWorldTime(worldTime, deltaTime, options, userId) {
    CONFIG.DND5E.calendar.instance?.renderCore();
    // TODO: Use the delta time to ensure the animation runs in the correct direction
  }
}
