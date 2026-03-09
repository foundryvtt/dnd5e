import ApplicationV2Mixin from "./api/application-v2-mixin.mjs";

const { RollTableSheet } = foundry.applications.sheets;

/**
 * Extension of the default roll table sheet to add dnd5e styling.
 */
export default class RollTableSheet5e extends ApplicationV2Mixin(RollTableSheet, { handlebars: false }) {

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      editImage: RollTableSheet5e._onEditImage
    },
    classes: ["titlebar", "hidden-title"]
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
    this._replaceElements('table td.image img[src$=".svg"]', "dnd5e-icon", {
      callback: icon => {
        if ( icon.src === "icons/svg/d20-black.svg" ) icon.src = "systems/dnd5e/icons/svg/dice/d20.svg";
      }
    });
    this.element.querySelectorAll("table td.image img").forEach(icon => icon.classList.add("gold-icon"));
  }
}
