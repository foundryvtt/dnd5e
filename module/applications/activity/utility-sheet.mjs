import ActivitySheet from "./activity-sheet.mjs";

/**
 * Sheet for the utility activity.
 */
export default class UtilitySheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["utility-activity"]
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    effect: {
      template: "systems/dnd5e/templates/activity/utility-effect.hbs",
      templates: super.PARTS.effect.templates
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareIdentityContext(context) {
    context = await super._prepareIdentityContext(context);
    context.behaviorFields.push({
      field: context.fields.roll.fields.prompt,
      value: context.source.roll.prompt,
      input: context.inputs.createCheckboxInput
    });
    return context;
  }
}
