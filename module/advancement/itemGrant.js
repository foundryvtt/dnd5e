import { Advancement } from "./advancement.js";

/**
 * Advancement that automatically grants one or more items to the player. Presents the player with the option of
 * skipping any or all of the items.
 *
 * @extends {Advancement}
 */
export class ItemGrantAdvancement extends Advancement {

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static order = 10;

  /* -------------------------------------------- */
  
  /** @inheritdoc */
  static defaultTitle = "DND5E.AdvancementItemGrantTitle";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultIcon = "icons/svg/book.svg";

}
