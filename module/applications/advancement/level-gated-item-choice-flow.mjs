import ItemChoiceFlow from "./item-choice-flow.mjs";
import {
  clampLevel,
  getMaxSectionLevel,
  sortItemsByName
} from "../../documents/advancement/level-gated-item-choice-helpers.mjs";

/**
 * Flow application for level-gated item choices.
 */
export default class LevelGatedItemChoiceFlow extends ItemChoiceFlow {

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(ItemChoiceFlow.DEFAULT_OPTIONS, {
    classes: [
      ...(ItemChoiceFlow.DEFAULT_OPTIONS.classes ?? []),
      "level-gated-item-choice"
    ]
  }, { inplace: false });

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = foundry.utils.mergeObject(ItemChoiceFlow.PARTS, {
    content: {
      template: "systems/dnd5e/templates/advancement/level-gated-item-choice-flow.hbs"
    }
  }, { inplace: false });

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContentContext(context, options) {
    this.manager?.clone?.reset?.();
    this.advancement.actor?.reset?.();
    await this.advancement.preparePendingChildPools?.({ manager: this.manager });

    if ( this.advancement.isPoolChild ) {
      this.pool = [];
    } else {
      this.pool = (
        await Promise.all(this.advancement.getPoolForLevel(this.level, { manager: this.manager })
          .map(entry => fromUuid(entry.uuid)))
      ).filter(Boolean);
    }

    context = await super._prepareContentContext(context, options);
    context.showBrowseButton = false;
    this._prepareLevelSections(context);
    return context;
  }

  /* -------------------------------------------- */

  _prepareLevelSections(context) {
    const sections = Array.from(context.sections ?? []);
    const maxLevel = getMaxSectionLevel();
    const entryLevels = new Map();
    const mergedPool = this.advancement.getMergedPool?.({ manager: this.manager })
      ?? this.advancement.getPoolForLevel(this.level, { manager: this.manager });

    for ( const entry of mergedPool ) {
      const minLevel = clampLevel(entry.minLevel ?? 1, maxLevel);
      entryLevels.set(entry.uuid, minLevel);
    }

    for ( const item of this.pool ?? [] ) {
      const sourceUuid = item.flags?.dnd5e?.sourceId ?? item.uuid;
      const entry = mergedPool.find(e => (e.uuid === sourceUuid) || (e.uuid === item.uuid));
      if ( !entry ) continue;

      const minLevel = clampLevel(entry.minLevel ?? 1, maxLevel);
      entryLevels.set(sourceUuid, minLevel);
      entryLevels.set(item.uuid, minLevel);
    }

    const levelForItem = item => {
      const uuid = item?.uuid;
      if ( entryLevels.has(uuid) ) return entryLevels.get(uuid);

      const actorItem = item?.id ? this.advancement.actor?.items?.get(item.id) : null;
      const sourceUuid = actorItem?.flags?.dnd5e?.sourceId ?? actorItem?._stats?.compendiumSource ?? actorItem?.uuid;
      if ( entryLevels.has(sourceUuid) ) return entryLevels.get(sourceUuid);

      return clampLevel(this.level ?? 1, maxLevel);
    };

    const selectedSections = new Map();
    const choiceSections = new Map();

    const addToSection = (map, item, sourceSection) => {
      const minLevel = levelForItem(item);
      const header = this.advancement.getRegionTitle(minLevel, { flow: true });
      const key = `${minLevel}.${header}`;

      if ( !map.has(key) ) {
        map.set(key, {
          ...sourceSection,
          level: minLevel,
          header,
          items: []
        });
      }

      map.get(key).items.push(item);
    };

    const selectedItems = [];
    const choiceItems = [];
    for ( const section of sections ) {
      for ( const item of section.items ?? [] ) {
        if ( section.isCurrentLevel ) choiceItems.push({ item, section });
        else selectedItems.push({ item, section });
      }
    }

    const selectedUuids = new Set();
    for ( const { item, section } of selectedItems ) {
      selectedUuids.add(item.uuid);
      addToSection(selectedSections, { ...item, disabled: true }, { ...section, isCurrentLevel: false });
    }

    for ( const { item, section } of choiceItems ) {
      if ( selectedUuids.has(item.uuid) ) continue;
      addToSection(choiceSections, item, section);
    }

    const prepareSections = map => {
      return Array.from(map.values()).sort((a, b) => a.level - b.level).map(section => {
        sortItemsByName(section.items);
        return section;
      });
    };

    context.previousSections = prepareSections(selectedSections);
    context.choiceLevelSections = prepareSections(choiceSections);
    context.currentChoiceHeader = sections.find(section => section.isCurrentLevel)?.header;
    context.sections = [
      ...context.previousSections,
      ...context.choiceLevelSections
    ];
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _handleForm(event, form, formData) {
    const target = event.target;
    const isChoiceCheckbox = target?.tagName === "DND5E-CHECKBOX";
    await super._handleForm(event, form, formData);

    if ( isChoiceCheckbox ) {
      this.pool = null;
      this.manager?.clone?.reset?.();
      this.advancement.actor?.reset?.();
      await this.advancement.preparePendingChildPools?.({
        manager: this.manager,
        extraUuids: target.checked ? [target.name] : []
      });
    }
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    if ( this.counts.full ) return false;

    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch(err) {
      return false;
    }

    if ( data.type !== "Item" ) return false;
    const item = await Item.implementation.fromDropData(data);

    try {
      this.advancement._validateItemType(item);
    } catch(err) {
      ui.notifications.error(err.message);
      return null;
    }

    const sourceUuid = item.flags?.dnd5e?.sourceId ?? item.uuid;
    const poolEntry = this.advancement.getPoolForLevel(this.level, { manager: this.manager }).find(entry => {
      return (entry.uuid === item.uuid) || (entry.uuid === sourceUuid);
    });

    if ( !poolEntry ) {
      ui.notifications.error(_loc("DND5E.ADVANCEMENT.LevelGatedItemChoice.Warning.Unavailable", {
        name: item.name,
        level: this.level
      }));
      return null;
    }

    const spellLevel = this.advancement.configuration.restriction.level;
    if ( (this.advancement.configuration.type === "spell") && ["available", "availableNoCantrips"].includes(spellLevel) ) {
      const maxSlot = this._maxSpellSlotLevel();
      const minSlot = spellLevel === "availableNoCantrips" ? 1 : 0;
      if ( (item.system.level < minSlot) || (item.system.level > maxSlot) ) {
        ui.notifications.error("DND5E.ADVANCEMENT.ItemChoice.Warning.SpellLevelAvailable", {
          format: { level: CONFIG.DND5E.spellLevels[maxSlot] }
        });
        return null;
      }
    }

    await this.advancement.apply(this.level, { selected: [poolEntry.uuid] });
    this.pool = null;
    this.manager?.clone?.reset?.();
    this.advancement.actor?.reset?.();
    await this.advancement.preparePendingChildPools?.({
      manager: this.manager,
      extraUuids: [poolEntry.uuid]
    });
    this.render();
  }
}
