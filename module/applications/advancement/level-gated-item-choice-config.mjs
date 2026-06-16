import ItemChoiceConfig from "./item-choice-config.mjs";
import {
  clampLevel,
  cleanPoolId,
  cleanSectionTitle,
  getMaxSectionLevel,
  getSectionTitle,
  MAX_LEVEL_GATED_CHOICE_LEVEL,
  normalizePoolRole,
  sortItemsByName
} from "../../documents/advancement/level-gated-item-choice-helpers.mjs";

/**
 * Configuration application for level-gated item choices.
 */
export default class LevelGatedItemChoiceConfig extends ItemChoiceConfig {

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(ItemChoiceConfig.DEFAULT_OPTIONS, {
    classes: [...new Set([...(ItemChoiceConfig.DEFAULT_OPTIONS.classes ?? []), "level-gated-item-choice"])],
    position: { width: 980 }
  }, { inplace: false });

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = foundry.utils.mergeObject(ItemChoiceConfig.PARTS, {
    items: {
      container: { classes: ["column-container"], id: "column-center" },
      template: "systems/dnd5e/templates/advancement/level-gated-item-choice-config-items.hbs"
    }
  }, { inplace: false });

  /* -------------------------------------------- */

  get collapseStorageKey() {
    const itemKey = this.item?.uuid ?? this.item?.id ?? "item";
    const advancementKey = this.advancement?.id ?? this.advancement?._id ?? "advancement";
    return `dnd5e.level-gated-item-choice.collapsed-levels.${itemKey}.${advancementKey}`;
  }

  /* -------------------------------------------- */

  loadCollapsedLevels() {
    if ( this._collapsedLevels instanceof Set ) return this._collapsedLevels;
    try {
      const stored = JSON.parse(localStorage.getItem(this.collapseStorageKey) ?? "[]");
      this._collapsedLevels = new Set(Array.isArray(stored) ? stored.map(String) : []);
    } catch(err) {
      this._collapsedLevels = new Set();
    }
    return this._collapsedLevels;
  }

  /* -------------------------------------------- */

  saveCollapsedLevels() {
    if ( !(this._collapsedLevels instanceof Set) ) return;
    localStorage.setItem(this.collapseStorageKey, JSON.stringify(Array.from(this._collapsedLevels)));
  }

  /* -------------------------------------------- */

