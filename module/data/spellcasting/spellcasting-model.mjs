const {
  ArrayField, BooleanField, FilePathField, NumberField, SchemaField, StringField, TypedObjectField
} = foundry.data.fields;

/**
 * A DataModel that represents a spellcasting method.
 * @extends {foundry.abstract.DataModel}
 */
export class SpellcastingModel extends foundry.abstract.DataModel {
  constructor(data={}, { key, ...options }={}) {
    super(data, options);
    this.#key = key;
  }

  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      img: new FilePathField({
        required: true, categories: ["IMAGE"], initial: "icons/magic/unholy/silhouette-robe-evil-power.webp"
      }),
      label: new StringField({ required: true, initial: () => game.i18n.localize("DND5E.SPELLCASTING.Unlabeled") }),
      order: new NumberField({ required: true, integer: true, nullable: false, initial: 0 }),
      type: new StringField({ required: true, readonly: true, initial: () => this.TYPE })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Available spellcasting methods.
   * @type {Record<string, typeof SpellcastingModel>}
   */
  static get TYPES() {
    Object.defineProperty(this, "TYPES", {
      value: {
        base: this,
        [SingleLevelSpellcasting.TYPE]: SingleLevelSpellcasting,
        [MultiLevelSpellcasting.TYPE]: MultiLevelSpellcasting
      },
      writable: false,
      configurable: false
    });
    return this.TYPES;
  }

  /* -------------------------------------------- */

  /**
   * The spellcasting method type.
   * @type {string}
   */
  static get TYPE() {
    return "none";
  }

  /* -------------------------------------------- */

  /**
   * The internal key of the spellcasting method.
   * @type {string}
   */
  get key() {
    return this.#key;
  }

  #key;

  /* -------------------------------------------- */
  /*  Public API                                  */
  /* -------------------------------------------- */

  /**
   * Initialize data models from global config.
   */
  static fromConfig() {
    const { spellcasting } = CONFIG.DND5E;

    // Map progressions to spellcasting for faster lookup.
    CONFIG.DND5E.spellProgression = { none: { label: game.i18n.localize("DND5E.SpellNone") } };

    // Initialize models.
    Object.entries(spellcasting).forEach(([key, config]) => {
      const Model = this.TYPES[config.type ?? "base"];
      if ( !Model ) return delete spellcasting[key];
      spellcasting[key] = new Model(config, { key });
      Object.entries(config.progression ?? {}).forEach(([k, v]) => {
        if ( k in CONFIG.DND5E.spellProgression ) console.warn(`Duplicate spell progression key '${k}' detected.`);
        CONFIG.DND5E.spellProgression[k] = { ...v, type: key };
      });
    });
  }

  /* -------------------------------------------- */

  /**
   * Get the human-readable label for this spellcasting method.
   * @param {object} [options]
   * @param {number} [options.level]                  The spell slot level.
   * @param {"long"|"short"} [options.format="long"]  The verbosity level.
   * @returns {string}
   */
  getLabel(options={}) {
    return this.label;
  }
}

/* -------------------------------------------- */

/**
 * An abstract class that defines spellcasting methods that provide spell slots.
 * @extends {SpellcastingModel}
 */
