import { Advancement } from "./advancement.js";

/**
 * Advancement that presents the player with a choice of multiple items that they can take. Keeps track of which
 * items were selected at which levels.
 *
 * @extends {Advancement}
 */
export class ItemChoiceAdvancement extends Advancement {

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static order = 20;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultTitle = "DND5E.AdvancementItemChoiceTitle";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultIcon = "icons/svg/stone-path.svg";

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */
  
  /** @inheritdoc */
  titleForLevel(level) {
    return `${this.title} <em>(${game.i18n.localize("DND5E.AdvancementChoices")})</em>`;
  }

}
