import { areKeysPressed } from "../../utils.mjs";
import DragDrop5e from "../../drag-drop.mjs";

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
      const data = DragDrop5e.getPayload(event);
      DragDrop5e.dropEffect = event.dataTransfer.dropEffect = (foundry.utils.getType(data) === "Object")
        ? this._dropBehavior(event, data) : "copy";
    }

    /* -------------------------------------------- */

    /**
     * The behavior for the dropped data. When called during the drop event, ensure this is called before awaiting
     * anything or the drop behavior will be lost.
     * @param {DragEvent} event  The drag event.
     * @param {object} [data]    The drag payload.
     * @returns {DropEffectValue}
     */
    _dropBehavior(event, data) {
      data ??= DragDrop5e.getPayload(event);
      const allowed = this._allowedDropBehaviors(event, data);
      let behavior = DragDrop5e.dropEffect ?? event.dataTransfer?.dropEffect;

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
     * @param {object} [data]    The drag payload.
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
     * @param {object} [data]    The drag payload.
     * @returns {DropEffectValue}
     * @protected
     */
    _defaultDropBehavior(event, data) {
      return "copy";
    }
  };
}
