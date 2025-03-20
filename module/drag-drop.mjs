/**
 * Valid `dropEffect` value (see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/dropEffect).
 * @typedef {"copy"|"move"|"link"|"none"} DropEffectValue
 */

/**
 * Extension of core's DragDrop class to provide additional information used by the system. Will replace core's
 * version in the global namespace.
 */
export default class DragDrop5e extends (foundry.applications?.ux?.DragDrop ?? DragDrop) {

  /**
   * Drop effect used for current drag operation.
   * @type {DropEffectValue|null}
   */
  static dropEffect = null;

  /* -------------------------------------------- */

  /**
   * Stored drag event payload.
   * @type {{ data: any, event: DragEvent }|null}
   */
  static #payload = null;

  /* -------------------------------------------- */

  /** @override */
  bind(html) {
    // Identify and activate draggable targets
    const canDrag = !!this.dragSelector && this.can("dragstart", this.dragSelector);
    const draggables = this.dragSelector ? html.querySelectorAll(this.dragSelector) : [];
    for ( const element of draggables ) {
      element.setAttribute("draggable", canDrag);
      element.ondragstart = canDrag ? DragDrop5e.prototype._handleDragStart.bind(this) : null;
      element.ondragend = DragDrop5e.prototype._handleDragEnd.bind(this);
    }

    // Identify and activate drop targets
    const canDrop = this.can("drop", this.dropSelector);
    const droppables = !this.dropSelector || html.matches(this.dropSelector) ? [html]
      : html.querySelectorAll(this.dropSelector);
    for ( const element of droppables ) {
      element.ondragover = canDrop ? DragDrop5e.prototype._handleDragOver.bind(this) : null;
      element.ondrop = canDrop ? DragDrop5e.prototype._handleDrop.bind(this) : null;
    }
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Handle the start of a drag workflow.
   * @param {DragEvent} event  The drag event.
   * @protected
   */
  async _handleDragStart(event) {
    await this.callback(event, "dragstart");
    if ( event.dataTransfer.items.length ) {
      event.stopPropagation();
      let data = event.dataTransfer.getData("application/json") || event.dataTransfer.getData("text/plain");
      try { data = JSON.parse(data); } catch(err) {}
      DragDrop5e.#payload = data ? { event, data } : null;
    } else {
      DragDrop5e.#payload = null;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle the end of a drag workflow
   * @param {DragEvent} event   The drag event being handled
   * @protected
   */
  async _handleDragEnd(event) {
    await this.callback(event, "dragend");
    DragDrop5e.dropEffect = null;
    DragDrop5e.#payload = null;
  }

  /* -------------------------------------------- */

  /**
   * Handle a dragged element moving over a droppable target.
   * @param {DragEvent} event  The drag event.
   * @returns {false}
   * @protected
   */
  _handleDragOver(event) {
    event.preventDefault();
    this.callback(event, "dragover");
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle a dragged element being dropped on a droppable target.
   * @param {DragEvent} event  The drag event.
   * @returns {any}
   * @protected
   */
  _handleDrop(event) {
    event.preventDefault();
    return this.callback(event, "drop");
  }

  /* -------------------------------------------- */

  /**
   * Get the data payload for the current drag event.
   * @param {DragEvent} event
   * @returns {any}
   */
  static getPayload(event) {
    if ( !DragDrop5e.#payload?.data ) return null;
    return DragDrop5e.#payload.data;
  }
}

/* -------------------------------------------- */

/**
 * Extend native DragDrop with functionality for storing payloads.
 * TODO: Remove when payload functionality is incorporated into core DragDrop.
 */
export function extendDragDrop() {
  (foundry.applications?.ux?.DragDrop ?? DragDrop).prototype.bind = DragDrop5e.prototype.bind;
}
