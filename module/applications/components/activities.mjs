import ContextMenu5e from "../context-menu.mjs";

/**
 * Custom element that handles displaying activities lists.
 */
export default class ActivitiesElement extends (foundry.applications.elements.AdoptableHTMLElement ?? HTMLElement) {
  connectedCallback() {
    if ( this.#app ) return;
    this.#app = foundry.applications.instances.get(this.closest(".application")?.id);

    for ( const control of this.querySelectorAll("[data-context-menu]") ) {
      control.addEventListener("click", ContextMenu5e.triggerEvent);
    }

    new ContextMenu5e(this, "[data-activity-id]", [], {
      onOpen: target => dnd5e.documents.activity.UtilityActivity.onContextMenu(this.document, target), jQuery: false
    });
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The HTML tag named used by this element.
   * @type {string}
   */
  static tagName = "dnd5e-activities";

  /* -------------------------------------------- */

  /**
   * The application that contains this component.
   * @type {ApplicationV2}
   */
  get app() {
    return this.#app;
  }

  #app;

  /* -------------------------------------------- */

  /**
   * The Document containing the activities.
   * @type {Document}
   */
  get document() {
    return this.app.document;
  }
}
