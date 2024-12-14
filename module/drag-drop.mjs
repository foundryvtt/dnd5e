/**
 * Valid `dropEffect` value (see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/dropEffect).
 * @typedef {"copy"|"move"|"link"|"none"} DropEffectValue
 */

/**
 * Extension of core's DragDrop class to provide additional information used by the system. Will replace core's
 * version in the global namespace.
 */
export default class DragDrop5e extends DragDrop {

  /**
   * Stored drag event payload.
   * @type {{ data: any, event: DragEvent }|null}
   */
  static #payload = null;

  /* -------------------------------------------- */

  /** @inheritDoc */
  bind(html) {
    super.bind(html);

    // Add dragend event handler to the existing dragstart event
    if ( this.can("dragstart", this.dragSelector) ) {
      const draggables = html.querySelectorAll(this.dragSelector);
      for ( const el of draggables ) {
        el.ondragend = this._handleDragEnd.bind(this);
      }
    }

    return this;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _handleDragStart(event) {
    await this.callback(event, "dragstart");
    if ( event.dataTransfer.items.length ) {
      event.stopPropagation();
      const data = event.dataTransfer.getData("application/json") || event.dataTransfer.getData("text/plain");
      DragDrop5e.#payload = data ? { event, data } : null;
    } else {
      DragDrop5e.#payload = null;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle the end of a drag workflow
   * @param {DragEvent} event   The drag event being handled
   * @private
   */
  async _handleDragEnd(event) {
    await this.callback(event, "dragend");
    DragDrop5e.#payload = null;
  }

  /* -------------------------------------------- */

  /**
   * Get the data payload for the current drag event.
   * @param {DragEvent} event
   * @returns {object|string|null}
   */
  static getPayload(event) {
    if ( !DragDrop5e.#payload?.data ) return null;
    try {
      return JSON.parse(DragDrop5e.#payload.data);
    } catch(err) {
      return DragDrop5e.#payload.data;
    }
  }
}
