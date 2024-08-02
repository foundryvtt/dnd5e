import ContainerSheet from "./container-sheet.mjs";
import ItemSheetV2Mixin from "./sheet-v2-mixin.mjs";

export default class ContainerSheet2 extends ItemSheetV2Mixin(ContainerSheet) {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "sheet", "item"],
      width: 500,
      height: "auto",
      resizable: false,
      scrollY: [".tab.active"]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    return "systems/dnd5e/templates/items/item-sheet-2.hbs";
  }
}
