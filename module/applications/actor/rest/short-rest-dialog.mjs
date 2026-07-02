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
      label: _loc("DND5E.REST.HitDice.AutoSpend.Label"),
      hint: _loc("DND5E.REST.HitDice.AutoSpend.Hint")
    });

    if ( this.actor.system.isNPC ) {
      const hd = this.actor.system.attributes.hd;
      context.hitDice = {
        canRoll: hd.value > 0,
        denomination: `d${hd.denomination}`,
        options: [{
          value: `d${hd.denomination}`,
          label: `d${hd.denomination} (${_loc("DND5E.HITDICE.Available", { number: hd.value })})`,
          number: hd.value
        }]
      };
    }

    else if ( foundry.utils.hasProperty(this.actor, "system.attributes.hd") ) {
      context.hitDice = {
        canRoll: this.actor.system.attributes.hd.value > 0,
        options: Object.entries(this.actor.system.attributes.hd.bySize).map(([value, number]) => ({
          value, label: `${value} (${_loc("DND5E.HITDICE.Available", { number })})`, number
        }))
      };
      context.hitDice.denomination = (this.actor.system.attributes.hd.bySize[this.#denom] > 0)
        ? this.#denom : context.hitDice.options.find(o => o.number > 0)?.value;
    }

    else {
      if ( !context.fields.length ) {
        context.formSections.unshift({ legend: "DND5E.REST.Configuration", fields: context.fields });
      }
      context.fields.unshift({
        field: context.autoRoll,
        input: context.inputs.createCheckboxInput,
        name: "autoHD",
        value: context.config.autoHD
      });
    }

    const denom = Number(context.hitDice.denomination?.slice(1));
    if ( denom ) {
      const { pct, effectiveMax: max } = this.actor.system.attributes.hp;
      context.progress = { pct };
      const con = this.actor.system.abilities.con.mod;
      let minRegain = Math.max(1 + con, 1);
      let maxRegain = Math.max(denom + con, 1);
      if ( context.config.autoHD ) {
        minRegain = minRegain * context.hd.value;
        maxRegain = context.hitDice.options.reduce((acc, hd) => {
          return acc + (Math.max(Number(hd.value.slice(1)) + con, 1) * hd.number);
        }, 0);
      }
      context.progress.potential = { max: 100 * (maxRegain - minRegain) / max, min: 100 * minRegain / max };
      context.progress.left = context.progress.potential.min + pct;
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
    foundry.utils.mergeObject(this.config, new foundry.applications.ux.FormDataExtended(this.form).object);
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    this.#denom = this.form.denom?.value;
    foundry.utils.mergeObject(this.config, new foundry.applications.ux.FormDataExtended(this.form).object);
    this.render();
  }
}
