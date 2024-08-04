import ActivitySheet from "./activity-sheet.mjs";

/**
 * Sheet for the attack activity.
 */
export default class AttackSheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["attack-activity"]
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    identity: {
      template: "systems/dnd5e/templates/activity/attack-identity.hbs",
      templates: [
        ...super.PARTS.identity.templates,
        "systems/dnd5e/templates/activity/parts/attack-identity.hbs"
      ]
    },
    effect: {
      template: "systems/dnd5e/templates/activity/attack-effect.hbs",
      templates: [
        ...super.PARTS.effect.templates,
        "systems/dnd5e/templates/activity/parts/attack-damage.hbs",
        "systems/dnd5e/templates/activity/parts/attack-details.hbs",
        "systems/dnd5e/templates/activity/parts/damage-part.hbs",
        "systems/dnd5e/templates/activity/parts/damage-parts.hbs"
      ]
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context) {
    context = await super._prepareEffectContext(context);

    // TODO: Add better default label to indicate what ability will be chosen
    // TODO: Add spellcasting option to automatically select spellcasting ability
    context.abilityOptions = [
      { value: "", label: "" },
      ...Object.entries(CONFIG.DND5E.abilities).map(([value, config]) => ({ value, label: config.label }))
    ];

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareIdentityContext(context) {
    context = await super._prepareIdentityContext(context);

    // TODO: Add better default label to indicate what type is inferred from the item
    context.attackTypeOptions = [
      { value: "", label: "" },
      ...Object.entries(CONFIG.DND5E.attackTypes).map(([value, config]) => ({ value, label: config.label }))
    ];
    // TODO: Add better default label to indicate what classification is inferred from the item
    context.attackClassificationOptions = [
      { value: "", label: "" },
      ...Object.entries(CONFIG.DND5E.attackClassifications).map(([value, config]) => ({ value, label: config.label }))
    ];

    return context;
  }
}
