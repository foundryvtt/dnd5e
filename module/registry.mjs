import CompendiumBrowser from "./applications/compendium-browser.mjs";
import { formatIdentifier } from "./utils.mjs";

/**
 * @import { RegisteredItemData } from "./_types.mjs";
 */

/* -------------------------------------------- */
/*  Dependents                                  */
/* -------------------------------------------- */

class DependentsRegistry {
  /**
   * Registration of documents that are dependent on an active effect. The map is keyed by the UUID of
   * the active effect upon which the document is dependent and contains a set of UUIDs for that effect's
   * dependents. All UUIDs are expected to be world UUIDs or UUIDs of documents with the same ancestor
   * document as the effect they are dependent on.
   * @type {Map<string, Set<string>>}
   */
  static #dependents = new Map();

  /* -------------------------------------------- */

  /**
   * Fetch dependent documents for an active effect.
   * @param {ActiveEffect|string} effect  Active effect for which to get the dependent documents or UUID for an
   *                                      effect in the world.
   * @returns {Document[]}
   */
  static get(effect) {
    effect = effect instanceof ActiveEffect ? effect : fromUuidSync(effect);
    return Array.from(this.#dependents.get(effect?.uuid) ?? [])
      .map(uuid => {
        // TODO: Remove this special casing once https://github.com/foundryvtt/foundryvtt/issues/11214 is resolved
        if ( effect.parent.pack && uuid.includes(effect.parent.uuid) ) {
          const [, embeddedName, id] = uuid.replace(effect.parent.uuid, "").split(".");
          return effect.parent.getEmbeddedDocument(embeddedName, id);
        }
        return fromUuidSync(uuid, { strict: false });
      })
      .filter(_ => _);
  }

  /* -------------------------------------------- */

  /**
   * Resolve an active effect ID into an absolute UUID.
   * @param {string} idOrUuid      ID or UUID of active effect.
   * @param {Document} dependent   Document to track as a dependent.
   * @returns {string}
   */
  static #resolveDependentID(idOrUuid, dependent) {
    if ( idOrUuid.length > 16 ) return foundry.utils.parseUuid(idOrUuid, { relative: dependent })?.uuid;
    let relative = dependent.parent;
    if ( relative && !(relative instanceof Item) ) relative = relative.parent;
    return relative.effects.get(idOrUuid)?.uuid;
  }

  /* -------------------------------------------- */

