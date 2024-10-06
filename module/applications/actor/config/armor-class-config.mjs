import { formatNumber } from "../../../utils.mjs";
import BaseConfigSheet from "../api/base-config-sheet.mjs";

/**
 * Configuration application for armor class calculation.
 */
export default class ActorArmorConfig extends BaseConfigSheet {
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
    context.source = this.document.system.toObject().attributes.ac;

    context.calculationOptions = Object.entries(CONFIG.DND5E.armorClasses).reduce((arr, [value, config]) => {
      if ( value === "custom" ) arr.push({ rule: true });
      arr.push({ value, label: config.label });
      if ( value === "natural" ) arr.push({ rule: true });
      return arr;
    }, []);

    // Display active effects targeting bonus
    context.effects = {
      bonuses: this.document._prepareActiveEffectAttributions("system.attributes.ac.bonus")
        .filter(e => e.mode === CONST.ACTIVE_EFFECT_MODES.ADD)
    };

    context.equipped = {};
    for ( const key of ["armor", "shield"] ) {
      const item = context.data[`equipped${key.capitalize()}`];
      if ( !item ) continue;
      context.equipped[key] = {
        anchor: item.toAnchor().outerHTML,
        img: item.img,
        magicalBonus: formatNumber(
          item.system.properties.has("mgc") ? item.system.armor.magicalBonus : 0, { signDisplay: "always" }
        ),
        name: item.name,
        value: formatNumber(item.system.armor.base, { signDisplay: key === "shield" ? "always" : "auto" })
      };
    }
    if ( foundry.utils.isEmpty(context.equipped) ) delete context.equipped;

    const config = CONFIG.DND5E.armorClasses[context.source.calc];
    context.formula = {
      disabled: context.source.calc !== "custom",
      showFlat: ["flat", "natural"].includes(context.source.calc),
      value: context.source.calc === "custom" ? context.source.formula : (config?.formula ?? "")
    };

    return context;
  }
}
