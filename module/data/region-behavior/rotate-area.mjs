const {
  AngleField, ArrayField, BooleanField, DocumentIdField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

const { Ray } = foundry.canvas.geometry;

/**
 * @typedef {number} Degrees
 */

/**
 * @typedef Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {number} Radians
 */

/**
 * @typedef Size
 * @property {number} width
 * @property {number} height
 */

/**
 * The data model for a region behavior that rotates tokens in its area around a center point along with any
 * other specified placeables.
 */
export default class RotateAreaRegionBehaviorType extends foundry.data.regionBehaviors.RegionBehaviorType {

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.REGIONBEHAVIORS.ROTATEAREA"];

  /* ---------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      time: new SchemaField({
        value: new NumberField({ required: true, initial: 1000, min: 0, integer: true }),
        mode: new StringField({
          required: true, initial: "fixed", choices: RotateAreaRegionBehaviorType.SPEED_MODES
        })
      }),
      tiles: new SchemaField({
        ids: new SetField(new DocumentIdField())
      }),
      walls: new SchemaField({
        ids: new SetField(new DocumentIdField()),
        link: new BooleanField({ initial: true })
      }),
      lights: new SchemaField({
        ids: new SetField(new DocumentIdField())
      }),
      regions: new SchemaField({
        ids: new SetField(new DocumentIdField())
      }),
      sounds: new SchemaField({
        ids: new SetField(new DocumentIdField())
      }),
      directionMode: new StringField({
        required: true, initial: "short", choices: RotateAreaRegionBehaviorType.DIRECTION_MODES
      }),
      positions: new ArrayField(new SchemaField({
        angle: new NumberField({ required: true, nullable: false, initial: 0, min: -360, max: 360 })
      }), { initial: [{ angle: 0 }] }),
      status: new SchemaField({
        angle: new AngleField({ required: true, initial: 0, hidden: true }),
        position: new NumberField({ initial: 0, integer: true, min: 0, hidden: true }),
        rotating: new BooleanField({ hidden: true })
      })
    };
  }

  /* ---------------------------------------- */

  /**
   * Modes for determining rotation direction when moving to the next point.
   * @type {Record<string, string>}
   */
  static DIRECTION_MODES = Object.seal({
    cw: "DND5E.REGIONBEHAVIORS.ROTATEAREA.DirectionMode.Clockwise",
    ccw: "DND5E.REGIONBEHAVIORS.ROTATEAREA.DirectionMode.CounterClockwise",
    short: "DND5E.REGIONBEHAVIORS.ROTATEAREA.DirectionMode.Shortest",
    long: "DND5E.REGIONBEHAVIORS.ROTATEAREA.DirectionMode.Longest"
  });

  /* ---------------------------------------- */

  /**
   * Modes for mapping rotation time to final speed.
   * @type {Record<string, string>}
   */
  static SPEED_MODES = Object.seal({
    fixed: "DND5E.REGIONBEHAVIORS.ROTATEAREA.SpeedMode.Fixed",
    variable: "DND5E.REGIONBEHAVIORS.ROTATEAREA.SpeedMode.Variable"
  });

  /* ---------------------------------------- */
  /*  Rotation                                */
  /* ---------------------------------------- */

  /**
   * Rotate to the next position.
   * @param {boolean} [reverse=false]  Rotate to previous position instead of next one.
   * @returns {Promise<boolean>}       Resolves once rotation is complete.
   */
  async rotate(reverse=false) {
    let position = this.status.position + (reverse ? -1 : 1);
    if ( position >= this.positions.length ) position = 0;
    else if ( position < 0 ) position = this.positions.length - 1;
    return this.rotateTo({ position });
  }

  /* ---------------------------------------- */

  /**
   * Trigger the rotator to rotate to a angle or specific position. Either the angle or position must be provided.
   * @param {object} options
   * @param {number} [options.angle]     Final angle.
   * @param {string} [options.position]  Position index to rotate to.
   * @returns {Promise}                  Resolves once rotation is complete.
   */
  async rotateTo({ angle: targetAngle, position }) {
    if ( this.status.rotating ) return false;

    const newPosition = this.positions[position];
    if ( (position !== undefined) && !newPosition ) {
      console.warn(`Invalid position \`${position}\` when attempting to rotate \`${this.parent.uuid}\`.`);
      return false;
    }

    targetAngle ??= newPosition?.angle;
    if ( targetAngle === undefined ) {
      console.warn(`No target angle or position index provided when attempting to rotate \`${this.parent.uuid}\`.`);
      return false;
    }

    // Determine rotation angle, time, and pivot point
    const angle = this.#travelAngle(this.status.angle, targetAngle);
    const radians = Math.toRadians(angle);
    const duration = Math.max(this.time.mode === "fixed" ? this.time.value
      : this.time.value * (Math.abs(angle) / 90), 500);
    const pivot = RotateAreaRegionBehaviorType.#shapeCenter(this.region.shapes[0]);

    const calculateRotationUpdate = placeable => {
      if ( !placeable ) return null;
      const center = RotateAreaRegionBehaviorType.#placeableCenter(placeable);
      const rotation = RotateAreaRegionBehaviorType.#placeableRotation(placeable);
      const size = RotateAreaRegionBehaviorType.#placeableSize(placeable);
      return {
        _id: placeable.id,
        ...RotateAreaRegionBehaviorType.#calculatePosition(radians, pivot, center, size),
        rotation: rotation !== undefined ? rotation + angle : rotation
      };
    };

    // Prepare update data for each rotated document type
    const docs = this.#getAnimatables();
    const updates = {
      tiles: docs.tiles.map(t => calculateRotationUpdate(t)),
      tokens: docs.tokens.map(t => calculateRotationUpdate(t)),
      lights: docs.lights.map(l => calculateRotationUpdate(l)),
      regions: docs.regions.map(r => RotateAreaRegionBehaviorType.#rotateRegionShapes(r, angle, radians, pivot)),
      sounds: docs.sounds.map(s => calculateRotationUpdate(s)),
      walls: docs.walls.map(wall => {
        const first = RotateAreaRegionBehaviorType.#calculatePosition(radians, pivot, {
          x: wall.c[0], y: wall.c[1]
        });
        const second = RotateAreaRegionBehaviorType.#calculatePosition(radians, pivot, {
          x: wall.c[2], y: wall.c[3]
        });
        return { _id: wall.id, c: [first.x, first.y, second.x, second.y] };
      })
    };

    // Update status to indicate rotation is occurring and trigger visible animation
    await this.parent.update(
      { "system.status": { angle: targetAngle, position, rotating: true } },
      { dnd5e: { rotateArea: { angle, duration, pivot } } }
    );

    // Wait for the visible animation to complete before performing document updates
    await new Promise(resolve => setTimeout(resolve, duration));

    // Update all rotated documents
    await Promise.all([
      this.parent.update({ "system.status.rotating": false }),
      this.scene.updateEmbeddedDocuments("AmbientLight", updates.lights),
      this.scene.updateEmbeddedDocuments("AmbientSound", updates.sounds),
      this.scene.updateEmbeddedDocuments("Region", updates.regions),
      this.scene.updateEmbeddedDocuments("Tile", updates.tiles),
      this.scene.updateEmbeddedDocuments("Token", updates.tokens, {
        animate: false,
        movement: updates.tokens.reduce((obj, { _id }) => {
          obj[_id] = {
            constrainOptions: { ignoreWalls: true, ignoreCost: true },
            showRuler: false
          };
          return obj;
        }, {})
      }),
      this.scene.updateEmbeddedDocuments("Wall", updates.walls)
    ]);
  }

  /* ---------------------------------------- */
  /*  Helpers                                 */
  /* ---------------------------------------- */

  /**
   * Calculate the final position based on a rotation.
   * @param {Radians} angle  Rotation amount in radians.
   * @param {Point} pivot    Center point for the rotation.
   * @param {Point} center   Center point for the object being rotated.
   * @param {Size} [size]    Size of the placeable being rotated.
   * @returns {Point}
   */
  static #calculatePosition(angle, pivot, center, size={ width: 0, height: 0 }) {
    const vector = new Ray(pivot, center).shiftAngle(angle);
    return { x: vector.B.x - (size.width / 2), y: vector.B.y - (size.height / 2) };
  }

  /* ---------------------------------------- */

  /**
   * Retrieve and object with canvas documents for anything rotated.
   * @returns {Record<string, CanvasDocument>}
   */
  #getAnimatables() {
    const animatables = {
      tiles: Array.from(this.tiles.ids).map(t => this.scene.tiles.get(t)).filter(_ => _),
      tokens: Array.from(this.region.tokens),
      lights: Array.from(this.lights.ids).map(l => this.scene.lights.get(l)).filter(_ => _),
      regions: [this.region.id, ...this.regions.ids].map(r => this.scene.regions.get(r)).filter(_ => _),
      sounds: Array.from(this.sounds.ids).map(l => this.scene.sounds.get(l)).filter(_ => _),
      walls: Array.from(this.walls.ids).map(w => this.scene.walls.get(w)).filter(_ => _)
    };
    if ( this.walls.link ) {
      animatables.walls = animatables.walls.flatMap(w => w.object.getLinkedSegments().walls.map(w => w.document));
    }
    return animatables;
  }

  /* ---------------------------------------- */

  /**
   * Center of the placeable used for position adjustment.
   * @param {CanvasDocument|PlaceableObject} doc
   * @returns {Point}
   */
  static #placeableCenter(doc) {
    if ( doc instanceof TokenDocument ) return doc.getCenterPoint();
    if ( doc instanceof foundry.abstract.Document ) {
      if ( doc.object ) doc = doc.object;
      else {
        const size = this.#placeableSize(doc);
        return { x: doc.x + (size.width / 2), y: doc.y + (size.height / 2) };
      }
    }
    if ( "center" in doc ) return doc.center;
    return { x: doc.x, y: doc.y };
  }

  /* ---------------------------------------- */

  /**
   * Current rotation value of a placeable.
   * @param {CanvasDocument|PlaceableObject} doc
   * @returns {Degrees}
   */
  static #placeableRotation(doc) {
    if ( "rotation" in (doc.document ?? {}) ) return doc.document.rotation;
    if ( "rotation" in doc ) return doc.rotation;
    return doc.object?.rotation;
  }

  /* ---------------------------------------- */

  /**
   * Size of the placeable used for position adjustment.
   * @param {CanvasDocument|PlaceableObject} doc
   * @returns {Size}
   */
  static #placeableSize(doc) {
    if ( !(doc instanceof foundry.abstract.Document) ) doc = doc.document;
    if ( doc instanceof TileDocument ) return { width: doc.width, height: doc.height };
    if ( doc instanceof TokenDocument ) return doc.getSize();
    else return { width: 0, height: 0 };
  }

  /* ---------------------------------------- */

  /**
   * Create updates needed to rotate a region's shapes.
   * @param {Region} region    The region to rotate.
   * @param {Degrees} angle    Rotation amount in degrees.
   * @param {Radians} radians  Rotation amount in radians.
   * @param {Point} pivot      Center point for the rotation.
   * @returns {object}         Update data for the region.
   */
  static #rotateRegionShapes(region, angle, radians, pivot) {
    const shapes = region.toObject().shapes;
    for ( const shape of shapes ) {
      const { x, y, width, height } = shape;
      switch ( shape.type ) {
        case foundry.data.RectangleShapeData.TYPE:
          Object.assign(shape, this.#calculatePosition(
            radians, pivot, { x: x + (width / 2), y: y + (height / 2) }, { width, height }
          ));
          break;
        case foundry.data.CircleShapeData.TYPE:
        case foundry.data.EllipseShapeData.TYPE:
          Object.assign(shape, this.#calculatePosition(radians, pivot, { x, y }));
          break;
        case foundry.data.PolygonShapeData.TYPE:
          const iterator = Iterator.from(shape.points);
          shape.points = [];
          let frag;
          while ( !(frag = iterator.next()).done ) {
            const { x, y } = this.#calculatePosition(radians, pivot, { x: frag.value, y: iterator.next().value });
            shape.points.push(x, y);
          }
          break;
      }
      shape.rotation += angle;
    }
    return { _id: region.id, shapes };
  }

  /* ---------------------------------------- */

  /**
   * Center of a specific region shape.
   * @param {ShapeData} shape
   * @returns {Point}
   */
  static #shapeCenter(shape) {
    switch ( shape.type ) {
      case foundry.data.RectangleShapeData.TYPE:
        return { x: shape.x + (shape.width / 2), y: shape.y + (shape.width / 2) };
      case foundry.data.CircleShapeData.TYPE:
      case foundry.data.EllipseShapeData.TYPE:
        return { x: shape.x, y: shape.y };
      case foundry.data.PolygonShapeData.TYPE:
        return foundry.utils.polygonCentroid(shape.points);
      default:
        throw new Error(`Unrecognized shape type: ${shape.type}.`);
    }
  }

  /* ---------------------------------------- */

  /**
   * Determine the direction to rotate and the final rotation angle based on the direction mode.
   * @param {Degrees} start  Starting angle.
   * @param {Degrees} end    Ending angle.
   * @returns {Degrees}
   */
  #travelAngle(start, end) {
    if ( start < 0 ) start += 360;
    if ( end < 0 ) end += 360;
    let cw = (end - start + 360) % 360;
    let ccw = ((start - end + 360) % 360) * -1;
    switch ( this.directionMode ) {
      case "cw": return cw;
      case "ccw": return ccw;
      case "short": return Math.abs(cw) < Math.abs(ccw) ? cw : ccw;
      case "long": return Math.abs(cw) > Math.abs(ccw) ? cw : ccw;
    }
  }

  /* ---------------------------------------- */
  /*  Hooks                                   */
  /* ---------------------------------------- */

  /**
   * Animate rotation in response to changes to behavior.
   * @param {object} changes
   * @param {object} options
   */
  async updateRotatateArea(changes, options) {
    const animationDetails = foundry.utils.getProperty(options, "dnd5e.rotateArea");
    if ( animationDetails && (canvas.scene === this.scene) ) {
      const { angle, duration, pivot } = animationDetails;
      this.#animateRotation(angle, pivot, duration);
    }
  }

  /* ---------------------------------------- */

  /**
   * Handle animating the rotation of the region.
   * @param {Degrees} angle
   * @param {Point} pivot
   * @param {number} duration
   */
  #animateRotation(angle, pivot, duration) {
    const docs = this.#getAnimatables();
    const animatables = [...docs.lights, ...docs.sounds, ...docs.tiles, ...docs.tokens]
      .reduce((map, doc) => {
        map.set(doc, {
          center: RotateAreaRegionBehaviorType.#placeableCenter(doc),
          rotation: RotateAreaRegionBehaviorType.#placeableRotation(doc),
          size: RotateAreaRegionBehaviorType.#placeableSize(doc)
        });
        return map;
      }, new Map());
    docs.walls.forEach(wall => animatables.set(wall, { points: Array.from(wall.c) }));

    foundry.canvas.animation.CanvasAnimation.animate([], {
      duration,
      easing: foundry.canvas.animation.CanvasAnimation.easeInOutCosine,
      priority: PIXI.UPDATE_PRIORITY.OBJECTS + 1,
      ontick: (e, a) => RotateAreaRegionBehaviorType.#animateFrame(animatables, angle, pivot, e, a)
    });
  }

  /* ---------------------------------------- */

  /**
   * Handle manually updating animation on tokens per-frame to ensure vision animates.
   * @param {Map<CanvasDocument, { center: Point, points: number[], rotation: Degrees, size: Size }>} animatables
   * @param {Degrees} angle
   * @param {Point} pivot
   * @param {number} elapsedMS               The incremental time in MS which has elapsed (uncapped).
   * @param {CanvasAnimationData} animation  The animation which is being performed.
   */
  static #animateFrame(animatables, angle, pivot, elapsedMS, animation) {
    const pt = animation.time >= animation.duration ? 1 : animation.time / animation.duration;

    if ( pt <= 1 ) {
      const pa = animation.easing?.(pt) ?? pt;
      const pr = Math.toRadians(angle * pa);
      for ( const [doc, { center, points, rotation, size }] of animatables.entries() ) {
        if ( doc instanceof WallDocument ) {
          const first = RotateAreaRegionBehaviorType.#calculatePosition(pr, pivot, { x: points[0], y: points[1] });
          const second = RotateAreaRegionBehaviorType.#calculatePosition(pr, pivot, { x: points[2], y: points[3] });
          doc.c = [first.x, first.y, second.x, second.y];
          doc.object.renderFlags.set({ refreshLine: true });
          if ( game.settings.get("core", "visionAnimation") ) {
            doc.object.initializeEdge();
            canvas.perception.update({
              refreshEdges: true, initializeLighting: true, initializeVision: true, initializeSounds: true
            });
          }
        } else {
          const updates = RotateAreaRegionBehaviorType.#calculatePosition(pr, pivot, center, size);
          updates.rotation = rotation + (angle * pa);
          Object.assign(doc, updates);
          if ( doc instanceof AmbientLightDocument ) doc.object.initializeLightSource();
          else if ( doc instanceof AmbientSoundDocument ) doc.object.initializeSoundSource();
          else if ( doc instanceof TileDocument ) doc.object.renderFlags.set({ refreshTransform: true });
          else if ( doc instanceof TokenDocument ) doc.object._onAnimationUpdate(updates);
        }
      }
    }
  }
}

Hooks.on("updateRegionBehavior", (doc, changes, options) => doc.system?.updateRotatateArea?.(changes, options));
