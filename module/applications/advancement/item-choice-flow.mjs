import Actor5e from "../../documents/actor/actor.mjs";
import CompendiumBrowser from "../compendium-browser.mjs";
import ItemGrantFlow from "./item-grant-flow-v2.mjs";

/**
 * Inline application that presents the player with a choice of items.
 */
export default class ItemChoiceFlow extends ItemGrantFlow {

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      browse: ItemChoiceFlow.#browseCompendium,
      deleteItem: ItemChoiceFlow.#deleteItem
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/advancement/item-choice-flow.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Current counts of selected items.
   * @type {{ current: number, max: number, full: boolean, replacement: boolean }}
   */
  get counts() {
    return this.advancement.getCounts(this.level);
  }

  /* -------------------------------------------- */

  /**
   * Level that will be used to evaluate feature prerequisites.
   * @type {number}
   */
  get featureLevel() {
    return this.level || this.advancement.actor.system.details?.level;
  }

  /* -------------------------------------------- */

  /**
   * Cached items from the advancement's pool.
   * @type {Item5e[]}
   */
  pool;

  /* -------------------------------------------- */

  /**
   * Copies of items added at earlier levels to pull from when re-creating items.
   * @type {Record<number, Record<string, Item5e>>}
   */
  retained;

  /* -------------------------------------------- */

