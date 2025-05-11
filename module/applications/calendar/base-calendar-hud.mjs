import Application5e from "../api/application.mjs";

/**
 * Base application that calendar HUDs should inherit from.
 */
export default class BaseCalendarHUD extends Application5e {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    actions: {
      advanceTime: BaseCalendarHUD.#advanceTime
    },
    id: "calendar-hud",
    window: {
      frame: false,
      positioned: false
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Should the calendar HUD be displayed for the current user?
   * @type {boolean}
   */
  static get shouldDisplay() {
    return (game.settings.get("dnd5e", "calendarConfig")?.enabled || false)
      && (game.settings.get("dnd5e", "calendarPreferences")?.visible || false);
  }

  /**
   * Should the calendar HUD be displayed for the current user?
   * @type {boolean}
   */
  get shouldDisplay() {
    return this.constructor.shouldDisplay;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async render(options) {
    if ( this.rendered || this.shouldDisplay ) await super.render(options);
    return this;
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @override */
  _insertElement(element) {
    const existing = document.getElementById(element.id);
    if ( existing ) existing.replaceWith(element);
    else {
      const location = document.querySelector("#ui-middle #ui-top");
      location.append(this.element);
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle moving between set amounts of time.
   * @this {BaseCalendarHUD}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #advanceTime(event, target) {
    const config = game.settings.get("dnd5e", "calendarConfig").buttons[target.dataset.amount];
    game.time.advance({
      [config.units]: target.dataset.amount.startsWith("reverse") ? -config.value : config.value
    });
  }

  /* -------------------------------------------- */

  /**
   * Respond to changes in the calendar settings.
   */
  onUpdateSettings() {
    if ( this.shouldDisplay ) this.render({ force: true });
    else if ( this.rendered ) this.close({ animate: false });
  }

  /* -------------------------------------------- */

  /**
   * Respond to changes in the world time.
   * @param {number} worldTime
   * @param {number} deltaTime
   * @param {object} options
   * @param {string} userId
   */
  static onUpdateWorldTime(worldTime, deltaTime, options, userId) {
    if ( this.shouldDisplay ) CONFIG.DND5E.calendar.instance?.render();
  }
}
