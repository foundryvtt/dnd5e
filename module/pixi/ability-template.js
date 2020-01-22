import { DND5E } from "../config.js";

/**
 * A helper class for building MeasuredTemplates for 5e spells and abilities
 * @extends {MeasuredTemplate}
 */
export class AbilityTemplate extends MeasuredTemplate {

  /**
   * A factory method to create an AbilityTemplate instance using provided data from an Item5e instance
   * @param {Item5e} item               The Item object for which to construct the template
   * @return {AbilityTemplate|null}     The template object, or null if the item does not produce a template
   */
  static fromItem(item) {
    const target = getProperty(item.data, "data.target") || {};
    const templateShape = DND5E.areaTargetTypes[target.type];
    if ( !templateShape ) return null;

    // Prepare template data
    const templateData = {
      t: templateShape,
      user: game.user._id,
      distance: target.value,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: game.user.color
    };

    // Additional type-specific data
    switch ( templateShape ) {
      case "rect": // 5e rectangular AoEs are always cubes
        templateData.width = target.value;
        templateData.direction = 45;
        break;
      case "ray": // 5e rays are most commonly 5ft wide
        templateData.width = 5;
        break;
      default:
        break;
    }

    // Return the template constructed from the item data
    return new this(templateData);
  }

  /* -------------------------------------------- */

  /**
   * Creates a preview of the spell template
   * @param {Event} event   The initiating click event
   */
  drawPreview(event) {
    const initialLayer = canvas.activeLayer;
    this.draw();
    this.layer.activate();
    this.layer.preview.addChild(this);
    this.activatePreviewListeners(initialLayer);
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for the template preview
   * @param {CanvasLayer}   The initially active CanvasLayer to re-activate after the workflow is complete
   */
  activatePreviewListeners(initialLayer) {
    const handlers = {};

    // Update placement (mouse-move)
    handlers.mm = event => {
      event.stopPropagation();
      const center = event.data.getLocalPosition(this.layer);
      this.data.x = center.x;
      this.data.y = center.y;
      this.refresh();
    };

    // Cancel the workflow (right-click)
    handlers.rc = event => {
      this.layer.preview.removeChildren();
      canvas.stage.off("mousemove", handlers.mm);
      canvas.stage.off("mousedown", handlers.lc);
      canvas.app.view.oncontextmenu = null;
      canvas.app.view.onwheel = null;
      initialLayer.activate();
    };

    // Confirm the workflow (left-click)
    handlers.lc = event => {
      handlers.rc(event);

      // Confirm final snapped position
      const destination = canvas.grid.getSnappedPosition(this.x, this.y, 2);
      this.data.x = destination.x;
      this.data.y = destination.y;

      // Create the template
      canvas.scene.createEmbeddedEntity("MeasuredTemplate", this.data);
    };

    // Rotate the template (mouse-wheel)
    handlers.mw = event => {
      event.stopPropagation();
      this.data.direction += event.deltaY * 0.1;
      this.refresh();
    };

    // Activate listeners
    canvas.stage.on("mousemove", handlers.mm);
    canvas.stage.on("mousedown", handlers.lc);
    canvas.app.view.oncontextmenu = handlers.rc;
    canvas.app.view.onwheel = handlers.mw;
  }
}
