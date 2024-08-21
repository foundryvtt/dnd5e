import EnchantActivity from "./documents/activity/enchant.mjs";

/* -------------------------------------------- */
/*  Enchantments                                */
/* -------------------------------------------- */

class EnchantmentRegisty {
  /**
   * Registration of enchanted items mapped to a specific enchantment source. The map is keyed by the UUID of
   * enchant activities while the set contains UUID of applied enchantment active effects.
   * @type {Map<string, Set<string>>}
   */
  static #appliedEnchantments = new Map();

  /* -------------------------------------------- */

  /**
   * Fetch the tracked enchanted items.
   * @param {string} uuid  UUID of an activity or item.
   * @returns {ActiveEffect5e[]}
   */
  static applied(uuid) {
    const source = fromUuidSync(uuid);
    if ( source instanceof EnchantActivity ) {
      return Array.from(EnchantmentRegisty.#appliedEnchantments.get(uuid) ?? [])
        .map(uuid => fromUuidSync(uuid))
        .filter(i => i);
    }
    if ( source instanceof Item ) {
      return source.system.activities?.getByType("enchant")
        .map(a => EnchantmentRegisty.applied(a.uuid))
        .flat() ?? [];
    }
    return [];
  }

  /* -------------------------------------------- */

  /**
   * Add a new enchantment effect to the list of tracked enchantments. Will not track enchanted items in compendiums.
   * @param {string} source     UUID of the active effect origin for the enchantment.
   * @param {string} enchanted  UUID of the enchantment to track.
   */
  static track(source, enchanted) {
    if ( enchanted.startsWith("Compendium.") ) return;
    if ( !EnchantmentRegisty.#appliedEnchantments.has(source) ) {
      EnchantmentRegisty.#appliedEnchantments.set(source, new Set());
    }
    EnchantmentRegisty.#appliedEnchantments.get(source).add(enchanted);
  }

  /* -------------------------------------------- */

  /**
   * Stop tracking an enchantment.
   * @param {string} source     UUID of the active effect origin for the enchantment.
   * @param {string} enchanted  UUID of the enchantment to stop tracking.
   */
  static untrack(source, enchanted) {
    EnchantmentRegisty.#appliedEnchantments.get(source)?.delete(enchanted);
  }
}

/* -------------------------------------------- */
/*  Message Rolls                               */
/* -------------------------------------------- */

class MessageRegistry {
  /**
   * Registration of roll chat messages that originated at a specific message. The map is keyed by the ID of
   * the originating message and contains sets of IDs for each roll type.
   * @type {Map<string, Map<string, Set<string>>}
   */
  static #messages = new Map();

  /* -------------------------------------------- */

  /**
   * Fetch roll messages for an origin message, in chronological order.
   * @param {string} origin  ID of the origin message.
   * @param {string} [type]  Type of roll messages to fetch.
   * @returns {ChatMessage5e[]}
   */
  static messages(origin, type) {
    const originMap = MessageRegistry.#messages.get(origin);
    if ( !originMap ) return [];
    let ids;
    if ( type ) ids = Array.from(originMap.get(type)) ?? [];
    else ids = Array.from(originMap.values()).map(v => Array.from(v)).flat();
    return ids
      .map(id => game.messages.get(id))
      .filter(m => m)
      .sort((lhs, rhs) => lhs.timestamp - rhs.timestamp);
  }

  /* -------------------------------------------- */

  /**
   * Add a new roll message to the registry.
   * @param {ChatMessage5e} message  Message to add to the registry.
   */
  static track(message) {
    const origin = message.getFlag("dnd5e", "originatingMessage");
    const type = message.getFlag("dnd5e", "roll.type");
    if ( !origin || !type ) return;
    if ( !MessageRegistry.#messages.has(origin) ) MessageRegistry.#messages.set(origin, new Map());
    const originMap = MessageRegistry.#messages.get(origin);
    if ( !originMap.has(type) ) originMap.set(type, new Set());
    originMap.get(type).add(message.id);
  }

  /* -------------------------------------------- */

  /**
   * Remove a roll message to the registry.
   * @param {ChatMessage5e} message  Message to remove from the registry.
   */
  static untrack(message) {
    const origin = message.getFlag("dnd5e", "originatingMessage");
    const type = message.getFlag("dnd5e", "roll.type");
    MessageRegistry.#messages.get(origin)?.get(type)?.delete(message.id);
  }
}

/* -------------------------------------------- */
/*  Summons                                     */
/* -------------------------------------------- */

class SummonRegistry {
  /**
   * Registration of summoned creatures mapped to a specific summoner. The map is keyed by the UUID of
   * summoner while the set contains UUID of actors that have been summoned.
   * @type {Map<string, Set<string>>}
   */
  static #creatures = new Map();

  /* -------------------------------------------- */

  /**
   * Fetch creatures summoned by an actor.
   * @param {Actor5e} actor  Actor for which to find the summoned creatures.
   * @returns {Actor5e[]}
   */
  static creatures(actor) {
    return Array.from(SummonRegistry.#creatures.get(actor.uuid) ?? []).map(uuid => fromUuidSync(uuid));
  }

  /* -------------------------------------------- */

  /**
   * Add a new summoned creature to the list of summoned creatures.
   * @param {string} summoner  UUID of the actor who performed the summoning.
   * @param {string} summoned  UUID of the summoned creature to track.
   */
  static track(summoner, summoned) {
    if ( summoned.startsWith("Compendium.") ) return;
    if ( !SummonRegistry.#creatures.has(summoner) ) {
      SummonRegistry.#creatures.set(summoner, new Set());
    }
    SummonRegistry.#creatures.get(summoner).add(summoned);
  }

  /* -------------------------------------------- */

  /**
   * Stop tracking a summoned creature.
   * @param {string} summoner  UUID of the actor who performed the summoning.
   * @param {string} summoned  UUID of the summoned creature to stop tracking.
   */
  static untrack(summoner, summoned) {
    SummonRegistry.#creatures.get(summoner)?.delete(summoned);
  }
}


export default {
  enchantments: EnchantmentRegisty,
  messages: MessageRegistry,
  summons: SummonRegistry
};
