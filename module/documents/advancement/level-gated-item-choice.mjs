import LevelGatedItemChoiceConfig from "../../applications/advancement/level-gated-item-choice-config.mjs";
import LevelGatedItemChoiceFlow from "../../applications/advancement/level-gated-item-choice-flow.mjs";
import { ItemChoiceValueData } from "../../data/advancement/item-choice-data.mjs";
import { LevelGatedItemChoiceConfigurationData } from "../../data/advancement/level-gated-item-choice-data.mjs";
import ItemChoiceAdvancement from "./item-choice.mjs";
import {
  cleanPoolId,
  collectMatchingChildPoolsFromItem,
  collectUuidsDeep,
  getAdvancementId,
  getAdvancementPool,
  getCandidateActors,
  getChildAdvancementsFromActor,
  getMaxSectionLevel,
  getSectionTitle,
  getSelectedSourceUuids,
  getSelectedSourceUuidsFromActor,
  getSelectedSourceUuidsFromManager,
  LEVEL_GATED_ITEM_CHOICE_TYPE,
  mergePools,
  normalizePoolRole
} from "./level-gated-item-choice-helpers.mjs";

/**
 * Advancement that presents item choices from a pool gated by minimum advancement level.
 */
export default class LevelGatedItemChoiceAdvancement extends ItemChoiceAdvancement {

  /** @inheritDoc */
  static get typeName() {
    return LEVEL_GATED_ITEM_CHOICE_TYPE;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        configuration: LevelGatedItemChoiceConfigurationData,
        value: ItemChoiceValueData
      },
      order: 51,
      title: _loc("DND5E.ADVANCEMENT.LevelGatedItemChoice.Title"),
      hint: _loc("DND5E.ADVANCEMENT.LevelGatedItemChoice.Hint"),
      apps: {
        config: LevelGatedItemChoiceConfig,
        flow: LevelGatedItemChoiceFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  get poolRole() {
    return normalizePoolRole(this.configuration.poolRole);
  }

  get isPoolParent() {
    return this.poolRole === "parent";
  }

  get isPoolChild() {
    return this.poolRole === "child";
  }

  get poolId() {
    return cleanPoolId(this.configuration.poolId);
  }

  get parentPoolId() {
    return cleanPoolId(this.configuration.parentPoolId);
  }

  /** @inheritDoc */
  get levels() {
    if ( this.isPoolChild ) return [];
    return super.levels;
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  getRegionTitle(level, { flow=false }={}) {
    return getSectionTitle(this.configuration, level, { flow, fallback: true });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  configuredForLevel(level) {
    if ( this.isPoolChild ) return true;
    return super.configuredForLevel(level);
  }

  /* -------------------------------------------- */
  /*  Pool Management                             */
  /* -------------------------------------------- */

  async preparePendingChildPools({ manager=null, extraUuids=[] }={}) {
    this._levelGatedPendingChildPools = [];
    if ( !this.isPoolParent || !this.poolId ) return [];

    manager?.clone?.reset?.();
    this.actor?.reset?.();

    const pools = [];
    const seenPoolKeys = new Set();
    const pendingUuids = new Set([
      ...getSelectedSourceUuids(this),
      ...getSelectedSourceUuidsFromManager(manager),
      ...collectUuidsDeep(manager, { maxDepth: 6 }),
      ...extraUuids
    ]);

    for ( const actor of getCandidateActors(this, manager) ) {
      for ( const uuid of getSelectedSourceUuidsFromActor(actor) ) pendingUuids.add(uuid);

      for ( const child of getChildAdvancementsFromActor(actor, this.poolId, this) ) {
        const key = `${child.item?.uuid ?? child.item?.id ?? "item"}.${getAdvancementId(child)
          ?? foundry.utils.randomID()}`;
        if ( seenPoolKeys.has(key) ) continue;
        seenPoolKeys.add(key);
        pools.push(getAdvancementPool(child));
      }

      for ( const item of actor.items ?? [] ) {
        const nestedPools = await collectMatchingChildPoolsFromItem(item, this.poolId, {
          currentAdvancement: this,
          seenPoolKeys
        });
        pools.push(...nestedPools);
      }
    }

    for ( const uuid of pendingUuids ) {
      const item = await fromUuid(uuid);
      const nestedPools = await collectMatchingChildPoolsFromItem(item, this.poolId, {
        currentAdvancement: this,
        seenPoolKeys
      });
      pools.push(...nestedPools);
    }

    this._levelGatedPendingChildPools = pools;
    return pools;
  }

  /* -------------------------------------------- */

  getLinkedChildAdvancements({ manager=null }={}) {
    if ( !this.isPoolParent || !this.poolId ) return [];

    const children = [];
    const seen = new Set();
    for ( const actor of getCandidateActors(this, manager) ) {
      for ( const child of getChildAdvancementsFromActor(actor, this.poolId, this) ) {
        const key = `${child.item?.uuid ?? child.item?.id ?? "item"}.${getAdvancementId(child)
          ?? foundry.utils.randomID()}`;
        if ( seen.has(key) ) continue;
        seen.add(key);
        children.push(child);
      }
    }
    return children;
  }

  /* -------------------------------------------- */

  getMergedPool({ manager=null }={}) {
    const maxLevel = getMaxSectionLevel();
    const pools = [this.configuration.pool ?? []];

    if ( this.isPoolParent ) {
      for ( const child of this.getLinkedChildAdvancements({ manager }) ) pools.push(getAdvancementPool(child));
      for ( const pendingPool of this._levelGatedPendingChildPools ?? [] ) pools.push(pendingPool);
    }

    return mergePools(pools, maxLevel);
  }

  /* -------------------------------------------- */

  getPoolForLevel(level, { manager=null }={}) {
    if ( this.isPoolChild ) return [];
    const numericLevel = Number(level);
    return this.getMergedPool({ manager }).filter(entry => numericLevel >= Number(entry.minLevel ?? 0));
  }

  /* -------------------------------------------- */

  isUuidAvailableAtLevel(uuid, level) {
    return this.getPoolForLevel(level).some(entry => entry.uuid === uuid);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async apply(level, data={}, options={}) {
    if ( this.isPoolChild ) return;

    if ( data.selected?.length ) await this.preparePendingChildPools({ extraUuids: data.selected });
    if ( data.selected?.length ) {
      const invalid = data.selected.filter(uuid => !this.isUuidAvailableAtLevel(uuid, level));
      if ( invalid.length ) {
        throw new this.constructor.ERROR(_loc("DND5E.ADVANCEMENT.LevelGatedItemChoice.Warning.InvalidSelection", {
          level
        }));
      }
    }

    const result = await super.apply(level, data, options);
    if ( data.selected?.length ) {
      this.actor?.reset?.();
      await this.preparePendingChildPools({ extraUuids: data.selected });
    }
    return result;
  }
}