  /**
   * Source UUIDs of all currently selected items for this level with how many times they have been selected.
   * @type {Map<string, number>}
   */
  get selected() {
    return Object.values(this.advancement.value.added[this.level] ?? {}).reduce((map, uuid) => {
      if ( !map.has(uuid) ) map.set(uuid, 1);
      else map.set(uuid, map.get(uuid) + 1);
      return map;
    }, new Map());
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContentContext(context, options) {
    const actor = this.advancement.actor;
    const config = this.advancement.configuration;
    const counts = this.counts;
    const value = this.advancement.value;
    this.pool ??= (await Promise.all(config.pool.map(i => fromUuid(i.uuid)))).filter(_ => _);
    this.retained ??= Object.entries(value.added).reduce((obj, [level, added]) => {
      obj[level] = Object.fromEntries(Object.entries(added).map(([id, uuid]) => [uuid, actor.items.get(id)]));
      return obj;
    }, {});

    const levelConfig = config.choices[this.level];
    let max = levelConfig.count ?? 0;
    context.replaceable = levelConfig.replacement;
    context.noReplacement = !counts.replacement;

    context.sections = new Map();
    const previouslySelected = new Set();
    // FIXME: We should not offer options for replacement if replacing the item would render the character ineligible
    // for items they had already picked *at earlier levels*. Becoming ineligible for an item that is pending addition
    // at this level is already handled by _evaluatePrerequisites.
    for ( const level of Array.fromRange(this.level) ) {
      const added = value.added[level];
      if ( added ) context.sections.set(level, {
        header: game.i18n.format(`DND5E.AdvancementLevel${level === "0" ? "AnyHeader" : "Header"}`, { level }),
        items: Object.entries(added).map(([id, uuid]) => {
          const { name, img } = actor.items.get(id) ?? fromUuidSync(uuid);
          previouslySelected.add(uuid);
          return {
            id, img, name, uuid,
            checked: id === config.choices[this.level].replacement,
            previouslyReplaced: false,
            replaced: false
          };
        }).filter(_ => _)
      });
    }
    for ( const level of Array.fromRange(this.level + 1) ) {
      const replaced = value.replaced[level];
      const match = context.sections.get(replaced?.level)?.items.find(v => v.id === replaced.original);
      if ( match ) {
        match.previouslyReplaced = level !== this.level;
        match.replaced = true;
        previouslySelected.delete(match.uuid);
      }
    }

    const spellLevel = config.restriction.level;
    const maxSlot = this._maxSpellSlotLevel();
    const validateSpellLevel = (config.type === "spell") && (spellLevel === "available");

    const added = [];
    const dropped = [];
    const selected = this.selected;
    for ( const [id, uuid] of Object.entries(value.added[this.level] ?? {}) ) {
      const item = await fromUuid(uuid);
      if ( item ) {
        added.push(item);
        if ( !this.pool.find(p => p.uuid === uuid) ) dropped.push(item);
      }
    }
    const removed = counts.replaced ? actor.items.get(config.choices[this.level].replacement) : [];

    context.sections.set(this.level, {
      header: game.i18n.format("DND5E.ADVANCEMENT.ItemChoice.Chosen", counts),
      isCurrentLevel: true,
      items: [...this.pool, ...dropped].reduce((arr, item) => {
        const { id, name, img } = item;
        const uuid = item.flags.dnd5e?.sourceId ?? item.uuid;
        const validFeature = !item.system.validatePrerequisites || (item.system.validatePrerequisites(
          this.advancement.actor, { added, removed, level: this.featureLevel }
        ) === true);
        const validSpell = !validateSpellLevel || (item.system.level <= maxSlot);
        if ( validFeature && validSpell ) {
          const data = {
            id, img, name, uuid,
            checked: selected.has(uuid),
            disabled: !selected.has(uuid) && counts.full,
            dropped: !this.pool.find(p => p.uuid === uuid)
          };
          if ( item.system.prerequisites?.repeatable && selected.has(uuid) ) {
            Array.fromRange(selected.get(uuid)).forEach(() => arr.push(data));
            if ( !counts.full ) arr.push({ ...data, checked: false, disabled: false });
          } else arr.push(data);
        }
        return arr;
      }, []).filter(_ => _)
    });
    context.sections = context.sections.values();

    context.abilities = this.getSelectAbilities();
    const firstLevel = parseInt(Object.keys(config.choices).sort()[0]);
    if ( context.abilities ) context.abilities.disabled = this.level > firstLevel;

    if ( config.type ) {
      let type = game.i18n.localize(CONFIG.Item.typeLabels[config.type]);
      if ( (config.type === "feat") && config.restriction.type ) {
        const typeConfig = CONFIG.DND5E.featureTypes[config.restriction.type];
        const subtype = typeConfig.subtypes?.[config.restriction.subtype];
        if ( subtype ) type = subtype;
        else type = typeConfig.label;
      }
      context.selectLabel = game.i18n.format("DND5E.ADVANCEMENT.ItemChoice.Action.SelectSpecific", { type });
    } else {
      context.selectLabel = game.i18n.localize("DND5E.ADVANCEMENT.ItemChoice.Action.SelectGeneric");
    }

    context.showBrowseButton = config.allowDrops && !counts.full;

    return context;
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    new foundry.applications.ux.DragDrop.implementation({
      dragSelector: ".draggable",
      dropSelector: "form",
      callbacks: {
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle opening the compendium browser and displaying the result.
   * @this {ItemChoiceFlow}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #browseCompendium(event, target) {
    // Determine how many items can be selected
    const config = this.advancement.configuration;
    const { current, max } = this.counts;
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

    const selected = Array.from(result).filter(uuid => !this.selected.has(uuid));
    await this.advancement.apply(this.level, { selected });
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting a dropped item.
   * @this {ItemChoiceFlow}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #deleteItem(event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    if ( !uuid ) return;
    await this.advancement.reverse(this.level, { uuid });
    this.render();
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @override */
  async _handleForm(event, form, formData) {
    const retainedData = { items: {} };

    if ( event.target?.name === "ability" ) {
      await this.advancement.apply(this.level, { ability: event.target.value });
    } else if ( event.target?.tagName === "DND5E-CHECKBOX" ) {
      if ( event.target.checked ) await this.advancement.apply(this.level, { selected: [event.target.name] });
      else await this.advancement.reverse(this.level, { uuid: event.target.name });
    } else if ( event.target?.type === "radio" ) {
      if ( event.target.value ) await this.advancement.apply(this.level, {
        replace: event.target.value, previousItems: this.retained
      });
      else await this.advancement.reverse(this.level, { clearReplacement: true, previousItems: this.retained });
    }
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /**
   * Handle dropping item onto the flow.
   * @param {DragEvent} event  The concluding drag event.
   * @protected
   */
  async _onDrop(event) {
    if ( this.counts.full ) return false;

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

    await this.advancement.apply(this.level, { selected: [item.uuid] });
    this.render();
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
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
}
