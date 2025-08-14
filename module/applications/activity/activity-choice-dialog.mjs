import Application5e from "../api/application.mjs";

/**
 * Dialog for choosing an activity to use on an Item.
 * @param {Item5e} item                         The Item whose activities are being chosen.
 * @param {ApplicationConfiguration} [options]  Application configuration options.
 */
export default class ActivityChoiceDialog extends Application5e {
  constructor(item, options={}) {
    super(options);
    this.#item = item;
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["activity-choice"],
    actions: {
      choose: ActivityChoiceDialog.#onChooseActivity
    },
    position: {
      width: 350
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    activities: {
      template: "systems/dnd5e/templates/activity/activity-choices.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The chosen activity.
   * @type {Activity|null}
   */
  get activity() {
    return this.#activity ?? null;
  }

  #activity;

  /* -------------------------------------------- */

  /**
   * The Item whose activities are being chosen.
   * @type {Item5e}
   */
  get item() {
    return this.#item;
  }

  #item;

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return this.#item.name;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if ( options.isFirstRender ) options.window.icon ||= this.#item.img;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    let controlHint;
    if ( game.settings.get("dnd5e", "controlHints") ) {
      controlHint = game.i18n.localize("DND5E.Controls.Activity.FastForwardHint");
      controlHint = controlHint.replace(
        "<left-click>",
        `<img src="systems/dnd5e/icons/svg/mouse-left.svg" alt="${game.i18n.localize("DND5E.Controls.LeftClick")}">`
      );
    }
    const activities = this.#item.system.activities
      .filter(a => a.canUse)
      .map(this._prepareActivityContext.bind(this))
      .sort((a, b) => a.sort - b.sort);
    return {
      ...await super._prepareContext(options),
      controlHint, activities
    };
  }

  /* -------------------------------------------- */

  /**
   * @typedef ActivityChoiceDialogContext
   * @property {string} id
   * @property {string} name
   * @property {number} sort
   * @property {object} icon
   * @property {string} icon.src
   * @property {boolean} icon.svg
   */

  /**
   * Prepare rendering context for a given activity.
   * @param {Activity} activity  The activity.
   * @returns {ActivityChoiceDialogContext}
   * @protected
   */
  _prepareActivityContext(activity) {
    const { id, name, img, sort } = activity;
    return {
      id, name, sort,
      icon: {
        src: img,
        svg: img.endsWith(".svg")
      }
    };
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Handle choosing an activity.
   * @this {ActivityChoiceDialog}
   * @param {PointerEvent} event  The triggering click event.
   * @param {HTMLElement} target  The activity button that was clicked.
   */
  static async #onChooseActivity(event, target) {
    const { activityId } = target.dataset;
    this.#activity = this.#item.system.activities.get(activityId);
    this.close();
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Display the activity choice dialog.
   * @param {Item5e} item                         The Item whose activities are being chosen.
   * @param {ApplicationConfiguration} [options]  Application configuration options.
   * @returns {Promise<Activity|null>}            The chosen activity, or null if the dialog was dismissed.
   */
  static create(item, options) {
    return new Promise(resolve => {
      const dialog = new this(item, options);
      dialog.addEventListener("close", () => resolve(dialog.activity), { once: true });
      dialog.render({ force: true });
    });
  }
}
