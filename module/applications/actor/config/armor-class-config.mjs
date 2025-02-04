import { formatNumber } from "../../../utils.mjs";
import BaseConfigSheet from "../api/base-config-sheet.mjs";

/**
 * Configuration application for armor class calculation.
 */
export default class ArmorClassConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["armor-class"],
    position: {
      width: 420
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
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
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.data = this.document.system.attributes.ac;
    context.fields = this.document.system.schema.fields.attributes.fields.ac.fields;
    context.source = this.document.system._source.attributes.ac;

    context.calculationOptions = Object.entries(CONFIG.DND5E.armorClasses).reduce((arr, [value, config]) => {
      if ( value === "custom" ) arr.push({ rule: true });
      arr.push({ value, label: config.label });
      if ( value === "natural" ) arr.push({ rule: true });
      return arr;
    }, []);

    const config = CONFIG.DND5E.armorClasses[context.source.calc];
    context.formula = {
      disabled: context.source.calc !== "custom",
      showFlat: ["flat", "natural"].includes(context.source.calc),
      value: (context.source.calc === "custom" ? context.source.formula : config?.formula) ?? ""
    };

    if ( context.formula.value.includes("@attributes.ac.dex") ) context.dexterity = context.data.dex;

    context.calculations = [];
    if ( context.formula.value.includes("@attributes.ac.armor") ) {
      for ( const key of ["armor", "shield"] ) {
        const item = context.data[`equipped${key.capitalize()}`];
        if ( !item ) continue;
        const val = item.system.armor.value - (item.system.magicAvailable ? (item.system.armor.magicalBonus ?? 0) : 0);
        context.calculations.push({
          anchor: item.toAnchor().outerHTML,
          img: item.img,
          magicalBonus: item.system.properties.has("mgc")
            ? formatNumber(item.system.armor.magicalBonus, { signDisplay: "always" }) : "—",
          name: item.name,
          value: formatNumber(val, { signDisplay: key === "shield" ? "always" : "auto" })
        });
      }
    }
    if ( context.source.calc !== "flat" ) {
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

    return context;
  }
}
