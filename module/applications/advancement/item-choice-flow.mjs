import Actor5e from "../../documents/actor/actor.mjs";
import ItemGrantFlow from "./item-grant-flow.mjs";

/**
 * Inline application that presents the player with a choice of items.
 */
export default class ItemChoiceFlow extends ItemGrantFlow {

  /**
   * Set of selected UUIDs.
   * @type {Set<string>}
   */
  selected;

  /**
   * Cached items from the advancement's pool.
   * @type {Item5e[]}
   */
  pool;

  /**
   * List of dropped items.
   * @type {Item5e[]}
   */
  dropped;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      dragDrop: [{ dropSelector: ".drop-target" }],
      template: "systems/dnd5e/templates/advancement/item-choice-flow.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getContext() {
    this.selected ??= new Set(
      this.retainedData?.items.map(i => foundry.utils.getProperty(i, "flags.dnd5e.sourceId"))
        ?? Object.values(this.advancement.value[this.level] ?? {})
    );
    this.pool ??= await Promise.all(this.advancement.configuration.pool.map(i => fromUuid(i.uuid)));
    if ( !this.dropped ) {
      this.dropped = [];
      for ( const data of this.retainedData?.items ?? [] ) {
        const uuid = foundry.utils.getProperty(data, "flags.dnd5e.sourceId");
        if ( this.pool.find(i => uuid === i.uuid) ) continue;
        const item = await fromUuid(uuid);
        item.dropped = true;
        this.dropped.push(item);
      }
    }

    const max = this.advancement.configuration.choices[this.level];
    const choices = { max, current: this.selected.size, full: this.selected.size >= max };

    const previousLevels = {};
    const previouslySelected = new Set();
    for ( const [level, data] of Object.entries(this.advancement.value.added ?? {}) ) {
      if ( level > this.level ) continue;
      previousLevels[level] = await Promise.all(Object.values(data).map(uuid => fromUuid(uuid)));
      Object.values(data).forEach(uuid => previouslySelected.add(uuid));
    }

    const items = [...this.pool, ...this.dropped].reduce((items, i) => {
      if ( i ) {
        i.checked = this.selected.has(i.uuid);
        i.disabled = !i.checked && choices.full;
        const validLevel = (i.system.prerequisites?.level ?? -Infinity) <= this.level;
        if ( !previouslySelected.has(i.uuid) && validLevel ) items.push(i);
      }
      return items;
    }, []);

    return { choices, items, previousLevels };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".item-delete").click(this._onItemDelete.bind(this));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onChangeInput(event) {
    if ( event.target.checked ) this.selected.add(event.target.name);
    else this.selected.delete(event.target.name);
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting a dropped item.
   * @param {Event} event  The originating click event.
   * @protected
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const uuidToDelete = event.currentTarget.closest(".item-name")?.querySelector("input")?.name;
    if ( !uuidToDelete ) return;
    this.dropped.findSplice(i => i.uuid === uuidToDelete);
    this.selected.delete(uuidToDelete);
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    if ( this.selected.size >= this.advancement.configuration.choices[this.level] ) return false;

    // Try to extract the data
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

    // If the item is already been marked as selected, no need to go further
    if ( this.selected.has(item.uuid) ) return false;

    // Check to ensure the dropped item hasn't been selected at a lower level
    for ( const [level, data] of Object.entries(this.advancement.value.added ?? {}) ) {
      if ( level >= this.level ) continue;
      if ( Object.values(data).includes(item.uuid) ) {
        ui.notifications.error("DND5E.AdvancementItemChoicePreviouslyChosenWarning", {localize: true});
        return null;
      }
    }

    // If a feature has a level pre-requisite, make sure it is less than or equal to current level
    if ( (item.system.prerequisites?.level ?? -Infinity) >= this.level ) {
      ui.notifications.error(game.i18n.format("DND5E.AdvancementItemChoiceFeatureLevelWarning", {
        level: item.system.prerequisites.level
      }));
      return null;
    }

    // If spell level is restricted to available level, ensure the spell is of the appropriate level
    const spellLevel = this.advancement.configuration.restriction.level;
    if ( (this.advancement.configuration.type === "spell") && spellLevel === "available" ) {
      const maxSlot = this._maxSpellSlotLevel();
      if ( item.system.level > maxSlot ) {
        ui.notifications.error(game.i18n.format("DND5E.AdvancementItemChoiceSpellLevelAvailableWarning", {
          level: CONFIG.DND5E.spellLevels[maxSlot]
        }));
        return null;
      }
    }

    // Mark the item as selected
    this.selected.add(item.uuid);

    // If the item doesn't already exist in the pool, add it
    if ( !this.pool.find(i => i.uuid === item.uuid) ) {
      this.dropped.push(item);
      item.dropped = true;
    }

    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Determine the maximum spell slot level for the actor to which this advancement is being applied.
   * @returns {number}
   */
  _maxSpellSlotLevel() {
    const spellcasting = this.advancement.item.spellcasting;
    let spells;

    // For advancements on classes or subclasses, use the largest slot available for that class
    if ( spellcasting ) {
      const progression = { slot: 0, pact: {} };
      const maxSpellLevel = CONFIG.DND5E.SPELL_SLOT_TABLE[CONFIG.DND5E.SPELL_SLOT_TABLE.length - 1].length;
      spells = Object.fromEntries(Array.fromRange(maxSpellLevel, 1).map(l => [`spell${l}`, {}]));
      Actor5e.computeClassProgression(progression, this.advancement.item, { spellcasting });
      Actor5e.prepareSpellcastingSlots(spells, spellcasting.type, progression);
    }

    // For all other items, use the largest slot possible
    else spells = this.advancement.actor.system.spells;

    return Object.values(spells).reduce((slot, { max, level }) => {
      if ( !max ) return slot;
      return Math.max(slot, level || -1);
    }, 0);
  }
}
