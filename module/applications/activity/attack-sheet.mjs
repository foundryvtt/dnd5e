import ActivitySheet from "./activity-sheet.mjs";

/**
 * Sheet for the attack activity.
 */
export default class AttackSheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["attack-activity"],
    actions: {
      addDamagePart: AttackSheet.#addDamagePart,
      deleteDamagePart: AttackSheet.#deleteDamagePart
    }
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

    const denominationOptions = [
      { value: "", label: "" },
      ...CONFIG.DND5E.dieSteps.map(value => ({ value, label: `d${value}` }))
    ];
    const scalingOptions = [
      { value: "", label: game.i18n.localize("DND5E.DAMAGE.Scaling.None") },
      ...Object.entries(CONFIG.DND5E.damageScalingModes).map(([value, config]) => ({ value, label: config.label }))
    ];
    context.damageParts = context.activity.damage.parts.map((data, index) => ({
      data,
      fields: this.activity.schema.fields.damage.fields.parts.element.fields,
      prefix: `damage.parts.${index}.`,
      source: context.source.damage.parts[index] ?? data,
      canScale: this.activity.canScaleDamage,
      denominationOptions,
      scalingOptions,
      typeOptions: Object.entries(CONFIG.DND5E.damageTypes).map(([value, config]) => ({
        value, label: config.label, selected: data.types.has(value)
      }))
    }));

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

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle adding a new entry to the damage parts list.
   * @this {ActivityConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #addDamagePart(event, target) {
    this.activity.update({ "damage.parts": [...this.activity.toObject().damage.parts, {}] });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing an entry from the damage parts list.
   * @this {ActivityConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #deleteDamagePart(event, target) {
    const parts = this.activity.toObject().damage.parts;
    parts.splice(target.closest("[data-index]").dataset.index, 1);
    this.activity.update({ "damage.parts": parts });
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareSubmitData(event, formData) {
    const submitData = super._prepareSubmitData(event, formData);
    if ( foundry.utils.hasProperty(submitData, "damage.parts") ) {
      submitData.damage.parts = Object.values(submitData.damage.parts);
    }
    return submitData;
  }
}
