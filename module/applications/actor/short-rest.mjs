/**
 * A helper Dialog subclass for rolling Hit Dice on short rest.
 *
 * @param {Actor5e} actor           Actor that is taking the short rest.
 * @param {object} [dialogData={}]  An object of dialog data which configures how the modal window is rendered.
 * @param {object} [options={}]     Dialog rendering options.
 */
export default class ShortRestDialog extends Dialog {
  constructor(actor, dialogData={}, options={}) {
    super(dialogData, options);

    /**
     * Store a reference to the Actor document which is resting
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

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/apps/short-rest.hbs",
      classes: ["dnd5e", "dialog"],
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData() {
    const context = super.getData();
    context.isGroup = this.actor.type === "group";

    if ( this.actor.type === "npc" ) {
      const hd = this.actor.system.attributes.hd;
      context.availableHD = { [`d${hd.denomination}`]: hd.value };
      context.canRoll = hd.value > 0;
      context.denomination = `d${hd.denomination}`;
    }

    else if ( foundry.utils.hasProperty(this.actor, "system.attributes.hd") ) {
      // Determine Hit Dice
      context.availableHD = this.actor.system.attributes.hd.bySize;
      context.canRoll = this.actor.system.attributes.hd.value > 0;

      const dice = Object.entries(context.availableHD);
      context.denomination = (context.availableHD[this._denom] > 0) ? this._denom : dice.find(([k, v]) => v > 0)?.[0];
    }

    // Determine rest type
    const variant = game.settings.get("dnd5e", "restVariant");
    context.promptNewDay = variant !== "epic";     // It's never a new day when only resting 1 minute
    context.newDay = false;                        // It may be a new day, but not by default
    return context;
  }

  /* -------------------------------------------- */


  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    let btn = html.find("#roll-hd");
    btn.click(this._onRollHitDie.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling a Hit Die as part of a Short Rest action
   * @param {Event} event     The triggering click event
   * @protected
   */
  async _onRollHitDie(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    this._denom = btn.form.hd.value;
    await this.actor.rollHitDie({ denomination: this._denom });
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the Short Rest dialog and returns a Promise once it's workflow has
   * been resolved.
   * @param {object} [options={}]
   * @param {Actor5e} [options.actor]  Actor that is taking the short rest.
   * @returns {Promise}                Promise that resolves when the rest is completed or rejects when canceled.
   */
  static async shortRestDialog({ actor }={}) {
    return new Promise((resolve, reject) => {
      const dlg = new this(actor, {
        title: `${game.i18n.localize("DND5E.ShortRest")}: ${actor.name}`,
        buttons: {
          rest: {
            icon: '<i class="fas fa-bed"></i>',
            label: game.i18n.localize("DND5E.Rest"),
            callback: html => {
              const formData = new FormDataExtended(html.find("form")[0]);
              resolve(formData.object);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("Cancel"),
            callback: reject
          }
        },
        close: reject
      });
      dlg.render(true);
    });
  }
}
