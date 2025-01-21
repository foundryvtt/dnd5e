import { formatNumber } from "../../../utils.mjs";
import BaseConfigSheet from "../api/base-config-sheet.mjs";

/**
 * Configuration application for hit point bonuses and current values.
 */
export default class HitPointsConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["hit-points"],
    actions: {
      roll: HitPointsConfig.#rollFormula
    },
    position: {
      width: 420
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/actors/config/hit-points-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.HitPoints");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.data = this.document.system.attributes.hp;
    context.fields = this.document.system.schema.fields.attributes.fields.hp.fields;
    context.source = this.document.system._source.attributes.hp;

    // Display positive ability modifier as its own row, but if negative merge into classes totals
    const ability = CONFIG.DND5E.abilities[CONFIG.DND5E.defaultAbilities.hitPoints];
    const mod = this.document.system.abilities?.[CONFIG.DND5E.defaultAbilities.hitPoints]?.mod ?? 0;
    if ( ability && (mod > 0) ) context.ability = { mod, name: ability.label };

    // Summarize HP from classes
    context.classes = Object.values(this.document.classes).map(cls => ({
      id: cls.id,
      anchor: cls.toAnchor().outerHTML,
      name: cls.name,
      total: cls.advancement.byType.HitPoints?.[0]?.[mod > 0 ? "total" : "getAdjustedTotal"](mod) ?? 0
    })).sort((lhs, rhs) => rhs.name - lhs.name);

    // Display active effects targeting bonus fields
    context.effects = {
      bonuses: this.document._prepareActiveEffectAttributions("system.attributes.hp.bonuses.level"),
      max: this.document._prepareActiveEffectAttributions("system.attributes.hp.max"),
      overall: this.document._prepareActiveEffectAttributions("system.attributes.hp.bonuses.overall")
    };
    for ( const [key, value] of Object.entries(context.effects) ) {
      context.effects[key] = value
        .filter(e => e.mode === CONST.ACTIVE_EFFECT_MODES.ADD)
        .map(e => ({ ...e, anchor: e.document.toAnchor().outerHTML}));
    }

    context.levels = this.document.system.details?.level ?? 0;
    context.levelMultiplier = `
      <span class="multiplier"><span class="times">&times;</span> ${formatNumber(context.levels)}</span>
    `;
    context.showCalculation = context.classes.length || context.fields.bonuses;
    context.showMaxInCalculation = context.showCalculation && (this.document.type === "npc");
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle rolling NPC health values using the provided formula.
   * @this {HitPointsConfig}
   * @param {PointerEvent} event  The triggering click event.
   * @param {HTMLElement} target  The button that was clicked.
   * @protected
   */
  static async #rollFormula(event, target) {
    try {
      const roll = await this.document.rollNPCHitPoints();
      this.submit({ updateData: { "system.attributes.hp.max": roll.total } });
    } catch(error) {
      ui.notifications.error("DND5E.HPFormulaError", { localize: true });
      throw error;
    }
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processSubmitData(event, form, submitData) {
    const clone = this.document.clone(foundry.utils.deepClone(submitData));
    const { value, max } = this.document.system.attributes.hp;
    const maxDelta = clone.system.attributes.hp.max - max;
    const current = submitData.system.attributes.hp.value ?? value;
    foundry.utils.setProperty(submitData, "system.attributes.hp.value", Math.max(current + maxDelta, 0));
    super._processSubmitData(event, form, submitData);
  }
}
