import { Advancement } from "./advancement.js";

/**
 * Advancement that presents the player with the option of improving their ability scores or selecting a feat.
 *
 * @extends {Advancement}
 */
export class AbilityScoreImprovementAdvancement extends Advancement {

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static order = 1;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultTitle = "DND5E.AdvancementAbilityScoreImprovementTitle";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultIcon = "icons/svg/upgrade.svg";

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  titleForLevel(level) {
    if ( this.data.value.selected !== "feat" ) return this.title;
    return game.i18n.localize("DND5E.AdvancementFeatTitle");
  }

  /** @inheritdoc */
  summaryForLevel(level) {
    if ( (this.data.value.selected === "feat") && this.data.value.feat ) {

      const [scope, collection, id] = this.data.value.feat.split(".");
      const pack = game.packs.get(`${scope}.${collection}`);
      const name = pack?.index.get(id)?.name;
      if ( name ) return `<a class="entity-link" data-pack="${scope}.${collection}" data-id="${id}">${name}</a>`;

    } else if ( (this.data.value.selected === "asi") && this.data.value.improvements ) {

      const formatter = new Intl.NumberFormat(game.i18n.lang, { signDisplay: "always" });
      return Object.entries(this.data.value.improvements).reduce((html, [key, value]) => {
        const name = CONFIG.DND5E.abilities[key] ?? key;
        html += `<span class="tag">${name} <strong>${formatter.format(value)}</strong></span>\n`;
        return html;
      }, "");

    }
    return "";
  }

}
