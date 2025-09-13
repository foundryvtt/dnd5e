import CalendarData5e from "../../data/calendar/calendar-data.mjs";
import { formatTime } from "../../utils.mjs";
import BaseCalendarHUD from "./base-calendar-hud.mjs";

/**
 * @typedef CalendarHUDButton
 * @property {string} [action]                    The action name triggered by clicking the button.
 * @property {Omit<CalendarHUDButton, "additional"|"position">[]} [additional]  Additional buttons that appear when
 *                                                the button is hovered.
 * @property {object} [dataset]                   Additional data to attach to the button.
 * @property {string} [icon]                      SVG icon path or font-awesome icon class for the button.
 * @property {string} [label]                     Label used for the button.
 * @property {"start"|"end"} position             Should this be displayed before or after the interface.
 * @property {string} [tooltip]                   Tooltip displayed on hover.
 * @property {(event: PointerEvent) => void|Promise<void>} [onClick]  A custom click handler function.
 * @property {boolean|(() => boolean)} [visible]  Is the control button visible for the current client.
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

  /**
   * Default time periods to display for controlling time.
   * @type {{ value: number, unit: string }}
   */
  static TIME_CONTROL_VALUES = [
    { value: 7, unit: "day" },
    { value: 1, unit: "day" },
    { value: 8, unit: "hour" },
    { value: 30, unit: "minute" },
    { value: 1, unit: "minute" }
  ];

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Build the list of default calendar buttons.
   * @returns {CalendarHUDButton[]}
   * @protected
   */
  _getCalendarButtons() {
    const config = game.settings.get("dnd5e", "calendarConfig");
    return [
      {
        action: "reverse",
        dataset: { value: 1, unit: "hour" },
        icon: "fa-solid fa-angles-left",
        position: "start",
        tooltip: game.i18n.format("DND5E.CALENDAR.Action.ReverseTime", { amount: formatTime(1, "hour").titleCase() }),
        visible: game.user.isGM,
        additional: CalendarHUD.TIME_CONTROL_VALUES.map(({ value, unit }) => ({
          action: "reverse",
          dataset: { value, unit },
          label: `-${formatTime(value, unit, { unitDisplay: "narrow" })}`,
          tooltip: game.i18n.format("DND5E.CALENDAR.Action.ReverseTime", {
            amount: formatTime(value, unit).titleCase()
          })
        }))
      },
      {
        action: "openCharacterSheet",
        icon: "fa-solid fa-user",
        position: "start",
        tooltip: game.i18n.localize("DND5E.CALENDAR.Action.OpenCharacterSheet"),
        visible: !!game.user.character
      },
      {
        action: "advance",
        icon: "fa-solid fa-angles-right",
        position: "end",
        tooltip: game.i18n.format("DND5E.CALENDAR.Action.AdvanceTime", { amount: formatTime(1, "hour").titleCase() }),
        visible: game.user.isGM,
        additional: CalendarHUD.TIME_CONTROL_VALUES.map(({ value, unit }) => ({
          action: "advance",
          dataset: { value, unit },
          label: `+${formatTime(value, unit, { unitDisplay: "narrow" })}`,
          tooltip: game.i18n.format("DND5E.CALENDAR.Action.AdvanceTime", {
            amount: formatTime(value, unit).titleCase()
          })
        }))
      },
      {
        action: "openPartySheet",
        icon: "fa-solid fa-users",
        position: "end",
        tooltip: game.i18n.localize("DND5E.CALENDAR.Action.OpenPartySheet"),
        visible: game.settings.get("dnd5e", "primaryParty")?.actor
          ?.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)
      }
    ];
  }

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
    /**
     * A hook event that fires when preparing the buttons displayed around the calendar HUD. Buttons in each list
     * are sorted with those closest to the center first.
     * @function dnd5e.prepareCalendarButtons
     * @memberof hookEvents
     * @param {CalendarHUD} app              The Calendar HUD application being rendered.
     * @param {CalendarHUDButton[]} buttons  Buttons displayed around the calendar UI.
     */
    const controls = this._doEvent(this._getCalendarButtons, {
      async: false,
      debugText: "Calendar Control Buttons",
      hookName: "dnd5e.prepareCalendarButtons",
      hookResponse: true,
      parentClassHooks: false
    });

    const prepareCalendarButton = (data, index, parent) => ({
      ...data, index,
      additional: data.additional ? data.additional.map((a, i) => prepareCalendarButton(a, i, data)) : undefined,
      tooltipDirection: (parent?.position ?? data.position) === "start" ? "LEFT" : "RIGHT"
    });

    context.buttons = controls
      .filter(b => typeof b.visible === "function" ? b.visible.call(this) : b.visible ?? true)
      .map(prepareCalendarButton);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "endButtons":
        context.buttons = context.buttons.filter(b => b.position === "end");
        break;
      case "startButtons":
        context.buttons = context.buttons.filter(b => b.position === "start").reverse();
        break;
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Adjust the date, time, and progress in the core part without a full re-render to allow animation.
   * @param {CalendarTimeDeltas} [deltas={}]  Information on the time change deltas.
   */
  async renderCore(deltas={}) {
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
    const adjustProgress = (variable, type, delta=0) => {
      const currentProgress = Number(widget.style.getPropertyValue(variable));
      const modulo = (n, d) => ((n % d) + d) % d;
      const partialProgress = modulo((currentProgress + 0.5), 2) - 0.5;
      const targetProgress = type in game.time.calendar ? game.time.calendar[type]()
        : CalendarData5e.prototype[type].call(game.time.calendar);
      const difference = targetProgress - partialProgress;
      const newProgress = currentProgress + difference + (delta * 2);
      widget.style.setProperty(variable, newProgress);
    };
    adjustProgress("--calendar-day-progress", "progressDay", deltas.midnights);
    adjustProgress("--calendar-night-progress", "progressNight", deltas.middays);
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    await this.renderCore();

    const addButtonEvent = (button, config) => {
      if ( typeof config?.onClick === "function" ) {
        button.addEventListener("click", event => {
          event.preventDefault();
          config.onClick(event);
        });
      }
    };

    for ( const button of this.element.querySelectorAll(".calendar-buttons > .calendar-button > button") ) {
      const config = context.buttons[parseInt(button.dataset.index)];
      addButtonEvent(button, config);
      for ( const additionalButton of button.parentElement.querySelectorAll(".calendar-button > button") ) {
        const additionalConfig = config?.additional?.[parseInt(additionalButton.dataset.index)];
        addButtonEvent(additionalButton, additionalConfig);
      }
    }
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
    CONFIG.DND5E.calendar.instance?.renderCore(options.dnd5e?.deltas);
  }
}
