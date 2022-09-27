import ActiveEffect5e from "../../documents/active-effect.mjs";
import * as Trait from "../../documents/actor/trait.mjs";
import Item5e from "../../documents/item.mjs";

import ActorAbilityConfig from "./ability-config.mjs";
import ActorArmorConfig from "./armor-config.mjs";
import ActorHitDiceConfig from "./hit-dice-config.mjs";
import ActorHitPointsConfig from "./hit-points-config.mjs";
import ActorInitiativeConfig from "./initiative-config.mjs";
import ActorMovementConfig from "./movement-config.mjs";
import ActorSensesConfig from "./senses-config.mjs";
import ActorSheetFlags from "./sheet-flags.mjs";
import ActorTypeConfig from "./type-config.mjs";

import AdvancementConfirmationDialog from "../advancement/advancement-confirmation-dialog.mjs";
import AdvancementManager from "../advancement/advancement-manager.mjs";

import PropertyAttribution from "../property-attribution.mjs";
import TraitSelector from "./trait-selector.mjs";
import ProficiencyConfig from "./proficiency-config.mjs";
import ToolSelector from "./tool-selector.mjs";

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
    spellbook: new Set(),
    features: new Set(),
    effects: new Set()
  };

  /* -------------------------------------------- */

  /**
   * IDs for items on the sheet that have been expanded.
   * @type {Set<string>}
   * @protected
   */
  _expanded = new Set();

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      scrollY: [
        ".inventory .inventory-list",
        ".features .inventory-list",
        ".spellbook .inventory-list",
        ".effects .inventory-list",
        ".center-pane"
      ],
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}],
      width: 720,
      height: Math.max(680, Math.max(
        237 + (Object.keys(CONFIG.DND5E.abilities).length * 70),
        240 + (Object.keys(CONFIG.DND5E.skills).length * 24)
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
    if ( !game.user.isGM && this.actor.limited ) return "systems/dnd5e/templates/actors/limited-sheet.hbs";
    return `systems/dnd5e/templates/actors/${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @override */
  async getData(options) {

    // The Actor's data
    const source = this.actor.toObject();

    // Basic data
    const context = {
      actor: this.actor,
      source: source.system,
      system: this.actor.system,
      items: Array.from(this.actor.items),
      itemContext: {},
      abilities: foundry.utils.deepClone(this.actor.system.abilities),
      skills: foundry.utils.deepClone(this.actor.system.skills ?? {}),
      tools: foundry.utils.deepClone(this.actor.system.tools ?? {}),
      labels: this._getLabels(),
      movement: this._getMovementSpeed(this.actor.system),
      senses: this._getSenses(this.actor.system),
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
      config: CONFIG.DND5E,
      rollableClass: this.isEditable ? "rollable" : "",
      rollData: this.actor.getRollData(),
      overrides: {
        attunement: foundry.utils.hasProperty(this.actor.overrides, "system.attributes.attunement.max")
      }
    };

    // Sort Owned Items
    context.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));

    // Temporary HP
    const hp = {...context.system.attributes.hp};
    if ( hp.temp === 0 ) delete hp.temp;
    if ( hp.tempmax === 0 ) delete hp.tempmax;
    context.hp = hp;

    // Ability Scores
    for ( const [a, abl] of Object.entries(context.abilities) ) {
      abl.icon = this._getProficiencyIcon(abl.proficient);
      abl.hover = CONFIG.DND5E.proficiencyLevels[abl.proficient];
      abl.label = CONFIG.DND5E.abilities[a]?.label;
      abl.baseProf = source.system.abilities[a]?.proficient ?? 0;
    }

    // Skills & tools.
    ["skills", "tools"].forEach(prop => {
      for ( const [key, entry] of Object.entries(context[prop]) ) {
        entry.abbreviation = CONFIG.DND5E.abilities[entry.ability]?.abbreviation;
        entry.icon = this._getProficiencyIcon(entry.value);
        entry.hover = CONFIG.DND5E.proficiencyLevels[entry.value];
        entry.label = prop === "skills" ? CONFIG.DND5E.skills[key]?.label : Trait.keyLabel("tool", key);
        entry.baseValue = source.system[prop]?.[key]?.value ?? 0;
      }
    });

    // Update traits
    context.traits = this._prepareTraits(context.system);

    // Prepare owned items
    this._prepareItems(context);
    context.expandedData = {};
    for ( const id of this._expanded ) {
      const item = this.actor.items.get(id);
      if ( item ) context.expandedData[id] = await item.getChatData({secrets: this.actor.isOwner});
    }

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
   * @returns {object}           Object containing various labels.
   * @protected
   */
  _getLabels() {
    const labels = {...this.actor.labels};

    // Currency Labels
    labels.currencies = Object.entries(CONFIG.DND5E.currencies).reduce((obj, [k, c]) => {
      obj[k] = c.label;
      return obj;
    }, {});

    // Proficiency
    labels.proficiency = game.settings.get("dnd5e", "proficiencyModifier") === "dice"
      ? `d${this.actor.system.attributes.prof * 2}`
      : `+${this.actor.system.attributes.prof}`;

    return labels;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the display of movement speed data for the Actor.
   * @param {object} systemData               System data for the Actor being prepared.
   * @param {boolean} [largestPrimary=false]  Show the largest movement speed as "primary", otherwise show "walk".
   * @returns {{primary: string, special: string}}
   * @protected
   */
  _getMovementSpeed(systemData, largestPrimary=false) {
    const movement = systemData.attributes.movement ?? {};

    // Prepare an array of available movement speeds
    let speeds = [
      [movement.burrow, `${game.i18n.localize("DND5E.MovementBurrow")} ${movement.burrow}`],
      [movement.climb, `${game.i18n.localize("DND5E.MovementClimb")} ${movement.climb}`],
      [movement.fly, `${game.i18n.localize("DND5E.MovementFly")} ${movement.fly}${movement.hover ? ` (${game.i18n.localize("DND5E.MovementHover")})` : ""}`],
      [movement.swim, `${game.i18n.localize("DND5E.MovementSwim")} ${movement.swim}`]
    ];
    if ( largestPrimary ) {
      speeds.push([movement.walk, `${game.i18n.localize("DND5E.MovementWalk")} ${movement.walk}`]);
    }

    // Filter and sort speeds on their values
    speeds = speeds.filter(s => s[0]).sort((a, b) => b[0] - a[0]);

    // Case 1: Largest as primary
    if ( largestPrimary ) {
      let primary = speeds.shift();
      return {
        primary: `${primary ? primary[1] : "0"} ${movement.units}`,
        special: speeds.map(s => s[1]).join(", ")
      };
    }

    // Case 2: Walk as primary
    else {
      return {
        primary: `${movement.walk || 0} ${movement.units}`,
        special: speeds.length ? speeds.map(s => s[1]).join(", ") : ""
      };
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare senses object for display.
   * @param {object} systemData  System data for the Actor being prepared.
   * @returns {object}           Senses grouped by key with localized and formatted string.
   * @protected
   */
  _getSenses(systemData) {
    const senses = systemData.attributes.senses ?? {};
    const tags = {};
    for ( let [k, label] of Object.entries(CONFIG.DND5E.senses) ) {
      const v = senses[k] ?? 0;
      if ( v === 0 ) continue;
      tags[k] = `${game.i18n.localize(label)} ${v} ${senses.units}`;
    }
    if ( senses.special ) tags.special = senses.special;
    return tags;
  }

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
   * Produce a list of armor class attribution objects.
   * @param {object} rollData             Data provided by Actor5e#getRollData
   * @returns {AttributionDescription[]}  List of attribution descriptions.
   * @protected
   */
  _prepareArmorClassAttribution(rollData) {
    const ac = rollData.attributes.ac;
    const cfg = CONFIG.DND5E.armorClasses[ac.calc];
    const attribution = [];

    // Base AC Attribution
    switch ( ac.calc ) {

      // Flat AC
      case "flat":
        return [{
          label: game.i18n.localize("DND5E.ArmorClassFlat"),
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: ac.flat
        }];

      // Natural armor
      case "natural":
        attribution.push({
          label: game.i18n.localize("DND5E.ArmorClassNatural"),
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: ac.flat
        });
        break;

      default:
        const formula = ac.calc === "custom" ? ac.formula : cfg.formula;
        let base = ac.base;
        const dataRgx = new RegExp(/@([a-z.0-9_-]+)/gi);
        for ( const [match, term] of formula.matchAll(dataRgx) ) {
          const value = String(foundry.utils.getProperty(rollData, term));
          if ( (term === "attributes.ac.armor") || (value === "0") ) continue;
          if ( Number.isNumeric(value) ) base -= Number(value);
          attribution.push({
            label: match,
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value
          });
        }
        const armorInFormula = formula.includes("@attributes.ac.armor");
        let label = game.i18n.localize("DND5E.PropertyBase");
        if ( armorInFormula ) label = this.actor.armor?.name ?? game.i18n.localize("DND5E.ArmorClassUnarmored");
        attribution.unshift({
          label,
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: base
        });
        break;
    }

    // Shield
    if ( ac.shield !== 0 ) attribution.push({
      label: this.actor.shield?.name ?? game.i18n.localize("DND5E.EquipmentShield"),
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: ac.shield
    });

    // Bonus
    if ( ac.bonus !== 0 ) attribution.push(...this._prepareActiveEffectAttributions("system.attributes.ac.bonus"));

    // Cover
    if ( ac.cover !== 0 ) attribution.push({
      label: game.i18n.localize("DND5E.Cover"),
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: ac.cover
    });
    return attribution;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the data structure for traits data like languages, resistances & vulnerabilities, and proficiencies.
   * @param {object} systemData  System data for the Actor being prepared.
   * @returns {object}           Prepared trait data.
   * @protected
   */
  _prepareTraits(systemData) {
    const traits = {};
    for ( const [trait, traitConfig] of Object.entries(CONFIG.DND5E.traits) ) {
      const key = traitConfig.actorKeyPath ?? `traits.${trait}`;
      const data = foundry.utils.deepClone(foundry.utils.getProperty(systemData, key));
      const choices = CONFIG.DND5E[traitConfig.configKey];
      if ( !data ) continue;

      foundry.utils.setProperty(traits, key, data);
      let values = data.value;
      if ( !values ) values = [];
      else if ( values instanceof Set ) values = Array.from(values);
      else if ( !Array.isArray(values) ) values = [values];

      // Split physical damage types from others if bypasses is set
      const physical = [];
      if ( data.bypasses?.size ) {
        values = values.filter(t => {
          if ( !CONFIG.DND5E.physicalDamageTypes[t] ) return true;
          physical.push(t);
          return false;
        });
      }

      data.selected = values.reduce((obj, key) => {
        obj[key] = Trait.keyLabel(trait, key) ?? key;
        return obj;
      }, {});

      // Display bypassed damage types
      if ( physical.length ) {
        const damageTypesFormatter = new Intl.ListFormat(game.i18n.lang, { style: "long", type: "conjunction" });
        const bypassFormatter = new Intl.ListFormat(game.i18n.lang, { style: "long", type: "disjunction" });
        data.selected.physical = game.i18n.format("DND5E.DamagePhysicalBypasses", {
          damageTypes: damageTypesFormatter.format(physical.map(t => choices[t])),
          bypassTypes: bypassFormatter.format(data.bypasses.map(t => CONFIG.DND5E.physicalWeaponProperties[t]))
        });
      }

      // Add custom entries
      if ( data.custom ) data.custom.split(";").forEach((c, i) => data.selected[`custom${i+1}`] = c.trim());
      data.cssClass = !foundry.utils.isEmpty(data.selected) ? "" : "inactive";
    }
    return traits;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the data structure for items which appear on the actor sheet.
   * Each subclass overrides this method to implement type-specific logic.
   * @protected
   */
  _prepareItems() {}

  /* -------------------------------------------- */

  /**
   * Insert a spell into the spellbook object when rendering the character sheet.
   * @param {object} context    Sheet rendering context data being prepared for render.
   * @param {object[]} spells   Spells to be included in the spellbook.
   * @returns {object[]}        Spellbook sections in the proper order.
   * @protected
   */
  _prepareSpellbook(context, spells) {
    const owner = this.actor.isOwner;
    const levels = context.actor.system.spells;
    const spellbook = {};

    // Define section and label mappings
    const sections = {atwill: -20, innate: -10, pact: 0.5 };
    const useLabels = {"-20": "-", "-10": "-", 0: "&infin;"};

    // Format a spellbook entry for a certain indexed level
    const registerSection = (sl, i, label, {prepMode="prepared", value, max, override}={}) => {
      const aeOverride = foundry.utils.hasProperty(this.actor.overrides, `system.spells.spell${i}.override`);
      spellbook[i] = {
        order: i,
        label: label,
        usesSlots: i > 0,
        canCreate: owner,
        canPrepare: (context.actor.type === "character") && (i >= 1),
        spells: [],
        uses: useLabels[i] || value || 0,
        slots: useLabels[i] || max || 0,
        override: override || 0,
        dataset: {type: "spell", level: prepMode in sections ? 1 : i, "preparation.mode": prepMode},
        prop: sl,
        editable: context.editable && !aeOverride
      };
    };

    // Determine the maximum spell level which has a slot
    const maxLevel = Array.fromRange(Object.keys(CONFIG.DND5E.spellLevels).length - 1, 1).reduce((max, i) => {
      const level = levels[`spell${i}`];
      if ( level && (level.max || level.override ) && ( i > max ) ) max = i;
      return max;
    }, 0);

    // Level-based spellcasters have cantrips and leveled slots
    if ( maxLevel > 0 ) {
      registerSection("spell0", 0, CONFIG.DND5E.spellLevels[0]);
      for (let lvl = 1; lvl <= maxLevel; lvl++) {
        const sl = `spell${lvl}`;
        registerSection(sl, lvl, CONFIG.DND5E.spellLevels[lvl], levels[sl]);
      }
    }

    // Pact magic users have cantrips and a pact magic section
    if ( levels.pact && levels.pact.max ) {
      if ( !spellbook["0"] ) registerSection("spell0", 0, CONFIG.DND5E.spellLevels[0]);
      const l = levels.pact;
      const config = CONFIG.DND5E.spellPreparationModes.pact;
      const level = game.i18n.localize(`DND5E.SpellLevel${levels.pact.level}`);
      const label = `${config} — ${level}`;
      registerSection("pact", sections.pact, label, {
        prepMode: "pact",
        value: l.value,
        max: l.max,
        override: l.override
      });
    }

    // Iterate over every spell item, adding spells to the spellbook by section
    spells.forEach(spell => {
      const mode = spell.system.preparation.mode || "prepared";
      let s = spell.system.level || 0;
      const sl = `spell${s}`;

      // Specialized spellcasting modes (if they exist)
      if ( mode in sections ) {
        s = sections[mode];
        if ( !spellbook[s] ) {
          const l = levels[mode] || {};
          const config = CONFIG.DND5E.spellPreparationModes[mode];
          registerSection(mode, s, config, {
            prepMode: mode,
            value: l.value,
            max: l.max,
            override: l.override
          });
        }
      }

      // Sections for higher-level spells which the caster "should not" have, but spell items exist for
      else if ( !spellbook[s] ) {
        registerSection(sl, s, CONFIG.DND5E.spellLevels[s], {levels: levels[sl]});
      }

      // Add the spell to the relevant heading
      spellbook[s].spells.push(spell);
    });

    // Sort the spellbook by section level
    const sorted = Object.values(spellbook);
    sorted.sort((a, b) => a.order - b.order);
    return sorted;
  }

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
      for ( let f of ["action", "bonus", "reaction"] ) {
        if ( filters.has(f) && (item.system.activation?.type !== f) ) return false;
      }

      // Spell-specific filters
      if ( filters.has("ritual") && (item.system.components.ritual !== true) ) return false;
      if ( filters.has("concentration") && (item.system.components.concentration !== true) ) return false;
      if ( filters.has("prepared") ) {
        if ( (item.system.level === 0) || ["innate", "always"].includes(item.system.preparation.mode) ) return true;
        if ( this.actor.type === "npc" ) return true;
        return item.system.preparation.prepared;
      }

      // Equipment-specific filters
      if ( filters.has("equipped") && (item.system.equipped !== true) ) return false;
      return true;
    });
  }

  /* -------------------------------------------- */

  /**
   * Get the font-awesome icon used to display a certain level of skill proficiency.
   * @param {number} level  A proficiency mode defined in `CONFIG.DND5E.proficiencyLevels`.
   * @returns {string}      HTML string for the chosen icon.
   * @private
   */
  _getProficiencyIcon(level) {
    const icons = {
      0: '<i class="far fa-circle"></i>',
      0.5: '<i class="fas fa-adjust"></i>',
      1: '<i class="fas fa-check"></i>',
      2: '<i class="fas fa-check-double"></i>'
    };
    return icons[level] || icons[0];
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
    html.find("[data-attribution]").mouseover(this._onPropertyAttribution.bind(this));
    html.find(".attributable").mouseover(this._onPropertyAttribution.bind(this));

    // Preparation Warnings
    html.find(".warnings").click(this._onWarningLink.bind(this));

    // Editable Only Listeners
    if ( this.isEditable ) {
      // Input focus and update
      const inputs = html.find("input");
      inputs.focus(ev => ev.currentTarget.select());
      inputs.addBack().find('[type="text"][data-dtype="Number"]').change(this._onChangeInputDelta.bind(this));

      // Ability Proficiency
      html.find(".ability-proficiency").click(this._onToggleAbilityProficiency.bind(this));

      // Toggle Skill Proficiency
      html.find(".skill-proficiency").on("click contextmenu", event => this._onCycleProficiency(event, "skill"));

      // Toggle Tool Proficiency
      html.find(".tool-proficiency").on("click contextmenu", event => this._onCycleProficiency(event, "tool"));

      // Trait Selector
      html.find(".trait-selector").click(this._onTraitSelector.bind(this));

      // Configure Special Flags
      html.find(".config-button").click(this._onConfigMenu.bind(this));

      // Owned Item management
      html.find(".item-create").click(this._onItemCreate.bind(this));
      html.find(".item-delete").click(this._onItemDelete.bind(this));
      html.find(".item-uses input").click(ev => ev.target.select()).change(this._onUsesChange.bind(this));
      html.find(".item-quantity input").click(ev => ev.target.select()).change(this._onQuantityChange.bind(this));
      html.find(".slot-max-override").click(this._onSpellSlotOverride.bind(this));
      html.find(".attunement-max-override").click(this._onAttunementOverride.bind(this));

      // Active Effect management
      html.find(".effect-control").click(ev => ActiveEffect5e.onManageActiveEffect(ev, this.actor));
      this._disableOverriddenFields(html);
    }

    // Owner Only Listeners
    if ( this.actor.isOwner ) {

      // Ability Checks
      html.find(".ability-name").click(this._onRollAbilityTest.bind(this));

      // Roll Skill Checks
      html.find(".skill-name").click(this._onRollSkillCheck.bind(this));

      // Roll Tool Checks.
      html.find(".tool-name").on("click", this._onRollToolCheck.bind(this));

      // Item Rolling
      html.find(".rollable .item-image").click(event => this._onItemUse(event));
      html.find(".item .item-recharge").click(event => this._onItemRecharge(event));

      // Item Context Menu
      new ContextMenu(html, ".item-list .item", [], {onOpen: this._onItemContext.bind(this)});
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
   * Disable any fields that are overridden by active effects and display an informative tooltip.
   * @param {jQuery} html  The sheet's rendered HTML.
   * @protected
   */
  _disableOverriddenFields(html) {
    const proficiencyToggles = {
      ability: /system\.abilities\.([^.]+)\.proficient/,
      skill: /system\.skills\.([^.]+)\.value/,
      tool: /system\.tools\.([^.]+)\.value/
    };

    for ( const override of Object.keys(foundry.utils.flattenObject(this.actor.overrides)) ) {
      html.find(`input[name="${override}"],select[name="${override}"]`).each((i, el) => {
        el.disabled = true;
        el.dataset.tooltip = "DND5E.ActiveEffectOverrideWarning";
      });

      for ( const [key, regex] of Object.entries(proficiencyToggles) ) {
        const [, match] = override.match(regex) || [];
        if ( match ) {
          const toggle = html.find(`li[data-${key}="${match}"] .proficiency-toggle`);
          toggle.addClass("disabled");
          toggle.attr("data-tooltip", "DND5E.ActiveEffectOverrideWarning");
        }
      }

      const [, spell] = override.match(/system\.spells\.(spell\d)\.override/) || [];
      if ( spell ) {
        html.find(`.spell-max[data-level="${spell}"]`).attr("data-tooltip", "DND5E.ActiveEffectOverrideWarning");
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle activation of a context menu for an embedded Item or ActiveEffect document.
   * Dynamically populate the array of context menu options.
   * @param {HTMLElement} element       The HTML element for which the context menu is activated
   * @protected
   */
  _onItemContext(element) {

    // Active Effects
    if ( element.classList.contains("effect") ) {
      const effect = this.actor.effects.get(element.dataset.effectId);
      if ( !effect ) return;
      ui.context.menuItems = this._getActiveEffectContextOptions(effect);
      Hooks.call("dnd5e.getActiveEffectContextOptions", effect, ui.context.menuItems);
    }

    // Items
    else {
      const item = this.actor.items.get(element.dataset.itemId);
      if ( !item ) return;
      ui.context.menuItems = this._getItemContextOptions(item);
      Hooks.call("dnd5e.getItemContextOptions", item, ui.context.menuItems);
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare an array of context menu options which are available for owned ActiveEffect documents.
   * @param {ActiveEffect5e} effect         The ActiveEffect for which the context menu is activated
   * @returns {ContextMenuEntry[]}          An array of context menu options offered for the ActiveEffect
   * @protected
   */
  _getActiveEffectContextOptions(effect) {
    return [
      {
        name: "DND5E.ContextMenuActionEdit",
        icon: "<i class='fas fa-edit fa-fw'></i>",
        callback: () => effect.sheet.render(true)
      },
      {
        name: "DND5E.ContextMenuActionDuplicate",
        icon: "<i class='fas fa-copy fa-fw'></i>",
        callback: () => effect.clone({label: game.i18n.format("DOCUMENT.CopyOf", {name: effect.label})}, {save: true})
      },
      {
        name: "DND5E.ContextMenuActionDelete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        callback: () => effect.deleteDialog()
      },
      {
        name: effect.disabled ? "DND5E.ContextMenuActionEnable" : "DND5E.ContextMenuActionDisable",
        icon: effect.disabled ? "<i class='fas fa-check fa-fw'></i>" : "<i class='fas fa-times fa-fw'></i>",
        callback: () => effect.update({disabled: !effect.disabled})
      }
    ];
  }

  /* -------------------------------------------- */

  /**
   * Prepare an array of context menu options which are available for owned Item documents.
   * @param {Item5e} item                   The Item for which the context menu is activated
   * @returns {ContextMenuEntry[]}          An array of context menu options offered for the Item
   * @protected
   */
  _getItemContextOptions(item) {

    // Standard Options
    const options = [
      {
        name: "DND5E.ContextMenuActionEdit",
        icon: "<i class='fas fa-edit fa-fw'></i>",
        callback: () => item.sheet.render(true)
      },
      {
        name: "DND5E.ContextMenuActionDuplicate",
        icon: "<i class='fas fa-copy fa-fw'></i>",
        condition: () => !["race", "background", "class", "subclass"].includes(item.type),
        callback: () => item.clone({name: game.i18n.format("DOCUMENT.CopyOf", {name: item.name})}, {save: true})
      },
      {
        name: "DND5E.ContextMenuActionDelete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        callback: () => item.deleteDialog()
      }
    ];

    // Toggle Attunement State
    if ( ("attunement" in item.system) && (item.system.attunement !== CONFIG.DND5E.attunementTypes.NONE) ) {
      const isAttuned = item.system.attunement === CONFIG.DND5E.attunementTypes.ATTUNED;
      options.push({
        name: isAttuned ? "DND5E.ContextMenuActionUnattune" : "DND5E.ContextMenuActionAttune",
        icon: "<i class='fas fa-sun fa-fw'></i>",
        callback: () => item.update({
          "system.attunement": CONFIG.DND5E.attunementTypes[isAttuned ? "REQUIRED" : "ATTUNED"]
        })
      });
    }

    // Toggle Equipped State
    if ( "equipped" in item.system ) options.push({
      name: item.system.equipped ? "DND5E.ContextMenuActionUnequip" : "DND5E.ContextMenuActionEquip",
      icon: "<i class='fas fa-shield-alt fa-fw'></i>",
      callback: () => item.update({"system.equipped": !item.system.equipped})
    });

    // Toggle Prepared State
    if ( ("preparation" in item.system) && (item.system.preparation?.mode === "prepared") ) options.push({
      name: item.system?.preparation?.prepared ? "DND5E.ContextMenuActionUnprepare" : "DND5E.ContextMenuActionPrepare",
      icon: "<i class='fas fa-sun fa-fw'></i>",
      callback: () => item.update({"system.preparation.prepared": !item.system.preparation?.prepared})
    });
    return options;
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
   * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs.
   * @param {Event} event  Triggering event.
   * @protected
   */
  _onChangeInputDelta(event) {
    const input = event.target;
    const value = input.value;
    if ( ["+", "-"].includes(value[0]) ) {
      const delta = parseFloat(value);
      const item = this.actor.items.get(input.closest("[data-item-id]")?.dataset.itemId);
      if ( item ) input.value = Number(foundry.utils.getProperty(item, input.dataset.name)) + delta;
      else input.value = Number(foundry.utils.getProperty(this.actor, input.name)) + delta;
    } else if ( value[0] === "=" ) input.value = value.slice(1);
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the TraitSelector application which allows a checkbox of multiple trait options.
   * @param {Event} event   The click event which originated the selection.
   * @private
   */
  _onConfigMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    let app;
    switch ( button.dataset.action ) {
      case "armor":
        app = new ActorArmorConfig(this.actor);
        break;
      case "hit-dice":
        app = new ActorHitDiceConfig(this.actor);
        break;
      case "hit-points":
        app = new ActorHitPointsConfig(this.actor);
        break;
      case "initiative":
        app = new ActorInitiativeConfig(this.actor);
        break;
      case "movement":
        app = new ActorMovementConfig(this.actor);
        break;
      case "flags":
        app = new ActorSheetFlags(this.actor);
        break;
      case "senses":
        app = new ActorSensesConfig(this.actor);
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
        const skill = event.currentTarget.closest("[data-key]").dataset.key;
        app = new ProficiencyConfig(this.actor, {property: "skills", key: skill});
        break;
      }
      case "tool": {
        const tool = event.currentTarget.closest("[data-key]").dataset.key;
        app = new ProficiencyConfig(this.actor, {property: "tools", key: tool});
        break;
      }
    }
    app?.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle cycling proficiency in a skill or tool.
   * @param {Event} event     A click or contextmenu event which triggered this action.
   * @returns {Promise|void}  Updated data for this actor after changes are applied.
   * @protected
   */
  _onCycleProficiency(event) {
    if ( event.currentTarget.classList.contains("disabled") ) return;
    event.preventDefault();
    const parent = event.currentTarget.closest(".proficiency-row");
    const field = parent.querySelector('[name$=".value"]');
    const {property, key} = parent.dataset;
    const value = this.actor._source.system[property]?.[key]?.value ?? 0;

    // Cycle to the next or previous skill level.
    const levels = [0, 1, .5, 2];
    const idx = levels.indexOf(value);
    const next = idx + (event.type === "contextmenu" ? 3 : 1);
    field.value = levels[next % levels.length];

    // Update the field value and save the form.
    return this._onSubmit(event);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropActor(event, data) {
    const canPolymorph = game.user.isGM || (this.actor.isOwner && game.settings.get("dnd5e", "allowPolymorphing"));
    if ( !canPolymorph ) return false;

    // Get the target actor
    const cls = getDocumentClass("Actor");
    const sourceActor = await cls.fromDropData(data);
    if ( !sourceActor ) return;

    // Define a function to record polymorph settings for future use
    const rememberOptions = html => {
      const options = {};
      html.find("input").each((i, el) => {
        options[el.name] = el.checked;
      });
      const settings = foundry.utils.mergeObject(game.settings.get("dnd5e", "polymorphSettings") ?? {}, options);
      game.settings.set("dnd5e", "polymorphSettings", settings);
      return settings;
    };

    // Create and render the Dialog
    return new Dialog({
      title: game.i18n.localize("DND5E.PolymorphPromptTitle"),
      content: {
        options: game.settings.get("dnd5e", "polymorphSettings"),
        settings: CONFIG.DND5E.polymorphSettings,
        effectSettings: CONFIG.DND5E.polymorphEffectSettings,
        isToken: this.actor.isToken
      },
      default: "accept",
      buttons: {
        accept: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("DND5E.PolymorphAcceptSettings"),
          callback: html => this.actor.transformInto(sourceActor, rememberOptions(html))
        },
        wildshape: {
          icon: CONFIG.DND5E.transformationPresets.wildshape.icon,
          label: CONFIG.DND5E.transformationPresets.wildshape.label,
          callback: html => this.actor.transformInto(sourceActor, foundry.utils.mergeObject(
            CONFIG.DND5E.transformationPresets.wildshape.options,
            { transformTokens: rememberOptions(html).transformTokens }
          ))
        },
        polymorph: {
          icon: CONFIG.DND5E.transformationPresets.polymorph.icon,
          label: CONFIG.DND5E.transformationPresets.polymorph.label,
          callback: html => this.actor.transformInto(sourceActor, foundry.utils.mergeObject(
            CONFIG.DND5E.transformationPresets.polymorph.options,
            { transformTokens: rememberOptions(html).transformTokens }
          ))
        },
        self: {
          icon: CONFIG.DND5E.transformationPresets.polymorphSelf.icon,
          label: CONFIG.DND5E.transformationPresets.polymorphSelf.label,
          callback: html => this.actor.transformInto(sourceActor, foundry.utils.mergeObject(
            CONFIG.DND5E.transformationPresets.polymorphSelf.options,
            { transformTokens: rememberOptions(html).transformTokens }
          ))
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Cancel")
        }
      }
    }, {
      classes: ["dialog", "dnd5e", "polymorph"],
      width: 900,
      template: "systems/dnd5e/templates/apps/polymorph-prompt.hbs"
    }).render(true);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropItemCreate(itemData) {
    let items = itemData instanceof Array ? itemData : [itemData];
    const itemsWithoutAdvancement = items.filter(i => !i.system.advancement?.length);
    const multipleAdvancements = (items.length - itemsWithoutAdvancement.length) > 1;
    if ( multipleAdvancements && !game.settings.get("dnd5e", "disableAdvancements") ) {
      ui.notifications.warn(game.i18n.format("DND5E.WarnCantAddMultipleAdvancements"));
      items = itemsWithoutAdvancement;
    }

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
      ui.notifications.warn(game.i18n.format("DND5E.ActorWarningInvalidItem", {
        itemType: game.i18n.localize(CONFIG.Item.typeLabels[itemData.type]),
        actorType: game.i18n.localize(CONFIG.Actor.typeLabels[this.actor.type])
      }));
      return false;
    }

    // Create a Consumable spell scroll on the Inventory tab
    if ( (itemData.type === "spell")
      && (this._tabs[0].active === "inventory" || this.actor.type === "vehicle") ) {
      const scroll = await Item5e.createScrollFromSpell(itemData);
      return scroll.toObject();
    }

    // Clean up data
    this._onDropResetData(itemData);

    // Stack identical consumables
    const stacked = this._onDropStackConsumables(itemData);
    if ( stacked ) return false;

    // Bypass normal creation flow for any items with advancement
    if ( itemData.system.advancement?.length && !game.settings.get("dnd5e", "disableAdvancements") ) {
      const manager = AdvancementManager.forNewItem(this.actor, itemData);
      if ( manager.steps.length ) {
        manager.render(true);
        return false;
      }
    }
    return itemData;
  }

  /* -------------------------------------------- */

  /**
   * Reset certain pieces of data stored on items when they are dropped onto the actor.
   * @param {object} itemData    The item data requested for creation. **Will be mutated.**
   */
  _onDropResetData(itemData) {
    if ( !itemData.system ) return;
    ["equipped", "proficient", "prepared"].forEach(k => delete itemData.system[k]);
    if ( "attunement" in itemData.system ) {
      itemData.system.attunement = Math.min(itemData.system.attunement, CONFIG.DND5E.attunementTypes.REQUIRED);
    }
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
   * Handle enabling editing for a spell slot override value.
   * @param {MouseEvent} event    The originating click event.
   * @protected
   */
  async _onSpellSlotOverride(event) {
    const span = event.currentTarget.parentElement;
    const level = span.dataset.level;
    const override = this.actor.system.spells[level].override || span.dataset.slots;
    const input = document.createElement("INPUT");
    input.type = "text";
    input.name = `system.spells.${level}.override`;
    input.value = override;
    input.placeholder = span.dataset.slots;
    input.dataset.dtype = "Number";
    input.addEventListener("focus", event => event.currentTarget.select());

    // Replace the HTML
    const parent = span.parentElement;
    parent.removeChild(span);
    parent.appendChild(input);
  }

  /* -------------------------------------------- */

  /**
   * Handle enabling editing for attunement maximum.
   * @param {MouseEvent} event    The originating click event.
   * @private
   */
  async _onAttunementOverride(event) {
    const span = event.currentTarget.parentElement;
    const input = document.createElement("INPUT");
    input.type = "text";
    input.name = "system.attributes.attunement.max";
    input.value = this.actor.system.attributes.attunement.max;
    input.placeholder = 3;
    input.dataset.dtype = "Number";
    input.addEventListener("focus", event => event.currentTarget.select());

    // Replace the HTML
    const parent = span.parentElement;
    parent.removeChild(span);
    parent.appendChild(input);
  }

  /* -------------------------------------------- */

  /**
   * Change the uses amount of an Owned Item within the Actor.
   * @param {Event} event        The triggering click event.
   * @returns {Promise<Item5e>}  Updated item.
   * @protected
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
   * Change the quantity of an Owned Item within the actor.
   * @param {Event} event        The triggering click event.
   * @returns {Promise<Item5e>}  Updated item.
   * @protected
   */
  async _onQuantityChange(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    const quantity = Math.max(0, parseInt(event.target.value));
    event.target.value = quantity;
    return item.update({"system.quantity": quantity});
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
    return item.use({}, {event});
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
    return item.rollRecharge();
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
      const summary = li.children(".item-summary");
      summary.slideUp(200, () => summary.remove());
      this._expanded.delete(item.id);
    } else {
      const summary = $(await renderTemplate("systems/dnd5e/templates/items/parts/item-summary.hbs", chatData));
      //let div = $(`<div class="item-summary">${chatData.identified === false ? chatData.description.unidentified : chatData.description.value}</div>`);
      li.append(summary.hide());
      summary.slideDown(200);
      this._expanded.add(item.id);
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

    // Check to make sure the newly created class doesn't take player over level cap
    if ( type === "class" && (this.actor.system.details.level + 1 > CONFIG.DND5E.maxLevel) ) {
      const err = game.i18n.format("DND5E.MaxCharacterLevelExceededWarn", {max: CONFIG.DND5E.maxLevel});
      return ui.notifications.error(err);
    }

    const itemData = {
      name: game.i18n.format("DND5E.ItemNew", {type: game.i18n.localize(CONFIG.Item.typeLabels[type])}),
      type: type,
      system: foundry.utils.expandObject({ ...header.dataset })
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
   * @returns {Promise<Item5e|AdvancementManager>|undefined}  The deleted item if something was deleted or the
   *                                                          advancement manager if advancements need removing.
   * @private
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    if ( !item ) return;

    // If item has advancement, handle it separately
    if ( !game.settings.get("dnd5e", "disableAdvancements") ) {
      const manager = AdvancementManager.forDeletedItem(this.actor, item.id);
      if ( manager.steps.length ) {
        if ( ["class", "subclass"].includes(item.type) ) {
          try {
            const shouldRemoveAdvancements = await AdvancementConfirmationDialog.forDelete(item);
            if ( shouldRemoveAdvancements ) return manager.render(true);
          } catch(err) {
            return;
          }
        } else {
          return manager.render(true);
        }
      }
    }

    return item.deleteDialog();
  }

  /* -------------------------------------------- */

  /**
   * Handle displaying the property attribution tooltip when a property is hovered over.
   * @param {Event} event   The originating mouse event.
   * @private
   */
  async _onPropertyAttribution(event) {
    const element = event.target;
    let property = element.dataset.attribution;
    if ( !property ) {
      property = element.dataset.property;
      if ( !property ) return;
      foundry.utils.logCompatibilityWarning(
        "Defining attributable properties on sheets with the `.attributable` class and `data-property` value"
        + " has been deprecated in favor of a single `data-attribution` value.",
        { since: "DnD5e 2.1.3", until: "DnD5e 2.4" }
      );
    }

    const rollData = this.actor.getRollData({ deterministic: true });
    const title = game.i18n.localize(element.dataset.attributionCaption);
    let attributions;
    switch ( property ) {
      case "attributes.ac":
        attributions = this._prepareArmorClassAttribution(rollData); break;
    }
    if ( !attributions ) return;
    new PropertyAttribution(this.actor, attributions, property, {title}).renderTooltip(element);
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
    const skill = event.currentTarget.closest("[data-key]").dataset.key;
    return this.actor.rollSkill(skill, {event: event});
  }

  /* -------------------------------------------- */

  _onRollToolCheck(event) {
    event.preventDefault();
    const tool = event.currentTarget.closest("[data-key]").dataset.key;
    return this.actor.rollToolCheck(tool, {event});
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling Ability score proficiency level.
   * @param {Event} event              The originating click event.
   * @returns {Promise<Actor5e>|void}  Updated actor instance.
   * @private
   */
  _onToggleAbilityProficiency(event) {
    if ( event.currentTarget.classList.contains("disabled") ) return;
    event.preventDefault();
    const field = event.currentTarget.previousElementSibling;
    return this.actor.update({[field.name]: 1 - parseInt(field.value)});
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
    const trait = event.currentTarget.dataset.trait;
    if ( trait === "tool" ) return new ToolSelector(this.actor, trait).render(true);
    return new TraitSelector(this.actor, trait).render(true);
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
      case "armor":
        (new ActorArmorConfig(this.actor)).render(true);
        return;
      default:
        const item = await fromUuid(a.dataset.target);
        item?.sheet.render(true);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    if ( this.actor.isPolymorphed ) {
      buttons.unshift({
        label: "DND5E.PolymorphRestoreTransformation",
        class: "restore-transformation",
        icon: "fas fa-backward",
        onclick: () => this.actor.revertOriginalForm()
      });
    }
    return buttons;
  }
}
