/**
 * @typedef {import("../../drag-drop.mjs").DropEffectValue} DropEffectValue
 */

/**
 * Adds drop behavior functionality to all sheets.
 * @param {typeof Application} Base  The base class being mixed.
 * @returns {typeof DragDropApplication}
 */
export default function DragDropApplicationMixin(Base) {
  return class DragDropApplication extends Base {
    /** @override */
    _onDragOver(event) {
      const data = DragDrop.getPayload(event);
      if ( foundry.utils.getType(data) === "Object" ) {
        event.dataTransfer.dropEffect = this._dropBehavior(event, data);
      } else {
        event.dataTransfer.dropEffect = "copy";
      }
    }

    /* -------------------------------------------- */

    /**
     * The behavior for the dropped data.
     * @param {DragEvent} event  The drag event.
     * @param {object} data      The drag payload.
     * @returns {DropEffectValue}
     */
    _dropBehavior(event, data) {
      const allowed = this._allowedDropBehaviors(event, data);
      let behavior = event.dataTransfer.dropEffect;

      if ( event.type === "dragover" ) {
        behavior = this._defaultDropBehavior(event, data);

        // An initial `dropEffect` of `copy` indicates that a modifier key is held down
        if ( (event.type === "dragover") && (event.dataTransfer.dropEffect === "copy") ) {
          if ( (behavior === "copy") && allowed.has("move") ) return "move";
          else if ( (behavior === "move") && allowed.has("copy") ) return "copy";
        }
      }

      if ( (behavior !== "none") && !allowed.has(behavior) ) return allowed.first() ?? "none";
      return behavior || "copy";
    }

    /* -------------------------------------------- */

    /**
     * Types of allowed drop behaviors based on the origin & target of a drag event.
     * @param {DragEvent} event  The drag event.
     * @param {object} data      The drag payload.
     * @returns {Set<DropEffectValue>}
     * @protected
     */
    _allowedDropBehaviors(event, data) {
      return new Set();
    }

    /* -------------------------------------------- */

    /**
     * Determine the default drop behavior for the provided operation.
     * @param {DragEvent} event  The drag event.
     * @param {object} data      The drag payload.
     * @returns {DropEffectValue}
     * @protected
     */
    _defaultDropBehavior(event, data) {
      return "copy";
    }
  };
}
