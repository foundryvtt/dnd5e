import Advancement from "./advancement.mjs";
import SubclassFlow from "../../applications/advancement/subclass-flow.mjs";

/**
 * Advancement that indicates when a class takes a subclass. Only allowed on class items and can only be taken once.
 */
export default class SubclassAdvancement extends Advancement {

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      order: 70,
      icon: "icons/skills/trades/mining-pickaxe-yellow-blue.webp",
      typeIcon: "systems/dnd5e/icons/svg/subclass.svg",
      title: game.i18n.localize("DND5E.ADVANCEMENT.Subclass.Title"),
      hint: game.i18n.localize("DND5E.ADVANCEMENT.Subclass.Hint"),
      apps: {
        flow: SubclassFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  summaryforLevel(level, { configMode=false }={}) {
    const subclass = this.item.subclass;
    if ( configMode || !item ) return "";
    return subclass.toAnchor({ classes: ["content-link"] }).outerHTML;
  }

  /* -------------------------------------------- */
  /*  Editing Methods                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static availableForItem(item) {
    return !item.advancement.byType.Subclass?.length;
  }
}
