/**
 * Mixin method for v2-style dialogs.
 * @param {typeof Application} Base   Application class being extended.
 * @returns {class}
 * @mixin
 */
export default Base => class extends Base {
  /** @inheritDoc */
  async _renderOuter() {
    const html = await super._renderOuter();
    const header = html[0].querySelector(".window-header");
    header.querySelectorAll(".header-button").forEach(btn => {
      const label = btn.querySelector(":scope > i").nextSibling;
      btn.dataset.tooltip = label.textContent;
      btn.setAttribute("aria-label", label.textContent);
      label.remove();
    });
    return html;
  }
};
