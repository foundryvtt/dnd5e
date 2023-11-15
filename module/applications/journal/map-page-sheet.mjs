/**
 * Journal entry page that displays a controls for editing map markers.
 */
export default class JournalMapLocationPageSheet extends JournalTextPageSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push("map");
    return options;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get template() {
    return `templates/journal/page-text-${this.isEditable ? "edit" : "view"}.html`;
  }

  /* -------------------------------------------- */

  async _renderInner(...args) {
    const jQuery = await super._renderInner(...args);

    const editingHeader = jQuery[0].querySelector(".journal-header");
    if ( editingHeader ) {
      const input = document.createElement("input");
      input.name = "system.code";
      input.type = "text";
      input.value = this.document.system.code ?? "";
      editingHeader.insertAdjacentElement("afterbegin", input);
    }

    else if ( jQuery[0].classList.contains("journal-page-header") && this.document.system.code ) {
      const span = document.createElement("span");
      span.innerText = this.document.system.code;
      span.classList.add("map-location-code");
      jQuery[0].querySelector(":is(h1, h2, h3)")?.insertAdjacentElement("afterbegin", span);
    }

    return jQuery;
  }
}
