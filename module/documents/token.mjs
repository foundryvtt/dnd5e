import { SummonsData } from "../data/item/fields/summons-field.mjs";
import TokenSystemFlags from "../data/token/token-system-flags.mjs";
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
    if ( game.release.generation < 12 ) return !!this.getFlag("dnd5e", "tokenRing.enabled");
    return this.ring.enabled;
  }

  /* -------------------------------------------- */

  #subjectPath;

  /**
   * Fetch the explicit subject texture or infer from `texture.src` for dynamic rings.
   * @type {string}
   */
  get subjectPath() {
    if ( game.release.generation >= 12 ) return this.ring.subject.texture;
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
  static getTrackedAttributeChoices(attributes) {
    const groups = super.getTrackedAttributeChoices(attributes);
    const abilities = [];
    const movement = [];
    const senses = [];
    const skills = [];
    const slots = [];

    // Regroup existing attributes based on their path.
    for ( const group of Object.values(groups) ) {
      for ( let i = 0; i < group.length; i++ ) {
        const attribute = group[i];
        if ( attribute.startsWith("abilities.") ) abilities.push(attribute);
        else if ( attribute.startsWith("attributes.movement.") ) movement.push(attribute);
        else if ( attribute.startsWith("attributes.senses.") ) senses.push(attribute);
        else if ( attribute.startsWith("skills.") ) skills.push(attribute);
        else if ( attribute.startsWith("spells.") ) slots.push(attribute);
        else continue;
        group.splice(i--, 1);
      }
    }

    // Add new groups to choices.
    if ( abilities.length ) groups[game.i18n.localize("DND5E.AbilityScorePl")] = abilities;
    if ( movement.length ) groups[game.i18n.localize("DND5E.MovementSpeeds")] = movement;
    if ( senses.length ) groups[game.i18n.localize("DND5E.Senses")] = senses;
    if ( skills.length ) groups[game.i18n.localize("DND5E.SkillPassives")] = skills;
    if ( slots.length ) groups[game.i18n.localize("JOURNALENTRYPAGE.DND5E.Class.SpellSlots")] = slots;
    return groups;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async toggleActiveEffect(effectData, {overlay=false, active}={}) {
    // TODO: This function as been deprecated in V12. Remove it once V11 support is dropped.

    if ( foundry.utils.isNewerVersion(game.version, 12) ) {
      foundry.utils.logCompatibilityWarning("TokenDocument#toggleActiveEffect is deprecated in favor of "
        + "Actor#toggleStatusEffect", {since: 12, until: 14});
    }

    if ( !this.actor ) return false;
    const statusId = effectData.id;
    if ( !statusId ) return false;
    const existing = [];

    // Find the effect with the static _id of the status effect
    if ( effectData._id ) {
      const effect = this.actor.effects.get(effectData._id);
      if ( effect ) existing.push(effect.id);
    }

    // If no static _id, find all single-status effects that have this status
    else {
      for ( const effect of this.actor.effects ) {
        const statuses = effect.statuses;
        if ( (statuses.size === 1) && statuses.has(statusId) ) existing.push(effect.id);
      }
    }

    // Remove the existing effects unless the status effect is forced active
    if ( existing.length ) {
      if ( active ) return true;
      await this.actor.deleteEmbeddedDocuments("ActiveEffect", existing);
      return false;
    }

    // Create a new effect unless the status effect is forced inactive
    if ( !active && (active !== undefined) ) return false;
    const effect = await ActiveEffect.implementation.fromStatusEffect(statusId);
    if ( overlay ) effect.updateSource({"flags.core.overlay": true});
    await ActiveEffect.implementation.create(effect, {parent: this.actor, keepId: true});
    return true;
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

  /** @inheritDoc */
  _onUpdate(data, options, userId) {
    const textureChange = foundry.utils.hasProperty(data, "texture.src");
    if ( textureChange ) this.#subjectPath = undefined;
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
   * @param {string} type     The key to determine the type of flashing.
   */
  flashRing(type) {
    if ( !this.rendered ) return;
    const color = CONFIG.DND5E.tokenRingColors[type];
    if ( !color ) return;
    const options = {};
    if ( type === "damage" ) {
      options.duration = 500;
      options.easing = CONFIG.Token.ringClass.easeTwoPeaks;
    }
    this.object.ring?.flashColor(Color.from(color), options);
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);

    const origin = this.actor?.getFlag("dnd5e", "summon.origin");
    // TODO: Replace with parseUuid once V11 support is dropped
    if ( origin ) SummonsData.untrackSummon(origin.split(".Item.")[0], this.actor.uuid);
  }
}
