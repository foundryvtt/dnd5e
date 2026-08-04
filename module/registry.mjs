import CompendiumBrowser from "./applications/compendium-browser.mjs";
import { formatIdentifier } from "./utils.mjs";

/**
 * @import { RegisteredItemData } from "./_types.mjs";
 */

const STATUS_STATES = Object.freeze({
  NONE: 0,
  LOADING: 1,
  READY: 2
});

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
    DependentsRegistry.#dependents.getOrInsert(uuid, new Set()).add(dependent.uuid);
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
    EnchantmentRegisty.#appliedEnchantments.getOrInsert(source, new Set()).add(enchanted);
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
   * Item types that track icon and a list of sources in addition to the name and identifier.
   * @type {Set<string>}
   */
  static #extendedData = new Set(["background", "class", "race", "subclass"]);

  /* -------------------------------------------- */

  /**
   * Core registry of item data, shared across types.
   * @type {Map<string, Map<string, RegisteredItemData>>}
   */
  static #items = new Map([["*", new Map()]]);

  /* -------------------------------------------- */

  /**
   * Has initial loading been completed?
   * @type {number}
   */
  static #status = STATUS_STATES.NONE;

  /* -------------------------------------------- */

  /**
   * Type of item represented by this registry.
   * @type {string}
   */
  #itemType;

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
   * Label for this item type.
   * @type {string}
   */
  get label() {
    let key = CONFIG.Item.typeLabels[this.#itemType];
    if ( game.i18n.has(`${key}Pl`) ) key = `${key}Pl`;
    return _loc(key);
  }

  /* -------------------------------------------- */

  /**
   * All items formatted for a select input.
   * @type {Iterator<FormSelectOption>}
   */
  get #options() {
    return (ItemRegistry.#items.get(this.#itemType)?.entries() ?? [].values())
      .map(([value, data]) => ({ value, label: data.name }));
  }

  /* -------------------------------------------- */

  /**
   * All items formatted for a select input.
   * @type {FormSelectOption[]}
   */
  get options() {
    return this.#options.toArray()
      .sort((lhs, rhs) => lhs.label.localeCompare(rhs.label, game.i18n.lang));
  }

  /* -------------------------------------------- */

  /**
   * All items formatted for a select input with grouping.
   * @type {FormSelectOption[]}
   */
  get groupedOptions() {
    // TODO: Group subclasses by parent class
    return this.#options.map(o => ({ ...o, group: this.label }))
      .sort((lhs, rhs) => lhs.label.localeCompare(rhs.label, game.i18n.lang));
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Get an item descriptor based on identifier. Accepts optional type as either separate option or using
   * the colon-separated format (e.g. `spell:blade-ward`).
   * @param {string} key             Identifier to find.
   * @param {object} [options={}]
   * @param {string} [options.type]  Type of items to check.
   * @returns {RegisteredItemData|void}
   */
  static get(key, { type }={}) {
    if ( !key ) return;
    if ( key.includes(":") && !type ) [type, key] = key.split(":", 2);
    return this.#items.get(type ?? "*")?.get(key);
  }

  /* -------------------------------------------- */

  /**
   * Get information on a single item based on its identifier.
   * @param {string} identifier
   * @returns {RegisteredItemData|void}
   */
  get(identifier) {
    return ItemRegistry.get(identifier, { type: this.#itemType });
  }

  /* -------------------------------------------- */

  /**
   * Scan compendium packs to register item identifiers.
   */
  static async initialize() {
    if ( this.#status > STATUS_STATES.NONE ) return;
    RegistryStatus.set("items", false);
    if ( game.modules.get("babele")?.active && (game.babele?.initialized === false) ) {
      Hooks.once("babele.ready", () => this.initialize());
      return;
    } else if ( !game.ready ) {
      Hooks.once("ready", () => this.initialize());
      return;
    }
    this.#status = STATUS_STATES.LOADING;

    const indexes = await CompendiumBrowser.fetch(Item, {
      indexFields: new Set(["system.identifier", "system.source"]),
      sort: false
    });
    for ( const item of indexes ) {
      const identifier = item.system?.identifier || formatIdentifier(item.name);
      const generalCollection = this.#items.get("*");
      const typeCollection = this.#items.getOrInsert(item.type, new Map());
      for ( const collection of [generalCollection, typeCollection] ) {
        const itemData = collection.getOrInsert(identifier, {});
        itemData.name = item.name;
        itemData.identifier = identifier;
        if ( this.#extendedData.has(item.type) ) {
          itemData.img = item.img;
          itemData.sources ??= [];
          itemData.sources.push(item.uuid);
        }
      }
    }

    this.#status = STATUS_STATES.READY;
    RegistryStatus.set("items", true);
  }
}

/* -------------------------------------------- */
/*  Message Rolls                               */
/* -------------------------------------------- */

class MessageRegistry {
  /**
   * Registration of chat messages that originated at a specific message. The map is keyed by the ID of
   * the originating message and contains sets of IDs for each message type.
   * @type {Map<string, Map<string, Set<string>>}
   */
  static #messages = new Map();

  /* -------------------------------------------- */

  /**
   * Fetch messages for an origin message, in chronological order.
   * @param {string} origin  ID of the origin message.
   * @param {string} [type]  Type of messages to fetch.
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
   * Add a new message to the registry.
   * @param {ChatMessage5e} message  Message to add to the registry.
   */
  static track(message) {
    const origin = message._source.system?.origin;
    const type = message.type;
    if ( !origin || (type === "base") ) return;
    MessageRegistry.#messages
      .getOrInsert(origin, new Map())
      .getOrInsert(type, new Set()).add(message.id);
  }

  /* -------------------------------------------- */

  /**
   * Remove a message from the registry.
   * @param {ChatMessage5e} message  Message to remove from the registry.
   */
  static untrack(message) {
    const origin = message._source.system?.origin;
    MessageRegistry.#messages.get(origin)?.get(message.type)?.delete(message.id);
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

    const list = SpellListRegistry.#byType
      .getOrInsert(page.system.type, new Map())
      .getOrInsertComputed(page.system.identifier, () => new SpellList({
        identifier: page.system.identifier, name: page.name, type: page.system.type
      }));
    await Promise.all(Array.from(list.contribute(page)).map(async uuid => {
      SpellListRegistry.#bySpell.getOrInsert(uuid, new Set()).add(list);
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
    background: "backgrounds",
    class: "classes",
    race: "species",
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
    SummonRegistry.#creatures.getOrInsert(summoner, new Set()).add(summoned);
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
  backgrounds: new ItemRegistry("background"),
  classes: new ItemRegistry("class"),
  dependents: DependentsRegistry,
  enchantments: EnchantmentRegisty,
  items: ItemRegistry,
  messages: MessageRegistry,
  ready: RegistryStatus.ready,
  species: new ItemRegistry("race"),
  spellLists: SpellListRegistry,
  subclasses: new ItemRegistry("subclass"),
  summons: SummonRegistry
};
