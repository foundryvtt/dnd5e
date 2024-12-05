import * as Trait from "../../documents/actor/trait.mjs";
import ActivitySheet from "./activity-sheet.mjs";

/**
 * Sheet for the check activity.
 */
export default class CheckSheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["check-activity"]
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    effect: {
      template: "systems/dnd5e/templates/activity/check-effect.hbs",
      templates: [
        ...super.PARTS.effect.templates,
        "systems/dnd5e/templates/activity/parts/check-details.hbs"
      ]
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context) {
    context = await super._prepareEffectContext(context);

    const group = game.i18n.localize("DND5E.Abilities");
    context.abilityOptions = [
      { value: "", label: "" },
      { rule: true },
      { value: "spellcasting", label: game.i18n.localize("DND5E.SpellAbility") },
      ...Object.entries(CONFIG.DND5E.abilities).map(([value, config]) => ({ value, label: config.label, group }))
    ];
    let ability;
    const associated = this.activity.check.associated;
    if ( (this.item.type === "tool") && !associated.size ) {
      ability = CONFIG.DND5E.abilities[this.item.system.ability]?.label?.toLowerCase();
    } else if ( (associated.size === 1) && (associated.first() in CONFIG.DND5E.skills) ) {
      ability = CONFIG.DND5E.abilities[CONFIG.DND5E.skills[associated.first()].ability]?.label?.toLowerCase();
    }
    if ( ability ) context.abilityOptions[0].label = game.i18n.format("DND5E.DefaultSpecific", { default: ability });

    context.associatedOptions = [
      ...Object.entries(CONFIG.DND5E.skills).map(([value, { label }]) => ({
        value, label, group: game.i18n.localize("DND5E.Skills")
      })),
      ...Object.keys(CONFIG.DND5E.toolIds).map(value => ({
        value, label: Trait.keyLabel(value, { trait: "tool" }), group: game.i18n.localize("TYPES.Item.toolPl")
      })).sort((lhs, rhs) => lhs.label.localeCompare(rhs.label, game.i18n.lang))
    ];

    context.calculationOptions = [
      { value: "", label: game.i18n.localize("DND5E.SAVE.FIELDS.save.dc.CustomFormula") },
      { rule: true },
      { value: "spellcasting", label: game.i18n.localize("DND5E.SpellAbility") },
      ...Object.entries(CONFIG.DND5E.abilities).map(([value, config]) => ({ value, label: config.label, group }))
    ];

    return context;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareIdentityContext(context) {
    context = await super._prepareIdentityContext(context);
    context.behaviorFields.push({
      field: context.fields.check.fields.visible,
      value: context.source.check.visible,
      input: context.inputs.createCheckboxInput
    });
    return context;
  }
}