  setLevelCollapsed(level, collapsed) {
    const collapsedLevels = this.loadCollapsedLevels();
    const key = String(level);
    if ( collapsed ) collapsedLevels.add(key);
    else collapsedLevels.delete(key);
    this.saveCollapsedLevels();
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const maxLevel = getMaxSectionLevel();
    const collapsedLevels = this.loadCollapsedLevels();
    const sections = new Map();

    for ( let level = 1; level <= maxLevel; level++ ) {
      const defaultLabel = _loc("DND5E.ADVANCEMENT.LevelGatedItemChoice.LevelLabel", { level });
      const titleValue = getSectionTitle(this.advancement.configuration, level, { fallback: false });
      sections.set(level, {
        level,
        label: titleValue || defaultLabel,
        defaultLabel,
        titleValue,
        dropLabel: _loc("DND5E.ADVANCEMENT.LevelGatedItemChoice.DropHere", { level }),
        open: !collapsedLevels.has(String(level)),
        items: []
      });
    }

    const poolItems = this.advancement.configuration.pool ?? [];
    context.items = poolItems.map((poolEntry, poolIndex) => {
      const min = [undefined, null, ""].includes(poolEntry.minLevel) ? 1 : Number(poolEntry.minLevel);
      const minLevel = clampLevel(Number.isFinite(min) ? min : 1, maxLevel);
      return {
        data: { uuid: poolEntry.uuid },
        uuid: poolEntry.uuid,
        poolIndex,
        minLevel,
        index: fromUuidSync(poolEntry.uuid)
      };
    });

    for ( const item of context.items ) sections.get(item.minLevel)?.items.push(item);
    context.levelSections = Array.from(sections.values());
    for ( const section of context.levelSections ) sortItemsByName(section.items);

    const poolRole = normalizePoolRole(this.advancement.configuration.poolRole);
    context.poolRole = poolRole;
    context.isPoolParent = poolRole === "parent";
    context.isPoolChild = poolRole === "child";
    context.poolId = this.advancement.configuration.poolId ?? "";
    context.parentPoolId = this.advancement.configuration.parentPoolId ?? "";
    context.poolRoleOptions = [
      {
        value: "standalone",
        label: _loc("DND5E.ADVANCEMENT.LevelGatedItemChoice.PoolRole.Standalone"),
        selected: poolRole === "standalone"
      },
      {
        value: "parent",
        label: _loc("DND5E.ADVANCEMENT.LevelGatedItemChoice.PoolRole.Parent"),
        selected: poolRole === "parent"
      },
      {
        value: "child",
        label: _loc("DND5E.ADVANCEMENT.LevelGatedItemChoice.PoolRole.Child"),
        selected: poolRole === "child"
      }
    ];
    context.showContainerWarning = context.items.some(i => i.index?.type === "container");
    return context;
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async prepareConfigurationUpdate(configuration) {
    if ( configuration.pool ) {
      const maxLevel = getMaxSectionLevel();
      configuration.pool = Object.values(configuration.pool).map(entry => ({
        uuid: entry.uuid,
        minLevel: clampLevel(entry.minLevel, maxLevel)
      }));
    }

    configuration.poolRole = normalizePoolRole(configuration.poolRole);
    configuration.poolId = cleanPoolId(configuration.poolId);
    configuration.parentPoolId = cleanPoolId(configuration.parentPoolId);
    if ( configuration.poolRole !== "parent" ) configuration.poolId = "";
    if ( configuration.poolRole !== "child" ) configuration.parentPoolId = "";

    const sectionTitles = configuration.sectionTitles ?? {};
    configuration.sectionTitles = Object.fromEntries(
      Array.from({ length: MAX_LEVEL_GATED_CHOICE_LEVEL }, (_, index) => {
        const level = index + 1;
        return [level, cleanSectionTitle(sectionTitles[level])];
      })
    );

    return super.prepareConfigurationUpdate(configuration);
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if ( !this.isEditable ) return;

    for ( const zone of this.element.querySelectorAll("[data-level-gated-level]") ) {
      zone.addEventListener("toggle", () => {
        this.setLevelCollapsed(zone.dataset.levelGatedLevel, !zone.open);
      });
      zone.addEventListener("dragenter", () => zone.classList.add("level-gated-drop-active"));
      zone.addEventListener("dragover", event => {
        event.preventDefault();
        zone.classList.add("level-gated-drop-active");
      });
      zone.addEventListener("dragleave", event => {
        if ( !zone.contains(event.relatedTarget) ) zone.classList.remove("level-gated-drop-active");
      });
      zone.addEventListener("drop", () => zone.classList.remove("level-gated-drop-active"));
    }

    for ( const input of this.element.querySelectorAll("[data-level-gated-section-title]") ) {
      input.addEventListener("click", event => event.stopPropagation());
      input.addEventListener("pointerdown", event => event.stopPropagation());
      input.addEventListener("keydown", event => event.stopPropagation());
    }

    const roleSelect = this.element.querySelector("[data-level-gated-pool-role]");
    const updateRoleFields = () => {
      const role = normalizePoolRole(roleSelect?.value);
      for ( const field of this.element.querySelectorAll("[data-level-gated-role-field]") ) {
        field.classList.toggle("level-gated-hidden", field.dataset.levelGatedRoleField !== role);
      }
    };
    roleSelect?.addEventListener("change", updateRoleFields);
    updateRoleFields();
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDragStart(event) {
    const row = event.target.closest?.("[data-item-uuid]");
    const uuid = row?.dataset.itemUuid;
    if ( !uuid ) return;
    event.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid }));
    event.dataTransfer.effectAllowed = "move";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    const levelSection = event.target.closest?.("[data-level-gated-level]");
    if ( !levelSection ) {
      ui.notifications.warn(_loc("DND5E.ADVANCEMENT.LevelGatedItemChoice.Warning.DropOnLevel"));
      return;
    }

    const minLevel = Number(levelSection.dataset.levelGatedLevel);
    if ( !Number.isFinite(minLevel) ) return;

    if ( "open" in levelSection ) {
      levelSection.open = true;
      this.setLevelCollapsed(minLevel, false);
    }

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "Item" ) return;
    const item = await Item.implementation.fromDropData(data);

    try {
      this._validateDroppedItem(event, item);
    } catch(err) {
      ui.notifications.error(err.message);
      return;
    }

    if ( item.uuid === this.item.uuid ) {
      ui.notifications.error("DND5E.ADVANCEMENT.ItemGrant.Warning.Recursive");
      return;
    }

    const existingItems = foundry.utils.deepClone(this.advancement.configuration.pool ?? []);
    const existingIndex = existingItems.findIndex(entry => entry.uuid === item.uuid);

    if ( existingIndex >= 0 ) {
      existingItems[existingIndex].minLevel = minLevel;
      ui.notifications.info(_loc("DND5E.ADVANCEMENT.LevelGatedItemChoice.Notification.Moved", {
        name: item.name,
        level: minLevel
      }));
    } else {
      existingItems.push({ uuid: item.uuid, minLevel });
    }

    await this.submit({ updateData: { "configuration.pool": existingItems } });
  }
}
