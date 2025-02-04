import BaseConfigSheet from "../api/base-config-sheet.mjs";

/**
 * Configuration application for adjusting hit dice amounts and rolling.
 */
export default class HitDiceConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["hit-dice"],
    actions: {
      decrease: HitDiceConfig.#stepValue,
      increase: HitDiceConfig.#stepValue,
      roll: HitDiceConfig.#rollDie
    },
    position: {
      width: 420
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/actors/config/hit-dice-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.HitDice");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.classes = Array.from(this.document.system.attributes?.hd?.classes ?? []).map(cls => ({
      data: { ...cls.system.hd },
      denomination: Number(cls.system.hd.denomination.slice(1)),
      id: cls.id,
      label: `${cls.name} (${cls.system.hd.denomination})`
    })).sort((lhs, rhs) => rhs.denomination - lhs.denomination);
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle rolling a specific hit die.
   * @this {HitDiceConfig}
   * @param {PointerEvent} event  The triggering click event.
   * @param {HTMLElement} target  The button that was clicked.
   */
  static async #rollDie(event, target) {
    await this.document.rollHitDie({ denomination: target.dataset.denomination });
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle stepping a hit die count up or down.
   * @this {HitDiceConfig}
   * @param {PointerEvent} event  The triggering click event.
   * @param {HTMLElement} target  The button that was clicked.
   */
  static #stepValue(event, target) {
    const valueField = target.closest(".form-group").querySelector("input");
    if ( target.dataset.action === "increase" ) valueField?.stepUp();
    else valueField?.stepDown();
    this.submit();
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    if ( form.reportValidity() ) {
      const submitData = super._processFormData(event, form, formData);
      const classUpdates = Object.entries(submitData).map(([_id, value]) => ({
        _id, "system.hd.spent": this.document.items.get(_id).system.levels - value
      }));
      this.document.updateEmbeddedDocuments("Item", classUpdates);
    }
    return {};
  }
}
