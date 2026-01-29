import ApplicationV2Mixin from "./api/application-v2-mixin.mjs";

const { RollTableSheet } = foundry.applications.sheets;

/**
 * Extension of the default roll table sheet to add dnd5e styling.
 */
export default class RollTableSheet5e extends ApplicationV2Mixin(RollTableSheet, { handlebars: false }) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["titlebar"]
  };

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    this._renderModeToggle();
    this.element.querySelector(".sheet-header img")?.classList.add("document-image");
    this.element.querySelector(".sheet-header [data-action=changeMode]")?.remove();
    this.element.querySelectorAll("tbody .inline-control").forEach(c => c.classList.add("unbutton", "control-button"));
    this._replaceElements("input[type=checkbox]", "dnd5e-checkbox");
    this._replaceElements('table img[src$=".svg"]', "dnd5e-icon");
  }

  /* -------------------------------------------- */

  /**
   * Replace all matching elements with a new tag, keeping all existing attributes.
   * @param {string} selector  CSS selector to find elements to replace.
   * @param {string} tagName   Tag name for the new element to use.
   * @protected
   */
  _replaceElements(selector, tagName) {
    for ( const oldElement of this.element.querySelectorAll(selector) ) {
      const newElement = document.createElement(tagName);
      for ( const attr of oldElement.attributes ) {
        newElement.setAttribute(attr.name, attr.value);
      }
      newElement.innerHTML = oldElement.innerHTML;
      oldElement.replaceWith(newElement);
    }
  }
}
