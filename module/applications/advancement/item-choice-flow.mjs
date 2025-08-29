import Actor5e from "../../documents/actor/actor.mjs";
import CompendiumBrowser from "../compendium-browser.mjs";
import ItemGrantFlow from "./item-grant-flow.mjs";

/**
 * Inline application that presents the player with a choice of items.
 */
export default class ItemChoiceFlow extends ItemGrantFlow {

  /**
   * Currently selected ability.
   * @type {string}
   */
  ability;

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
   * ID of item to be replaced.
   * @type {string}
   */
  replacement;

  /**
   * List of dropped items.
   * @type {Item5e[]}
   */
  dropped;

  /* -------------------------------------------- */

  /**
   * Level that will be used to evaluate feature prerequisites.
   * @type {number}
   */
  get featureLevel() {
    return this.level || this.advancement.actor.system.details?.level;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      dragDrop: [{ dropSelector: ".drop-target" }],
      template: "systems/dnd5e/templates/advancement/item-choice-flow.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async retainData(data) {
    await super.retainData(data);
    this.replacement = data.replaced?.original;
    this.selected = new Set(data.items.map(i => foundry.utils.getProperty(i, "flags.dnd5e.sourceId")));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getContext() {
    const context = {};
    this.selected ??= new Set(Object.values(this.advancement.value.added?.[this.level] ?? {}));
    this.pool ??= (await Promise.all(this.advancement.configuration.pool.map(i => fromUuid(i.uuid)))).filter(_ => _);
    if ( !this.dropped ) {
      this.dropped = [];
      for ( const data of this.retainedData?.items ?? [] ) {
        const uuid = foundry.utils.getProperty(data, "flags.dnd5e.sourceId");
        if ( this.pool.find(i => uuid === i?.uuid) ) continue;
        const item = await fromUuid(uuid);
        item.dropped = true;
        this.dropped.push(item);
      }
    }

    const levelConfig = this.advancement.configuration.choices[this.level];
    let max = levelConfig.count ?? 0;
    context.replaceable = levelConfig.replacement;
    context.noReplacement = !this.advancement.actor.items.has(this.replacement);
    if ( context.replaceable && !context.noReplacement ) max++;
    if ( this.selected.size > max ) {
      const [kept, lost] = Array.from(Array.from(this.selected).entries()).reduce(([kept, lost], [index, value]) => {
        if ( index < max ) kept.push(value);
        else lost.push(value);
        return [kept, lost];
      }, [[], []]);
      this.selected = new Set(kept);
      this.dropped = this.dropped.filter(i => !lost.includes(i.uuid));
    }
    context.choices = { max, current: this.selected.size, full: this.selected.size >= max };

    context.previousLevels = {};
    const previouslySelected = new Set();
    // FIXME: We should not offer options for replacement if replacing the item would render the character ineligible
    // for items they had already picked *at earlier levels*. Becoming ineligible for an item that is pending addition
    // at this level is already handled by _evaluatePrerequisites.
    for ( const level of Array.fromRange(this.level) ) {
      const added = this.advancement.value.added[level];
      if ( added ) context.previousLevels[level] = Object.entries(added).map(([id, uuid]) => {
        const item = fromUuidSync(uuid);
        previouslySelected.add(uuid);
        return {
          ...item, id, uuid,
          checked: id === this.replacement,
          replaced: false
        };
      });
      const replaced = this.advancement.value.replaced[level];
      if ( replaced ) {
        const match = context.previousLevels[replaced.level].find(v => v.id === replaced.original);
        if ( match ) {
          match.replaced = true;
          previouslySelected.delete(match.uuid);
        }
      }
    }

    const spellLevel = this.advancement.configuration.restriction.level;
    const maxSlot = this._maxSpellSlotLevel();
    const validateSpellLevel = (this.advancement.configuration.type === "spell") && (spellLevel === "available");
    const replaced = this.advancement.actor.items.get(this.replacement);
    const removed = replaced ? [replaced] : [];
    const added = [...this.dropped, ...this.pool.filter(item => this.selected.has(item.uuid))];

    context.items = [...this.pool, ...this.dropped].reduce((items, i) => {
      if ( i ) {
        i.checked = this.selected.has(i.uuid);
        i.disabled = !i.checked && context.choices.full;
        const validFeature = !i.system.validatePrerequisites || (i.system.validatePrerequisites(
          this.advancement.actor, { added, removed, level: this.featureLevel }
        ) === true);
        const validSpell = !validateSpellLevel || (i.system.level <= maxSlot);
        if ( validFeature && validSpell ) items.push(i);
      }
      return items;
    }, []);

    context.abilities = this.getSelectAbilities();
    context.abilities.disabled = previouslySelected.size;
    this.ability ??= context.abilities.selected;

    if ( this.advancement.configuration.type ) {
      let type = game.i18n.localize(CONFIG.Item.typeLabels[this.advancement.configuration.type]);
      if ( (this.advancement.configuration.type === "feat") && this.advancement.configuration.restriction.type ) {
        const typeConfig = CONFIG.DND5E.featureTypes[this.advancement.configuration.restriction.type];
        const subtype = typeConfig.subtypes?.[this.advancement.configuration.restriction.subtype];
        if ( subtype ) type = subtype;
        else type = typeConfig.label;
      }
      context.selectLabel = game.i18n.format("DND5E.ADVANCEMENT.ItemChoice.Action.SelectSpecific", { type });
    } else {
      context.selectLabel = game.i18n.localize("DND5E.ADVANCEMENT.ItemChoice.Action.SelectGeneric");
    }

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('[data-action="browse"]').click(this._onBrowseCompendium.bind(this));
    html.find('[data-action="delete"]').click(this._onItemDelete.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle opening the compendium browser and displaying the result.
   * @param {Event} event  The originating click event.
   * @protected
   */
  async _onBrowseCompendium(event) {
    event.preventDefault();

    // Determine how many items can be selected
    const config = this.advancement.configuration;
    let max = config.choices[this.level].count ?? 0;
    if ( config.choices[this.level].replacement && this.advancement.actor.items.has(this.replacement) ) max++;
    const current = this.selected.size;
    if ( current >= max ) {
      ui.notifications.warn("DND5E.ADVANCEMENT.ItemChoice.Warning.MaxSelected", { localize: true });
      return;
    }

    const filters = { locked: { additional: {}, documentClass: "Item" } };

    // Apply restrictions based on type
    if ( config.type ) {
      filters.locked.types = new Set([config.type]);
      if ( (config.type === "feat") && config.restriction.type ) {
        const typeConfig = CONFIG.DND5E.featureTypes[config.restriction.type];
        const subtype = typeConfig.subtypes?.[config.restriction.subtype];
        filters.locked.additional.category = { [config.restriction.type]: 1 };
        if ( subtype ) filters.locked.additional.subtype = { [config.restriction.subtype]: 1 };
      }
    } else {
      filters.locked.types = this.advancement.constructor.VALID_TYPES;
    }

    // Apply restrictions based on level
    if ( config.type === "feat" ) {
      filters.locked.arbitrary = [{ k: "system.prerequisites.level", o: "lte", v: this.featureLevel }];
    } else if ( (config.type === "spell") && (config.restriction.level !== "") ) {
      filters.locked.additional.level = {
        min: config.restriction.level === "available" ? undefined : Number(config.restriction.level),
        max: config.restriction.level === "available" ? this._maxSpellSlotLevel() : Number(config.restriction.level)
      };
    }

    // Apply restrictions based on spell list
    if ( (config.type === "spell") && config.restriction.list.size ) {
      filters.locked.additional.spelllist = config.restriction.list.reduce((obj, list) => {
        obj[list] = 1;
        return obj;
      }, {});
    }

    const result = await CompendiumBrowser.select({ filters, selection: { min: 1, max: max - current } });
    if ( !result?.size ) return;

    const items = await Promise.all(Array.from(result).map(uuid => fromUuid(uuid)));
    for ( const item of items ) {
      if ( this.selected.has(item.uuid) ) continue;
      this.selected.add(item.uuid);
      if ( !this.pool.find(i => i.uuid === item.uuid) ) {
        this.dropped.push(item);
        item.dropped = true;
      }
    }

    this._evaluatePrerequisites();
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onChangeInput(event) {
    if ( event.target.tagName === "DND5E-CHECKBOX" ) {
      if ( event.target.checked ) this.selected.add(event.target.name);
      else this.selected.delete(event.target.name);
    }
    else if ( event.target.type === "radio" ) this.replacement = event.target.value;
    else if ( event.target.name === "ability" ) this.ability = event.target.value;
    this._evaluatePrerequisites();
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
    const uuidToDelete = event.currentTarget.closest("[data-uuid]")?.dataset.uuid;
    if ( !uuidToDelete ) return;
    this.dropped.findSplice(i => i.uuid === uuidToDelete);
    this.selected.delete(uuidToDelete);
    this._evaluatePrerequisites();
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    const levelConfig = this.advancement.configuration.choices[this.level];
    let max = levelConfig.count ?? 0;
    if ( levelConfig.replacement && this.advancement.actor.items.has(this.replacement) ) max++;
    if ( this.selected.size >= max ) return false;

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

    // If spell level is restricted to available level, ensure the spell is of the appropriate level
    const spellLevel = this.advancement.configuration.restriction.level;
    if ( (this.advancement.configuration.type === "spell") && spellLevel === "available" ) {
      const maxSlot = this._maxSpellSlotLevel();
      if ( item.system.level > maxSlot ) {
        ui.notifications.error(game.i18n.format("DND5E.ADVANCEMENT.ItemChoice.Warning.SpellLevelAvailable", {
          level: CONFIG.DND5E.spellLevels[maxSlot]
        }));
        return null;
      }
    }

    // Mark the item as selected
    this.selected.add(item.uuid);

    // If the item doesn't already exist in the pool, add it
    if ( !this.pool.find(i => i?.uuid === item.uuid) ) {
      this.dropped.push(item);
      item.dropped = true;
    }

    this._evaluatePrerequisites();
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
    if ( spellcasting?.type ) {
      const progression = Object.fromEntries(Object.keys(CONFIG.DND5E.spellcasting).map(k => [k, 0]));
      const maxSpellLevel = Object.keys(CONFIG.DND5E.spellLevels).length - 1;
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

  /* -------------------------------------------- */

  /**
   * Evaluate selected item prerequisites and update state appropriately.
   * @protected
   */
  _evaluatePrerequisites() {
    const replaced = this.advancement.actor.items.get(this.replacement);
    const removed = replaced ? [replaced] : [];
    for ( let i = 0; i < 100; i++ ) {
      const itemsBefore = this.selected.size;
      const added = [...this.dropped, ...this.pool.filter(item => this.selected.has(item.uuid))];
      this.dropped = this.dropped.filter(item => {
        const isValid = item.system.validatePrerequisites?.(this.advancement.actor, {
          added, removed, level: this.featureLevel, showMessage: true
        }) ?? true;
        if ( isValid !== true ) this.selected.delete(item.uuid);
        return isValid === true;
      });
      for ( const item of this.pool ) {
        if ( !this.selected.has(item.uuid) ) continue;
        const isValid = item.system.validatePrerequisites?.(this.advancement.actor, {
          added, removed, level: this.level, showMessage: true
        }) ?? true;
        if ( isValid !== true ) this.selected.delete(item.uuid);
      }
      if ( itemsBefore === this.selected.size ) break;
    }
  }
}
