/**
 * Bit of text with a button after it for copying it.
 */
export default class CopyableTextElement extends HTMLElement {
  /** @override */
  connectedCallback() {
    this.#controller = new AbortController();
    const button = document.createElement("button");
    button.ariaLabel = this.getAttribute("label") ?? game.i18n.localize("DND5E.Copy");
    button.classList.add("copy-button");
    button.dataset.tooltip = button.ariaLabel;
    button.innerHTML = '<i class="fa-regular fa-clipboard" inert></i>';
    this.addEventListener("click", this._onClick.bind(this), { signal: this.#controller.signal });
    this.append(button);
  }

  /* -------------------------------------------- */

  /**
   * Controller for removing listeners automatically.
   * @type {AbortController}
   */
  #controller;

  /* -------------------------------------------- */

  /** @override */
  disconnectedCallback() {
    this.#controller.abort();
    this.querySelector("button")?.remove();
  }

  /* -------------------------------------------- */

  /**
   * Handle copying the contents.
   * @param {PointerEvent} event  Triggering click event.
   */
  _onClick(event) {
    event.preventDefault();
    event.stopPropagation();
    const value = this.getAttribute("value") ?? this.innerText;
    game.clipboard.copyPlainText(value);
    game.tooltip.activate(event.target, { text: game.i18n.format("DND5E.Copied", { value }), direction: "UP" });
  }
}
