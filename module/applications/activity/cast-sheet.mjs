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

    context.abilityOptions = [
      { value: "", label: game.i18n.localize("DND5E.Spellcasting") },
      { rule: true },
      ...Object.entries(CONFIG.DND5E.abilities).map(([value, { label }]) => ({ value, label }))
    ];
    context.propertyOptions = Array.from(CONFIG.DND5E.validProperties.spell).map(value => ({
      value, label: CONFIG.DND5E.itemProperties[value]?.label ?? ""
    }));

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareIdentityContext(context) {
    context = await super._prepareIdentityContext(context);
    context.behaviorFields = [{
      field: context.fields.spell.fields.spellbook,
      value: context.source.spell.spellbook,
      input: context.inputs.createCheckboxInput
    }];
    if ( context.spell ) context.placeholder = { name: context.spell.name, img: context.spell.img };
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getTabs() {
    const tabs = super._getTabs();
    tabs.effect.label = "DND5E.CAST.SECTIONS.Spell";
    tabs.effect.icon = "fa-solid fa-wand-sparkles";
    return tabs;
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
