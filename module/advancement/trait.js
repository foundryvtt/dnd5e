import { Advancement } from "./advancement.js";

/**
 * Advancement that grants the player with certain traits or presents them with a list of traits from which
 * to choose.
 *
 * @extends {Advancement}
 */
export class TraitAdvancement extends Advancement {

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static order = 30;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultTitle = "DND5E.AdvancementTraitTitle";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultIcon = "icons/svg/sun.svg";

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  configuredForLevel(level) {
    return !foundry.utils.isObjectEmpty(this.data.value);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  summaryForLevel(level) {
    if ( !this.data.value.chosen ) return "";
    return this.data.value.chosen.reduce((html, key) => {
      html += `<span class="tag">${this.labelForKey(key)}</span>\n`;
      return html;
    }, "");
  }

  /**
   * Retrieve the proper display label for the provided key.
   * @param {string} key  Key for which to generate the label.
   * @returns {string}    Retrieved label.
   */
  labelForKey(key) {
    const type = this.data.configuration.type;
    if ( ["armor", "tool", "weapon"].includes(type) ) {
      const categories = CONFIG.DND5E[`${type}Proficiencies`];
      if ( categories[key] ) return categories[key];

      if ( type === "tool" && CONFIG.DND5E.vehicleTypes[key] ) {
        return CONFIG.DND5E.vehicleTypes[key];
      }

      const item = game.dnd5e.applications.ProficiencySelector.getBaseItem(
        CONFIG.DND5E[`${type}Ids`][key], { indexOnly: true });
      return item?.name ?? key;
    }

    const source = (type === "saves") ? CONFIG.DND5E.abilities : CONFIG.DND5E[type];
    return source ? source[key] ?? key : key;
  }

}
