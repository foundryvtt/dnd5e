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
  static order = 40;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultTitle = "DND5E.AdvancementItemGrantTitle";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultIcon = "icons/svg/book.svg";

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
    return this.data.configuration.items.reduce((html, uuid) => {
      const [scope, collection, id] = uuid.split(".");
      const pack = game.packs.get(`${scope}.${collection}`);
      const name = pack?.index.get(id)?.name;
      if ( !name ) return html;
      html += `<a class="entity-link content-link" data-pack="${scope}.${collection}" data-id="${id}">${name}</a>\n`;
      return html;
    }, "");
  }

}
