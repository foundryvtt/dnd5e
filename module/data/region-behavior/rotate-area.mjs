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

    // Determine rotation angle and time
    const angle = this.#travelAngle(this.status.angle, targetAngle);
    const radians = Math.toRadians(angle);
    const duration = Math.max(this.time.mode === "fixed" ? this.time.value
      : this.time.value * (Math.abs(angle) / 90), 500);

    // Update status to indicate rotation is occurring
    await this.parent.update({ "system.status": { angle: targetAngle, position, rotating: true } });

    const { promise, resolve } = Promise.withResolvers();
    setTimeout(async () => {
      await this.parent.update({ "system.status.rotating": false });
      resolve(true);
    }, duration);

    // TODO: Better calculate the rotation center point and/or allow setting it explicitly
    const pivot = foundry.utils.polygonCentroid(this.region.polygons[0].points);
    const animateFlags = {
      angle, duration, pivot,
      moveDelta: true
    };

    const calculateRotationUpdate = placeable => {
      if ( !placeable ) return null;
      const center = RotateAreaRegionBehaviorType.#placeableCenter(placeable);
      const rotation = RotateAreaRegionBehaviorType.#placeableRotation(placeable);
      const size = RotateAreaRegionBehaviorType.#placeableSize(placeable);
      return {
        _id: placeable.id,
        ...RotateAreaRegionBehaviorType.#calculatePosition(radians, pivot, center, size),
        rotation: rotation !== undefined && !placeable.document?.lockRotation ? rotation + angle : undefined
      };
    };

    const updates = {
      tiles: Array.from(this.tiles.ids).map(t => calculateRotationUpdate(this.scene.tiles.get(t))).filter(_ => _),
      tokens: Array.from(this.region.tokens).map(({ object: token }) => calculateRotationUpdate(token)),
      lights: Array.from(this.lights.ids).map(l => calculateRotationUpdate(this.scene.lights.get(l))).filter(_ => _),
      sounds: Array.from(this.sounds.ids).map(l => calculateRotationUpdate(this.scene.sounds.get(l))).filter(_ => _)
    };
    let walls = Array.from(this.walls.ids).map(w => this.scene.walls.get(w)?.object).filter(_ => _);
    if ( this.walls.link ) walls = walls.flatMap(w => w.getLinkedSegments().walls);
    updates.walls = walls.map(wall => {
      const first = RotateAreaRegionBehaviorType.#calculatePosition(radians, pivot, {
        x: wall.document.c[0], y: wall.document.c[1]
      });
      const second = RotateAreaRegionBehaviorType.#calculatePosition(radians, pivot, {
        x: wall.document.c[2], y: wall.document.c[3]
      });
      return { _id: wall.id, c: [first.x, first.y, second.x, second.y] };
    });

    // Handle tile and token updates immediately to allow animation
    await canvas.scene.updateEmbeddedDocuments("Tile", updates.tiles, { dnd5e: { animate: { ...animateFlags } } });
    await canvas.scene.updateEmbeddedDocuments("Token", updates.tokens, {
      animate: false,
      dnd5e: { animate: { ...animateFlags } },
      movement: updates.tokens.reduce((obj, { _id }) => {
        obj[_id] = {
          constrainOptions: { ignoreWalls: true, ignoreCost: true },
          showRuler: false
        };
        return obj;
      }, {})
    });

    // Delay light, sound, and wall updates until the halfway point of the animation
    setTimeout(() => {
      canvas.scene.updateEmbeddedDocuments("AmbientLight", updates.lights);
      canvas.scene.updateEmbeddedDocuments("AmbientSound", updates.sounds);
      canvas.scene.updateEmbeddedDocuments("Wall", updates.walls);
    }, duration / 2);
    // TODO: See how performant it is to animate wall movement

    return promise;
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
   * Size of the placeable used for position adjustment.
   * @param {CanvasDocument|PlaceableObject} doc
   * @returns {Point}
   */
  static #placeableCenter(doc) {
    if ( doc instanceof foundry.abstract.Document ) doc = doc.object;
    if ( "center" in doc ) return doc.center;
    return { x: doc.x, y: doc.y };
  }

  /* ---------------------------------------- */

  /**
   * Size of the placeable used for position adjustment.
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
    if ( doc instanceof TokenDocument ) return { width: doc.object.w, height: doc.object.h };
    else return { width: 0, height: 0 };
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
   * Stores previous position for animation.
   * @param {CanvasDocument} doc
   * @param {object} changes
   * @param {object} options
   */
  static preUpdatePlaceable(doc, changes, options) {
    if ( foundry.utils.getProperty(options, "dnd5e.animate.moveDelta") && ( ("x" in changes) && ("y" in changes) ) ) {
      foundry.utils.setProperty(options, `dnd5e.animate.moveOrigin.${doc.id}`, { x: doc.x, y: doc.y });
    }
  }

  /* ---------------------------------------- */

  /**
   * Animate placeable movement.
   * @param {CanvasDocument} doc
   * @param {object} changes
   * @param {object} options
   */
  static updatePlaceable(doc, changes, options) {
    const originalPosition = foundry.utils.getProperty(options, `dnd5e.animate.moveOrigin.${doc.id}`);
    const angle = foundry.utils.getProperty(options, "dnd5e.animate.angle");
    const pivot = foundry.utils.getProperty(options, "dnd5e.animate.pivot");
    if ( !angle ) return;
    const duration = foundry.utils.getProperty(options, "dnd5e.animate.duration") ?? 500;
    foundry.canvas.animation.CanvasAnimation.animate([
      {
        attribute: "x",
        parent: doc,
        from: originalPosition?.x ?? doc.x,
        to: doc.x
      },
      {
        attribute: "y",
        parent: doc,
        from: originalPosition?.y ?? doc.y,
        to: doc.y
      },
      {
        attribute: "rotation",
        parent: doc,
        from: doc.rotation - angle,
        to: doc.rotation
      }
    ], {
      duration,
      easing: foundry.canvas.animation.CanvasAnimation.easeInOutCosine,
      priority: PIXI.UPDATE_PRIORITY.HIGH,
      ontick: (e, a) => RotateAreaRegionBehaviorType.#animateFrame(doc, angle, pivot, e, a)
    });
  }

  /* ---------------------------------------- */

  /**
   * Handle manually updating animation per-frame.
   * @param {CanvasDocument} doc
   * @param {Degrees} angle
   * @param {Point} pivot
   * @param {number} elapsedMS               The incremental time in MS which has elapsed (uncapped).
   * @param {CanvasAnimationData} animation  The animation which is being performed.
   */
  static #animateFrame(doc, angle, pivot, elapsedMS, animation) {
    const pt = animation.time >= animation.duration ? 1 : animation.time / animation.duration;

    if ( pt !== 1 ) {
      const pa = animation.easing?.(pt) ?? pt;
      const pr = Math.toRadians(angle * pa);
      let from = {};
      animation.attributes.forEach(a => from[a.attribute] = a.from);
      const size = RotateAreaRegionBehaviorType.#placeableSize(doc);
      from.x += size.width / 2;
      from.y += size.height / 2;
      Object.assign(doc, RotateAreaRegionBehaviorType.#calculatePosition(pr, pivot, from, size));
    }

    doc.object.renderFlags.set({ refreshPosition: true, refreshRotation: true });
  }
}

Hooks.on("preUpdateToken", RotateAreaRegionBehaviorType.preUpdatePlaceable);
Hooks.on("preUpdateTile", RotateAreaRegionBehaviorType.preUpdatePlaceable);
Hooks.on("updateTile", RotateAreaRegionBehaviorType.updatePlaceable);
Hooks.on("updateToken", RotateAreaRegionBehaviorType.updatePlaceable);
