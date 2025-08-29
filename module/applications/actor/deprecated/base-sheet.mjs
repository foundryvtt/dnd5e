import * as Trait from "../../../documents/actor/trait.mjs";
import Item5e from "../../../documents/item.mjs";
import { defaultUnits, formatLength, splitSemicolons } from "../../../utils.mjs";
import EffectsElement from "../../components/effects.mjs";
import MovementSensesConfig from "../../shared/movement-senses-config.mjs";
import CreatureTypeConfig from "../../shared/creature-type-config.mjs";

import SourceConfig from "../../shared/source-config.mjs";

import AdvancementConfirmationDialog from "../../advancement/advancement-confirmation-dialog.mjs";
import AdvancementManager from "../../advancement/advancement-manager.mjs";

import ActorSheetMixin from "./sheet-mixin.mjs";
import TransformDialog from "../transform-dialog.mjs";

import AbilityConfig from "../config/ability-config.mjs";
import ArmorClassConfig from "../config/armor-class-config.mjs";
import ConcentrationConfig from "../config/concentration-config.mjs";
import DeathConfig from "../config/death-config.mjs";
import DamagesConfig from "../config/damages-config.mjs";
import HabitatConfig from "../config/habitat-config.mjs";
import HitDiceConfig from "../config/hit-dice-config.mjs";
import HitPointsConfig from "../config/hit-points-config.mjs";
import InitiativeConfig from "../config/initiative-config.mjs";
import LanguagesConfig from "../config/languages-config.mjs";
import SkillToolConfig from "../config/skill-tool-config.mjs";
import SkillsConfig from "../config/skills-config.mjs";
import SpellSlotsConfig from "../config/spell-slots-config.mjs";
import ToolsConfig from "../config/tools-config.mjs";
import TraitsConfig from "../config/traits-config.mjs";
import TreasureConfig from "../config/treasure-config.mjs";
import WeaponsConfig from "../config/weapons-config.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * @import { DropEffectValue } from "../../../drag-drop.mjs"
 * @import { FilterState5e } from "../../components/item-list-controls.mjs";
 */

/**
 * Extend the basic ActorSheet class to suppose system-specific logic and functionality.
 * @abstract
 */
