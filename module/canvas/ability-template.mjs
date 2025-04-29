/**
 * A helper class for building MeasuredTemplates for 5e spells and abilities
 */
export default class AbilityTemplate extends foundry.canvas.placeables.MeasuredTemplate {

  /**
   * Track the timestamp when the last mouse move event was captured.
   * @type {number}
   */
  #moveTime = 0;

  /* -------------------------------------------- */

  /**
   * Current token that is highlighted when using adjusted size template.
   * @type {Token5e}
   */
  #hoveredToken;

  /* -------------------------------------------- */

  /**
   * The initially active CanvasLayer to re-activate after the workflow is complete.
   * @type {CanvasLayer}
   */
  #initialLayer;

  /* -------------------------------------------- */

  /**
   * Track the bound event handlers so they can be properly canceled later.
   * @type {object}
   */
  #events;

  /* -------------------------------------------- */

  /**
   * A factory method to create an AbilityTemplate instance using provided data from an Activity instance.
   * @param {Activity} activity         The Activity for which to construct the template.
   * @param {object} [options={}]       Options to modify the created template.
   * @returns {AbilityTemplate[]|null}  The template objects, or null if the item does not produce a template.
   */
  static fromActivity(activity, options={}) {
    const target = activity.target?.template ?? {};
    const templateShape = dnd5e.config.areaTargetTypes[target.type]?.template;
    if ( !templateShape ) return null;

    // Prepare template data
    const rollData = activity.getRollData();
    const templateData = foundry.utils.mergeObject({
      t: templateShape,
      user: game.user.id,
      distance: target.size,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: game.user.color,
      flags: { dnd5e: {
        dimensions: {
          size: target.size,
          width: target.width,
          height: target.height,
          adjustedSize: target.type === "radius"
        },
        item: activity.item.uuid,
        origin: activity.uuid,
        spellLevel: rollData.item.level
      } }
    }, options);

    // Additional type-specific data
    switch ( templateShape ) {
      case "cone":
        templateData.angle = CONFIG.MeasuredTemplate.defaults.angle;
        break;
      case "rect": // 5e rectangular AoEs are always cubes
        templateData.width = target.size;
        if ( game.settings.get("dnd5e", "gridAlignedSquareTemplates") ) {
          templateData.distance = Math.hypot(target.size, target.size);
          templateData.direction = 45;
        } else {
          // Override as 'ray' to make the template able to be rotated without morphing its shape
          templateData.t = "ray";
        }
        break;
      case "ray": // 5e rays are most commonly 1 square (5 ft) in width
        templateData.width = target.width ?? canvas.dimensions.distance;
        break;
      default:
        break;
    }

    /**
     * A hook event that fires before a template is created for an Activity.
     * @function dnd5e.preCreateActivityTemplate
     * @memberof hookEvents
     * @param {Activity} activity    Activity for which the template is being placed.
     * @param {object} templateData  Data used to create the new template.
     * @returns {boolean}            Explicitly return `false` to prevent the template from being placed.
     */
    if ( Hooks.call("dnd5e.preCreateActivityTemplate", activity, templateData) === false ) return null;

    // Construct the templates from activity data
    const cls = CONFIG.MeasuredTemplate.documentClass;
    const created = Array.fromRange(target.count || 1).map(() => {
      const template = new cls(foundry.utils.deepClone(templateData), { parent: canvas.scene });
      const object = new this(template);
      object.activity = activity;
      object.item = activity.item;
      object.actorSheet = activity.actor?.sheet || null;
      return object;
    });

    /**
     * A hook event that fires after a template are created for an Activity.
     * @function dnd5e.createActivityTemplate
     * @memberof hookEvents
     * @param {Activity} activity            Activity for which the template is being placed.
     * @param {AbilityTemplate[]} templates  The templates being placed.
     */
    Hooks.callAll("dnd5e.createActivityTemplate", activity, created);

    return created;
  }

  /* -------------------------------------------- */

