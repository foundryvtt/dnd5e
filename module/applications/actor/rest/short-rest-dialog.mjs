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
          label: `d${hd.denomination} (${game.i18n.format("DND5E.HITDICE.Available", { number: hd.value })})`,
          number: hd.value
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
      context.hitDice.denomination = (this.actor.system.attributes.hd.bySize[this.#denom] > 0)
        ? this.#denom : context.hitDice.options.find(o => o.number > 0)?.value;
    }

    else context.fields.unshift({
      field: context.autoRoll,
      input: context.inputs.createCheckboxInput,
      name: "autoHD",
      value: context.config.autoHD
    });

    const numericalDenom = Number(context.hitDice.denomination?.slice(1));
    if ( numericalDenom ) {
      const { value: currHP, max: maxHP } = this.actor.system.attributes.hp;
      context.progressBar = 100 * currHP / maxHP;
      const conMod = this.actor.system.abilities.con.mod;
      let minRegain = Math.max(1 + conMod, 1);
      let maxRegain = Math.max(numericalDenom + conMod, 1);
      if (context.config.autoHD) {
        minRegain = minRegain * context.hd.value;
        maxRegain = context.hitDice.options.reduce((acc, hd) => {
          return acc + (Math.max(Number(hd.value.slice(1)) + conMod, 1) * hd.number);
        }, 0);
      }
      context.potentialMin = 100 * minRegain / maxHP;
      context.potentialMax = 100 * maxRegain / maxHP;
      context.maxLeft = context.potentialMin + context.progressBar;
    }

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
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    this.#denom = this.form.denom.value;
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
