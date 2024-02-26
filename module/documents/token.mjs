import TokenSystemFlags from "../data/token/token-system-flags.mjs";
import { staticID } from "../utils.mjs";
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
    return !!this.getFlag("dnd5e", "tokenRing.enabled");
  }

  /* -------------------------------------------- */

  #subjectPath;

  /**
   * Fetch the explicit subject texture or infer from `texture.src` for dynamic rings.
   * @type {string}
   */
  get subjectPath() {
    const subject = this.getFlag("dnd5e", "tokenRing")?.textures?.subject;
    if ( subject ) return subject;
    this.#subjectPath ??= this.constructor.inferSubjectPath(this.texture.src);
    return this.#subjectPath;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get _systemFlagsDataModel() {
    return TokenSystemFlags;
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeSource(data, options={}) {
    // Migrate backpack -> container.
    for ( const item of data.delta?.items ?? [] ) {
      // This will be correctly flagged as needing a source migration when the synthetic actor is created, but we need
      // to also change the type in the raw ActorDelta to avoid spurious console warnings.
      if ( item.type === "backpack" ) item.type = "container";
    }
    return super._initializeSource(data, options);
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @inheritdoc */
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

  /** @inheritdoc */
  async toggleActiveEffect(effectData, {overlay=false, active}={}) {
    if ( !this.actor || !effectData.id ) return false;
    const id = staticID(`dnd5e${effectData.id}`);

    // Remove existing effects that contain this effect data's primary ID as their primary ID.
    const existing = this.actor.effects.get(id);
    const state = active ?? !existing;
    if ( !state && existing ) await this.actor.deleteEmbeddedDocuments("ActiveEffect", [id]);

    // Add a new effect
    else if ( state ) {
      const cls = getDocumentClass("ActiveEffect");
      const effect = await cls.fromStatusEffect(effectData);
      if ( overlay ) effect.updateSource({ "flags.core.overlay": true });
      await cls.create(effect, { parent: this.actor, keepId: true });
    }

    return state;
  }

  /* -------------------------------------------- */

  /**
   * Determine the subject path based on the path to the main token artwork.
   * @param {string} path  The token's `texture.src` path.
   * @returns {string}     Inferred subject path.
   */
  static inferSubjectPath(path) {
    if ( !path ) return "";
    for ( const [src, dest] of Object.entries(CONFIG.Token.ringClass.subjectPaths) ) {
      if ( path.startsWith(src) ) return path.replace(src, dest);
    }
    return path;
  }

  /* -------------------------------------------- */

  /** @override */
  prepareData() {
    super.prepareData();
    if ( !this.getFlag("dnd5e", "tokenRing.enabled") ) return;
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

  /** @inheritDoc */
  _onUpdate(data, options, userId) {
    const textureChange = foundry.utils.hasProperty(data, "texture.src");
    const tokenRingChange = foundry.utils.hasProperty(data, "flags.dnd5e.tokenRings.enabled");
    if ( textureChange || tokenRingChange ) this.#subjectPath = null;
    super._onUpdate(data, options, userId);
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
    const e = CONFIG.Token.ringClass.effects;
    const effects = [];
    if ( this.hasStatusEffect(CONFIG.specialStatusEffects.INVISIBLE) ) effects.push(e.INVISIBILITY);
    else if ( this === game.combat?.combatant?.token ) effects.push(e.RING_GRADIENT);
    return effects;
  }

  /* -------------------------------------------- */

  /**
   * Flash the token ring based on damage, healing, or temp HP.
   * @param {object} changes
   * @param {number} [changes.dhp]    Change to the actor's HP.
   * @param {number} [changes.dtemp]  Change to the actor's temp HP.
   */
  flashRing({ dhp, dtemp }) {
    let color;
    const options = {};
    if ( dtemp ) color = CONFIG.DND5E.tokenRingColors.temp;
    else if ( dhp > 0 ) color = CONFIG.DND5E.tokenRingColors.healing;
    else if ( dhp < 0 ) {
      color = CONFIG.DND5E.tokenRingColors.damage;
      options.duration = 500;
      options.easing = CONFIG.Token.ringClass.easeTwoPeaks;
    }
    if ( !color ) return;
    this.object.ring.flashColor(Color.from(color), options);
  }
}