export class SlotSpellcasting extends SpellcastingModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      cantrips: new BooleanField(),
      exclusive: new SchemaField({
        slots: new BooleanField(),
        spells: new BooleanField()
      }),
      prepares: new BooleanField(),
      progression: new TypedObjectField(new SchemaField({
        divisor: new NumberField({ required: true, nullable: false, integer: true, positive: true, initial: 1 }),
        label: new StringField({ required: true, initial: () => game.i18n.localize("DND5E.SPELLCASTING.Unlabeled") }),
        roundUp: new BooleanField()
      }))
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Are spell slots recovered on a long rest?
   * @type {boolean}
   */
  get isLR() {
    return this.recovery.has("long");
  }

  /* -------------------------------------------- */

  /**
   * Are spell slots recovered on a short rest?
   * @type {boolean}
   */
  get isSR() {
    return this.recovery.has("short");
  }

  /* -------------------------------------------- */

  /**
   * Rest types that fully restore the spell slots of this spellcasting method.
   * @type {Set<string>}
   */
  get recovery() {
    if ( this.#recovery ) return this.#recovery;
    return this.#recovery = Object.entries(CONFIG.DND5E.restTypes).reduce((acc, [k, v]) => {
      if ( v.recoverSpellSlotTypes?.has(this.key) ) acc.add(k);
      return acc;
    }, new Set());
  }

  #recovery;

  /* -------------------------------------------- */

  /**
   * Whether this spellcasting method provides spell slots.
   * @type {boolean}
   */
  get slots() {
    return true;
  }

  /* -------------------------------------------- */
  /*  Public API                                  */
  /* -------------------------------------------- */

  /**
   * Calculate the slots made available by this spellcasting method at the given character level.
   * @param {number} level              The character level, adjusted for different progression speeds and
   *                                    multi-classing.
   * @returns {Record<number, number>}  A mapping of slot level to the number of slots.
   * @abstract
   */
  calculateSlots(level) {
    return {};
  }

  /* -------------------------------------------- */

  /**
   * Contribute to the actor's spellcasting progression for a spellcasting method that provides slots.
   * @param {object} progression                      Spellcasting progression data. *Will be mutated.*
   * @param {Actor5e|void} actor                      Actor for whom the data is being prepared, if any.
   * @param {Item5e} [cls]                            Class for whom this progression is being computed.
   * @param {SpellcastingDescription} [spellcasting]  Spellcasting descriptive object.
   * @param {number} [count]                          Number of classes with this type of spellcasting.
   */
  computeProgression(progression, actor, cls, spellcasting, count) {
    const prog = this.progression?.[spellcasting?.progression];
    if ( !prog ) return;
    const rounding = prog.roundUp ? Math.ceil : Math.floor;
    progression[this.key] += rounding(spellcasting.levels / (prog.divisor ?? 1));
    // Single-classed, non-full progression rounds up, rather than down.
    if ( (count === 1) && (prog.divisor > 1) && progression[this.key] ) {
      progression[this.key] = Math.ceil(spellcasting.levels / prog.divisor);
    }
  }

  /* -------------------------------------------- */

  /**
   * When being considered as a single-classed caster, retrieve the available levels which can be prepared via this
   * spellcasting method, in ascending order.
   * @param {Actor5e} actor  The caster.
   * @returns {number[]}
   */
  getAvailableLevels(actor) {
    const spells = foundry.utils.getProperty(actor, `system.spells.${this.getSpellSlotKey()}`);
    return spells?.max ? [spells.level] : [];
  }

  /* -------------------------------------------- */

  /**
   * Get the internal actor model key for spell slots provided by the spellcasting method.
   * @param {number} [level]  The spell slot level.
   * @returns {string}
   */
  getSpellSlotKey(level) {
    if ( level === 0 ) return "spell0";
    return this.key;
  }

  /* -------------------------------------------- */

  /**
   * Prepare slots provided by this spellcasting method.
   * @param {object} spells        The `data.spells` object within actor's data. *Will be mutated.*
   * @param {Actor5e|null} actor   Actor for whom the data is being prepared, if any.
   * @param {object} progression   Spellcasting progression data.
   * @abstract
   */
  prepareSlots(spells, actor, progression) {}
}

/* -------------------------------------------- */

/**
 * A spellcasting model that represents spellcasting methods that provide spell slots that are all the same level.
 * @extends {SlotSpellcasting}
 */
export class SingleLevelSpellcasting extends SlotSpellcasting {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      table: new TypedObjectField(new SchemaField({
        slots: new NumberField({ required: true, nullable: false, integer: true, positive: true, initial: 1 }),
        level: new NumberField({ required: true, nullable: false, integer: true, positive: true, initial: 1 })
      }), { validateKey: SingleLevelSpellcasting.#validateTableKey })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  static get TYPE() {
    return "single";
  }

  /* -------------------------------------------- */

  /**
   * Whether this spellcasting method only provides a single level of spell slots.
   * @returns {boolean}
   */
  get isSingleLevel() {
    return true;
  }

  /* -------------------------------------------- */
  /*  Validation                                  */
  /* -------------------------------------------- */

  /**
   * Ensure spell slot table keys are numeric.
   * @param {any} k  The key.
   * @returns {boolean}
   */
  static #validateTableKey(k) {
    return Number.isNumeric(k) && (Number(k) > 0);
  }