export default class ActorSheet5e extends ActorSheetMixin(foundry.appv1?.sheets?.ActorSheet ?? ActorSheet) {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "The `ActorSheet5e` application has been deprecated and replaced with `BaseActorSheet`.",
      { since: "DnD5e 5.0", until: "DnD5e 5.2", once: true }
    );
    super(...args);
  }

  /**
   * Track the set of item filters which are applied
   * @type {Object<string, FilterState5e>}
   * @protected
   */
  _filters = {
    inventory: { name: "", properties: new Set() },
    spellbook: { name: "", properties: new Set() },
    features: { name: "", properties: new Set() },
    effects: { name: "", properties: new Set() }
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
        "dnd5e-inventory .inventory-list",
        "dnd5e-effects .effects-list",
        ".center-pane"
      ],
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}],
      width: 720,
      height: Math.max(680, Math.max(
        237 + (Object.keys(CONFIG.DND5E.abilities).length * 70),
        240 + (Object.keys(CONFIG.DND5E.skills).length * 24)
      )),
      elements: {
        effects: "dnd5e-effects",
        inventory: "dnd5e-inventory"
      }
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
      effects: EffectsElement.prepareCategories(this.actor.allApplicableEffects()),
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
      },
      elements: this.options.elements
    };

    // Remove items in containers & sort remaining
    context.items = context.items
      .filter(i => !this.actor.items.has(i.system.container))
      .sort((a, b) => (a.sort || 0) - (b.sort || 0));

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
      abl.key = a;
    }

    // Skills & tools.
    const baseAbility = (prop, key) => {
      let src = source.system[prop]?.[key]?.ability;
      if ( src ) return src;
      if ( prop === "skills" ) src = CONFIG.DND5E.skills[key]?.ability;
      return src ?? "int";
    };
    ["skills", "tools"].forEach(prop => {
      for ( const [key, entry] of Object.entries(context[prop]) ) {
        entry.abbreviation = CONFIG.DND5E.abilities[entry.ability]?.abbreviation;
        entry.icon = this._getProficiencyIcon(entry.value);
        entry.hover = CONFIG.DND5E.proficiencyLevels[entry.value];
        entry.label = (prop === "skills") ? CONFIG.DND5E.skills[key]?.label : Trait.keyLabel(key, {trait: "tool"});
        entry.baseValue = source.system[prop]?.[key]?.value ?? 0;
        entry.baseAbility = baseAbility(prop, key);
      }
    });

    // Update traits
    context.traits = this._prepareTraits(context.system);

    // Prepare owned items
    this._prepareItems(context);
    context.expandedData = {};
    for ( const id of this._expanded ) {
      const item = this.actor.items.get(id);
      if ( item ) {
        context.expandedData[id] = await item.getChatData({secrets: this.actor.isOwner});
        if ( context.itemContext[id] ) context.itemContext[id].expanded = context.expandedData[id];
      }
    }

    // Biography HTML enrichment
    context.biographyHTML = await TextEditor.enrichHTML(context.system.details.biography.value, {
      secrets: this.actor.isOwner,
      rollData: context.rollData,
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
    const units = movement.units ?? defaultUnits("length");

    // Case 1: Largest as primary
    if ( largestPrimary ) {
      let primary = speeds.shift();
      return {
        primary: primary ? `${primary?.[1]} ${units}` : formatLength(movement.walk ?? 0, units),
        special: speeds.map(s => s[1]).join(", ")
      };
    }

    // Case 2: Walk as primary
    else {
      return {
        primary: formatLength(movement.walk ?? 0, units),
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
    const units = senses.units ?? defaultUnits("length");
    for ( let [k, label] of Object.entries(CONFIG.DND5E.senses) ) {
      const v = senses[k] ?? 0;
      if ( v === 0 ) continue;
      tags[k] = `${game.i18n.localize(label)} ${formatLength(v, units)}`;
    }
    if ( senses.special ) splitSemicolons(senses.special).forEach((c, i) => tags[`custom${i + 1}`] = c);
    return tags;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async activateEditor(name, options={}, initialContent="") {
    options.relativeLinks = true;
    return super.activateEditor(name, options, initialContent);
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
      if ( trait === "dm" ) continue;
      const key = traitConfig.actorKeyPath?.replace("system.", "") ?? `traits.${trait}`;
      const data = foundry.utils.deepClone(foundry.utils.getProperty(systemData, key));
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
          if ( !CONFIG.DND5E.damageTypes[t]?.isPhysical ) return true;
          physical.push(t);
          return false;
        });
      }

      data.selected = values.reduce((obj, key) => {
        obj[key] = Trait.keyLabel(key, { trait }) ?? key;
        return obj;
      }, {});

      // Display bypassed damage types
      if ( physical.length ) {
        const damageTypesFormatter = new Intl.ListFormat(game.i18n.lang, { style: "long", type: "conjunction" });
        const bypassFormatter = new Intl.ListFormat(game.i18n.lang, { style: "long", type: "disjunction" });
        data.selected.physical = game.i18n.format("DND5E.DamagePhysicalBypasses", {
          damageTypes: damageTypesFormatter.format(physical.map(t => Trait.keyLabel(t, { trait }))),
          bypassTypes: bypassFormatter.format(data.bypasses.reduce((acc, t) => {
            const v = CONFIG.DND5E.itemProperties[t];
            if ( v && v.isPhysical ) acc.push(v.label);
            return acc;
          }, []))
        });
      }

      // Add custom entries
      if ( data.custom ) splitSemicolons(data.custom).forEach((c, i) => data.selected[`custom${i + 1}`] = c);
      data.cssClass = !foundry.utils.isEmpty(data.selected) ? "" : "inactive";

      // If petrified, display "All Damage" instead of all damage types separately
      if ( (trait === "dr") && this.document.hasConditionEffect("petrification") ) {
        data.selected = { custom1: game.i18n.localize("DND5E.DamageAll") };
        data.cssClass = "";
      }
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
    const sections = Object.entries(CONFIG.DND5E.spellPreparationModes).reduce((acc, [k, {order}]) => {
      if ( Number.isNumeric(order) ) acc[k] = Number(order);
      return acc;
    }, {});
    const useLabels = {"-30": "-", "-20": "-", "-10": "-", 0: "&infin;"};

    // Format a spellbook entry for a certain indexed level
    const registerSection = (sl, i, label, {prepMode="prepared", value, max, override, config}={}) => {
      const aeOverride = foundry.utils.hasProperty(this.actor.overrides, `system.spells.spell${i}.override`);
      spellbook[i] = {
        order: i,
        label: label,
        usesSlots: i > 0,
        canCreate: owner,
        canPrepare: ((context.actor.type === "character") && (i >= 1)) || config?.prepares,
        spells: [],
        uses: useLabels[i] || value || 0,
        slots: useLabels[i] || max || 0,
        override: override || 0,
        dataset: {type: "spell", level: prepMode in sections ? 1 : i, preparationMode: prepMode},
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

    // Create spellbook sections for all alternative spell preparation modes that have spell slots.
    for ( const [k, v] of Object.entries(CONFIG.DND5E.spellPreparationModes) ) {
      if ( !(k in levels) || !v.upcast || !levels[k].max ) continue;

      if ( !spellbook["0"] && v.cantrips ) registerSection("spell0", 0, CONFIG.DND5E.spellLevels[0]);
      const l = levels[k];
      const level = game.i18n.localize(`DND5E.SpellLevel${l.level}`);
      const label = `${v.label} — ${level}`;
      registerSection(k, sections[k], label, {
        prepMode: k,
        value: l.value,
        max: l.max,
        override: l.override,
        config: v
      });
    }

    // Iterate over every spell item, adding spells to the spellbook by section
    spells.forEach(spell => {
      const mode = spell.system.preparation.mode || "prepared";
      let s = spell.system.level || 0;
      const sl = `spell${s}`;

      // Spells from items
      if ( spell.getFlag("dnd5e", "cachedFor") ) {
        s = "item";
        if ( !spell.system.linkedActivity?.displayInSpellbook ) return;
        if ( !spellbook[s] ) {
          registerSection(null, s, game.i18n.localize("DND5E.CAST.SECTIONS.Spellbook"));
          spellbook[s].order = 1000;
        }
      }

      // Specialized spellcasting modes (if they exist)
      else if ( mode in sections ) {
        s = sections[mode];
        if ( !spellbook[s] ) {
          const l = levels[mode] || {};
          const config = CONFIG.DND5E.spellPreparationModes[mode];
          registerSection(mode, s, config.label, {
            prepMode: mode,
            value: l.value,
            max: l.max,
            override: l.override,
            config: config
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
   * Filter child embedded Documents based on the current set of filters.
   * @param {string} collection    The embedded collection name.
   * @param {Set<string>} filters  Filters to apply to the children.
   * @returns {Document[]}
   * @protected
   */
  _filterChildren(collection, filters) {
    switch ( collection ) {
      case "items": return this._filterItems(this.actor.items, filters);
      case "effects": return this._filterEffects(Array.from(this.actor.allApplicableEffects()), filters);
    }
    return [];
  }

  /* -------------------------------------------- */

  /**
   * Filter Active Effects based on the current set of filters.
   * @param {ActiveEffect5e[]} effects  The effects to filter.
   * @param {Set<string>} filters       Filters to apply to the effects.
   * @returns {ActiveEffect5e[]}
   * @protected
   */
  _filterEffects(effects, filters) {
    return effects;
  }

  /* -------------------------------------------- */

  /**
   * Filter items based on the current set of filters.
   * @param {Item5e[]} items       Copies of item data to be filtered.
   * @param {Set<string>} filters  Filters applied to the item list.
   * @returns {Item5e[]}           Subset of input items limited by the provided filters.
   * @protected
   */
  _filterItems(items, filters) {
    const alwaysPrepared = ["innate", "always"];
    const actions = ["action", "bonus", "reaction"];
    const recoveries = ["lr", "sr"];
    const spellSchools = new Set(Object.keys(CONFIG.DND5E.spellSchools));
    const schoolFilter = spellSchools.intersection(filters);
    const spellcastingClasses = new Set(Object.keys(this.actor.spellcastingClasses));
    const classFilter = spellcastingClasses.intersection(filters);

    return items.filter(item => {

      // Subclass-specific logic.
      const filtered = this._filterItem(item, filters);
      if ( filtered !== undefined ) return filtered;

      // Action usage
      for ( const f of actions ) {
        if ( !filters.has(f) ) continue;
        if ( item.type === "spell" ) {
          if ( item.system.activation.type !== f ) return false;
          continue;
        }
        if ( !item.system.activities?.size ) return false;
        if ( item.system.activities.every(a => a.activation.type !== f) ) return false;
      }

      // Spell-specific filters
      if ( filters.has("ritual") && !item.system.properties?.has("ritual") ) return false;
      if ( filters.has("concentration") && !item.system.properties?.has("concentration") ) return false;
      if ( schoolFilter.size && !schoolFilter.has(item.system.school) ) return false;
      if ( classFilter.size && !classFilter.has(item.system.sourceClass) ) return false;
      if ( filters.has("prepared") ) {
        if ( alwaysPrepared.includes(item.system.preparation?.mode) ) return true;
        return item.system.preparation?.prepared;
      }

      // Equipment-specific filters
      if ( filters.has("equipped") && (item.system.equipped !== true) ) return false;
      if ( filters.has("mgc") && !item.system.properties?.has("mgc") ) return false;

      // Recovery
      for ( const f of recoveries ) {
        if ( !filters.has(f) ) continue;
        if ( !item.system.uses?.recovery.length ) return false;
        if ( item.system.uses.recovery.every(r => r.period !== f) ) return false;
      }

      return true;
    });
  }

  /* -------------------------------------------- */

  /**
   * Determine whether an Item will be shown based on the current set of filters.
   * @param {Item5e} item          The item.
   * @param {Set<string>} filters  Filters applied to the Item.
   * @returns {boolean|void}
   * @protected
   */
  _filterItem(item, filters) {}

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

  /** @inheritDoc */
  activateListeners(html) {
    // Property attributions
    this.form.querySelectorAll("[data-attribution], .attributable").forEach(this._applyAttributionTooltips.bind(this));

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

      // Changing Level
      html.find(".level-selector").change(this._onLevelChange.bind(this));

      // Owned Item management
      html.find(".slot-max-override").click(this._onSpellSlotOverride.bind(this));
      html.find(".attunement-max-override").click(this._onAttunementOverride.bind(this));

      this._disableOverriddenFields(html);
    }

    // Owner Only Listeners, for non-compendium actors.
    if ( this.actor.isOwner && !this.actor.inCompendium ) {
      // Ability Checks
      html.find(".ability-name").click(this._onRollAbilityTest.bind(this));

      // Roll Skill Checks
      html.find(".skill-name").click(this._onRollSkillCheck.bind(this));

      // Roll Tool Checks.
      html.find(".tool-name").on("click", this._onRollToolCheck.bind(this));
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
   * Respond to a new level being selected from the level selector.
   * @param {Event} event                           The originating change.
   * @returns {Promise<AdvancementManager|Item5e>}  Manager if advancements needed, otherwise updated class item.
   * @private
   */
  async _onLevelChange(event) {
    event.preventDefault();
    const delta = Number(event.target.value);
    const classId = event.target.closest("[data-item-id]")?.dataset.itemId;
    if ( !delta || !classId ) return;
    const classItem = this.actor.items.get(classId);
    if ( !game.settings.get("dnd5e", "disableAdvancements") ) {
      const manager = AdvancementManager.forLevelChange(this.actor, classId, delta);
      if ( manager.steps.length ) {
        if ( delta > 0 ) return manager.render(true);
        try {
          const shouldRemoveAdvancements = await AdvancementConfirmationDialog.forLevelDown(classItem);
          if ( shouldRemoveAdvancements ) return manager.render(true);
        }
        catch(err) {
          return;
        }
      }
    }
    return classItem.update({"system.levels": classItem.system.levels + delta});
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the TraitSelector application which allows a checkbox of multiple trait options.
   * @param {Event} event   The click event which originated the selection.
   * @protected
   */
  _onConfigMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    let app;
    switch ( button.dataset.action ) {
      case "armor":
        app = new ArmorClassConfig({ document: this.actor });
        break;
      case "death":
        app = new DeathConfig({ document: this.actor });
        break;
      case "habitat":
        app = new HabitatConfig({ document: this.actor });
        break;
      case "hitDice":
        app = new HitDiceConfig({ document: this.actor });
        break;
      case "hitPoints":
        app = new HitPointsConfig({ document: this.actor });
        break;
      case "initiative":
        app = new InitiativeConfig({ document: this.actor });
        break;
      case "movement":
      case "senses":
        app = new MovementSensesConfig({ document: this.actor, type: button.dataset.action });
        break;
      case "treasure":
        app = new TreasureConfig({ document: this.actor });
        break;
      case "source":
        app = new SourceConfig({ document: this.actor });
        break;
      case "type":
        app = new CreatureTypeConfig({ document: this.actor });
        break;
      case "ability":
        const ability = event.currentTarget.closest("[data-ability]").dataset.ability;
        if ( ability === "concentration" ) app = new ConcentrationConfig({ document: this.actor });
        else app = new AbilityConfig({ document: this.actor, key: ability });
        break;
      case "skill":
        const skill = event.currentTarget.closest("[data-key]").dataset.key;
        app = new SkillToolConfig({ document: this.actor, trait: "skills", key: skill });
        break;
      case "skills":
        app = new SkillsConfig({ document: this.actor });
        break;
      case "spellSlots":
        app = new SpellSlotsConfig({ document: this.actor });
        break;
      case "tool":
        const tool = event.currentTarget.closest("[data-key]").dataset.key;
        app = new SkillToolConfig({ document: this.actor, trait: "tool", key: tool });
        break;
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

  /** @inheritDoc */
  _onDragStart(event) {
    const li = event.currentTarget;
    if ( event.target.classList.contains("content-link") ) return;

    if ( li.dataset.effectId && li.dataset.parentId ) {
      const effect = this.actor.items.get(li.dataset.parentId)?.effects.get(li.dataset.effectId);
      if ( effect ) event.dataTransfer.setData("text/plain", JSON.stringify(effect.toDragData()));
      return;
    }

    super._onDragStart(event);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropActor(event, data) {
    const canPolymorph = game.user.isGM || (this.actor.isOwner && game.settings.get("dnd5e", "allowPolymorphing"));
    if ( !canPolymorph || (this._tabs[0].active === "bastion") ) return false;

    // Get the target actor
    const cls = getDocumentClass("Actor");
    const sourceActor = await cls.fromDropData(data);
    if ( !sourceActor ) return;

    // Configure the transformation
    const settings = await TransformDialog.promptSettings(this.actor, sourceActor, {
      transform: { settings: game.settings.get("dnd5e", "transformationSettings") }
    });
    if ( !settings ) return;
    await game.settings.set("dnd5e", "transformationSettings", settings.toObject());

    return this.actor.transformInto(sourceActor, settings);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDropActiveEffect(event, data) {
    const effect = await ActiveEffect.implementation.fromDropData(data);
    if ( effect?.target === this.actor ) return false;
    return super._onDropActiveEffect(event, data);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropItem(event, data) {
    const behavior = this._dropBehavior(event, data);
    if ( !this.actor.isOwner || (behavior === "none") ) return false;
    const item = await Item.implementation.fromDropData(data);

    // Handle moving out of container & item sorting
    if ( (behavior === "move") && (this.actor.uuid === item.parent?.uuid) ) {
      if ( item.system.container !== null ) await item.update({ "system.container": null });
      return this._onSortItem(event, item.toObject());
    }

    return this._onDropItemCreate(item, event, behavior);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropFolder(event, data) {
    if ( !this.actor.isOwner ) return [];
    const folder = await Folder.implementation.fromDropData(data);
    if ( folder.type !== "Item" ) return [];
    const droppedItemData = await Promise.all(folder.contents.map(async item => {
      if ( !(item instanceof Item) ) item = await fromUuid(item.uuid);
      return item;
    }));
    return this._onDropItemCreate(droppedItemData, event);
  }

  /* -------------------------------------------- */

  /**
   * Handle the final creation of dropped Item data on the Actor.
   * @param {Item5e[]|Item5e} itemData     The item or items requested for creation.
   * @param {DragEvent} event              The concluding DragEvent which provided the drop data.
   * @param {DropEffectValue} behavior     The specific drop behavior.
   * @returns {Promise<Item5e[]>}
   * @protected
   */
  async _onDropItemCreate(itemData, event, behavior) {
    let items = itemData instanceof Array ? itemData : [itemData];
    const itemsWithoutAdvancement = items.filter(i => !i.system.advancement?.length);
    const multipleAdvancements = (items.length - itemsWithoutAdvancement.length) > 1;
    if ( multipleAdvancements && !game.settings.get("dnd5e", "disableAdvancements") ) {
      ui.notifications.warn(game.i18n.format("DND5E.WarnCantAddMultipleAdvancements"));
      items = itemsWithoutAdvancement;
    }

    // Filter out items already in containers to avoid creating duplicates
    const containers = new Set(items.filter(i => i.type === "container").map(i => i._id));
    items = items.filter(i => !containers.has(i.system.container));

    // Create the owned items & contents as normal
    const toCreate = await Item5e.createWithContents(items, {
      transformFirst: item => {
        if ( item instanceof foundry.abstract.Document ) item = item.toObject();
        return this._onDropSingleItem(item, event);
      }
    });
    const created = await Item5e.createDocuments(toCreate, { pack: this.actor.pack, parent: this.actor, keepId: true });
    if ( behavior === "move" ) items.forEach(i => fromUuid(i.uuid).then(d => d?.delete({ deleteContents: true })));
    return created;
  }

  /* -------------------------------------------- */

  /**
   * Handles dropping of a single item onto this character sheet.
   * @param {object} itemData            The item data to create.
   * @param {DragEvent} event            The concluding DragEvent which provided the drop data.
   * @returns {Promise<object|boolean>}  The item data to create after processing, or false if the item should not be
   *                                     created or creation has been otherwise handled.
   * @protected
   */
  async _onDropSingleItem(itemData, event) {
    // Check to make sure items of this type are allowed on this actor
    if ( this.constructor.unsupportedItemTypes.has(itemData.type) ) {
      ui.notifications.warn(game.i18n.format("DND5E.ACTOR.Warning.InvalidItem", {
        itemType: game.i18n.localize(CONFIG.Item.typeLabels[itemData.type]),
        actorType: game.i18n.localize(CONFIG.Actor.typeLabels[this.actor.type])
      }));
      return false;
    }

    // Create a Consumable spell scroll on the Inventory tab
    if ( (itemData.type === "spell")
      && (this._tabs[0].active === "inventory" || this.actor.type === "vehicle") ) {
      const scroll = await Item5e.createScrollFromSpell(itemData);
      return scroll?.toObject?.() ?? false;
    }

    // Clean up data
    this._onDropResetData(itemData, event);

    // Stack identical consumables
    const stacked = this._onDropStackConsumables(itemData);
    if ( stacked ) return false;

    // Bypass normal creation flow for any items with advancement
    if ( this.actor.system.metadata?.supportsAdvancement && itemData.system.advancement?.length
        && !game.settings.get("dnd5e", "disableAdvancements") ) {
      // Ensure that this item isn't violating the singleton rule
      const dataModel = CONFIG.Item.dataModels[itemData.type];
      const singleton = dataModel?.metadata.singleton ?? false;
      if ( singleton && this.actor.itemTypes[itemData.type].length ) {
        ui.notifications.error(game.i18n.format("DND5E.ACTOR.Warning.Singleton", {
          itemType: game.i18n.localize(CONFIG.Item.typeLabels[itemData.type]),
          actorType: game.i18n.localize(CONFIG.Actor.typeLabels[this.actor.type])
        }));
        return false;
      }

      const manager = AdvancementManager.forNewItem(this.actor, itemData);
      if ( manager.steps.length ) {
        manager.render(true);
        return false;
      }
    }

    // Adjust the preparation mode of a leveled spell depending on the section on which it is dropped.
    if ( itemData.type === "spell" ) this._onDropSpell(itemData, event);

    return itemData;
  }

  /* -------------------------------------------- */

  /**
   * Reset certain pieces of data stored on items when they are dropped onto the actor.
   * @param {object} itemData    The item data requested for creation. **Will be mutated.**
   * @param {DragEvent} event    The concluding DragEvent which provided the drop data.
   */
  _onDropResetData(itemData, event) {
    if ( !itemData.system ) return;
    ["attuned", "equipped", "prepared"].forEach(k => delete itemData.system[k]);
  }

  /* -------------------------------------------- */

  /**
   * Adjust the preparation mode of a dropped spell depending on the drop location on the sheet.
   * @param {object} itemData    The item data requested for creation. **Will be mutated.**
   * @param {DragEvent} event    The concluding DragEvent which provided the drop data.
   */
  _onDropSpell(itemData, event) {
    if ( !["npc", "character"].includes(this.document.type) ) return;

    // Determine the section it is dropped on, if any.
    let header = event.target.closest(".items-header"); // Dropped directly on the header.
    if ( !header ) {
      const list = event.target.closest(".item-list"); // Dropped inside an existing list.
      header = list?.previousElementSibling;
    }
    const { level, preparationMode } = header?.closest("[data-level]")?.dataset ?? {};

    // Determine the actor's spell slot progressions, if any.
    const spellcastKeys = Object.keys(CONFIG.DND5E.spellcastingTypes);
    const progs = Object.values(this.document.classes).reduce((acc, cls) => {
      const type = cls.spellcasting?.type;
      if ( spellcastKeys.includes(type) ) acc.add(type);
      return acc;
    }, new Set());

    const prep = itemData.system.preparation;

    // Case 1: Drop a cantrip.
    if ( itemData.system.level === 0 ) {
      const modes = CONFIG.DND5E.spellPreparationModes;
      if ( modes[preparationMode]?.cantrips ) {
        prep.mode = "prepared";
      } else if ( !preparationMode ) {
        const isCaster = this.document.system.attributes.spell?.level || progs.size;
        prep.mode = isCaster ? "prepared" : "innate";
      } else {
        prep.mode = preparationMode;
      }
      if ( modes[prep.mode]?.prepares ) prep.prepared = true;
    }

    // Case 2: Drop a leveled spell in a section without a mode.
    else if ( (level === "0") || !preparationMode ) {
      if ( this.document.type === "npc" ) {
        prep.mode = this.document.system.attributes.spell.level ? "prepared" : "innate";
      } else {
        const m = progs.has("leveled") ? "prepared" : (progs.first() ?? "innate");
        prep.mode = progs.has(prep.mode) ? prep.mode : m;
      }
    }

    // Case 3: Drop a leveled spell in a specific section.
    else prep.mode = preparationMode;
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
   * Initialize attribution tooltips on an element.
   * @param {HTMLElement} element  The tooltipped element.
   * @protected
   */
  _applyAttributionTooltips(element) {
    if ( "tooltip" in element.dataset ) return;
    element.dataset.tooltip = `
      <section class="loading" data-uuid="${this.actor.uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>
    `;
    element.dataset.tooltipClass = "property-attribution";
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
    this.actor.rollAbility({ ability, event });
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
    return this.actor.rollSkill({ skill, event });
  }

  /* -------------------------------------------- */

  _onRollToolCheck(event) {
    event.preventDefault();
    const tool = event.currentTarget.closest("[data-key]").dataset.key;
    return this.actor.rollToolCheck({ tool, event });
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
   * Handle spawning the TraitSelector application which allows a checkbox of multiple trait options.
   * @param {Event} event      The click event which originated the selection.
   * @returns {TraitSelector}  Newly displayed application.
   * @private
   */
  _onTraitSelector(event) {
    event.preventDefault();
    const trait = event.currentTarget.dataset.trait;
    const options = { document: this.actor, trait };
    if ( trait === "ci" ) options.position = { width: 400 };
    switch ( trait ) {
      case "di":
      case "dm":
      case "dr":
      case "dv": return new DamagesConfig(options).render({ force: true });
      case "languages": return new LanguagesConfig(options).render({ force: true });
      case "tool": return new ToolsConfig(options).render({ force: true });
      case "weapon": return new WeaponsConfig(options).render({ force: true });
      default: return new TraitsConfig(options).render({ force: true });
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
      case "armor":
        new ArmorClassConfig({ document: this.actor }).render({ force: true });
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
        label: "DND5E.TRANSFORM.Action.Restore",
        class: "restore-transformation",
        icon: "fas fa-backward",
        onclick: () => this.actor.revertOriginalForm()
      });
    }
    return buttons;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {
    // Unset any flags which are "false"
    for ( const [k, v] of Object.entries(formData) ) {
      if ( k.startsWith("flags.dnd5e.") && !v ) {
        delete formData[k];
        if ( foundry.utils.hasProperty(this.document._source, k) ) formData[k.replace(/\.([\w\d]+)$/, ".-=$1")] = null;
      }
    }

    // Parent ActorSheet update steps
    return super._updateObject(event, formData);
  }
}
