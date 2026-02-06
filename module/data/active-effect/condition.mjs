const { ActiveEffectTypeDataModel } = foundry.data;
const { TypeDataModel } = foundry.abstract;

const { NumberField, StringField } = foundry.data.fields;

/**
 * System data model for condition active effects.
 */
export default class ConditionData extends (ActiveEffectTypeDataModel ?? TypeDataModel) {
  /** @override */
  static defineSchema() {
    const schema = ActiveEffectTypeDataModel ? super.defineSchema() : {};
    return Object.assign(schema, {
      level: new NumberField({ nullable: true, integer: true, initial: null, min: 1 }),
      type: new StringField({ required: true, blank: false })
    });
  }

  /* -------------------------------------------------- */

  /**
   * Does the given status have levels?
   * @param {string} type   The primary status id.
   * @returns {boolean}
   */
  static hasLevels(type) {
    const config = CONFIG.DND5E.conditionTypes[type];
    return !!config && ("levels" in config);
  }

  /* -------------------------------------------------- */

  /**
   * Does this condition have levels?
   * @type {boolean}
   */
  get hasLevels() {
    return ConditionData.hasLevels(this.type);
  }

  /* -------------------------------------------------- */

  /**
   * The max level of this condition.
   * @type {number|null}
   */
  get maxLevel() {
    return this.hasLevels
      ? CONFIG.DND5E.conditionTypes[this.type].levels
      : null;
  }

  /* -------------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    if ( !this.hasLevels ) {
      this.level = null;
      return;
    }

    this.level = Math.clamp(this.level, 1, this.maxLevel);
    this.parent.name = `${CONFIG.DND5E.conditionTypes[this.type].name} (${this.level})`;
    this.parent.img = this.constructor.getIconByLevel(this.type, this.level);

    for (let i=1; i <= this.level; i++) {
      const statuses = CONFIG.DND5E.conditionTypes[this.type].conditions?.[i] ?? [];
      statuses.forEach(s => this.parent.statuses.add(s));
    }

    const actor = this.parent.parent;
    if ( this.parent.active && (actor instanceof Actor) ) {
      actor.system.conditions ??= {};
      actor.system.conditions[this.type] = this.level;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Get the image used to represent a status of a given level.
   * @param {string} type     The condition type.
   * @param {number} level    The level of the condition.
   * @returns {string}
   */
  static getIconByLevel(type, level) {
    const { img } = CONFIG.DND5E.conditionTypes[type];
    const split = img.split(".");
    const ext = split.pop();
    const path = split.join(".");
    return `${path}-${level}.${ext}`;
  }

  /* -------------------------------------------------- */

  /**
   * Decrease the level of this condition.
   * @param {number} [levels=1]   The increase in levels.
   * @returns {Promise<ActiveEffect5e>}   A promise that resolves to the updaeed effect.
   */
  async decrease(levels=1) {
    if ( !this.hasLevels ) return this;
    await this.parent.update({ "system.level": this.level - levels }, { dnd5e: { originalLevel: this.level }});
    return this.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Increase the level of this condition.
   * @param {number} [levels=1]   The increase in levels.
   * @returns {Promise<ActiveEffect5e>}   A promise that resolves to the updaeed effect.
   */
  async increase(levels=1) {
    if ( !this.hasLevels ) return this;
    await this.parent.update({ "system.level": this.level + levels }, { dnd5e: { originalLevel: this.level }});
    return this.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Manage a change to levels of an actor's conditions.
   * @param {string} statusId                   The status id.
   * @param {Actor5e} actor                     The actor having a status applied, changed, or removed.
   * @param {object} [options={}]
   * @param {number} [options.levels=1]         The change in levels.
   * @returns {Promise<ActiveEffect5e|void>}    A promise that resolves to a created, deleted, or updated
   *                                            effect, or void if no operation was performed.
   */
  static async _applyDelta(statusId, actor, { levels=1 }={}) {
    const effect = actor.effects.get(dnd5e.utils.staticID(`dnd5e${statusId}`));

    // Increase level of existing effect.
    if ( effect && (levels > 0) ) return effect.system.increase(levels);

    // Create new effect with level.
    if ( levels > 0 ) {
      const effect = await getDocumentClass("ActiveEffect").fromStatusEffect(statusId);
      const data = foundry.utils.mergeObject(effect.toObject(), {
        _id: dnd5e.utils.staticID(`dnd5e${statusId}`),
        "system.level": levels
      });
      return getDocumentClass("ActiveEffect").create(data, { parent: actor, keepId: true });
    }

    // Decrease level (possibly delete).
    if ( effect && (levels < 0) ) {
      const nLevel = effect.system.level + levels;
      if ( nLevel <= 0 ) {
        await effect.delete();
        return false;
      }
      return effect.system.decrease(Math.abs(levels));
    }
  }

  /* -------------------------------------------------- */

  /** @inheritDoc */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);

    if ( !this.hasLevels ) return;
    const delta = this.level - options.dnd5e?.originalLevel;
    if ( delta ) this.parent._displayScrollingStatus(delta);
  }
}