  /* -------------------------------------------- */
  /*  Public API                                  */
  /* -------------------------------------------- */

  /** @override */
  calculateSlots(level) {
    const [, slots] = Object.entries(this.table).reverse().find(([l]) => Number(l) <= level) ?? [];
    const available = {};
    if ( slots ) available[slots.level] = slots.slots;
    return available;
  }

  /* -------------------------------------------- */

  /** @override */
  getLabel({ level, format }={}) {
    if ( !(level in CONFIG.DND5E.spellLevels) ) return this.label;
    const short = format === "short";
    return [this.label, short ? "" : "—", short ? "" : CONFIG.DND5E.spellLevels[level]].filterJoin(" ");
  }

  /* -------------------------------------------- */

  /** @override */
  prepareSlots(spells, actor, progression) {
    let level = Math.clamp(progression[this.key], 0, CONFIG.DND5E.maxLevel);
    const slot = spells[this.key] ??= { value: 0 };
    slot.type = this.key;
    slot.label = this.label;
    const override = Number.isNumeric(slot.override) ? Math.max(parseInt(slot.override), 0) : null;
    if ( (level === 0) && (actor.type === "npc") && (override !== null) ) level = actor.system.attributes.spell.level;
    const slots = this.calculateSlots(level);
    if ( foundry.utils.isEmpty(slots) && !override ) return;
    const [[slotLevel, slotAmount]=[]] = Object.entries(slots);
    slot.max = Number.isFinite(override) ? override : (slotAmount || 0);
    slot.level = slot.max ? slotLevel ? parseInt(slotLevel) : 1 : 0;
    slot.value = Math.clamp(slot.value, 0, slot.max) || 0;
  }
}

/* -------------------------------------------- */

/**
 * A spellcasting model that represents spellcasting methods that provide slots of different levels.
 * @extends {SlotSpellcasting}
 */
export class MultiLevelSpellcasting extends SlotSpellcasting {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      table: new ArrayField(new ArrayField(new NumberField({
        required: true, nullable: false, integer: true, positive: true, initial: 1
      })))
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  static get TYPE() {
    return "multi";
  }

  /* -------------------------------------------- */
  /*  Public API                                  */
  /* -------------------------------------------- */

  /** @override */
  calculateSlots(level) {
    const slots = this.table[Math.min(level, this.table.length) - 1] ?? [];
    return Object.fromEntries(slots.map((n, i) => [i + 1, n]));
  }

  /* -------------------------------------------- */

  /** @override */
  getAvailableLevels(actor) {
    return Array.fromRange(Object.keys(CONFIG.DND5E.spellLevels).length - 1, 1).reduce((arr, l) => {
      const spells = foundry.utils.getProperty(actor, `system.spells.${this.getSpellSlotKey(l)}`);
      if ( spells?.max ) arr.push(l);
      return arr;
    }, []);
  }

  /* -------------------------------------------- */

  /** @override */
  getLabel({ level }={}) {
    return game.i18n.localize(`DND5E.SPELLCASTING.SLOTS.${this.getSpellSlotKey(level)}`);
  }

  /* -------------------------------------------- */

  /** @override */
  getSpellSlotKey(level) {
    return `${this.key}${level}`;
  }

  /* -------------------------------------------- */

  /** @override */
  prepareSlots(spells, actor, progression) {
    const slots = this.calculateSlots(progression[this.key]);
    for ( const level of Array.fromRange(Object.keys(CONFIG.DND5E.spellLevels).length - 1, 1) ) {
      const slot = spells[this.getSpellSlotKey(level)] ??= { value: 0 };
      slot.label = this.getLabel({ level });
      slot.level = level;
      slot.max = Number.isNumeric(slot.override) ? Math.max(parseInt(slot.override), 0) : slots[level] ?? 0;
      slot.type = this.key;
    }
  }
}