  /**
   * Creates a preview of the spell template.
   * @returns {Promise}  A promise that resolves with the final measured template if created.
   */
  drawPreview() {
    const initialLayer = canvas.activeLayer;

    // Draw the template and switch to the template layer
    this.draw();
    this.layer.activate();
    this.layer.preview.addChild(this);

    // Hide the sheet that originated the preview
    this.actorSheet?.minimize();

    // Activate interactivity
    return this.activatePreviewListeners(initialLayer);
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for the template preview
   * @param {CanvasLayer} initialLayer  The initially active CanvasLayer to re-activate after the workflow is complete
   * @returns {Promise}                 A promise that resolves with the final measured template if created.
   */
  activatePreviewListeners(initialLayer) {
    return new Promise((resolve, reject) => {
      this.#initialLayer = initialLayer;
      this.#events = {
        cancel: this._onCancelPlacement.bind(this),
        confirm: this._onConfirmPlacement.bind(this),
        move: this._onMovePlacement.bind(this),
        resolve,
        reject,
        rotate: this._onRotatePlacement.bind(this)
      };

      // Activate listeners
      canvas.stage.on("mousemove", this.#events.move);
      canvas.stage.on("mouseup", this.#events.confirm);
      canvas.app.view.oncontextmenu = this.#events.cancel;
      canvas.app.view.onwheel = this.#events.rotate;
    });
  }

  /* -------------------------------------------- */

  /**
   * Shared code for when template placement ends by being confirmed or canceled.
   * @param {Event} event  Triggering event that ended the placement.
   */
  async _finishPlacement(event) {
    this.layer._onDragLeftCancel(event);
    canvas.stage.off("mousemove", this.#events.move);
    canvas.stage.off("mouseup", this.#events.confirm);
    canvas.app.view.oncontextmenu = null;
    canvas.app.view.onwheel = null;
    if ( this.#hoveredToken ) {
      this.#hoveredToken._onHoverOut(event);
      this.#hoveredToken = null;
    }
    this.#initialLayer.activate();
    await this.actorSheet?.maximize();
  }

  /* -------------------------------------------- */

  /**
   * Move the template preview when the mouse moves.
   * @param {Event} event  Triggering mouse event.
   */
  _onMovePlacement(event) {
    event.stopPropagation();
    const now = Date.now(); // Apply a 20ms throttle
    if ( now - this.#moveTime <= 20 ) return;
    const center = event.data.getLocalPosition(this.layer);
    const updates = this.getSnappedPosition(center);

    // Adjust template size to take hovered token into account if `adjustedSize` is set
    const baseDistance = this.document.flags.dnd5e?.dimensions?.size;
    if ( this.document.flags.dnd5e?.dimensions?.adjustedSize && baseDistance ) {
      const rectangle = new PIXI.Rectangle(center.x, center.y, 1, 1);
      const hoveredToken = canvas.tokens.quadtree.getObjects(rectangle, {
        collisionTest: ({ t }) => t.visible && !t.document.isSecret }).first();
      if ( hoveredToken && (hoveredToken !== this.#hoveredToken) ) {
        this.#hoveredToken = hoveredToken;
        this.#hoveredToken._onHoverIn(event);
        const size = Math.max(hoveredToken.document.width, hoveredToken.document.height);
        updates.distance = baseDistance + (size * canvas.grid.distance / 2);
      } else if ( !hoveredToken && this.#hoveredToken ) {
        this.#hoveredToken._onHoverOut(event);
        this.#hoveredToken = null;
        updates.distance = baseDistance;
      }
    }

    this.document.updateSource(updates);
    this.refresh();
    this.#moveTime = now;
  }

  /* -------------------------------------------- */

  /**
   * Rotate the template preview by 3˚ increments when the mouse wheel is rotated.
   * @param {Event} event  Triggering mouse event.
   */
  _onRotatePlacement(event) {
    if ( event.ctrlKey ) event.preventDefault(); // Avoid zooming the browser window
    event.stopPropagation();
    const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
    const snap = event.shiftKey ? delta : 5;
    const update = {direction: this.document.direction + (snap * Math.sign(event.deltaY))};
    this.document.updateSource(update);
    this.refresh();
  }

  /* -------------------------------------------- */

  /**
   * Confirm placement when the left mouse button is clicked.
   * @param {Event} event  Triggering mouse event.
   */
  async _onConfirmPlacement(event) {
    await this._finishPlacement(event);
    const destination = canvas.templates.getSnappedPoint({ x: this.document.x, y: this.document.y });
    this.document.updateSource(destination);
    this.#events.resolve(canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [this.document.toObject()]));
  }

  /* -------------------------------------------- */

  /**
   * Cancel placement when the right mouse button is clicked.
   * @param {Event} event  Triggering mouse event.
   */
  async _onCancelPlacement(event) {
    await this._finishPlacement(event);
    this.#events.reject();
  }

}
