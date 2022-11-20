import ActiveEffect5e from "../../documents/active-effect.mjs";
import Item5e from "../../documents/item.mjs";

import ActorAbilityConfig from "./ability-config.mjs";
import ActorMovementConfig from "./movement-config.mjs";
import ActorScalingConfig from "./scaling-config.mjs";
import ActorSheetFlags from "./sheet-flags.mjs";
import ActorSkillConfig from "./skill-config.mjs";
import ActorTypeConfig from "./type-config.mjs";

import DamageTraitSelector from "../damage-trait-selector.mjs";
import PropertyAttribution from "../property-attribution.mjs";
import TraitSelector from "../trait-selector.mjs";

/**
 * Extend the basic ActorSheet class to suppose system-specific logic and functionality.
 * @abstract
 */
export default class ActorSheet5e extends ActorSheet {

  /**
   * Track the set of item filters which are applied
   * @type {Object<string, Set>}
   * @protected
   */
  _filters = {
    inventory: new Set(),
    features: new Set(),
    effects: new Set()
  };

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      scrollY: [
        ".inventory .inventory-list",
        ".features .inventory-list",
        ".effects .inventory-list"
      ],
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}],
      width: 720,
      height: Math.max(680, Math.max(
        237 + (Object.keys(CONFIG.SHAPER.abilities).length * 70),
        240 + (Object.keys(CONFIG.SHAPER.skills).length * 24)
      ))
    });
  }

  /* -------------------------------------------- */

  /**
   * A set of item types that should be prevented from being dropped on this type of actor sheet.
   * @type {Set<string>}
   */
  static unsupportedItemTypes = new Set();

  /* -------------------------------------------- */

  /** @override */
  get template() {
    if ( !game.user.isGM && this.actor.limited ) return "systems/shaper/templates/actors/limited-sheet.hbs";
    return `systems/shaper/templates/actors/${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @override */
  async getData(options) {

    // The Actor's data
    const source = this.actor.toObject();
    const actorData = this.actor.toObject(false);

    // Basic data
    const context = {
      actor: actorData,
      source: source.system,
      system: actorData.system,
      items: actorData.items,
      labels: this._getLabels(actorData.system),
      movement: this._getMovementSpeed(actorData.system),
      effects: ActiveEffect5e.prepareActiveEffectCategories(this.actor.effects),
      warnings: foundry.utils.deepClone(this.actor._preparationWarnings),
      filters: this._filters,
      owner: this.actor.isOwner,
      limited: this.actor.limited,
      options: this.options,
      editable: this.isEditable,
      cssClass: this.actor.isOwner ? "editable" : "locked",
      isCharacter: this.actor.type === "character",
      isNPC: this.actor.type === "npc",
      isVehicle: this.actor.type === "vehicle",
      config: CONFIG.SHAPER,
      rollData: this.actor.getRollData.bind(this.actor)
    };


    // Sort Owned Items
    for ( let i of context.items ) {
      const item = this.actor.items.get(i._id);
      i.labels = item.labels;
    }
    context.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));

    // Ability Scores
    for ( const [a, abl] of Object.entries(context.system.abilities) ) {
      abl.label = CONFIG.SHAPER.abilities[a];
    }

    // Skills
    for ( const [s, skl] of Object.entries(context.system.skills ?? {}) ) {
      skl.ability0 = CONFIG.SHAPER.abilityAbbreviations[skl.ability0];
      skl.ability1 = CONFIG.SHAPER.abilityAbbreviations[skl.ability1];
      skl.label = CONFIG.SHAPER.skills[s]?.label;
      skl.baseValue = source.system.skills[s]?.value ?? 0;
    }

    // Stats
    for ( const [s, stat] of Object.entries(context.system.stats ?? {}) ) {
      stat.label = CONFIG.SHAPER.stats[s]?.label;
      stat.baseValue = source.system.stats[s]?.value ?? 0;
    }

    // Counts
    for ( const [c, count] of Object.entries(context.system.counts ?? {}) ) {
      count.label = CONFIG.SHAPER.counts[c]?.label;
      count.baseValue = source.system.counts[c]?.value ?? 0;
    }

    // Update traits
    this._prepareTraits(context.system.traits);

    // Prepare owned items
    this._prepareItems(context);

    // Biography HTML enrichment
    context.biographyHTML = await TextEditor.enrichHTML(context.system.details.biography.value, {
      secrets: this.actor.isOwner,
      rollData: context.rollData,
      async: true,
      relativeTo: this.actor
    });

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare labels object for the context.
   * @param {object} systemData  System data for the Actor being prepared.
   * @returns {object}           Object containing various labels.
   * @protected
   */
  _getLabels(systemData) {
    const labels = this.actor.labels ?? {};
    return labels;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the display of movement speed data for the Actor.
   * @param {object} systemData               System data for the Actor being prepared.
   * @param {boolean} [largestPrimary=false]  Show the largest movement speed as "primary", otherwise show "walk".
   * @returns {{primary: string, special: string}}
   * @private
   */
  _getMovementSpeed(systemData, largestPrimary=false) {
    const movement = systemData.attributes.movement ?? {};
    let speeds = [movement.walk, `${game.i18n.localize("SHAPER.MovementWalk")} ${movement.walk}`];
    return {
      primary: `${movement.walk || 0} ${movement.units}`,
    };
  }

  /* -------------------------------------------- */


  /* -------------------------------------------- */

  /** @inheritdoc */
  async activateEditor(name, options={}, initialContent="") {
    options.relativeLinks = true;
    return super.activateEditor(name, options, initialContent);
  }

  /* --------------------------------------------- */
  /*  Property Attribution                         */
  /* --------------------------------------------- */

  /**
   * Break down all of the Active Effects affecting a given target property.
   * @param {string} target               The data property being targeted.
   * @returns {AttributionDescription[]}  Any active effects that modify that property.
   * @protected
   */
  _prepareActiveEffectAttributions(target) {
    return this.actor.effects.reduce((arr, e) => {
      let source = e.sourceName;
      if ( e.origin === this.actor.uuid ) source = e.label;
      if ( !source || e.disabled || e.isSuppressed ) return arr;
      const value = e.changes.reduce((n, change) => {
        if ( (change.key !== target) || !Number.isNumeric(change.value) ) return n;
        if ( change.mode !== CONST.ACTIVE_EFFECT_MODES.ADD ) return n;
        return n + Number(change.value);
      }, 0);
      if ( !value ) return arr;
      arr.push({value, label: source, mode: CONST.ACTIVE_EFFECT_MODES.ADD});
      return arr;
    }, []);
  }


  /* -------------------------------------------- */

  /**
   * Prepare the data structure for traits data like languages, resistances & vulnerabilities.
   * @param {object} traits   The raw traits data object from the actor data. *Will be mutated.*
   * @private
   */
  _prepareTraits(traits) {
    const map = {
      dr: CONFIG.SHAPER.damageResistanceTypes,
      di: CONFIG.SHAPER.damageResistanceTypes,
      dv: CONFIG.SHAPER.damageResistanceTypes,
      ci: CONFIG.SHAPER.conditionTypes,
      languages: CONFIG.SHAPER.languages
    };
    const config = CONFIG.SHAPER;
    for ( const [key, choices] of Object.entries(map) ) {
      const trait = traits[key];
      if ( !trait ) continue;
      let values = (trait.value ?? []) instanceof Array ? trait.value : [trait.value];

      // Fill out trait values
      trait.selected = values.reduce((obj, t) => {
        obj[t] = choices[t];
        return obj;
      }, {});

      // Add custom entry
      if ( trait.custom ) trait.custom.split(";").forEach((c, i) => trait.selected[`custom${i+1}`] = c.trim());
      trait.cssClass = !foundry.utils.isEmpty(trait.selected) ? "" : "inactive";
    }

  }

  /* -------------------------------------------- */

  /**
   * Prepare the data structure for items which appear on the actor sheet.
   * Each subclass overrides this method to implement type-specific logic.
   * @protected
   */
  _prepareItems() {}

  /* -------------------------------------------- */


  /* -------------------------------------------- */

  /**
   * Determine whether an Owned Item will be shown based on the current set of filters.
   * @param {object[]} items       Copies of item data to be filtered.
   * @param {Set<string>} filters  Filters applied to the item list.
   * @returns {object[]}           Subset of input items limited by the provided filters.
   * @protected
   */
  _filterItems(items, filters) {
    return items.filter(item => {

      // Action usage
      for ( let f of ["major", "minor", "counter"] ) {
        if ( filters.has(f) && (item.system.activation?.type !== f) ) return false;
      }
      return true;
    });
  }


  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {

    // Activate Item Filters
    const filterLists = html.find(".filter-list");
    filterLists.each(this._initializeFilterItemList.bind(this));
    filterLists.on("click", ".filter-item", this._onToggleFilter.bind(this));

    // Item summaries
    html.find(".item .item-name.rollable h4").click(event => this._onItemSummary(event));

    // View Item Sheets
    html.find(".item-edit").click(this._onItemEdit.bind(this));

    // Property attributions
    html.find(".attributable").mouseover(this._onPropertyAttribution.bind(this));

    // Preparation Warnings
    html.find(".warnings").click(this._onWarningLink.bind(this));

    // Editable Only Listeners
    if ( this.isEditable ) {

      // Input focus and update
      const inputs = html.find("input");
      inputs.focus(ev => ev.currentTarget.select());
      inputs.addBack().find('[type="number"]').change(this._onChangeInputDelta.bind(this));

      html.find(".trait-selector").click(this._onTraitSelector.bind(this));

      // Configure Special Flags
      html.find(".config-button").click(this._onConfigMenu.bind(this));

      // Owned Item management
      html.find(".item-create").click(this._onItemCreate.bind(this));
      html.find(".item-delete").click(this._onItemDelete.bind(this));
      html.find(".item-uses input").click(ev => ev.target.select()).change(this._onUsesChange.bind(this));

      // Active Effect management
      html.find(".effect-control").click(ev => ActiveEffect5e.onManageActiveEffect(ev, this.actor));
    }

    // Owner Only Listeners
    if ( this.actor.isOwner ) {

      // Ability Checks
      html.find(".ability-name").click(this._onRollAbilityTest.bind(this));

      // Roll Skill Checks
      html.find(".skill-name").click(this._onRollSkillCheck.bind(this));

      // Item Rolling
      html.find(".rollable .item-image").click(event => this._onItemUse(event));
      html.find(".item .item-recharge").click(event => this._onItemRecharge(event));
    }

    // Otherwise, remove rollable classes
    else {
      html.find(".rollable").each((i, el) => el.classList.remove("rollable"));
    }

    // Handle default listeners last so system listeners are triggered first
    super.activateListeners(html);
  }

  /* -------------------------------------------- */

  /**
   * Initialize Item list filters by activating the set of filters which are currently applied
   * @param {number} i  Index of the filter in the list.
   * @param {HTML} ul   HTML object for the list item surrounding the filter.
   * @private
   */
  _initializeFilterItemList(i, ul) {
    const set = this._filters[ul.dataset.filter];
    const filters = ul.querySelectorAll(".filter-item");
    for ( let li of filters ) {
      if ( set.has(li.dataset.filter) ) li.classList.add("active");
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs
   * @param {Event} event  Triggering event.
   * @private
   */
  _onChangeInputDelta(event) {
    const input = event.target;
    const value = input.value;
    if ( ["+", "-"].includes(value[0]) ) {
      let delta = parseFloat(value);
      input.value = foundry.utils.getProperty(this.actor, input.name) + delta;
    }
    else if ( value[0] === "=" ) input.value = value.slice(1);
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the TraitSelector application which allows a checkbox of multiple trait options.
   * @param {Event} event   The click event which originated the selection.
   * @private
   */
  _onConfigMenu(event) {
    event.preventDefault();
    const button = event.currentTarget;
    let app;
    switch ( button.dataset.action ) {
      case "movement":
        app = new ActorMovementConfig(this.actor);
        break;
      case "scaling":
        const stat = event.currentTarget.closest("[data-stat]").dataset.stat;
        app = new ActorScalingConfig(this.actor, null, stat);
        break;
      case "flags":
        app = new ActorSheetFlags(this.actor);
        break;
      case "type":
        app = new ActorTypeConfig(this.actor);
        break;
      case "ability": {
        const ability = event.currentTarget.closest("[data-ability]").dataset.ability;
        app = new ActorAbilityConfig(this.actor, null, ability);
        break;
      }
      case "skill": {
        const skill = event.currentTarget.closest("[data-skill]").dataset.skill;
        app = new ActorSkillConfig(this.actor, null, skill);
        break;
      }
    }
    app?.render(true);
  }



  /* -------------------------------------------- */

  /** @override */
  async _onDropItemCreate(itemData) {
    let items = itemData instanceof Array ? itemData : [itemData];

    const toCreate = [];
    for ( const item of items ) {
      const result = await this._onDropSingleItem(item);
      if ( result ) toCreate.push(result);
    }

    // Create the owned items as normal
    return this.actor.createEmbeddedDocuments("Item", toCreate);
  }

  /* -------------------------------------------- */

  /**
   * Handles dropping of a single item onto this character sheet.
   * @param {object} itemData            The item data to create.
   * @returns {Promise<object|boolean>}  The item data to create after processing, or false if the item should not be
   *                                     created or creation has been otherwise handled.
   * @protected
   */
  async _onDropSingleItem(itemData) {

    // Check to make sure items of this type are allowed on this actor
    if ( this.constructor.unsupportedItemTypes.has(itemData.type) ) {
      ui.notifications.warn(game.i18n.format("SHAPER.ActorWarningInvalidItem", {
        itemType: game.i18n.localize(CONFIG.Item.typeLabels[itemData.type]),
        actorType: game.i18n.localize(CONFIG.Actor.typeLabels[this.actor.type])
      }));
      return false;
    }

    // Clean up data
    this._onDropResetData(itemData);

    // Stack identical consumables
    const stacked = this._onDropStackConsumables(itemData);
    if ( stacked ) return false;

    return itemData;
  }

  /* -------------------------------------------- */

  /**
   * Reset certain pieces of data stored on items when they are dropped onto the actor.
   * @param {object} itemData    The item data requested for creation. **Will be mutated.**
   */
  _onDropResetData(itemData) {
    if ( !itemData.system ) return;
    ["equipped", "prepared"].forEach(k => delete itemData.system[k]);
  }

  /* -------------------------------------------- */

  /**
   * Stack identical consumables when a new one is dropped rather than creating a duplicate item.
   * @param {object} itemData         The item data requested for creation.
   * @returns {Promise<Item5e>|null}  If a duplicate was found, returns the adjusted item stack.
   */
  _onDropStackConsumables(itemData) {
    const droppedSourceId = itemData.flags.core?.sourceId;
    if ( itemData.type !== "consumable" || !droppedSourceId ) return null;
    const similarItem = this.actor.items.find(i => {
      const sourceId = i.getFlag("core", "sourceId");
      return sourceId && (sourceId === droppedSourceId) && (i.type === "consumable") && (i.name === itemData.name);
    });
    if ( !similarItem ) return null;
    return similarItem.update({
      "system.quantity": similarItem.system.quantity + Math.max(itemData.system.quantity, 1)
    });
  }

  /* -------------------------------------------- */

  /**
   * Change the uses amount of an Owned Item within the Actor.
   * @param {Event} event        The triggering click event.
   * @returns {Promise<Item5e>}  Updated item.
   * @private
   */
  async _onUsesChange(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    const uses = Math.clamped(0, parseInt(event.target.value), item.system.uses.max);
    event.target.value = uses;
    return item.update({"system.uses.value": uses});
  }

  /* -------------------------------------------- */

  /**
   * Handle using an item from the Actor sheet, obtaining the Item instance, and dispatching to its use method.
   * @param {Event} event  The triggering click event.
   * @returns {Promise}    Results of the usage.
   * @protected
   */
  _onItemUse(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if ( item ) return item.use();
  }

  /* -------------------------------------------- */
  /**
   * Handle attempting to recharge an item usage by rolling a recharge check.
   * @param {Event} event      The originating click event.
   * @returns {Promise<Roll>}  The resulting recharge roll.
   * @private
   */
   _onItemRecharge(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    return item.recharge();
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling and items expanded description.
   * @param {Event} event   Triggering event.
   * @private
   */
  async _onItemSummary(event) {
    event.preventDefault();
    const li = $(event.currentTarget).parents(".item");
    const item = this.actor.items.get(li.data("item-id"));
    const chatData = await item.getChatData({secrets: this.actor.isOwner});

    // Toggle summary
    if ( li.hasClass("expanded") ) {
      let summary = li.children(".item-summary");
      summary.slideUp(200, () => summary.remove());
    } else {
      let div = $(`<div class="item-summary">${chatData.description.value}</div>`);
      let props = $('<div class="item-properties"></div>');
      chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
      div.append(props);
      li.append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass("expanded");
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset.
   * @param {Event} event          The originating click event.
   * @returns {Promise<Item5e[]>}  The newly created item.
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;


    const itemData = {
      name: game.i18n.format("SHAPER.ItemNew", {type: game.i18n.localize(`SHAPER.ItemType${type.capitalize()}`)}),
      type: type,
      system: foundry.utils.deepClone(header.dataset)
    };
    delete itemData.system.type;
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /* -------------------------------------------- */

  /**
   * Handle editing an existing Owned Item for the Actor.
   * @param {Event} event    The originating click event.
   * @returns {ItemSheet5e}  The rendered item sheet.
   * @private
   */
  _onItemEdit(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    return item.sheet.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting an existing Owned Item for the Actor.
   * @param {Event} event  The originating click event.
   * @returns {Promise<Item5e>|undefined}  The deleted item if something was deleted or the
   * @private
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    if ( !item ) return;
    return item.delete();
  }

  /* -------------------------------------------- */

  /**
   * Handle displaying the property attribution tooltip when a property is hovered over.
   * @param {Event} event   The originating mouse event.
   * @private
   */
  async _onPropertyAttribution(event) {
    const existingTooltip = event.currentTarget.querySelector("div.tooltip");
    const property = event.currentTarget.dataset.property;
    if ( existingTooltip || !property ) return;
    const rollData = this.actor.getRollData({ deterministic: true });
    let attributions;
    if ( !attributions ) return;
    const html = await new PropertyAttribution(this.actor, attributions, property).renderTooltip();
    event.currentTarget.insertAdjacentElement("beforeend", html[0]);
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling an Ability test or saving throw.
   * @param {Event} event      The originating click event.
   * @private
   */
  _onRollAbilityTest(event) {
    event.preventDefault();
    let ability = event.currentTarget.parentElement.dataset.ability;
    this.actor.rollAbility(ability, {event: event});
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling a Skill check.
   * @param {Event} event      The originating click event.
   * @returns {Promise<Roll>}  The resulting roll.
   * @private
   */
  _onRollSkillCheck(event) {
    event.preventDefault();
    const skill = event.currentTarget.closest("[data-skill]").dataset.skill;
    return this.actor.rollSkill(skill, {event: event});
  }



  /* -------------------------------------------- */

  /**
   * Handle toggling of filters to display a different set of owned items.
   * @param {Event} event     The click event which triggered the toggle.
   * @returns {ActorSheet5e}  This actor sheet with toggled filters.
   * @private
   */
  _onToggleFilter(event) {
    event.preventDefault();
    const li = event.currentTarget;
    const set = this._filters[li.parentElement.dataset.filter];
    const filter = li.dataset.filter;
    if ( set.has(filter) ) set.delete(filter);
    else set.add(filter);
    return this.render();
  }



  /* -------------------------------------------- */

  /**
   * Handle spawning the TraitSelector application which allows a checkbox of multiple trait options.
   * @param {Event} event      The click event which originated the selection.
   * @returns {TraitSelector}  Newly displayed application.
   * @private
   */
  _onTraitSelector(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const label = a.parentElement.querySelector("label");
    const choices = CONFIG.SHAPER[a.dataset.options];
    const options = { name: a.dataset.target, title: `${label.innerText}: ${this.actor.name}`, choices };
    if ( ["di", "dr", "dv"].some(t => a.dataset.target.endsWith(`.${t}`)) ) {
      return new DamageTraitSelector(this.actor, options).render(true);
    } else {
      return new TraitSelector(this.actor, options).render(true);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle links within preparation warnings.
   * @param {Event} event  The click event on the warning.
   * @protected
   */
  async _onWarningLink(event) {
    event.preventDefault();
    const a = event.target;
    if ( !a || !a.dataset.target ) return;
    switch ( a.dataset.target ) {
      default:
        const item = await fromUuid(a.dataset.target);
        item?.sheet.render(true);
    }
  }

}
