import SystemFlagsMixin from "./mixins/flags.mjs";

/**
 * Extend the base TokenDocument class to implement system-specific HP bar logic.
 */
export default class TokenDocument5e extends SystemFlagsMixin(TokenDocument) {

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
  /*  Data Migrations                             */
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
      abilities: game.i18n.localize("DND5E.AbilityScorePl"),
      movement: game.i18n.localize("DND5E.MovementSpeeds"),
      senses: game.i18n.localize("DND5E.Senses"),
      skills: game.i18n.localize("DND5E.SkillPassives"),
      slots: game.i18n.localize("JOURNALENTRYPAGE.DND5E.Class.SpellSlots")
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
      const deltaSize = this.delta.system.traits?.size;
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
      const noAutomation = game.settings.get("dnd5e", "disableMovementAutomation");
      const { actor } = token;
      const actorMovement = actor?.system.attributes?.movement;
      const hasMovement = actorMovement !== undefined;
      return noAutomation || !actor?.system.isCreature || !hasMovement
        ? cost => cost
        : (cost, _from, _to, distance) => cost + distance;
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
    const noAutomation = game.settings.get("dnd5e", "disableMovementAutomation");
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

    if ( (this.actor?.type === "npc") && !this.actorLink
      && foundry.utils.getProperty(this.actor, "system.attributes.hp.formula")?.trim().length ) {
      const autoRoll = game.settings.get("dnd5e", "autoRollNPCHP");
      if ( autoRoll === "no" ) return;
      const roll = await this.actor.rollNPCHitPoints({ chatMessage: autoRoll === "yes" });
      this.delta.updateSource({
        "system.attributes.hp": {
          max: roll.total,
          value: roll.total
        }
      });
    }
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);

    const origin = this.actor?.getFlag("dnd5e", "summon.origin");
    // TODO: Replace with parseUuid once V11 support is dropped
    if ( origin ) dnd5e.registry.summons.untrack(origin.split(".Item.")[0], this.actor.uuid);
  }
}
