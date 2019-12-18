import { ActorTraitSelector } from "../../apps/trait-selector.js";
import { ActorSheetFlags } from "../../apps/actor-flags.js";

/**
 * Extend the basic ActorSheet class to do all the D&D5e things!
 * This sheet is an Abstract layer which is not used.
 *
 * @type {ActorSheet}
 */
export class ActorSheet5e extends ActorSheet {
  constructor(...args) {
    super(...args);

    /**
     * Track the set of item filters which are applied
     * @type {Set}
     */
    this._filters = {
      inventory: new Set(),
      spellbook: new Set(),
      features: new Set()
    };
  }

  /* -------------------------------------------- */

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {

    // Basic data
    let isOwner = this.entity.owner;
    const data = {
      owner: isOwner,
      limited: this.entity.limited,
      options: this.options,
      editable: this.isEditable,
      cssClass: isOwner ? "editable" : "locked",
      isCharacter: this.entity.data.type === "character",
      config: CONFIG.DND5E,
    };

    // The Actor and its Items
    data.actor = duplicate(this.actor.data);
    data.items = this.actor.items.map(i => {
      i.data.labels = i.labels;
      return i.data;
    });
    data.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    data.data = data.actor.data;
    data.labels = this.actor.labels || {};
    data.filters = this._filters;

    // Ability Scores
    for ( let [a, abl] of Object.entries(data.actor.data.abilities)) {
      abl.icon = this._getProficiencyIcon(abl.proficient);
      abl.hover = CONFIG.DND5E.proficiencyLevels[abl.proficient];
      abl.label = CONFIG.DND5E.abilities[a];
    }

    // Update skill labels
    for ( let [s, skl] of Object.entries(data.actor.data.skills)) {
      skl.ability = data.actor.data.abilities[skl.ability].label.substring(0, 3);
      skl.icon = this._getProficiencyIcon(skl.value);
      skl.hover = CONFIG.DND5E.proficiencyLevels[skl.value];
      skl.label = CONFIG.DND5E.skills[s];
    }

    // Update traits
    this._prepareTraits(data.actor.data.traits);

    // Prepare owned items
    this._prepareItems(data);

    // Return data to the sheet
    return data
  }

  /* -------------------------------------------- */

  _prepareTraits(traits) {
    const map = {
      "dr": CONFIG.DND5E.damageTypes,
      "di": CONFIG.DND5E.damageTypes,
      "dv": CONFIG.DND5E.damageTypes,
      "ci": CONFIG.DND5E.conditionTypes,
      "languages": CONFIG.DND5E.languages,
      "armorProf": CONFIG.DND5E.armorProficiencies,
      "weaponProf": CONFIG.DND5E.weaponProficiencies,
      "toolProf": CONFIG.DND5E.toolProficiencies
    };
    for ( let [t, choices] of Object.entries(map) ) {
      const trait = traits[t];
      if ( !trait ) continue;
      let values = [];
      if ( trait.value ) {
        values = trait.value instanceof Array ? trait.value : [trait.value];
      }
      trait.selected = values.reduce((obj, t) => {
        obj[t] = choices[t];
        return obj;
      }, {});

      // Add custom entry
      if ( trait.custom ) {
        trait.custom.split(";").forEach((c, i) => trait.selected[`custom${i+1}`] = c.trim());
      }
      trait.cssClass = !isObjectEmpty(trait.selected) ? "" : "inactive";
    }
  }

  /* -------------------------------------------- */

  /**
   * Insert a spell into the spellbook object when rendering the character sheet
   * @param {Object} data     The Actor data being prepared
   * @param {Array} spells    The spell data being prepared
   * @private
   */
  _prepareSpellbook(data, spells) {
    const owner = this.actor.owner;

    // Define some mappings
    const levels = {
      "always": -30,
      "innate": -20,
      "pact": -10
    };

    // Label spell slot uses headers
    const useLabels = {
      "-30": "-",
      "-20": "-",
      "-10": "-",
      "0": "&infin;"
    };

    // Reduce spells to the nested spellbook structure
    let spellbook = spells.reduce((sb, spell) => {

      // Define the numeric spell level for sorting
      const mode = spell.data.preparation.mode || "prepared";
      const lvl = levels[mode] || spell.data.level || 0;

      // Prepare a new Spellbook level
      if ( !sb[lvl] ) {
        sb[lvl] = {
          level: lvl,
          usesSlots: lvl > 0,
          canCreate: owner && (lvl >= 0),
          canPrepare: (data.actor.type === "character") && (lvl > 0),
          label: lvl >= 0 ? CONFIG.DND5E.spellLevels[lvl] : CONFIG.DND5E.spellPreparationModes[mode],
          spells: [],
          uses: useLabels[lvl] || data.data.spells["spell"+lvl].value || 0,
          slots: useLabels[lvl] || data.data.spells["spell"+lvl].max || 0,
          dataset: {"type": "spell", "level": lvl}
        };
      }

      // Add the spell to the section
      sb[lvl].spells.push(spell);
      return sb;
    }, {});

    // Sort the spellbook by section order
    spellbook = Object.values(spellbook);
    spellbook.sort((a, b) => a.level - b.level);
    return spellbook;
  }

