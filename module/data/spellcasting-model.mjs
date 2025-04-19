const {
  BooleanField, FilePathField, NumberField, SchemaField, StringField, TypedObjectField
} = foundry.data.fields;

export default class SpellcastingModel extends foundry.abstract.DataModel {
  constructor(data={}, { key, ...options } = {}) {
    super(data, options);
    this.#key = key;
  }

  /* -------------------------------------------------- */

  /**
   * The internal key of this spellcasting type, stored in the model for easy reference.
   * @type {string}
   */
  #key;

  get key() {
    return this.#key;
  }

  /* -------------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      img: new FilePathField({ categories: ["IMAGE"], initial: "icons/magic/unholy/silhouette-robe-evil-power.webp" }),
      label: new StringField({ initial: () => game.i18n.localize("DND5E.SPELLCASTING.Unlabeled") }),
      order: new NumberField({ integer: true, nullable: false, initial: 0 }),
      type: new StringField({ readonly: true, initial: () => this.TYPE, required: true })
    };
  }

  /* -------------------------------------------------- */

  /**
   * Spellcasting subtypes.
   * @type {Record<string, typeof SpellcastingModel>}
   */
  static get TYPES() {
    return {
      [ProgressionSpellcasting.TYPE]: ProgressionSpellcasting,
      [StaticSpellcasting.TYPE]: StaticSpellcasting
    };
  }

  /* -------------------------------------------------- */

  /**
   * The progression subtype.
   * @type {string}
   */
  static get TYPE() {
    return "";
  }

  /* -------------------------------------------------- */

  /**
   * Is this a spellcasting type that does not use any kind of slots?
   * @type {boolean}
   */
  get isStatic() {
    return ( this.type === StaticSpellcasting.TYPE ) || !this.spellcastingTable;
  }

  /* -------------------------------------------------- */

  /**
   * The spellcasting table used to calculate this progression.
   * @type {object|null}
   */
  get spellcastingTable() {
    return null;
  }

  /* -------------------------------------------------- */

  /**
   * Keys in `DND5E.restTypes` which restore this type of spell slot.
   * @type {Set<string>}
   */
  get recovery() {
    return new Set();
  }

  /* -------------------------------------------------- */

  /**
   * Is this recovered on a short rest?
   * @type {boolean}
   */
  get isSR() {
    return this.recovery.has("short");
  }

  /* -------------------------------------------------- */

  /**
   * Is this recovered on a long rest?
   * @type {boolean}
   */
  get isLR() {
    return this.recovery.has("long");
  }

  /* -------------------------------------------------- */

  /**
   * Return a localized label for a given level of spell slots.
   * @param {number} [level]    The level of spell slots.
   * @param {boolean} [short]   Use short-form label?
   * @returns {string}
   */
  spellSlotLabel(level=null, short=false) {
    if ( this.isStatic ) return this.label;
    if ( !this.separate ) {
      return [
        game.i18n.localize(`DND5E.SPELLCASTING.SLOTS.${this.key}`),
        short ? null : " — ",
        short ? null : CONFIG.DND5E.spellLevels[level]
      ].filterJoin(" ");
    }
    return game.i18n.localize(`DND5E.SPELLCASTING.SLOTS.${this.key}${level}`);
  }

  /* -------------------------------------------------- */

  /**
   * Determine the internal key for this spellcasting type of a given level.
   * @param {number} level    Spell level.
   * @returns {string}
   */
  spellSlotKey(level) {
    if ( this.isStatic ) return this.key;
    if ( this.separate && (level > 0) ) return `${this.key}${level}`;
    return (level > 0) ? this.key : "spell0";
  }

  /* -------------------------------------------------- */

  /**
   * Determine the slots that an actor would have of a given spellcasting level.
   * @param {number} level    Spellcaster level.
   * @returns {object}
   */
  calculateSlots(level) {
    const table = this.spellcastingTable;
    if ( !table ) {
      throw new Error(`No slot progression table was found for the '${this.#key}' spellcasting!`);
    }

    level = Math.clamp(level, 0, CONFIG.DND5E.maxLevel);

    if ( this.separate ) {
      const acc = {};
      for ( let i = 1; i <= level; i++ ) {
        for ( const [slotLevel, increase] of Object.entries(table[i] ?? {}) ) {
          acc[slotLevel] = (acc[slotLevel] ?? 0) + increase;
        }
      }
      return acc;
    }

    let amount = 0;
    let slotLevel = 0;
    for ( let i = 1; i <= level; i++ ) {
      if ( !table[i] ) continue;
      amount += (table[i].slots ?? 0);
      slotLevel += (table[i].level ?? 0);
    }
    return (amount && slotLevel) ? { [slotLevel]: amount } : {};
  }
}

/* -------------------------------------------------- */

class StaticSpellcasting extends SpellcastingModel {
  /** @inheritDoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {});
  }

  /* -------------------------------------------------- */

  /** @inheritDoc */
  static get TYPE() {
    return "static";
  }
}

/* -------------------------------------------------- */

class ProgressionSpellcasting extends SpellcastingModel {
  /** @inheritDoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      cantrips: new BooleanField({ initial: true }),
      prepares: new BooleanField({ initial: true }),
      progression: new TypedObjectField(new SchemaField({
        divisor: new NumberField({ nullable: false, integer: true, min: 1, initial: 1 }),
        label: new StringField({ initial: () => game.i18n.localize("DND5E.SPELLCASTING.Unlabeled") }),
        roundUp: new BooleanField({ initial: true })
      })),
      separate: new BooleanField({ initial: false }),
      table: new StringField({ required: true, blank: true }),
      _deprecated: new BooleanField()
    });
  }

  /* -------------------------------------------------- */

  /** @inheritDoc */
  static get TYPE() {
    return "progression";
  }

  /* -------------------------------------------------- */

  /** @inheritDoc */
  get recovery() {
    const types = new Set();
    for ( const [k, v] of Object.entries(CONFIG.DND5E.restTypes) ) {
      if ( v.recoverSpellSlotTypes?.has(this.key) ) {
        types.add(k);
      }
    }
    return types;
  }

  /* -------------------------------------------------- */

  /** @inheritDoc */
  get spellcastingTable() {
    return CONFIG.DND5E.spellcastingTables[this.table] ?? null;
  }

  /* -------------------------------------------------- */

  /**
   * For progressions, a character sheet shows all sections that have
   * a non-zero number of maximum slots, even if no spell is present.
   * @param {Actor5e} actor   The actor to determine sections for.
   * @returns {number[]}
   */
  spellSections(actor) {
    if ( this.separate ) {
      const levels = [];
      for ( const n of Array.fromRange(Object.keys(CONFIG.DND5E.spellLevels).length - 1, 1) ) {
        const spell = actor.system.spells[this.spellSlotKey(n)];
        if ( spell?.max ) levels.push(n);
      }
      return levels;
    } else {
      return actor.system.spells[this.key]?.max ? [actor.system.spells[this.key].level] : [];
    }
  }

  /* -------------------------------------------------- */

  /** @inheritDoc */
  calculateSlots(level) {
    if ( !this._deprecated ) return super.calculateSlots(level);

    const table = this.spellcastingTable;
    const [, keyConfig] = Object.entries(table).reverse().find(([l]) => Number(l) <= level) ?? [];
    if ( keyConfig ) {
      const { slots, level } = keyConfig;
      return { [level]: slots };
    }

    return {};
  }
}
