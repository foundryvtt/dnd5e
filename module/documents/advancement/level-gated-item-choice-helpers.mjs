/* eslint-disable jsdoc/require-jsdoc */

export const LEVEL_GATED_ITEM_CHOICE_TYPE = "LevelGatedItemChoice";
export const MAX_LEVEL_GATED_CHOICE_LEVEL = 20;

/* -------------------------------------------- */

export function clampLevel(value, maxLevel=getMaxSectionLevel()) {
  const numeric = Number(value);
  if ( !Number.isFinite(numeric) ) return 1;
  return Math.min(Math.max(Math.trunc(numeric), 1), maxLevel);
}

/* -------------------------------------------- */

export function getMaxSectionLevel() {
  return Math.min(Number(CONFIG.DND5E?.maxLevel ?? MAX_LEVEL_GATED_CHOICE_LEVEL), MAX_LEVEL_GATED_CHOICE_LEVEL)
    || MAX_LEVEL_GATED_CHOICE_LEVEL;
}

/* -------------------------------------------- */

export function sortItemsByName(items) {
  return items.sort((a, b) => {
    const nameA = String(a.item?.name ?? a.name ?? a.label ?? a.uuid ?? "");
    const nameB = String(b.item?.name ?? b.name ?? b.label ?? b.uuid ?? "");
    return nameB.localeCompare(nameA, game.i18n.lang, { sensitivity: "base", numeric: true });
  });
}

/* -------------------------------------------- */

export function normalizePoolRole(value) {
  return ["standalone", "parent", "child"].includes(value) ? value : "standalone";
}

/* -------------------------------------------- */

export function cleanPoolId(value) {
  return String(value ?? "").trim();
}

/* -------------------------------------------- */

export function cleanSectionTitle(value) {
  return String(value ?? "").trim();
}

/* -------------------------------------------- */

export function getSectionTitles(configuration) {
  const titles = configuration?.sectionTitles ?? {};
  return titles?.toObject?.() ?? titles;
}

/* -------------------------------------------- */

export function getSectionTitle(configuration, level, { flow=false, fallback=true }={}) {
  const title = cleanSectionTitle(getSectionTitles(configuration)?.[level]);
  if ( title ) return title;
  if ( !fallback ) return "";
  return flow
    ? _loc("DND5E.ADVANCEMENT.LevelGatedItemChoice.AvailableFromLevel", { level })
    : _loc("DND5E.ADVANCEMENT.LevelGatedItemChoice.LevelLabel", { level });
}

/* -------------------------------------------- */

export function normalizePoolEntry(entry, maxLevel=getMaxSectionLevel()) {
  if ( typeof entry === "string" ) entry = { uuid: entry };
  if ( !entry?.uuid ) return null;

  const min = [undefined, null, ""].includes(entry.minLevel) ? 1 : Number(entry.minLevel);
  return {
    uuid: entry.uuid,
    minLevel: clampLevel(Number.isFinite(min) ? min : 1, maxLevel)
  };
}

/* -------------------------------------------- */

export function mergePools(pools, maxLevel=getMaxSectionLevel()) {
  const merged = new Map();
  for ( const pool of pools ) {
    for ( const rawEntry of pool ?? [] ) {
      const entry = normalizePoolEntry(rawEntry, maxLevel);
      if ( !entry ) continue;

      const existing = merged.get(entry.uuid);
      if ( existing ) existing.minLevel = Math.min(existing.minLevel, entry.minLevel);
      else merged.set(entry.uuid, entry);
    }
  }
  return Array.from(merged.values()).sort((a, b) => (a.minLevel - b.minLevel) || a.uuid.localeCompare(b.uuid));
}

/* -------------------------------------------- */

export function getSelectedSourceUuids(advancement) {
  const value = advancement?.value ?? advancement?.data?.value ?? advancement?.toObject?.()?.value ?? {};
  const uuids = new Set();

  const collect = source => {
    if ( !source ) return;
    if ( typeof source === "string" ) {
      uuids.add(source);
      return;
    }
    if ( Array.isArray(source) ) {
      for ( const entry of source ) collect(entry);
      return;
    }
    if ( typeof source === "object" ) {
      for ( const entry of Object.values(source) ) collect(entry);
    }
  };

  collect(value.added ?? {});
  return Array.from(uuids);
}

