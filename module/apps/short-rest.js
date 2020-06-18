import LongRestDialog from "./long-rest.js";

/**
 * A helper Dialog subclass for rolling Hit Dice on short rest
 * @extends {Dialog}
 */
export default class ShortRestDialog extends Dialog {
  constructor(actor, dialogData={}, options={}) {
    super(dialogData, options);

    /**
     * Store a reference to the Actor entity which is resting
     * @type {Actor}
     */
    this.actor = actor;

    /**
     * Track the most recently used HD denomination for re-rendering the form
     * @type {string}
     */
    this._denom = null;
  }

  /* -------------------------------------------- */

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
	    template: "systems/dnd5e/templates/apps/short-rest.html",
      classes: ["dnd5e", "dialog"]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();

    // Determine Hit Dice
    data.availableHD = this.actor.data.items.reduce((hd, item) => {
      if ( item.type === "class" ) {
        const d = item.data;
        const denom = d.hitDice || "d6";
        const available = parseInt(d.levels || 1) - parseInt(d.hitDiceUsed || 0);
        hd[denom] = denom in hd ? hd[denom] + available : available;
      }
      return hd;
    }, {});
    data.canRoll = this.actor.data.data.attributes.hd > 0;
    data.denomination = this._denom;

    // Determine rest type
    const variant = game.settings.get("dnd5e", "restVariant");
    data.promptNewDay = variant !== "epic";     // It's never a new day when only resting 1 minute
    data.newDay = false;                        // It may be a new day, but not by default
    return data;
  }

  /* -------------------------------------------- */


  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    let btn = html.find("#roll-hd");
    btn.click(this._onRollHitDie.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling a Hit Die as part of a Short Rest action
   * @param {Event} event     The triggering click event
   * @private
   */
  async _onRollHitDie(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    this._denom = btn.form.hd.value;
    await this.actor.rollHitDie(this._denom);
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the Short Rest dialog and returns a Promise once it's workflow has
   * been resolved.
   * @param {Actor5e} actor
   * @return {Promise}
   */
  static async shortRestDialog({actor}={}) {
    return new Promise((resolve, reject) => {
      const dlg = new this(actor, {
        title: "Short Rest",
        buttons: {
          rest: {
            icon: '<i class="fas fa-bed"></i>',
            label: "Rest",
            callback: html => {
              let newDay = false;
              if (game.settings.get("dnd5e", "restVariant") === "gritty")
                newDay = html.find('input[name="newDay"]')[0].checked;
              resolve(newDay);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: reject
          }
        },
        close: reject
      });
      dlg.render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the Long Rest confirmation dialog and returns a Promise once it's
   * workflow has been resolved.
   * @deprecated
   * @param {Actor5e} actor
   * @return {Promise}
   */
  static async longRestDialog({actor}={}) {
    console.warn("WARNING! ShortRestDialog.longRestDialog has been deprecated, use LongRestDialog.longRestDialog instead.");
    return LongRestDialog.longRestDialog(...arguments);
  }
}
