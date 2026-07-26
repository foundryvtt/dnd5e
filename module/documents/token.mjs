import { playLandingVfx } from "../canvas/vfx/landing-vfx.mjs";
import { postFallDamage } from "../rules/falling.mjs";
import SystemFlagsMixin from "./mixins/flags.mjs";

/**
 * Extend the base TokenDocument class to implement system-specific HP bar logic.
 */
export default class TokenDocument5e extends SystemFlagsMixin(TokenDocument) {

  /**
   * Cached sense-derived overrides, used to skip vision re-derivation when senses are unchanged.
   * @type {{ sight: object, detectionModes: Record<string, number> }}
   */
  #senseOverrides;

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Is the dynamic token ring enabled?
   * @type {boolean}
   */
  get hasDynamicRing() {
    return this.ring.enabled;
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeSource(data, options={}) {
    if ( data instanceof foundry.abstract.DataModel ) data = data.toObject();

    // Migrate backpack -> container.
    for ( const item of data.delta?.items ?? [] ) {
      // This will be correctly flagged as needing a source migration when the synthetic actor is created, but we need
      // to also change the type in the raw ActorDelta to avoid spurious console warnings.
      if ( item.type === "backpack" ) item.type = "container";
    }
    return super._initializeSource(data, options);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareDetectionModes() {
    // Set sight & sense detection modes before calling super so basicSight is seeded from the derived sight range.
    this._applySenseVision();
    super._prepareDetectionModes();
  }

  /* -------------------------------------------- */

  /**
   * Derive token sight range and detection modes from the actor's senses.
   * @protected
   */
  _applySenseVision() {
    if ( !game.settings.get("dnd5e", "senseVisionSync") ) return;
    const senses = this.actor?.system?.attributes?.senses;
    if ( senses ) TokenDocument5e.applySenseOverrides(senses, this);
  }

  /* -------------------------------------------- */

  /**
   * Compute sense-derived sight and detection mode data from actor senses.
   * @param {object} senses                          Object containing sense ranges.
   * @param {Record<string, number>} senses.ranges   Mapping of sense keys to their range values.
   * @returns {{ sight: object, detectionModes: Record<string, number> }}
   */
  static computeSenseOverrides(senses) {
    const detectionModes = {};
    let maxSightRange = 0;
    let sightVisionMode = null;

    for ( const [key, config] of Object.entries(CONFIG.DND5E.senses) ) {
      const range = senses.ranges?.[key];
      if ( !range ) continue;

      if ( config.detectionMode ) detectionModes[config.detectionMode] = range;

      if ( config.grantsSight && (range > maxSightRange) ) {
        maxSightRange = range;
        sightVisionMode = config.visionMode ?? null;
      }
    }

    const sight = maxSightRange > 0
      ? { enabled: true, range: maxSightRange, visionMode: sightVisionMode ?? "basic" }
      : {};

    return { sight, detectionModes };
  }

  /* -------------------------------------------- */

  /**
   * Apply sense-derived overrides to a token-like target's prepared data.
   * @param {object} senses                         Object containing sense ranges.
   * @param {Record<string, number>} senses.ranges  Mapping of sense keys to their range values.
   * @param {object} target                         Target with `sight` and `detectionModes` properties.
   */
  static applySenseOverrides(senses, target) {
    const { sight, detectionModes } = TokenDocument5e.computeSenseOverrides(senses);

    for ( const [id, range] of Object.entries(detectionModes) ) {
      const existing = target.detectionModes[id];
      if ( existing ) Object.assign(existing, { enabled: true, range });
      else target.detectionModes[id] = { enabled: true, range };
    }

    if ( sight.enabled ) {
      Object.assign(target.sight, { enabled: true, range: sight.range, visionMode: sight.visionMode });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getBarAttribute(barName, options={}) {
    const attribute = options.alternative || this[barName]?.attribute;
    if ( attribute?.startsWith(".") ) {
      const item = fromUuidSync(attribute, { relative: this.actor });
      const { value, max } = item?.system.uses ?? { value: 0, max: 0 };
      if ( max ) return { attribute, value, max, type: "bar", editable: true };
    }

    const data = super.getBarAttribute(barName, options);
    if ( data?.attribute === "attributes.hp" ) {
      const hp = this.actor.system.attributes.hp || {};
      data.value += (hp.temp || 0);
      data.max = Math.max(0, hp.effectiveMax);
    } else if ( ["resources.legact", "resources.legres"].includes(data?.attribute) ) {
      data.editable = true;
    }
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Get an Array of attribute choices which are suitable for being consumed by an item usage.
   * @param {object} data  The actor data.
   * @returns {string[]}
   */
  static getConsumedAttributes(data) {
    return CONFIG.DND5E.consumableResources;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static getTrackedAttributeChoices(attributes) {
    const groups = super.getTrackedAttributeChoices(attributes);
    const i18n = {
      abilities: _loc("DND5E.AbilityScorePl"),
      movement: _loc("DND5E.MOVEMENT.FIELDS.speeds.label"),
      senses: _loc("DND5E.Senses"),
      skills: _loc("DND5E.SkillPassives"),
      slots: _loc("JOURNALENTRYPAGE.DND5E.Class.SpellSlots")
    };
    for ( const entry of groups ) {
      const { value } = entry;
      if ( value.startsWith("abilities.") ) entry.group = i18n.abilities;
      else if ( value.startsWith("attributes.movement.") ) entry.group = i18n.movement;
      else if ( value.startsWith("attributes.senses.") ) entry.group = i18n.senses;
      else if ( value.startsWith("skills.") ) entry.group = i18n.skills;
      else if ( value.startsWith("spells.") ) entry.group = i18n.slots;
    }
    return groups;
  }

  /* -------------------------------------------- */

  /** @override */
  prepareData() {
    super.prepareData();
    if ( !this.hasDynamicRing ) return;
    let size = this.baseActor?.system.traits?.size;
    if ( !this.actorLink ) {
      const deltaSize = this.delta?.system.traits?.size;
      if ( deltaSize ) size = deltaSize;
    }
    if ( !size ) return;
    const dts = CONFIG.DND5E.actorSizes[size].dynamicTokenScale ?? 1;
    this.texture.scaleX = this._source.texture.scaleX * dts;
    this.texture.scaleY = this._source.texture.scaleY * dts;
  }

  /* -------------------------------------------- */
  /*  Movement                                    */
  /* -------------------------------------------- */

  /**
   * Set up the system's movement action customization.
   */
  static registerMovementActions() {
    for ( const type of Object.keys(CONFIG.DND5E.movementTypes) ) {
      const actionConfig = CONFIG.Token.movement.actions[type];
      if ( !actionConfig ) continue;
      actionConfig.getAnimationOptions = token => {
        const actorMovement = token?.actor?.system.attributes?.movement ?? {};
        if ( !(type in actorMovement) || actorMovement[type] ) return {};
        return { movementSpeed: CONFIG.Token.movement.defaultSpeed / 2 };
      };
      actionConfig.getCostFunction = (...args) => this.getMovementActionCostFunction(type, ...args);
    }
    CONFIG.Token.movement.actions.crawl.getCostFunction = token => {
      const noAutomation = game.settings.get("dnd5e", "movementAutomation") === "none";
      const { actor } = token;
      const actorMovement = actor?.system.attributes?.movement;
      const hasMovement = actorMovement !== undefined;
      return noAutomation || !actor?.system.isCreature || !hasMovement
        ? cost => cost
        : (cost, _from, _to, distance) => cost + distance;
    };
    CONFIG.Token.movement.actions.jump.deriveTerrainDifficulty = () => 1;
    CONFIG.Token.movement.actions.jump.getCostFunction = () => cost => cost;

    // Falling is involuntary, so it cannot be selected by the user and never consumes movement.
    CONFIG.Token.movement.actions.fall = {
      canSelect: false,
      costMultiplier: 0,
      icon: "fa-solid fa-arrow-down-long",
      img: "systems/dnd5e/icons/svg/statuses/falling.svg",
      label: "DND5E.FALLING.MovementAction",
      measure: false,
      order: 9,
      teleport: false,
      terrainAction: null,
      visualize: true
    };
  }

  /* -------------------------------------------- */

  /**
   * Return the movement action cost function for a specific movement type.
   * @param {string} type
   * @param {TokenDocument5e} token
   * @param {TokenMeasureMovementPathOptions} options
   * @returns {TokenMovementActionCostFunction}
   */
  static getMovementActionCostFunction(type, token, options) {
    const noAutomation = game.settings.get("dnd5e", "movementAutomation") === "none";
    const { actor } = token;
    const actorMovement = actor?.system.attributes?.movement;
    const walkFallback = CONFIG.DND5E.movementTypes[type]?.walkFallback;
    const hasMovement = actorMovement !== undefined;
    const speed = actorMovement?.[type];
    return noAutomation || !actor?.system.isCreature || !hasMovement || speed || (!speed && !walkFallback)
      ? cost => cost
      : (cost, _from, _to, distance) => cost + distance;
  }

  /* -------------------------------------------- */
  /*  Falling                                     */
  /* -------------------------------------------- */

  /**
   * Find the supporting surface this token rests on or would fall onto, and the level it comes to rest on. A scene that
   * defines any movement surface uses those surfaces as its only floors. As a heuristic to accommodate older scenes
   * without levels or surfaces, the base of each level is considered a floor in scenes with no surfaces.
   * @param {object} [options]
   * @param {TokenCoordinates} [options.position]  The position to evaluate against. Defaults to the token's source
   *                                               position.
   * @returns {{ elevation: number, region: RegionDocument|null, level: Level }|null}
   * @internal
   */
  _findSupportingSurface({ position=this._source }={}) {
    const scene = this.parent;
    if ( !scene ) return null;
    const { elevation, level } = position;

    // Walk surfaces from highest to lowest and return the first whose footprint contains the required share of the
    // token. Scene#getSurfaces already orders surfaces by elevation.
    if ( scene.getSurfaces({ type: "move" }).length ) {
      const surfaces = scene.getSurfaces({ level, type: "move" });
      if ( !surfaces.length ) return null;
      const points = this.getContainmentTestPoints(position);
      const required = Math.ceil(points.length * .75);
      const allowedMisses = points.length - required;

      for ( let i = surfaces.length; i--; ) {
        const surface = surfaces[i];
        if ( surface.elevation > elevation ) continue;
        let inside = 0;
        let missed = 0;
        for ( const p of points ) {
          if ( surface.region.polygonTree.testPoint(p) ) {
            if ( ++inside >= required ) return {
              elevation: surface.elevation,
              level: this.#findRestingLevel(surface.region, surface.elevation, level),
              region: surface.region
            };
          } else if ( ++missed > allowedMisses ) {
            break;
          }
        }
      }
      return null;
    }

    // With no surfaces defined, the base of every level is an implied floor. The supporting surface is the highest
    // level base at or below the token.
    let floorLevel = null;
    for ( const l of scene.levels ) {
      if ( l.elevation.base > elevation ) continue;
      if ( !floorLevel || (l.elevation.base > floorLevel.elevation.base) ) floorLevel = l;
    }
    if ( !floorLevel ) return null;
    return { elevation: floorLevel.elevation.base, level: floorLevel, region: null };
  }

  /* -------------------------------------------- */

  /**
   * Resolve the level a token comes to rest on when landing on a surface region at a given elevation. Checks every
   * level the surface region belongs to. The result is the single candidate whose elevation range is home to the
   * landing elevation, or the current level when there is no unambiguous home.
   * @param {RegionDocument} region  The landed surface's region.
   * @param {number} elevation       The landing elevation.
   * @param {string} levelId         The token's current level ID.
   * @returns {Level|null}           The level the token rests on.
   */
  #findRestingLevel(region, elevation, levelId) {
    const scene = this.parent;
    const current = scene.levels.get(levelId) ?? null;
    const candidates = region.levels.size
      ? Array.from(region.levels, id => scene.levels.get(id))
      : scene.levels.contents;
    let home = null;
    for ( const level of candidates ) {
      if ( !level ) continue;
      if ( (elevation >= level.elevation.bottom) && (elevation < level.elevation.top) ) {
        if ( home ) return current; // Ambiguous: more than one candidate level is home to this elevation.
        home = level;
      }
    }
    return home ?? current;
  }

  /* -------------------------------------------- */

  /**
   * Determine whether this token should be considered falling given a position and its actor's condition. A creature
   * suspended in the air falls unless it can keep itself aloft, i.e. has a fly speed.
   * @param {object} [options]
   * @param {TokenCoordinates} [options.position]  The position to evaluate against. Defaults to the token's source
   *                                               position.
   * @returns {boolean}
   * @internal
   */
  _isFalling({ position=this._source }={}) {
    const { actor } = this;
    if ( !actor ) return false;
    const surface = this._findSupportingSurface({ position });
    if ( !surface || (surface.elevation >= position.elevation) ) return false;
    if ( foundry.utils.getProperty(actor, "system.traits.ci.value")?.has("falling") ) return false;
    const { hover, speeds } = actor.system.attributes?.movement ?? {};
    if ( actor.statuses.has("prone") || actor.statuses.has("incapacitated") ) return !hover;
    return !speeds?.fly;
  }

  /* -------------------------------------------- */

  /**
   * Plummet this token straight down to the highest movement-restricting surface beneath it and post fall damage to
   * chat. Landing prone is deferred to the point at which that damage is applied, as a creature is only knocked prone
   * if the fall actually deals damage.
   * @returns {Promise<void>}
   */
  async plummet() {
    const { actor } = this;
    if ( !actor?.statuses.has("falling") || !actor.canUserModify(game.user, "update") ) return;

    const surface = this._findSupportingSurface();
    if ( !surface || (surface.elevation >= this.elevation) ) {
      ui.notifications.warn("DND5E.FALLING.Warning.NoLandingSurface", { format: { name: this.name } });
      return;
    }

    const distance = this.elevation - surface.elevation;
    const waypoint = { action: "fall", elevation: surface.elevation };
    if ( surface.level && (surface.level.id !== this._source.level) ) waypoint.level = surface.level.id;
    await this.move(waypoint, { animate: false, dnd5e: { fall: { distance } } });
    await actor.toggleStatusEffect("falling", { active: false });
    await postFallDamage([this], distance);
  }

  /* -------------------------------------------- */

  /**
   * Determine whether this token should be considered falling after its movement. Movement that ends with a climb
   * action, or that takes place while transiting a level-change region, is a deliberate reposition and does not leave
   * the token falling.
   * @param {TokenMovementOperation} movement  The concluded movement.
   * @returns {boolean}
   */
  #shouldFall(movement) {
    if ( movement.passed.waypoints.at(-1)?.action === "climb" ) return false;
    if ( this.#inLevelChangeRegion() ) return false;
    return this._isFalling({ position: movement.destination });
  }

  /* -------------------------------------------- */

  /**
   * Whether this token currently occupies a region that relocates tokens between levels, such as a ladder or
   * stairwell. Such a region moves the token through open space to reach the destination level, and those transient
   * airborne positions are part of the relocation rather than a fall.
   * @returns {boolean}
   */
  #inLevelChangeRegion() {
    for ( const region of this.regions ?? [] ) {
      for ( const behavior of region.behaviors ) {
        if ( !behavior.disabled && (behavior.type === "changeLevel") ) return true;
      }
    }
    return false;
  }

  /* -------------------------------------------- */
  /*  Ring Animations                             */
  /* -------------------------------------------- */

  /**
   * Determine if any rings colors should be forced based on current status.
   * @returns {{[ring]: number, [background]: number}}
   */
  getRingColors() {
    const colors = {};
    if ( this.hasStatusEffect(CONFIG.specialStatusEffects.DEFEATED) ) {
      colors.ring = CONFIG.DND5E.tokenRingColors.defeated;
    }
    return colors;
  }

  /* -------------------------------------------- */

  /**
   * Determine what ring effects should be applied on top of any set by flags.
   * @returns {string[]}
   */
  getRingEffects() {
    const e = foundry.canvas.placeables.tokens.TokenRing.effects;
    const effects = [];
    if ( this.hasStatusEffect(CONFIG.specialStatusEffects.INVISIBLE) ) effects.push(e.INVISIBILITY);
    else if ( this === game.combat?.combatant?.token ) effects.push(e.RING_GRADIENT);
    return effects;
  }

  /* -------------------------------------------- */

  /**
   * Flash the token ring based on damage, healing, or temp HP.
   * @param {string} type     The key to determine the type of flashing.
   */
  flashRing(type) {
    if ( !this.rendered ) return;
    const color = CONFIG.DND5E.tokenRingColors[type];
    if ( !color ) return;
    const options = {};
    if ( type === "damage" ) {
      options.duration = 500;
      options.easing = foundry.canvas.placeables.tokens.TokenRing.easeTwoPeaks;
    }
    this.object.ring?.flashColor(Color.from(color), options);
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;

    if ( this.actor?.system.isNPC && !this.actorLink
      && foundry.utils.getProperty(this.actor, "system.attributes.hp.formula")?.trim().length ) {
      const autoRoll = options.dnd5e?.autoRollNPCHP ?? game.settings.get("dnd5e", "autoRollNPCHP");
      if ( autoRoll === "no" ) return;
      const roll = await this.actor.rollNPCHitPoints({ chatMessage: autoRoll === "yes" });
      const update = {
        "system.attributes.hp": {
          max: roll.total,
          value: roll.total
        }
      };
      this.updateSource({ delta: update });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRelatedUpdate(update={}, operation={}) {
    super._onRelatedUpdate(update, operation);
    if ( !game.settings.get("dnd5e", "senseVisionSync") ) return;
    const senses = this.actor?.system?.attributes?.senses;
    if ( !senses ) return;

    // Re-derive vision whenever sense-granting data changes, covering direct edits and item/effect-granted senses.
    const overrides = TokenDocument5e.computeSenseOverrides(senses);
    if ( foundry.utils.equals(overrides, this.#senseOverrides) ) return;
    this.#senseOverrides = overrides;
    if ( !this.parent?.isView ) return;
    this.reset();
    this.object?.initializeVisionSource();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onUpdateMovement(movement, operation, user) {
    await super._onUpdateMovement(movement, operation, user);
    if ( !user.isSelf || dnd5e.settings.disableFalling || (movement.passed.waypoints.at(-1)?.action === "fall") ) {
      return;
    }
    const { actor } = this;
    if ( !actor ) return;
    const shouldFall = this.#shouldFall(movement);
    if ( shouldFall === actor.statuses.has("falling") ) return;
    await actor.toggleStatusEffect("falling", { active: shouldFall });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    const distance = foundry.utils.getProperty(options, "dnd5e.fall.distance");
    if ( distance ) playLandingVfx(this, distance);
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);

    const origin = this.actor?.getFlag("dnd5e", "summon.origin");
    if ( origin ) {
      const { collection, primaryId } = foundry.utils.parseUuid(origin);
      dnd5e.registry.summons.untrack(collection?.get?.(primaryId)?.uuid, this.actor.uuid);
    }
  }
}