/* -------------------------------------------- */

export function getAdvancementId(advancement) {
  return advancement?.id ?? advancement?._id ?? advancement?.data?._id ?? advancement?.toObject?.()?._id ?? null;
}

/* -------------------------------------------- */

export function getAdvancementType(advancement) {
  return advancement?.type ?? advancement?.constructor?.typeName ?? advancement?.data?.type
    ?? advancement?.toObject?.()?.type ?? null;
}

/* -------------------------------------------- */

export function getAdvancementConfiguration(advancement) {
  return advancement?.configuration ?? advancement?.data?.configuration
    ?? advancement?.toObject?.()?.configuration ?? {};
}

/* -------------------------------------------- */

export function getAdvancementPool(advancement) {
  const pool = getAdvancementConfiguration(advancement).pool ?? [];
  return Array.isArray(pool) ? pool : Object.values(pool);
}

/* -------------------------------------------- */

export function getItemAdvancements(item) {
  if ( !item ) return [];

  const parsed = item.advancement;
  if ( parsed?.contents ) return Array.from(parsed.contents);
  if ( parsed?.byId ) {
    if ( typeof parsed.byId.values === "function" ) return Array.from(parsed.byId.values());
    return Object.values(parsed.byId);
  }
  if ( typeof parsed?.values === "function" ) return Array.from(parsed.values());
  if ( Array.isArray(parsed) ) return parsed;

  const advancements = item.system?.advancement;
  if ( !advancements ) return [];
  if ( Array.isArray(advancements) ) return advancements;
  if ( typeof advancements.values === "function" ) return Array.from(advancements.values());
  return Object.values(advancements);
}

/* -------------------------------------------- */

export function getSelectedSourceUuidsFromActor(actor) {
  const uuids = new Set();
  for ( const item of actor?.items ?? [] ) {
    for ( const advancement of getItemAdvancements(item) ) {
      for ( const uuid of getSelectedSourceUuids(advancement) ) uuids.add(uuid);
    }
  }
  return Array.from(uuids);
}

/* -------------------------------------------- */

export function getSelectedSourceUuidsFromManager(manager) {
  const uuids = new Set();
  for ( const step of manager?.steps ?? [] ) {
    const advancement = step?.flow?.advancement;
    for ( const uuid of getSelectedSourceUuids(advancement) ) uuids.add(uuid);
  }
  return Array.from(uuids);
}

/* -------------------------------------------- */

export function getCandidateActors(advancement, manager) {
  const actors = [];
  if ( advancement?.actor ) actors.push(advancement.actor);
  if ( manager?.clone && !actors.includes(manager.clone) ) actors.push(manager.clone);
  return actors;
}

/* -------------------------------------------- */

export function getChildAdvancementsFromActor(actor, parentPoolId, currentAdvancement) {
  if ( !actor || !parentPoolId ) return [];

  const children = [];
  const currentId = getAdvancementId(currentAdvancement);

  for ( const item of actor.items ?? [] ) {
    for ( const advancement of getItemAdvancements(item) ) {
      if ( getAdvancementType(advancement) !== LEVEL_GATED_ITEM_CHOICE_TYPE ) continue;
      if ( getAdvancementId(advancement) === currentId ) continue;

      const configuration = getAdvancementConfiguration(advancement);
      if ( normalizePoolRole(configuration.poolRole) !== "child" ) continue;
      if ( cleanPoolId(configuration.parentPoolId) !== parentPoolId ) continue;

      children.push(advancement);
    }
  }

  return children;
}

/* -------------------------------------------- */

export function looksLikeUuid(value) {
  if ( typeof value !== "string" ) return false;
  return /^(Actor|Item|Compendium|Scene|JournalEntry|Macro|RollTable)\./.test(value);
}

/* -------------------------------------------- */

