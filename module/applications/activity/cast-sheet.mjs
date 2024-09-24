import ActivitySheet from "./activity-sheet.mjs";

/**
 * Sheet for the cast activity.
 */
export default class CastSheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["cast-activity"],
    actions: {
      removeSpell: CastSheet.#removeSpell
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    effect: {
      template: "systems/dnd5e/templates/activity/cast-effect.hbs",
      templates: [
        "systems/dnd5e/templates/activity/parts/cast-spell.hbs",
        "systems/dnd5e/templates/activity/parts/cast-details.hbs"
      ]
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    return {
      ...await super._prepareContext(options),
      spell: await fromUuid(this.activity.spell.uuid)
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context) {
    context = await super._prepareEffectContext(context);
    if ( context.spell ) {
      context.contentLink = context.spell.toAnchor().outerHTML;
      if ( context.spell.system.level > 0 ) context.levelOptions = Object.entries(CONFIG.DND5E.spellLevels)
        .filter(([level]) => Number(level) >= context.spell.system.level)
        .map(([value, label]) => ({ value, label }));
    }
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareIdentityContext(context) {
    context = await super._prepareIdentityContext(context);
    if ( context.spell ) context.placeholder = { name: context.spell.name, img: context.spell.img };
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle removing the associated spell.
   * @this {CastSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #removeSpell(event, target) {
    this.activity.update({ "spell.uuid": null });
  }
}
