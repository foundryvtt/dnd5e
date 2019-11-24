/**
 * A helper Dialog subclass for rolling Hit Dice on short rest
 * @type {Dialog}
 */
export class ShortRestDialog extends Dialog {
  constructor(actor, dialogData={}, options={}) {
    super(dialogData, options);
    this.options.classes = ["dnd5e", "dialog"];

    /**
     * Store a reference to the Actor entity which is resting
     * @type {Actor}
     */
    this.actor = actor;
  }

  /* -------------------------------------------- */

  activateListeners(html) {
    let btn = html.find("#roll-hd");
    if ( this.data.canRoll ) btn.click(this._onRollHitDie.bind(this));
    else btn[0].disabled = true;
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
    let fml = btn.form.hd.value;
    await this.actor.rollHitDie(fml);
    if ( this.actor.data.data.attributes.hd.value === 0 ) btn.disabled = true;
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the Short Rest dialog and returns a Promise once it's workflow has
   * been resolved.
   * @param {Actor5e} actor
   * @param {boolean} canRoll
   * @return {Promise}
   */
  static async shortRestDialog({actor, canRoll=true}={}) {
    const html = await renderTemplate("systems/dnd5e/templates/apps/short-rest.html");
    return new Promise(resolve => {
      const dlg = new this(actor, {
        title: "Short Rest",
        content: html,
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
        },
        canRoll: canRoll
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
    const content = `<p>Take a long rest?</p><p>On a long rest you will recover hit points, half your maximum hit dice, 
        class resources, limited use item charges, and spell slots.</p>`;
    return new Promise((resolve, reject) => {
      new Dialog({
        title: "Long Rest",
        content: content,
        buttons: {
          rest: {
            icon: '<i class="fas fa-bed"></i>',
            label: "Rest",
            callback: resolve
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
