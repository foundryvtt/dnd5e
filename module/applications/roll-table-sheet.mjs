import ApplicationV2Mixin from "./api/application-v2-mixin.mjs";

/**
 * Extension of the default roll table sheet to add dnd5e styling.
 */
export default class RollTableSheet5e extends ApplicationV2Mixin(foundry.applications.sheets.RollTableSheet) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["titlebar"]
  };

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);

    this._renderModeToggle();
    this.element.querySelector(".sheet-header img")?.classList.add("document-image");
    this.element.querySelector(".sheet-header [data-action=changeMode]")?.remove();
    this.element.querySelectorAll("tbody .inline-control").forEach(c => c.classList.add("unbutton", "control-button"));
    this.element.querySelectorAll("input[type=checkbox]").forEach(oldCheckbox => {
      const newCheckbox = document.createElement("dnd5e-checkbox");
      for ( const attr of oldCheckbox.attributes ) {
        newCheckbox.setAttribute(attr.name, attr.value);
      }
      oldCheckbox.replaceWith(newCheckbox);
    });
  }
}
