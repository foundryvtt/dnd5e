import { ClassHelper } from "../actor/class-helper.js";

/**
 * A helper Dialog subclass for rolling Hit Dice on short rest
 * @type {Dialog}
 */
export class ShortRestV2Dialog extends Dialog {
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
    let rollCompleted = await this.actor.rollSpecificHitDie(fml);

    if (rollCompleted) {
      // remove the die we just clicked
      btn.form.hd.remove(btn.form.hd.selectedIndex);

      // disable further inputs if the dice are exhausted
      if (btn.form.hd.length === 0) {
        btn.disabled = true;
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the Short Rest dialog and returns a Promise once its workflow has
   * been resolved.
   * @param {Actor5e} actor
   * @param {boolean} canRoll
   * @return {Promise}
   */
  static async shortRestDialog({actor, canRoll=true}={}) {
    let actorType = typeof(actor);

    let hdAvailable = ClassHelper.hitDiceAvailable(actor.data);
    let hdRemaining = ClassHelper.hitDiceRemaining(actor.data);
    let hdUsed =  actor.data.data.attributes.hdUsed !== null ? actor.data.data.attributes.hdUsed : [];

    const html = await renderTemplate("systems/dnd5e/templates/apps/short-rest-v2.html", {
      "hdAvailable": hdAvailable,
      "hdRemaining": hdRemaining,
      "hdUsed": hdUsed
    });
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
}
