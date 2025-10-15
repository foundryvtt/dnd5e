import ItemChoiceConfig from "../../applications/advancement/item-choice-config.mjs";
import ItemChoiceFlow from "../../applications/advancement/item-choice-flow.mjs";
import { ItemChoiceConfigurationData, ItemChoiceValueData } from "../../data/advancement/item-choice.mjs";
import ItemGrantAdvancement from "./item-grant.mjs";

/**
 * Advancement that presents the player with a choice of multiple items that they can take. Keeps track of which
 * items were selected at which levels.
 */
export default class ItemChoiceAdvancement extends ItemGrantAdvancement {

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        configuration: ItemChoiceConfigurationData,
        value: ItemChoiceValueData
      },
      order: 50,
      icon: "icons/magic/symbols/cog-orange-red.webp",
      typeIcon: "systems/dnd5e/icons/svg/item-choice.svg",
      title: game.i18n.localize("DND5E.ADVANCEMENT.ItemChoice.Title"),
      hint: game.i18n.localize("DND5E.ADVANCEMENT.ItemChoice.Hint"),
      multiLevel: true,
      apps: {
        config: ItemChoiceConfig,
        flow: ItemChoiceFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get levels() {
    return Array.from(Object.keys(this.configuration.choices));
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  configuredForLevel(level) {
    return (this.value.added?.[level] !== undefined) || !this.configuration.choices[level]?.count;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  titleForLevel(level, { configMode=false }={}) {
    const data = this.configuration.choices[level] ?? {};
    let tag;
    if ( data.count ) tag = game.i18n.format("DND5E.ADVANCEMENT.ItemChoice.Choose", { count: data.count });
    else if ( data.replacement ) tag = game.i18n.localize("DND5E.ADVANCEMENT.ItemChoice.Replacement.Title");
    else return this.title;
    return `${this.title} <em>(${tag})</em>`;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  summaryForLevel(level, { configMode=false }={}) {
    const items = this.value.added?.[level];
    if ( !items || configMode ) return "";
    return Object.values(items).reduce((html, uuid) => html + game.dnd5e.utils.linkForUuid(uuid), "");
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /**
   * Current counts of selected items.
   * @param {number} level
   * @returns {{ current: number, max: number, full: boolean, replacement: boolean }}
   */
  getCounts(level) {
    const current = Object.keys(this.value.added[level] ?? {}).length;
    const replacement = !!this.configuration.choices[level]?.replacement && !!this.value.replaced[level];
    const max = this.configuration.choices[level]?.count + (replacement ? 1 : 0);
    return {
      current, max, replacement,
      full: current >= max
    };
  }

  /* -------------------------------------------- */

  /** @override */
  storagePath(level) {
    return `value.added.${level}`;
  }

  /* -------------------------------------------- */

  /**
   * @typedef {ItemGrantAdvancementApplicationData} ItemChoiceAdvancementApplicationData
   * @property {Record<number, Record<string, Item5e>>} previousItems  Copies of items added at earlier levels.
   * @property {string} [replace]                       Actor ID of the item being replaced.
   * @property {ItemChoiceRetainedData} [retainedData]  Retained data including replacement data.
   */

  /**
   * @typedef {ItemGrantRetainedData} ItemChoiceRetainedData
   * @property {object} [replaced]  Details on item replacement.
   */

  /** @inheritDoc */
  async apply(level, { previousItems, replace: original, retainedData={}, ...data }, options={}) {
    let replacement;
    if ( retainedData.replaced ) ({ original, replacement } = retainedData.replaced);

    const updates = await super.apply(level, { ...data, retainedData }, options);

    if ( original ) {
      const replaced = this.value.replaced[level] ?? {};
      await this._restoreReplacedItem(replaced.level, replaced.original, previousItems ?? retainedData.items);
      const replacedLevel = Object.entries(this.value.added).reverse().reduce((level, [l, v]) => {
        if ( (original in v) && (Number(l) > level) ) return Number(l);
        return level;
      }, 0);
      if ( Number.isFinite(replacedLevel) ) {
        this.actor.items.delete(original);
        this.updateSource({ [`value.replaced.${level}`]: { level: replacedLevel, original } });
      }
    }

    const replaced = this.value.replaced[level];
    if ( replaced && !replaced.replacement ) replacement ??= options.firstCreatedItem
      ?? (this.getCounts(level).full ? Object.keys(this.value.added[level] ?? {})[0] : undefined);
    if ( replacement ) this.updateSource({ [`value.replaced.${level}`]: { replacement } });

    await this._evaluatePrerequisites(level, { showMessage: true });
  }

  /* -------------------------------------------- */

  /** @override */
  async automaticApplicationValue(level) {
    return false;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async restore(level, data, options={}) {
    const original = this.actor.items.get(data.replaced?.original);
    if ( data.replaced && !original ) Object.entries(data.items).forEach(([uuid, i]) => {
      if ( i._id !== data.replaced.replacement ) delete data.items[uuid];
    });

    await super.restore(level, data, options={});

    if ( data.replaced ) {
      if ( !original ) {
        throw new ItemChoiceAdvancement.ERROR(game.i18n.localize("DND5E.ADVANCEMENT.ItemChoice.Warning.NoOriginal"));
      }
      this.actor.items.delete(data.replaced.original);
      this.updateSource({ [`value.replaced.${level}`]: data.replaced });
    }
  }

  /* -------------------------------------------- */

  /**
   * @typedef {ItemGrantAdvancementReversalOptions} ItemChoiceAdvancementReversalOptions
   * @property {boolean} [clearReplacement]  Clear the replacement and restore the original item.
   * @property {Record<number, Record<string, Item5e>>} previousItems  Copies of items added at earlier levels.
   * @property {boolean} [skipEvaluation]    Do not re-evaluate other item selected at this level.
   */

  /** @inheritDoc */
  async reverse(level, { clearReplacement, previousItems, retainedData={}, skipEvaluation, ...options }={}) {
    const replaced = this.value.replaced[level];
    const restoreReplacedItem = replaced && (clearReplacement || foundry.utils.isEmpty(options));
    const uuidIsReplacement = this.value.added[level]?.[replaced?.replacement] === options.uuid;
    const retainedItems = retainedData.items ?? {};

    const counts = this.getCounts(level);
    if ( clearReplacement && counts.full ) {
      const uuid = this.value.added[level]?.[replaced?.replacement];
      if ( uuid ) retainedData = (await super.reverse(level, { uuid })) ?? {};
    } else if ( !clearReplacement ) {
      retainedData = (await super.reverse(level, options)) ?? {};
    }

    if ( restoreReplacedItem ) {
      retainedData.replaced = replaced;
      await this._restoreReplacedItem(replaced.level, replaced.original, previousItems ?? retainedData.items);
    }

    if ( replaced && foundry.utils.isEmpty(options) ) {
      this.updateSource({ [`value.replaced.-=${level}`]: null });
    } else if ( replaced && uuidIsReplacement ) {
      retainedData.replaced ??= replaced;
      this.updateSource({ [`value.replaced.${level}.-=replacement`]: null });
    }

    if ( !skipEvaluation ) await this._evaluatePrerequisites(level);

    return retainedData;
  }

  /* -------------------------------------------- */

  /**
   * Evaluate all items at the current level to determine if their prerequisites are still met.
   * If not, then remove them and any additional items that might require those.
   * @param {number} level
   * @param {object} [options={}]
   * @param {boolean} [options.showMessage=false]  Show a UI message if the validation fails.
   */
  async _evaluatePrerequisites(level, { showMessage=false }={}) {
    const added = Object.values(this.value.added[level] ?? {}).map(uuid => fromUuidSync(uuid));
    const replaced = this.actor.items.get(this.value.replaced[level]?.original);
    const removed = replaced ? [replaced] : [];

    for ( let i = 0; i < 100; i++ ) {
      const itemsBefore = Object.keys(this.value.added).length;
      for ( const [id, uuid] of Object.entries(this.value.added[level] ?? {}) ) {
        const item = this.actor.items.get(id);
        if ( !item ) continue;
        const isValid = item.system.validatePrerequisites?.(this.actor, {
          added, removed, level: level || this.actor.system.details?.level, showMessage
        }) ?? true;
        if ( isValid !== true ) await this.reverse(level, { skipEvaluation: true, uuid });
      }
      if ( itemsBefore === Object.keys(this.value.added).length ) break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Restore a previously replaced item that had been removed through the flow process.
   * @param {number} level       Level of the item that was replaced.
   * @param {string} originalId  ID of the item that was replaced.
   * @param {Record<string, object>|Record<number, Record<string, Item5e>> retainedItems  Original item data.
   */
  async _restoreReplacedItem(level, originalId, retainedItems={}) {
    const uuid = this.value.added[level]?.[originalId];
    const itemData = retainedItems[level]?.[uuid]?.toObject() ?? retainedItems[uuid]
      ?? await this.createItemData(uuid, originalId);
    if ( itemData ) {
      if ( itemData.type === "spell" ) {
        this.configuration.spell?.applySpellChanges?.(itemData, { ability: this.value.ability });
      }
      this.actor.updateSource({ items: [itemData] });
    }
  }

  /* -------------------------------------------- */

  /**
   * Verify that the provided item can be used with this advancement based on the configuration.
   * @param {Item5e} item                   Item that needs to be tested.
   * @param {object} [config={}]
   * @param {string|false} [config.type]    Type restriction on this advancement, or `false` to not validate type.
   * @param {object} [config.restriction]   Additional restrictions to be applied.
   * @param {boolean} [config.strict=true]  Should an error be thrown when an invalid type is encountered?
   * @returns {boolean}                     Is this type valid?
   * @throws {Error}                        An error if the item is invalid and strict is `true`.
   */
  _validateItemType(item, { type, restriction, strict=true }={}) {
    if ( !item ) return false;
    super._validateItemType(item, { strict });
    type ??= this.configuration.type;
    restriction ??= this.configuration.restriction;

    const handleError = (localizationKey, data) => {
      if ( strict ) throw new Error(game.i18n.format(localizationKey, data));
      return false;
    };

    // Type restriction is set and the item type does not match the selected type
    if ( type && (type !== item.type) ) {
      type = game.i18n.localize(CONFIG.Item.typeLabels[restriction]);
      return handleError("DND5E.ADVANCEMENT.ItemChoice.Warning.InvalidType", { type: typeLabel });
    }

    // If additional type restrictions applied, make sure they are valid
    if ( (type === "feat") && restriction.type ) {
      const typeConfig = CONFIG.DND5E.featureTypes[restriction.type];
      const subtype = typeConfig.subtypes?.[restriction.subtype];
      let errorLabel;
      if ( restriction.type !== item.system.type.value ) errorLabel = typeConfig.label;
      else if ( subtype && (restriction.subtype !== item.system.type.subtype) ) errorLabel = subtype;
      if ( errorLabel ) return handleError("DND5E.ADVANCEMENT.ItemChoice.Warning.InvalidType", { type: errorLabel });
    }

    // If spell level is restricted, ensure the spell is of the appropriate level
    const l = parseInt(restriction.level);
    if ( (type === "spell") && !Number.isNaN(l) && (item.system.level !== l) ) {
      const level = CONFIG.DND5E.spellLevels[l];
      return handleError("DND5E.ADVANCEMENT.ItemChoice.Warning.SpellLevelSpecific", { level });
    }

    // If spell list is specified, ensure the spell is on that list
    if ( (type === "spell") && restriction.list.size ) {
      const lists = Array.from(restriction.list)
        .map(l => dnd5e.registry.spellLists.forType(...l.split(":")))
        .filter(_ => _);
      if ( !lists.some(l => l.has(item)) ) return handleError("DND5E.ADVANCEMENT.ItemChoice.Warning.SpellList", {
        lists: game.i18n.getListFormatter({ type: "disjunction" }).format(lists.map(l => l.name))
      });
    }

    return true;
  }
}