export function collectUuidsDeep(value, { maxDepth=6, seen=new WeakSet() }={}) {
  const uuids = new Set();

  const collect = (entry, depth) => {
    if ( depth > maxDepth || entry == null ) return;

    if ( typeof entry === "string" ) {
      if ( looksLikeUuid(entry) ) uuids.add(entry);
      return;
    }

    if ( typeof entry !== "object" ) return;
    if ( seen.has(entry) ) return;
    seen.add(entry);

    if ( looksLikeUuid(entry.uuid) ) uuids.add(entry.uuid);

    if ( entry instanceof Map ) {
      for ( const [key, value] of entry.entries() ) {
        collect(key, depth + 1);
        collect(value, depth + 1);
      }
      return;
    }

    if ( entry instanceof Set ) {
      for ( const value of entry.values() ) collect(value, depth + 1);
      return;
    }

    if ( Array.isArray(entry) ) {
      for ( const value of entry ) collect(value, depth + 1);
      return;
    }

    for ( const [key, value] of Object.entries(entry) ) {
      if ( key.startsWith("_") && key !== "_id" ) continue;
      collect(value, depth + 1);
    }
  };

  collect(value, 0);
  return Array.from(uuids);
}

/* -------------------------------------------- */

export function collectGrantEntryUuids(entries) {
  const uuids = new Set();
  const collect = entry => {
    if ( !entry ) return;
    if ( typeof entry === "string" ) {
      if ( looksLikeUuid(entry) ) uuids.add(entry);
      return;
    }
    if ( Array.isArray(entry) ) {
      for ( const value of entry ) collect(value);
      return;
    }
    if ( typeof entry !== "object" ) return;
    if ( looksLikeUuid(entry.uuid) ) uuids.add(entry.uuid);
  };

  collect(entries);
  return Array.from(uuids);
}

/* -------------------------------------------- */

export function getFollowUpItemUuidsFromAdvancement(advancement) {
  const configuration = getAdvancementConfiguration(advancement);
  const type = getAdvancementType(advancement);
  const uuids = new Set();

  for ( const uuid of getSelectedSourceUuids(advancement) ) uuids.add(uuid);
  for ( const uuid of collectGrantEntryUuids(configuration.items) ) uuids.add(uuid);

  if ( type !== LEVEL_GATED_ITEM_CHOICE_TYPE ) {
    for ( const uuid of collectGrantEntryUuids(configuration.pool) ) uuids.add(uuid);
  }

  return Array.from(uuids);
}

/* -------------------------------------------- */

export async function collectMatchingChildPoolsFromItem(item, parentPoolId, {
  currentAdvancement=null,
  depth=0,
  maxDepth=10,
  seenItems=new Set(),
  seenPoolKeys=new Set()
}={}) {
  const pools = [];
  if ( !item || !parentPoolId || depth > maxDepth ) return pools;

  const itemKey = item.uuid ?? item.id ?? item.name;
  if ( !itemKey || seenItems.has(itemKey) ) return pools;
  seenItems.add(itemKey);

  const currentId = getAdvancementId(currentAdvancement);
  const nextUuids = new Set();

  for ( const advancement of getItemAdvancements(item) ) {
    const configuration = getAdvancementConfiguration(advancement);
    const type = getAdvancementType(advancement);
    const role = normalizePoolRole(configuration.poolRole);
    const childParentPoolId = cleanPoolId(configuration.parentPoolId);
    const advancementId = getAdvancementId(advancement);

    if ( (type === LEVEL_GATED_ITEM_CHOICE_TYPE) && (role === "child") && (childParentPoolId === parentPoolId) ) {
      if ( advancementId !== currentId ) {
        const key = `${item.uuid ?? item.id ?? "item"}.${advancementId ?? foundry.utils.randomID()}`;
        if ( !seenPoolKeys.has(key) ) {
          seenPoolKeys.add(key);
          pools.push(getAdvancementPool(advancement));
        }
      }
    }

    for ( const uuid of getFollowUpItemUuidsFromAdvancement(advancement) ) nextUuids.add(uuid);
  }

  for ( const uuid of nextUuids ) {
    const nextItem = await fromUuid(uuid);
    const nestedPools = await collectMatchingChildPoolsFromItem(nextItem, parentPoolId, {
      currentAdvancement,
      depth: depth + 1,
      maxDepth,
      seenItems,
      seenPoolKeys
    });
    pools.push(...nestedPools);
  }

  return pools;
}