  /* -------------------------------------------- */

  /**
   * Determine whether an Owned Item will be shown based on the current set of filters
   * @return {boolean}
   * @private
   */
  _filterItems(items, filters) {
    return items.filter(item => {
      const data = item.data;

      // Action usage
      for ( let f of ["action", "bonus", "reaction"] ) {
        if ( filters.has(f) ) {
          if ((data.activation && (data.activation.type !== f))) return false;
        }
      }

      // Spell-specific filters
      if ( filters.has("ritual") ) {
        if (data.components.ritual !== true) return false;
      }
      if ( filters.has("concentration") ) {
        if (data.components.concentration !== true) return false;
      }
      if ( filters.has("prepared") ) {
        if ( data.level === 0 || ["pact", "innate"].includes(data.preparation.mode) ) return true;
        if ( this.actor.data.type === "npc" ) return true;
        return data.preparation.prepared;
      }

      // Equipment-specific filters
      if ( filters.has("equipped") ) {
        if (data.equipped && data.equipped !== true) return false;
      }
      return true;
    });
  }

  /* -------------------------------------------- */

  /**
   * Get the font-awesome icon used to display a certain level of skill proficiency
   * @private
   */
  _getProficiencyIcon(level) {
    const icons = {
      0: '<i class="far fa-circle"></i>',
      0.5: '<i class="fas fa-adjust"></i>',
      1: '<i class="fas fa-check"></i>',
      2: '<i class="fas fa-check-double"></i>'
    };
    return icons[level];
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers
  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    new Tabs(html.find(".tabs"), {
      initial: this["_sheetTab"],
      callback: clicked => {
        this["_sheetTab"] = clicked.data("tab");
      }
    });

    // Activate Item Filters
    const filterLists = html.find(".filter-list");
    filterLists.each(this._initializeFilterItemList.bind(this));
    filterLists.on("click", ".filter-item", this._onToggleFilter.bind(this));

    // Item summaries
    html.find('.item .item-name h4').click(event => this._onItemSummary(event));

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    /* -------------------------------------------- */
    /*  Abilities, Skills, and Traits
     /* -------------------------------------------- */

    // Ability Proficiency
    html.find('.ability-proficiency').click(this._onToggleAbilityProficiency.bind(this));

    // Ability Checks
    html.find('.ability-name').click(this._onRollAbilityTest.bind(this));

    // Toggle Skill Proficiency
    html.find('.skill-proficiency').on("click contextmenu", this._onCycleSkillProficiency.bind(this));

    // Roll Skill Checks
    html.find('.skill-name').click(this._onRollSkillCheck.bind(this));

    // Trait Selector
    html.find('.trait-selector').click(this._onTraitSelector.bind(this));

    // Configure Special Flags
    html.find('.configure-flags').click(this._onConfigureFlags.bind(this));

    /* -------------------------------------------- */
    /*  Inventory
    /* -------------------------------------------- */

    // Create New Item
    html.find('.item-create').click(ev => this._onItemCreate(ev));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      let itemId = Number($(ev.currentTarget).parents(".item").attr("data-item-id"));
      const item = this.actor.getOwnedItem(itemId);
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      let li = $(ev.currentTarget).parents(".item"),
        itemId = Number(li.attr("data-item-id"));
      this.actor.deleteOwnedItem(itemId);
      li.slideUp(200, () => this.render(false));
    });

    // Item Dragging
    let handler = ev => this._onDragItemStart(ev);
    html.find('li.item').each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
    });

    // Item Rolling
    html.find('.item .item-image').click(event => this._onItemRoll(event));

    // Item Recharging
    html.find('.item .item-recharge').click(event => this._onItemRecharge(event));
  }

  /* -------------------------------------------- */

  /**
   * @private
   */
  _findActiveList () {
    return this.element.find('.tab.active .inventory-list');
  }

  /**
   * Iinitialize Item list filters by activating the set of filters which are currently applied
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
   * Handle click events for the Traits tab button to configure special Character Flags
   */
  _onConfigureFlags(event) {
    event.preventDefault();
    new ActorSheetFlags(this.actor).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle cycling proficiency in a Skill
   * @param {Event} event   A click or contextmenu event which triggered the handler
   * @private
   */
  _onCycleSkillProficiency(event) {
    event.preventDefault();
    const field = $(event.currentTarget).siblings('input[type="hidden"]');

    // Get the current level and the array of levels
    const level = parseFloat(field.val());
    const levels = [0, 1, 0.5, 2];
    let idx = levels.indexOf(level);

    // Toggle next level - forward on click, backwards on right
    if ( event.type === "click" ) {
      field.val(levels[(idx === levels.length - 1) ? 0 : idx + 1]);
    } else if ( event.type === "contextmenu" ) {
      field.val(levels[(idx === 0) ? levels.length - 1 : idx - 1]);
    }

    // Update the field value and save the form
    this._onSubmit(event);
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
   * @private
   */
  _onItemRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.getOwnedItem(itemId);

    // Roll spells through the actor
    if ( item.data.type === "spell" ) {
      return this.actor.useSpell(item, {configureDialog: !event.shiftKey});
    }

    // Otherwise roll the Item directly
    else return item.roll();
  }

  /* -------------------------------------------- */

  /**
   * Handle attempting to recharge an item usage by rolling a recharge check
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemRecharge(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.getOwnedItem(itemId);
    return item.rollRecharge();
  };

  /* -------------------------------------------- */

  /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
   * @private
   */
  _onItemSummary(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item"),
        item = this.actor.getOwnedItem(Number(li.attr("data-item-id"))),
        chatData = item.getChatData({secrets: this.actor.owner});

    // Toggle summary
    if ( li.hasClass("expanded") ) {
      let summary = li.children(".item-summary");
      summary.slideUp(200, () => summary.remove());
    } else {
      let div = $(`<div class="item-summary">${chatData.description.value}</div>`);
      let props = $(`<div class="item-properties"></div>`);
      chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
      div.append(props);
      li.append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass("expanded");
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    const itemData = {
      name: `New ${type.capitalize()}`,
      type: type,
      data: duplicate(header.dataset)
    };
    delete itemData.data["type"];
    return this.actor.createOwnedItem(itemData);
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling an Ability check, either a test or a saving throw
   * @param {Event} event   The originating click event
   * @private
   */
  _onRollAbilityTest(event) {
    event.preventDefault();
    let ability = event.currentTarget.parentElement.dataset.ability;
    this.actor.rollAbility(ability, {event: event});
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling a Skill check
   * @param {Event} event   The originating click event
   * @private
   */
  _onRollSkillCheck(event) {
    event.preventDefault();
    const skill = event.currentTarget.parentElement.dataset.skill;
    this.actor.rollSkill(skill, {event: event});
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling Ability score proficiency level
   * @param {Event} event     The originating click event
   * @private
   */
  _onToggleAbilityProficiency(event) {
    event.preventDefault();
    const field = event.currentTarget.previousElementSibling;
    this.actor.update({[field.name]: 1 - parseInt(field.value)});
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling of filters to display a different set of owned items
   * @param {Event} event     The click event which triggered the toggle
   * @private
   */
  _onToggleFilter(event) {
    event.preventDefault();
    const li = event.currentTarget;
    const set = this._filters[li.parentElement.dataset.filter];
    const filter = li.dataset.filter;
    if ( set.has(filter) ) set.delete(filter);
    else set.add(filter);
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the ActorTraitSelector application which allows a checkbox of multiple trait options
   * @param {Event} event   The click event which originated the selection
   * @private
   */
  _onTraitSelector(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const label = a.parentElement.querySelector("label");
    const options = {
      name: label.getAttribute("for"),
      title: label.innerText,
      choices: CONFIG.DND5E[a.dataset.options]
    };
    new ActorTraitSelector(this.actor, options).render(true)
  }

  /**
   * @private
   */
  async _render (force = false, options = {}) {
    this._saveScrollPositions();
    await super._render(force, options);
    this._restoreScrollPositions();
  }

  /**
   * @private
   */
  _restoreScrollPositions () {
    const activeList = this._findActiveList();
    if (activeList.length && this._scroll != null) {
      activeList.prop('scrollTop', this._scroll);
    }
  }

  /**
   * @private
   */
  _saveScrollPositions () {
    const activeList = this._findActiveList();
    if (activeList.length) {
      this._scroll = activeList.prop('scrollTop');
    }
  }
}
