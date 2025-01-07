import BaseRestDialog from "./base-rest-dialog.mjs";

const { BooleanField } = foundry.data.fields;

/**
 * Dialog for configuring a short rest.
 */
export default class ShortRestDialog extends BaseRestDialog {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["short-rest"],
    actions: {
      rollHitDie: ShortRestDialog.#rollHitDie
    },
    window: {
      title: "DND5E.REST.Short.Label"
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/actors/rest/short-rest.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Currently selected hit dice denomination.
   * @type {string}
   */
  #denom;

  /* -------------------------------------------- */

  /** @override */
  get promptNewDay() {
    // It's never a new day when resting 1 minute
    // TODO: Adjust based on actual variant duration, rather than hard-coding
    return context.variant !== "epic";
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.autoRoll = new BooleanField({
      label: game.i18n.localize("DND5E.REST.HitDice.AutoSpend.Label"),
      hint: game.i18n.localize("DND5E.REST.HitDice.AutoSpend.Hint")
    });

    if ( this.actor.type === "npc" ) {
      const hd = this.actor.system.attributes.hd;
      context.hitDice = {
        canRoll: hd.value > 0,
        denomination: `d${hd.denomination}`,
        options: [{
          value: `d${hd.denomination}`,
          label: `d${hd.denomination} (${game.i18n.format("DND5E.HITDICE.Available", { number: hd.value })})`
        }]
      };
    }

    else if ( foundry.utils.hasProperty(this.actor, "system.attributes.hd") ) {
      context.hitDice = {
        canRoll: this.actor.system.attributes.hd.value > 0,
        options: Object.entries(this.actor.system.attributes.hd.bySize).map(([value, number]) => ({
          value, label: `${value} (${game.i18n.format("DND5E.HITDICE.Available", { number })})`, number
        }))
      };
      context.denomination = (this.actor.system.attributes.hd.bySize[this.#denom] > 0)
        ? this.#denom : context.hitDice.options.find(o => o.number > 0)?.value;
    }

    else context.fields.unshift({
      field: context.autoRoll,
      input: context.inputs.createCheckboxInput,
      name: "autoHD",
      value: context.config.autoHD
    });

    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle rolling a hit die.
   * @this {ShortRestDialog}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #rollHitDie(event, target) {
    this.#denom = this.form.denom.value;
    await this.actor.rollHitDie({ denomination: this.#denom });
    foundry.utils.mergeObject(this.config, new FormDataExtended(this.form).object);
    this.render();
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the Short Rest dialog and returns a Promise once its workflow has
   * been resolved.
   * @param {object} [options={}]
   * @param {Actor5e} [options.actor]  Actor that is taking the short rest.
   * @returns {Promise}                Promise that resolves when the rest is completed or rejects when canceled.
   */
  static async shortRestDialog({ actor } = {}) {
    foundry.utils.logCompatibilityWarning(
      "The `shortRestDialog` method on `ShortRestDialog` has been renamed `configure`.",
      { since: "DnD5e 4.2", until: "DnD5e 4.4" }
    );
    return this.configure(actor, { type: "short" });
  }
}
