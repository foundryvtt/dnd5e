import { formatNumber, simplifyBonus } from "../../../utils.mjs";
import BaseConfigSheet from "../api/base-config-sheet.mjs";

const { StringField } = foundry.data.fields;

/**
 * Configuration application for armor class calculation.
 */
export default class ArmorClassConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      addFormula: ArmorClassConfig.#onAddFormula,
      deleteFormula: ArmorClassConfig.#onDeleteFormula
    },
    classes: ["armor-class"],
    position: {
      width: 420
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    calculation: {
      template: "systems/dnd5e/templates/actors/config/armor-class-calculation.hbs"
    },
    config: {
      template: "systems/dnd5e/templates/actors/config/armor-class-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.ArmorClass");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    return {
      ...await super._prepareContext(options),
      data: this.document.system.attributes.ac,
      fields: this.document.system.schema.fields.attributes.fields.ac.fields,
      source: this.document.system._source.attributes.ac
    };
  }

  /* -------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "calculation": return this._prepareCalculationContext(context, options);
      case "config": return this._prepareConfigurationContext(context, options);
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the calculation section.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareCalculationContext(context, options) {
    if ( context.data.formula.includes("@attributes.ac.dex") ) {
      context.ability = { label: CONFIG.DND5E.abilities.dex?.label, value: context.data.dex };
    } else if ( context.data.formula.includes("@attributes.ac.clamped.") ) {
      const ability = context.data.formula.match(/@attributes\.ac\.clamped\.([a-zA-Z]+)/);
      context.ability = { label: CONFIG.DND5E.abilities[ability[1]]?.label, value: context.data.clamped[ability[1]] };
    }

    context.calculations = [];
    if ( context.data.formula.includes("@attributes.ac.armor") ) {
      for ( const key of ["armor", "shield"] ) {
        const item = context.data[`equipped${key.capitalize()}`];
        if ( !item ) continue;
        const magicalBonus = simplifyBonus(item.system.armor.magicalBonus, item.getRollData({ deterministic: true }));
        const val = item.system.armor.value - (item.system.magicAvailable ? magicalBonus : 0);
        context.calculations.push({
          anchor: item.toAnchor().outerHTML,
          img: item.img,
          magicalBonus: item.system.properties.has("mgc") ? formatNumber(magicalBonus, { signDisplay: "always" }) : "—",
          name: item.name,
          value: formatNumber(val, { signDisplay: key === "shield" ? "always" : "auto" })
        });
      }
    }
    if ( !context.data.override ) {
      for ( const bonus of this.document._prepareActiveEffectAttributions("system.attributes.ac.bonus") ) {
        if ( bonus.mode !== CONST.ACTIVE_EFFECT_MODES.ADD ) continue;
        context.calculations.push({
          anchor: bonus.document.toAnchor().outerHTML,
          img: bonus.document.img,
          magicalBonus: formatNumber(bonus.value, { signDisplay: "always" }),
          name: bonus.label,
          value: "—"
        });
      }
    }

    context.formulaLabel = context.data.activeFormula?.label ?? context.data.label;

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the configuration section.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareConfigurationContext(context, options) {
    context.customFormulas = (context.source.formulas ?? []).map((source, index) => ({
      source, fields: context.fields.formulas.element.fields
    }));
    context.formulaOptions = Object.entries(CONFIG.DND5E.armorClasses).map(([value, { label }]) => ({ value, label }));
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle adding a new custom formula.
   * @this {ArmorClassConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #onAddFormula(event, target) {
    this.document.update({
      "system.attributes.ac.formulas": [...(this.document.system.toObject().attributes.ac.formulas ?? []), {}]
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing a custom formula.
   * @this {ArmorClassConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #onDeleteFormula(event, target) {
    const formulas = this.document.system.toObject().attributes.ac.formulas;
    formulas.splice(target.closest("[data-index]").dataset.index, 1);
    this.document.update({ "system.attributes.ac.formulas": formulas });
  }
}