  /**
   * Add a dependent document to the registry.
   * @param {string} idOrUuid      ID or UUID of active effect.
   * @param {Document} dependent   Document to track as a dependent.
   */
  static track(idOrUuid, dependent) {
    const uuid = DependentsRegistry.#resolveDependentID(idOrUuid, dependent);
    if ( !uuid ) return;
    if ( !DependentsRegistry.#dependents.has(uuid) ) DependentsRegistry.#dependents.set(uuid, new Set());
    DependentsRegistry.#dependents.get(uuid).add(dependent.uuid);
  }

  /* -------------------------------------------- */

  /**
   * Remove a dependent document from the registry.
   * @param {string} idOrUuid     ID or UUID of active effect.
   * @param {Document} dependent  Dependent document to stop tracking.
   */
  static untrack(idOrUuid, dependent) {
    const uuid = DependentsRegistry.#resolveDependentID(idOrUuid, dependent);
    DependentsRegistry.#dependents.get(uuid)?.delete(dependent.uuid);
  }
}

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
    if ( source instanceof Item ) {
      return source.system.activities?.getByType("enchant")
        .map(a => EnchantmentRegisty.applied(a.uuid))
        .flat() ?? [];
    }
    return Array.from(EnchantmentRegisty.#appliedEnchantments.get(uuid) ?? [])
      .map(uuid => fromUuidSync(uuid))
      .filter(effect => effect?.isAppliedEnchantment);
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
/*  Item Registry                               */
/* -------------------------------------------- */

class ItemRegistry {
  constructor(itemsType) {
    this.#itemType = itemsType;
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Items grouped by identifiers.
   * @type {Map<string, RegisteredItemData>}
   */
  #items = new Map();

  /* -------------------------------------------- */

  /**
   * Type of item represented by this registry.
   * @type {string}
   */
  #itemType;

  /* -------------------------------------------- */

  /**
   * Has initial loading been completed?
   * @type {number}
   */
  #status = ItemRegistry.#STATUS_STATES.NONE;

  /**
   * Possible preparation states for the item registry.
   * @enum {number}
   */
  static #STATUS_STATES = Object.freeze({
    NONE: 0,
    LOADING: 1,
    READY: 2
  });

  /* -------------------------------------------- */

  /**
   * Choices object.
   * @type {Record<string, string>}
   */
  get choices() {
    return this.options.reduce((obj, { value, label }) => {
      obj[value] = label;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * All items formatted for a select input.
   * @type {FormSelectOption[]}
   */
  get options() {
    return Array.from(this.#items.entries())
      .map(([value, data]) => ({ value, label: data.name }))
      .sort((lhs, rhs) => lhs.label.localeCompare(rhs.label, game.i18n.lang));
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Get information on a single item based on its identifier.
   * @param {string} identifier
   * @returns {RegisteredItemData|void}
   */
  get(identifier) {
    return this.#items.get(identifier);
  }

  /* -------------------------------------------- */

  /**
   * Scan compendium packs to register matching items of this type.
   */
  async initialize() {
    if ( this.#status > ItemRegistry.#STATUS_STATES.NONE ) return;
    RegistryStatus.set(this.#itemType, false);
    if ( game.modules.get("babele")?.active && (game.babele?.initialized === false) ) {
      Hooks.once("babele.ready", () => this.initialize());
      return;
    } else if ( !game.ready ) {
      Hooks.once("ready", () => this.initialize());
      return;
    }
    this.#status = ItemRegistry.#STATUS_STATES.LOADING;

    const indexes = await CompendiumBrowser.fetch(Item, {
      types: new Set([this.#itemType]),
      indexFields: new Set(["system.identifier", "system.source"]),
      sort: false
    });
    for ( const item of indexes ) {
      const identifier = item.system?.identifier ?? formatIdentifier(item.name);
      if ( !this.#items.has(identifier) ) this.#items.set(identifier, { sources: [] });
      const itemData = this.#items.get(identifier);
      itemData.name = item.name;
      itemData.img = item.img;
      itemData.identifier = identifier;
      itemData.sources.push(item.uuid);
    }

    this.#status = ItemRegistry.#STATUS_STATES.READY;
    RegistryStatus.set(this.#itemType, true);
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
  static get(origin, type) {
    const originMap = MessageRegistry.#messages.get(origin);
    if ( !originMap ) return [];
    let ids;
    if ( type ) ids = Array.from(originMap.get(type) ?? []);
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
/*  Spell Lists                                 */
/* -------------------------------------------- */

class SpellListRegistry {
  /**
   * Spell lists organized by the UUID of a spell they contain.
   * @type {Map<string, Set<SpellList>>}
   */
  static #bySpell = new Map();

  /* -------------------------------------------- */

  /**
   * Registration of spell lists grouped by type and identifier.
   * @type {Map<string, Map<string, SpellList>>}
   */
  static #byType = new Map();

  /* -------------------------------------------- */

  /**
   * IDs of compendiums that have been re-indexed during loading.
   * @type {Set<string>}
   */
  static #compendiumsIndexed = new Set();

  /* -------------------------------------------- */

  /**
   * UUIDs of spell lists or IDs of compendiums in the process of being loaded.
   * @type {Set<string>}
   */
  static #loading = new Set();

  /* -------------------------------------------- */

  /**
   * Options for each registered spell list, grouped by type.
   * @type {FormSelectOption[]}
   */
  static get options() {
    return Object.entries(CONFIG.DND5E.spellListTypes).map(([type, group]) => {
      const lists = this.#byType.get(type);
      if ( !lists ) return [];
      return Array.from(lists.entries())
        .map(([value, list]) => ({ value: `${type}:${value}`, label: list.name, group, type }))
        .sort((lhs, rhs) => lhs.label.localeCompare(rhs.label, game.i18n.lang));
    }).flat();
  }

  /* -------------------------------------------- */

  /**
   * Have spell lists finished loading?
   * @type {boolean}
   */
  static get ready() {
    return this.#loading.size === 0;
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve a list of spell lists a spell belongs to.
   * @param {string} uuid  UUID of a spell item.
   * @returns {Set<SpellList>}
   */
  static forSpell(uuid) {
    return SpellListRegistry.#bySpell.get(uuid) ?? new Set();
  }

  /* -------------------------------------------- */

  /**
   * Retrieve a specific spell list from the registry.
   * @param {string} type          Type of list as defined in `CONFIG.DND5E.spellListTypes`. Can also be a combination
   *                               of the type and identifier split by a colon (e.g. `class:bard`).
   * @param {string} [identifier]  Identifier of the specific spell list.
   * @returns {SpellList|null}
   */
  static forType(type, identifier) {
    if ( type.includes(":") && !identifier ) [type, identifier] = type.split(":", 2);
    return SpellListRegistry.#byType.get(type)?.get(identifier) ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Register a spell list journal entry page.
   * @param {string} uuid  UUID of a spell list journal entry page.
   */
  static async register(uuid) {
    RegistryStatus.set("spellLists", false);
    this.#loading.add(uuid);
    if ( !game.ready ) {
      Hooks.once("ready", () => this.register(uuid));
      return;
    }

    const page = await fromUuid(uuid);
    if ( !page ) throw new Error(`Journal entry page "${uuid}" could not be found to register as spell list.`);
    if ( page.type !== "spells" ) throw new Error(`Journal entry page "${uuid}" is not a Spell List.`);

    if ( !SpellListRegistry.#byType.has(page.system.type) ) SpellListRegistry.#byType.set(page.system.type, new Map());

    const type = SpellListRegistry.#byType.get(page.system.type);
    if ( !type.has(page.system.identifier) ) type.set(page.system.identifier, new SpellList({
      identifier: page.system.identifier, name: page.name, type: page.system.type
    }));

    const list = type.get(page.system.identifier);
    await Promise.all(Array.from(list.contribute(page)).map(async uuid => {
      if ( !SpellListRegistry.#bySpell.has(uuid) ) SpellListRegistry.#bySpell.set(uuid, new Set());
      SpellListRegistry.#bySpell.get(uuid).add(list);
      const { collection } = foundry.utils.parseUuid(uuid);
      if ( (collection instanceof foundry.documents.collections.CompendiumCollection)
        && !this.#compendiumsIndexed.has(collection.metadata.id) ) {
        this.#compendiumsIndexed.add(collection.metadata.id);
        this.#loading.add(collection.metadata.id);
        await collection.getIndex();
        this.#loading.delete(collection.metadata.id);
      }
    }));

    this.#loading.delete(uuid);
    if ( this.ready ) RegistryStatus.set("spellLists", true);
  }
}

/**
 * Type that represents a unified spell list for a specific class, subclass, species, or something else.
 */
export class SpellList {
  constructor(metadata) {
    this.#metadata = Object.freeze(metadata);
  }

  /* -------------------------------------------- */

  /**
   * Mapping of spell list types to item registries.
   * @enum {string}
   */
  static #REGISTRIES = {
    class: "classes",
    subclass: "subclasses"
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Identifiers for all the available & unlinked spells in this list.
   * @type {Set<string>}
   */
  get identifiers() {
    return new Set([
      ...this.indexes.map(s => s.system?.identifier),
      ...this.#unlinked.map(u => u.identifier)
    ].filter(_ => _));
  }

  /* -------------------------------------------- */

  /**
   * Indexes for the available spells sorted by name.
   * @type {object[]}
   */
  get indexes() {
    return Array.from(this.#spells.keys())
      .map(s => fromUuidSync(s))
      .filter(_ => _)
      .sort((lhs, rhs) => lhs.name.localeCompare(rhs.name, game.i18n.lang));
  }

  /* -------------------------------------------- */

  /**
   * Information on the spell list.
   * @type {{ identifier: string, name: string, type: string }}
   */
  #metadata;

  get metadata() {
    return this.#metadata;
  }

  /* -------------------------------------------- */

  /**
   * Display name for the spell list.
   * @type {string}
   */
  get name() {
    return dnd5e.registry[SpellList.#REGISTRIES[this.metadata.type]]?.get(this.metadata.identifier)?.name
      ?? this.metadata.name;
  }

  /* -------------------------------------------- */

  /**
   * @typedef {SpellData}
   * @property {string} page  UUID of the original page.
   */

  /**
   * Spells represented by this spell list.
   * @type {Map<string, SpellList.SpellData>}
   */
  #spells = new Map();

  /* -------------------------------------------- */

  /**
   * Unlinked spell definitions.
   * @type {UnlinkedSpellConfiguration[]}
   */
  #unlinked = [];

  /* -------------------------------------------- */

  /**
   * UUIDs of all of the spells in this list.
   * @type {Set<string>}
   */
  get uuids() {
    return new Set(this.#spells.keys());
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Add a spell list page to this unified spell list.
   * @param {JournalEntryPage} page  Spells page to contribute.
   * @returns {Set<string>}          Newly added UUIDs.
   */
  contribute(page) {
    const added = new Set();

    page.system.spells.forEach(s => {
      if ( !this.#spells.has(s) ) added.add(s);
      this.#spells.set(s, { page: page.uuid });
    });

    for ( const unlinked of page.system.unlinkedSpells ) {
      if ( fromUuidSync(unlinked.source?.uuid) ) {
        if ( !this.#spells.has(unlinked.source.uuid) ) added.add(unlinked.source.uuid);
        this.#spells.set(unlinked.source.uuid, { page: page.uuid });
      } else {
        this.#unlinked.push(foundry.utils.mergeObject({ page: page.uuid }, unlinked));
      }
    }

    return added;
  }

  /* -------------------------------------------- */

  /**
   * Determine whether the provided spell is included in the list.
   * @param {Item5e|string} spell  Spell item or a compendium UUID.
   * @returns {boolean}
   */
  has(spell) {
    if ( spell instanceof Item ) spell = spell._stats?.compendiumSource ?? spell.uuid;
    return this.#spells.has(spell);
  }

  /* -------------------------------------------- */

  /**
   * All of the spells represented by this list.
   * @returns {Promise<Item5e>}
   */
  async getSpells() {
    return Promise.all(Array.from(this.#spells.keys()).map(s => fromUuid(s)));
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

/* -------------------------------------------- */
/*  Ready API                                   */
/* -------------------------------------------- */

/**
 * Track the ready status of various registries.
 * @type {Map<string, boolean>}
 */
const RegistryStatus = new class extends Map {
  constructor(iterable) {
    super(iterable);
    const { promise, resolve } = Promise.withResolvers();
    this.#ready = promise;
    this.#resolve = resolve;
  }

  /* -------------------------------------------- */

  /**
   * Promise that resolves when the registry is ready.
   * @type {Promise}
   */
  #ready;

  /* -------------------------------------------- */

  /**
   * Promise that resolves when all registries are ready.
   * @returns {Promise}
   */
  get ready() {
    return this.#ready;
  }

  /* -------------------------------------------- */

  /**
   * Internal method called when registry is ready.
   * @type {Function}
   */
  #resolve;

  /* -------------------------------------------- */

  /** @inheritDoc */
  set(key, value) {
    super.set(key, value);
    if ( Array.from(this.values()).every(s => s) ) this.#resolve();
    return this;
  }
}();

/* -------------------------------------------- */

export default {
  classes: new ItemRegistry("class"),
  dependents: DependentsRegistry,
  enchantments: EnchantmentRegisty,
  messages: MessageRegistry,
  ready: RegistryStatus.ready,
  spellLists: SpellListRegistry,
  subclasses: new ItemRegistry("subclass"),
  summons: SummonRegistry
};
