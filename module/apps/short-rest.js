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
    return data;
  }

  /* -------------------------------------------- */


  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    let btn = html.find("#roll-hd");
    btn.click(this._onRollHitDie.bind(this));
    super.activateListeners(html);
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
    return new Promise(resolve => {
      const dlg = new this(actor, {
        title: "Short Rest",
        buttons: {
          rest: {
            icon: '<i class="fas fa-bed"></i>',
            label: "Rest",
            callback: () => resolve(true)
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(false)
          }
        }
      });
      dlg.render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the Long Rest confirmation dialog and returns a Promise once it's
   * workflow has been resolved.
   * @param {Actor5e} actor
   * @return {Promise}
   */
  static async longRestDialog({actor}={}) {
    const template = "systems/dnd5e/templates/apps/long-rest.html";
    const content = await renderTemplate(template);
    return new Promise((resolve, reject) => {
      new Dialog({
        title: "Long Rest",
        content: content,
        buttons: {
          rest: {
            icon: '<i class="fas fa-bed"></i>',
            label: "Rest",
            callback: html => {
              const newDay = html.find('input[name="newDay"]')[0].checked;
              resolve(newDay);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: reject
          },
        },
        default: 'rest',
        close: reject
      }, {classes: ["dnd5e", "dialog"]}).render(true);
    });
  }
}
