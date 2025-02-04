import { areKeysPressed } from "../../utils.mjs";

/**
 * @import { DropEffectValue } from "../../drag-drop.mjs"
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
      DragDrop.dropEffect = event.dataTransfer.dropEffect = (foundry.utils.getType(data) === "Object")
        ? this._dropBehavior(event, data) : "copy";
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
      let behavior = DragDrop.dropEffect ?? event.dataTransfer?.dropEffect;

      if ( event.type === "dragover" ) {
        if ( areKeysPressed(event, "dragMove") ) behavior = "move";
        else if ( areKeysPressed(event, "dragCopy") ) behavior = "copy";
        else behavior = this._defaultDropBehavior(event, data);
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
