import * as Trait from "../../../documents/actor/trait.mjs";
import Item5e from "../../../documents/item.mjs";
import {
  formatLength, formatNumber, getPluralRules, parseInputDelta, simplifyBonus, splitSemicolons, staticID
} from "../../../utils.mjs";

import AdvancementConfirmationDialog from "../../advancement/advancement-confirmation-dialog.mjs";
import AdvancementManager from "../../advancement/advancement-manager.mjs";
import ApplicationV2Mixin from "../../api/application-v2-mixin.mjs";
import PrimarySheetMixin from "../../api/primary-sheet-mixin.mjs";
import EffectsElement from "../../components/effects.mjs";
import { createCheckboxInput } from "../../fields.mjs";
import CreatureTypeConfig from "../../shared/creature-type-config.mjs";
import MovementSensesConfig from "../../shared/movement-senses-config.mjs";
import SourceConfig from "../../shared/source-config.mjs";

import AbilityConfig from "../config/ability-config.mjs";
import ArmorClassConfig from "../config/armor-class-config.mjs";
import ConcentrationConfig from "../config/concentration-config.mjs";
import DamagesConfig from "../config/damages-config.mjs";
import DeathConfig from "../config/death-config.mjs";
import HitDiceConfig from "../config/hit-dice-config.mjs";
import HitPointsConfig from "../config/hit-points-config.mjs";
import InitiativeConfig from "../config/initiative-config.mjs";
import LanguagesConfig from "../config/languages-config.mjs";
import SkillsConfig from "../config/skills-config.mjs";
import SkillToolConfig from "../config/skill-tool-config.mjs";
import SpellSlotsConfig from "../config/spell-slots-config.mjs";
import ToolsConfig from "../config/tools-config.mjs";
import TraitsConfig from "../config/traits-config.mjs";
import WeaponsConfig from "../config/weapons-config.mjs";
import TransformDialog from "../transform-dialog.mjs";
import ItemListControlsElement from "../../components/item-list-controls.mjs";

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { DropEffectValue } from "../../../drag-drop.mjs"
 */

/**
 * Base actor sheet built on ApplicationV2.
 */
export default class BaseActorSheet extends PrimarySheetMixin(
  ApplicationV2Mixin(foundry.applications.sheets.ActorSheetV2)
) {
  constructor(options={}) {
    // Set initial size based on saved size
    const key = `${options.document?.type}${options.document?.limited ? ":limited" : ""}`;
    const { width, height } = game.user.getFlag("dnd5e", `sheetPrefs.${key}`) ?? {};
    options.position ??= {};
    if ( width && !("width" in options.position) ) options.position.width = width;
    if ( height && !("height" in options.position) ) options.position.height = height;

    super(options);
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      editImage: BaseActorSheet.#onEditImage,
      inspectWarning: BaseActorSheet.#inspectWarning,
      openWarnings: BaseActorSheet.#openWarnings,
      rest: BaseActorSheet.#rest,
      restoreTransformation: BaseActorSheet.#restoreTransformation,
      roll: BaseActorSheet.#roll,
      showArtwork: BaseActorSheet.#showArtwork,
      showConfiguration: BaseActorSheet.#showConfiguration,
      togglePip: BaseActorSheet.#togglePip,
      toggleSidebar: BaseActorSheet.#toggleSidebar
    },
    classes: ["actor", "standard-form"],
    elements: {
      effects: "dnd5e-effects",
      inventory: "dnd5e-inventory"
    },
    form: {
      submitOnChange: true
    },
    window: {
      controls: [
        {
          action: "restoreTransformation",
          icon: "fa-solid fa-backward",
          label: "DND5E.TRANSFORM.Action.Restore",
          ownership: "OWNER",
          visible: BaseActorSheet.#canRestoreTransformation
        }
      ],
      resizable: true
    }
  };

  /* -------------------------------------------- */

  /**
   * Application parts used when rendering the sheet in limited mode.
   * @type {Record<string, HandlebarsTemplatePart>}
   */
  static LIMITED_PARTS = {
    header: {
      template: "systems/dnd5e/templates/actors/limited-header.hbs"
    },
    biography: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/limited-body.hbs",
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /**
   * A set of item types that should be prevented from being dropped on this type of actor sheet.
   * @type {Set<string>}
   */
  static unsupportedItemTypes = new Set();

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The cached concentration information for the character.
   * @type {{ items: Set<Item5e>, effects: Set<ActiveEffect5e> }}
   * @internal
   */
  _concentration;

  /* -------------------------------------------- */

  /**
   * Key path to the sidebar collapsed flag for the current tab.
   * @type {string}
   * @internal
   */
  get _sidebarCollapsedKeyPath() {
    return `sheetPrefs.${this.actor.type}.tabs.${this.tabGroups.primary}.collapseSidebar`;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Allow subclasses to make adjustments to inventory section configuration.
   * @param {InventorySectionDescriptor[]} sections  The inventory sections.
   * @returns {Promise<void>}
   * @protected
   */
  async _configureInventorySections(sections) {}

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _configureRenderOptions(options) {
    await super._configureRenderOptions(options);
    if ( options.isFirstRender && options.tab ) this.tabGroups.primary = options.tab;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _configureRenderParts(options) {
    if ( this.actor.limited ) return foundry.utils.deepClone(this.constructor.LIMITED_PARTS);
    const parts = super._configureRenderParts(options);
    if ( "inventory" in parts ) {
      parts.inventory.templates ??= [];
      parts.inventory.templates.push(...customElements.get(this.options.elements.inventory).templates);
    }
    if ( "features" in parts ) {
      parts.features.templates ??= [];
      parts.features.templates.push(...customElements.get(this.options.elements.inventory).templates);
    }
    return parts;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = {
      ...await super._prepareContext(options),
      actor: this.actor,
      elements: this.options.elements,
      fields: this.actor.system.schema.fields,
      labels: {
        damageAndHealing: { ...CONFIG.DND5E.damageTypes, ...CONFIG.DND5E.healingTypes },
        ...this.actor.labels
      },
      limited: this.actor.limited,
      modernRules: this.actor.system.source?.rules
        ? this.actor.system.source.rules === "2024"
        : game.settings.get("dnd5e", "rulesVersion") === "modern",
      rollableClass: this.isEditable ? "rollable" : "",
      sidebarCollapsed: !!game.user.getFlag("dnd5e", this._sidebarCollapsedKeyPath),
      system: this.actor.system,
      user: game.user,
      warnings: foundry.utils.deepClone(this.actor._preparationWarnings)
    };
    context.source = context.editable ? this.actor.system._source : this.actor.system;
    context.config = context.CONFIG; // TODO: Temporary patch until all templates have been updated

    // Cache concentration data and prepare items
    this._concentration = this.actor.concentration;
    await this._prepareItems(context);

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the effects tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareEffectsContext(context, options) {
    context.effects = EffectsElement.prepareCategories(this.actor.allApplicableEffects());

    const conditionIds = new Set();
    context.conditions = Object.entries(CONFIG.DND5E.conditionTypes).reduce((arr, [k, c]) => {
      if ( c.pseudo ) return arr; // Filter out pseudo-conditions.
      let { label, name, icon, img, reference } = c;
      if ( label ) {
        foundry.utils.logCompatibilityWarning(
          "The `label` property of status conditions has been deprecated in place of using `name`.",
          { since: "DnD5e 5.0", until: "DnD5e 5.2" }
        );
        name = label;
      }
      const id = staticID(`dnd5e${k}`);
      conditionIds.add(id);
      const existing = this.actor.effects.get(id);
      const { disabled } = existing ?? {};
      if ( icon ) {
        foundry.utils.logCompatibilityWarning(
          "The `icon` property of status conditions has been deprecated in place of using `img`.",
          { since: "DnD5e 5.0", until: "DnD5e 5.2" }
        );
        img = icon;
      }
      arr.push({
        name, reference,
        id: k,
        img: existing?.img ?? img,
        disabled: existing ? disabled : true
      });
      return arr;
    }, []);

    for ( const category of Object.values(context.effects) ) {
      category.effects = await category.effects.reduce(async (arr, effect) => {
        effect.updateDuration();
        if ( conditionIds.has(effect.id) && !effect.duration.remaining ) return arr;
        const { id, name, img, disabled, duration } = effect;
        const toggleable = !this._concentration?.effects.has(effect);
        let source = await effect.getSource();
        // If the source is an ActiveEffect from another Actor, note the source as that Actor instead.
        if ( source instanceof ActiveEffect ) {
          source = source.target;
          if ( (source instanceof Item) && source.parent && (source.parent !== this.object) ) source = source.parent;
        }
        arr = await arr;
        arr.push({
          id, name, img, disabled, duration, source, toggleable,
          parentId: effect.target === effect.parent ? null : effect.parent.id,
          durationParts: duration.remaining ? duration.label.split(", ") : [],
          hasTooltip: source instanceof dnd5e.documents.Item5e
        });
        return arr;
      }, []);
    }

    context.effects.suppressed.info = context.effects.suppressed.info[0];

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the inventory tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareInventoryContext(context, options) {
    const Inventory = customElements.get(this.options.elements.inventory);

    // Containers
    context.itemContext ??= {};
    context.containers = context.itemCategories.containers ?? [];
    for ( const container of context.containers ?? [] ) {
      const ctx = context.itemContext[container.id];
      ctx.capacity = await container.system.computeCapacity();
      ctx.capacity.maxLabel = Number.isFinite(ctx.capacity.max) ? ctx.capacity.max : "&infin;";
      ctx.columns = Inventory.mapColumns(["capacity", "controls"]);
      ctx.clickAction = "view";
    }

    // Inventory
    const sections = Object.values(CONFIG.Item.dataModels)
      .filter(model => "inventorySection" in model)
      .map(model => model.inventorySection);
    sections.push(foundry.utils.deepClone(Inventory.SECTIONS.contents));
    await this._configureInventorySections(sections);
    // Add hidden section that renders the union of columns.
    sections.push({ items: context.itemCategories.inventory ?? [], columns: Inventory.unionColumns(sections) });
    context.sections = Inventory.prepareSections(sections);
    context.showCurrency = true;

    // Filtering, Grouping, & Sorting
    context.listControls = foundry.utils.deepClone(ItemListControlsElement.CONFIG.inventory);

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the special traits tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareSpecialTraitsContext(context, options) {
    const sections = [];
    const source = context.editable ? this.document._source : this.document;
    const flags = context.flags = {
      classes: Object.values(this.document.classes)
        .map(cls => ({ value: cls.id, label: cls.name }))
        .sort((lhs, rhs) => lhs.label.localeCompare(rhs.label, game.i18n.lang)),
      data: source.flags?.dnd5e ?? {},
      disabled: this._mode === this.constructor.MODES.PLAY
    };

    // Character Flags
    for ( const [key, config] of Object.entries(CONFIG.DND5E.characterFlags) ) {
      const flag = { ...config, name: `flags.dnd5e.${key}`, value: foundry.utils.getProperty(flags.data, key) };
      const fieldOptions = { label: config.name, hint: config.hint };
      if ( config.type === Boolean ) {
        flag.field = new BooleanField(fieldOptions);
        flag.input = createCheckboxInput;
      }
      else if ( config.type === Number ) flag.field = new NumberField(fieldOptions);
      else flag.field = new StringField(fieldOptions);

      if ( !config.deprecated || flag.value ) {
        sections[config.section] ??= [];
        sections[config.section].push(flag);
      }
    }

    // Global Bonuses
    const globals = [];
    const addBonus = field => {
      if ( field instanceof SchemaField ) Object.values(field.fields).forEach(f => addBonus(f));
      else globals.push({ field, name: field.fieldPath, value: foundry.utils.getProperty(source, field.fieldPath) });
    };
    addBonus(this.document.system.schema.fields.bonuses);
    if ( globals.length ) sections[game.i18n.localize("DND5E.BONUSES.FIELDS.bonuses.label")] = globals;

    flags.sections = Object.entries(sections).map(([label, fields]) => ({ label, fields }));

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the spells tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareSpellsContext(context, options) {
    const Inventory = customElements.get(this.options.elements.inventory);
    context.sections = Inventory.prepareSections(Object.values(context.spellbook));
    context.listControls = {
      label: "DND5E.SpellsSearch",
      list: "spells",
      filters: [
        { key: "action", label: "DND5E.Action" },
        { key: "bonus", label: "DND5E.BonusAction" },
        { key: "reaction", label: "DND5E.Reaction" },
        { key: "concentration", label: "DND5E.Concentration" },
        { key: "ritual", label: "DND5E.Ritual" },
        { key: "prepared", label: "DND5E.Prepared" },
        ...Object.entries(CONFIG.DND5E.spellSchools).map(([key, { label }]) => ({ key, label }))
      ],
      sorting: [
        { key: "a", label: "SIDEBAR.SortModeAlpha", dataset: { icon: "fa-solid fa-arrow-down-a-z" } },
        { key: "p", label: "SIDEBAR.SortModePriority", dataset: { icon: "fa-solid fa-arrow-down-1-9" } },
        { key: "m", label: "SIDEBAR.SortModeManual", dataset: { icon: "fa-solid fa-arrow-down-short-wide" } }
      ]
    };
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the tabs.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareTabsContext(context, options) {
    context.tabs = foundry.utils.deepClone(this.constructor.TABS);
    const activeTab = context.tabs.find(t => t.tab === this.tabGroups.primary) ?? context.tabs[0];
    activeTab.active = true;
    return context;
  }

  /* -------------------------------------------- */
  /*  Actor Preparation Helpers                   */
  /* -------------------------------------------- */

  /**
   * Prepare actor abilities for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {object[]}
   * @protected
   */
  _prepareAbilities(context) {
    return Object.entries(context.system.abilities).map(([key, ability]) => ({
      ...ability, key,
      abbr: CONFIG.DND5E.abilities[key]?.abbreviation ?? "",
      hover: CONFIG.DND5E.proficiencyLevels[ability.proficient],
      icon: CONFIG.DND5E.abilities[key]?.icon,
      label: CONFIG.DND5E.abilities[key]?.label,
      source: context.source.abilities[key]
    }));
  }

  /* -------------------------------------------- */

  /**
   * Prepare items display across the sheet.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @protected
   */
  async _prepareItems(context) {
    context.itemCategories = {};
    context.itemContext = {};
    context.items = Array.from(this.actor.items).filter(i => !this.actor.items.has(i.system.container));
    await Promise.all(context.items.map(async item => {
      // Prepare item context
      const ctx = context.itemContext[item.id] ??= {};
      ctx.clickAction = "use";
      this._prepareItem(item, ctx);
      if ( item.type === "spell" ) await this._prepareItemSpell(item, ctx);
      else if ( "quantity" in item.system ) await this._prepareItemPhysical(item, ctx);
      else await this._prepareItemFeature(item, ctx);

      // Handle expanded data
      ctx.isExpanded = this.expandedSections.get(item.id) === true;
      if ( ctx.isExpanded ) ctx.expanded = await item.getChatData({ secrets: this.actor.isOwner });

      // Place the item into a specific categories
      const categories = this._assignItemCategories(item) ?? [];
      for ( const category of categories ) {
        context.itemCategories[category] ??= [];
        context.itemCategories[category].push(item);
      }

      // Grouping
      ctx.dataset = Object.fromEntries(Object.entries(ctx.groups ?? {}).map(([k, v]) => [`group-${k}`, v]));
    }));
  }

  /* -------------------------------------------- */

  /**
   * Prepare actor portrait for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {Promise<object>}
   * @protected
   */
  async _preparePortrait(context) {
    const showTokenPortrait = this.actor.getFlag("dnd5e", "showTokenPortrait") === true;
    const token = this.actor.isToken ? this.actor.token : this.actor.prototypeToken;
    const defaultArtwork = Actor.implementation.getDefaultArtwork(this.actor._source)?.img;
    let action = "editImage";
    let texture = token?.texture.src;
    if ( showTokenPortrait && token?.randomImg ) {
      const images = await this.actor.getTokenImages();
      texture = images[Math.floor(Math.random() * images.length)];
      action = "configurePrototypeToken";
    }
    const src = (showTokenPortrait ? texture : this.actor.img) ?? defaultArtwork;
    return {
      src, action,
      token: showTokenPortrait,
      path: showTokenPortrait ? this.actor.isToken ? "token.texture.src" : "prototypeToken.texture.src" : "img",
      type: showTokenPortrait ? "imagevideo" : "image",
      isVideo: foundry.helpers.media.VideoHelper.hasVideoExtension(src)
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare actor senses for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {object[]}
   * @protected
   */
  _prepareSenses(context) {
    return [
      ...Object.entries(CONFIG.DND5E.senses).map(([k, label]) => {
        const value = context.system.attributes.senses[k];
        return value ? { label, value } : null;
      }, {}).filter(_ => _),
      ...splitSemicolons(context.system.attributes.senses.special)
        .map(label => ({ label }))
    ];
  }

  /* -------------------------------------------- */

  /**
   * Prepare actor skills or tools for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {"skills"|"tools"} property         Type of data being prepared.
   * @returns {object[]}
   * @protected
   */
  _prepareSkillsTools(context, property) {
    const baseAbility = key => {
      let src = context.source[property]?.[key]?.ability;
      if ( src ) return src;
      if ( property === "skills" ) src = CONFIG.DND5E.skills[key]?.ability;
      return src ?? "int";
    };
    return Object.entries(context.system[property] ?? {}).map(([key, entry]) => ({
      ...entry, key,
      abbreviation: CONFIG.DND5E.abilities[entry.ability]?.abbreviation,
      baseAbility: baseAbility(key),
      hover: CONFIG.DND5E.proficiencyLevels[entry.value],
      label: (property === "skills") ? CONFIG.DND5E.skills[key]?.label : Trait.keyLabel(key, { trait: "tool" }),
      source: context.source[property]?.[key]
    })).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
  }

  /* -------------------------------------------- */

  /**
   * Prepare spells sections for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {object}
   * @protected
   */
  _prepareSpellbook(context) {
    const spellbook = {};
    const columns = customElements.get(this.options.elements.inventory).mapColumns([
      "school", "time", "range", "target", "roll", { id: "uses", order: 650, priority: 300 },
      { id: "formula", priority: 200 }, "controls"
    ]);

    /**
     * Register a section in the spellbook.
     * @param {string} key                  The section's unique identifier.
     * @param {number} [level]              The level of spells in this section. Only relevant for spellcasting methods
     *                                      that provide multi-level slots.
     * @param {SpellcastingModel} [config]  The spellcasting model, if any.
     */
    const registerSection = (key, level, config) => {
      level = config?.slots ? level : 1;
      if ( key in spellbook ) return;
      const label = config?.getLabel({ level }) ?? game.i18n.localize("DND5E.CAST.SECTIONS.Spellbook");
      const method = config?.key ?? key;
      const order = level === 0 ? 0 : (config?.order ?? 1000);
      const usesSlots = config?.slots && level;
      const section = spellbook[key] = {
        label, columns, order, usesSlots,
        id: method,
        slot: key,
        items: [],
        minWidth: 220,
        draggable: true,
        dataset: { level, method, type: "spell" }
      };
      if ( !usesSlots ) return;
      const spells = foundry.utils.getProperty(this.actor.system.spells, key);
      const maxSlots = spells.override ?? spells.max ?? 0;
      section.pips = Array.fromRange(Math.max(maxSlots, spells.value ?? 0), 1).map(n => {
        const filled = spells.value >= n;
        const temp = n > maxSlots;
        const label = temp
          ? game.i18n.localize("DND5E.SpellSlotTemporary")
          : filled
            ? game.i18n.format(`DND5E.SpellSlotN.${getPluralRules({ type: "ordinal" }).select(n)}`, { n })
            : game.i18n.localize("DND5E.SpellSlotExpended");
        const classes = ["pip"];
        if ( filled ) classes.push("filled");
        if ( temp ) classes.push("tmp");
        return { n, label, filled, tooltip: label, classes: classes.join(" ") };
      });
    };

    // Register sections for the available spellcasting methods this character has.
    for ( const spellcasting of Object.values(CONFIG.DND5E.spellcasting) ) {
      const levels = spellcasting.getAvailableLevels?.(this.actor) ?? [];
      if ( !levels.length ) continue;
      if ( spellcasting.cantrips ) registerSection("spell0", 0, CONFIG.DND5E.spellcasting.spell);
      levels.forEach(l => registerSection(spellcasting.getSpellSlotKey(l), l, spellcasting));
    }

    // Iterate over every spell item, adding spells to the spellbook by section
    (context.itemCategories.spells ?? []).forEach(spell => {
      let method = spell.system.method;
      if ( !(method in CONFIG.DND5E.spellcasting) ) method = "innate";
      const spellcasting = CONFIG.DND5E.spellcasting[method];
      const level = spell.system.level || 0;
      method = spellcasting?.getSpellSlotKey?.(level) ?? method;

      // Spells from items
      if ( spell.getFlag("dnd5e", "cachedFor") ) {
        method = "item";
        if ( !spell.system.linkedActivity?.displayInSpellbook ) return;
        registerSection(method);
      }

      // Sections for higher-level spells which the caster does not have any slots for.
      else registerSection(method, level, spellcasting);

      // Add the spell to the relevant heading
      spellbook[method].items.push(spell);
    });

    // Sort the spellbook by section level
    return spellbook;
  }

  /* -------------------------------------------- */

  /**
   * Prepare actor traits for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {Record<string, object[]>}
   * @protected
   */
  _prepareTraits(context) {
    const traits = {};
    for ( const [trait, config] of Object.entries(CONFIG.DND5E.traits) ) {
      const key = config.actorKeyPath ?? `system.traits.${trait}`;
      const data = foundry.utils.deepClone(foundry.utils.getProperty(this.actor, key));
      if ( ["dm", "languages"].includes(trait) || !data ) continue;

      let values = data.value;
      if ( !values ) values = [];
      else if ( values instanceof Set ) values = Array.from(values);
      else if ( !Array.isArray(values) ) values = [values];
      values = values.map(key => {
        const value = { key, label: Trait.keyLabel(key, { trait }) ?? key };
        const icons = value.icons = [];
        if ( data.bypasses?.size && CONFIG.DND5E.damageTypes[key]?.isPhysical ) icons.push(...data.bypasses.map(p => {
          const type = CONFIG.DND5E.itemProperties[p]?.label;
          return { icon: p, label: game.i18n.format("DND5E.DamagePhysicalBypassesShort", { type }) };
        }));
        return value;
      });
      if ( data.custom ) splitSemicolons(data.custom).forEach(label => values.push({ label }));
      if ( values.length ) traits[trait] = values;
    }

    // If petrified, display "All Damage" instead of all damage types separately
    if ( this.document.hasConditionEffect("petrification") ) {
      traits.dr = [{ label: game.i18n.localize("DND5E.DamageAll") }];
    }

    // Combine damage & condition immunities in play mode.
    if ( (this._mode === this.constructor.MODES.PLAY) && traits.ci ) {
      traits.di ??= [];
      traits.di.push(...traits.ci);
      delete traits.ci;
    }

    // Prepare damage modifications
    const dm = this.actor.system.traits?.dm;
    if ( dm ) {
      const rollData = this.actor.getRollData({ deterministic: true });
      const values = Object.entries(dm.amount).map(([k, v]) => {
        const total = simplifyBonus(v, rollData);
        if ( !total ) return null;
        const value = {
          label: `${CONFIG.DND5E.damageTypes[k]?.label ?? k} ${formatNumber(total, { signDisplay: "always" })}`,
          color: total > 0 ? "maroon" : "green"
        };
        const icons = value.icons = [];
        if ( dm.bypasses.size && CONFIG.DND5E.damageTypes[k]?.isPhysical ) icons.push(...dm.bypasses.map(p => {
          const type = CONFIG.DND5E.itemProperties[p]?.label;
          return { icon: p, label: game.i18n.format("DND5E.DamagePhysicalBypassesShort", { type }) };
        }));
        return value;
      }).filter(f => f);
      if ( values.length ) traits.dm = values;
    }

    // Prepare languages
    const languages = this.actor.system.traits?.languages?.labels;
    if ( languages?.languages?.length ) traits.languages = languages.languages.map(label => ({ label }));
    for ( const [key, { label }] of Object.entries(CONFIG.DND5E.communicationTypes) ) {
      const data = this.actor.system.traits?.languages?.communication?.[key];
      if ( !data?.value ) continue;
      traits.languages ??= [];
      traits.languages.push({ label, value: data.value });
    }

    // Display weapon masteries
    for ( const key of this.actor.system.traits?.weaponProf?.mastery?.value ?? [] ) {
      let value = traits.weapon?.find(w => w.key === key);
      if ( !value ) {
        value = { key, label: Trait.keyLabel(key, { trait: "weapon" }) ?? key, icons: [] };
        traits.weapon ??= [];
        traits.weapon.push(value);
      }
      value.icons.push({ icon: "mastery", label: game.i18n.format("DND5E.WEAPON.Mastery.Label") });
    }

    return traits;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderFrame(options) {
    const html = await super._renderFrame(options);

    // Preparation warnings
    const warnings = document.createElement("button");
    warnings.type = "button";
    warnings.classList.add(
      "header-control", "preparation-warnings", "icon", "fa-solid", "fa-triangle-exclamation"
    );
    Object.assign(warnings.dataset, { action: "openWarnings", tooltip: "Warnings", tooltipDirection: "DOWN" });
    warnings.setAttribute("aria-label", game.i18n.localize("Warnings"));
    html.querySelector(".window-header .window-subtitle").after(warnings);

    return html;
  }

  /* -------------------------------------------- */
  /*  Item Preparation Helpers                    */
  /* -------------------------------------------- */

  /**
   * Place an item into specific categories.
   * @param {Item5e} item    Item being prepared for display.
   * @returns {Set<string>}  Names of categories into which to place item.
   * @protected
   */
  _assignItemCategories(item) {
    if ( item.type === "container" ) return new Set(["containers", "inventory"]);
    if ( item.type === "spell" ) return new Set(["spells"]);
    if ( "inventorySection" in item.system.constructor ) return new Set(["inventory"]);
    return new Set(["features"]);
  }

  /* -------------------------------------------- */

  /**
   * Prepare specific activity's context.
   * @param {Activity} activity  Activity being prepared for display.
   * @returns {object}
   * @protected
   */
  _prepareActivity(activity) {
    let { _id, activation, img, labels, name, range, save, uses } = activity.prepareSheetContext();

    // Activation
    const activationAbbr = {
      action: "DND5E.ActionAbbr",
      bonus: "DND5E.BonusActionAbbr",
      reaction: "DND5E.ReactionAbbr",
      minute: "DND5E.TimeMinuteAbbr",
      hour: "DND5E.TimeHourAbbr",
      day: "DND5E.TimeDayAbbr"
    }[activation?.type || ""];

    // To Hit
    const toHit = parseInt(labels.toHit);

    // Limited Uses
    uses = { ...(uses ?? {}) };
    uses.hasRecharge = uses.max && (uses.recovery?.[0]?.period === "recharge");
    uses.isOnCooldown = uses.hasRecharge && (uses.value < 1);
    uses.hasUses = uses.max;
    uses.prop = "uses.value";

    return {
      _id, labels, name, range, uses,
      activation: activationAbbr
        ? `${activation.value ?? ""}${game.i18n.localize(activationAbbr)}`
        : labels.activation,
      icon: {
        src: img,
        svg: img.endsWith(".svg")
      },
      isSpell: activity.item.type === "spell",
      save: save ? {
        ...save,
        ability: save.ability?.size
          ? save.ability.size === 1
            ? CONFIG.DND5E.abilities[save.ability.first()]?.abbreviation
            : game.i18n.localize("DND5E.AbbreviationDC")
          : null
      } : null,
      toHit: Number.isNaN(toHit) ? null : toHit
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare specific item's context.
   * @param {Item5e} item  Item being prepared for display.
   * @param {object} ctx   Item specific context.
   * @protected
   */
  _prepareItem(item, ctx) {
    ctx.groups = {};

    // Activities
    ctx.activities = item.system.activities
      ?.filter(a => a.canUse)
      ?.map(this._prepareActivity.bind(this));

    // Concentration
    if ( this._concentration.items.has(item) ) ctx.concentration = true;

    // To Hit
    const toHit = parseInt(item.labels.modifier);
    ctx.toHit = item.hasAttack && !isNaN(toHit) ? toHit : null;

    // Save
    ctx.save = { ...item.system.activities?.getByType("save")[0]?.save };
    ctx.save.ability = ctx.save.ability?.size ? ctx.save.ability.size === 1
      ? CONFIG.DND5E.abilities[ctx.save.ability.first()]?.abbreviation
      : game.i18n.localize("DND5E.AbbreviationDC") : null;

    // Linked Uses
    const cachedFor = fromUuidSync(item.flags.dnd5e?.cachedFor, { relative: this.actor, strict: false });
    if ( cachedFor ) {
      const targetItemUses = cachedFor.consumption?.targets.find(t => t.type === "itemUses");
      ctx.linkedUses = cachedFor.consumption?.targets.find(t => t.type === "activityUses")
        ? cachedFor.uses : targetItemUses
          ? (this.actor.items.get(targetItemUses.target) ?? cachedFor.item).system.uses : null;
    }
    ctx.uses = { ...(item.system.uses ?? {}) };
    ctx.uses.hasRecharge = item.hasRecharge;
    ctx.uses.hasUses = item.hasLimitedUses;
    ctx.uses.isOnCooldown = item.isOnCooldown;
    ctx.uses.prop = "system.uses.value";
  }

  /* -------------------------------------------- */

  /**
   * Prepare context for a feature. Called in addition to the standard `_prepareItem` for this item.
   * @param {Item5e} item  Item being prepared for display.
   * @param {object} ctx   Item specific context.
   * @protected
   */
  async _prepareItemFeature(item, ctx) {
    // Classes & Subclasses
    if ( ["class", "subclass"].includes(item.type) ) {
      ctx.prefixedImage = item.img ? foundry.utils.getRoute(item.img) : null;
      if ( item.type === "class" ) ctx.availableLevels = Array.fromRange(CONFIG.DND5E.maxLevel, 1).map(level => {
        const value = level - item.system.levels;
        const label = value ? `${level} (${formatNumber(value, { signDisplay: "always" })})` : `${level}`;
        return { label, value, disabled: value > (CONFIG.DND5E.maxLevel - (this.actor.system.details?.level ?? 0)) };
      });
    }

    ctx.subtitle = [item.system.type?.label, item.isActive ? item.labels.activation : null].filterJoin(" &bull; ");
  }

  /* -------------------------------------------- */

  /**
   * Prepare context for a physical item. Called in addition to the standard `_prepareItem` for this item.
   * @param {Item5e} item  Item being prepared for display.
   * @param {object} ctx   Item specific context.
   * @protected
   */
  async _prepareItemPhysical(item, ctx) {
    // Attuned
    if ( ctx.attunement ) {
      ctx.attunement.applicable = true;
      ctx.attunement.disabled = !item.isOwner;
      ctx.attunement.cls = ctx.attunement.cls === "attuned" ? "active" : "";
    }
    else ctx.attunement = { applicable: false };

    // Equipped
    if ( "equipped" in item.system ) ctx.equip = {
      applicable: true,
      cls: item.system.equipped ? "active" : "",
      title: `DND5E.${item.system.equipped ? "Equipped" : "Unequipped"}`,
      disabled: !item.isOwner
    };
    else ctx.equip = { applicable: false };

    // Subtitles
    ctx.subtitle = [item.system.type?.label, item.isActive ? item.labels.activation : null].filterJoin(" &bull; ");

    // Weight
    ctx.totalWeight = item.system.totalWeight?.toNearest(0.1);

    // Grouping
    Object.assign(ctx.groups, { contents: "contents", type: item.type });
  }

  /* -------------------------------------------- */

  /**
   * Prepare context for a spell. Called in addition to the standard `_prepareItem` for this item.
   * @param {Item5e} item  Item being prepared for display.
   * @param {object} ctx   Item specific context.
   * @protected
   */
  async _prepareItemSpell(item, ctx) {
    const linked = item.system.linkedActivity?.item;

    // Activation
    const cost = item.system.activation?.value ?? "";
    const abbr = {
      action: "DND5E.ActionAbbr",
      bonus: "DND5E.BonusActionAbbr",
      reaction: "DND5E.ReactionAbbr",
      minute: "DND5E.TimeMinuteAbbr",
      hour: "DND5E.TimeHourAbbr",
      day: "DND5E.TimeDayAbbr"
    }[item.system.activation.type];
    ctx.activation = abbr ? `${cost}${game.i18n.localize(abbr)}` : item.labels.activation;

    // Range
    const units = item.system.range?.units;
    if ( units && (units !== "none") ) {
      if ( units in CONFIG.DND5E.movementUnits ) ctx.range = {
        distance: true,
        value: item.system.range.value,
        unit: CONFIG.DND5E.movementUnits[units].abbreviation,
        parts: formatLength(item.system.range.value, units, { parts: true })
      };
      else ctx.range = { distance: false };
    }

    // Prepared
    const { method, prepared } = item.system;
    const config = CONFIG.DND5E.spellcasting[method];
    if ( config?.prepares && !linked ) {
      const isAlways = prepared === CONFIG.DND5E.spellPreparationStates.always.value;
      ctx.preparation = {
        applicable: true,
        disabled: !item.isOwner || isAlways,
        cls: prepared ? "active" : "",
        icon: `<i class="fa-${prepared ? "solid" : "regular"} fa-${isAlways ? "certificate" : "sun"}" inert></i>`,
        title: CONFIG.DND5E.spellPreparationStates[isAlways ? "always" : prepared ? "prepared" : "unprepared"].label
      };
    }
    else ctx.preparation = { applicable: false };

    // Subtitle
    ctx.subtitle = [
      linked ? linked.name : this.actor.classes[item.system.sourceClass]?.name,
      item.labels.components.vsm
    ].filterJoin(" &bull; ");
  }

  /* -------------------------------------------- */

  /**
   * Augment inventory display with attunement indicator.
   * @param {ApplicationRenderContext} context
   * @param {ApplicationRenderOptions} options
   * @protected
   */
  _renderAttunement(context, options) {
    const { attunement } = context.system.attributes;
    const element = document.createElement("div");
    element.classList.add("attunement");
    element.innerHTML = `
      <i class="fa-solid fa-sun" data-tooltip="DND5E.Attunement"
         aria-label="${game.i18n.localize("DND5E.Attunement")}"></i>
      <span class="value"></span>
      <span class="separator">&sol;</span>
    `;
    element.querySelector(".value").append(attunement.value);
    if ( context.editable ) {
      const input = document.createElement("input");
      Object.assign(input, {
        type: "number", name: "system.attributes.attunement.max", className: "max", min: "0", step: "1",
        value: context.source.attributes.attunement.max
      });
      element.append(input);
    } else {
      element.insertAdjacentHTML("beforeend", '<span class="max"></span>');
      element.querySelector(".max").append(attunement.max);
    }
    this.element.querySelector('[data-application-part="inventory"] .middle').append(element);
  }

  /* -------------------------------------------- */

  /**
   * Augment spellbook display.
   * @param {ApplicationRenderContext} context
   * @param {ApplicationRenderOptions} options
   * @protected
   */
  _renderSpellbook(context, options) {
    for ( const { usesSlots, pips, slot, dataset } of Object.values(context.spellbook) ) {
      if ( !usesSlots ) continue;
      const query = `[data-application-part="spells"] .items-section[data-level="${
        dataset.level}"][data-method="${dataset.method}"] .items-header`;
      const header = this.element.querySelector(query);
      if ( !header ) continue;
      if ( context.editable ) {
        const config = document.createElement("button");
        Object.assign(config, {
          type: "button", className: "unbutton config-button", ariaLabel: game.i18n.localize("DND5E.SpellSlotsConfig")
        });
        Object.assign(config.dataset, {
          action: "showConfiguration", config: "spellSlots", tooltip: "DND5E.SpellSlotsConfig"
        });
        config.insertAdjacentHTML("afterbegin", '<i class="fa-solid fa-cog" inert></i>');
        header.append(config);
        continue;
      }
      const slots = document.createElement("div");
      slots.classList.add("pips");
      slots.dataset.prop = `system.spells.${slot}.value`;
      pips.forEach(({ classes, n, tooltip, label, filled}) => {
        const button = document.createElement("button");
        Object.assign(button, { type: "button", className: classes, ariaLabel: label, ariaPressed: filled });
        Object.assign(button.dataset, { n, tooltip, action: "togglePip" });
        const icon = '<dnd5e-icon src="systems/dnd5e/icons/svg/spell-slot.svg"></dnd5e-icon>';
        button.insertAdjacentHTML("afterbegin", icon);
        slots.append(button);
      });
      header.insertAdjacentElement("afterend", slots);
    }
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /**
   * Apply a property attribution tooltip to an element.
   * @param {HTMLElement} element  The element to get the tooltip.
   * @protected
   */
  _applyTooltips(element) {
    if ( "tooltip" in element.dataset ) return;
    const uuid = element.dataset.referenceTooltip ?? this.actor.uuid;
    element.dataset.tooltip = `
      <section class="loading" data-uuid="${uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>
    `;
    if ( element.dataset.attribution ) element.dataset.tooltipClass = "property-attribution";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);

    let mainContent = this.element.querySelector(".main-content");
    if ( !mainContent && this.element.querySelector(".tab-body") ) {
      mainContent = document.createElement("div");
      mainContent.classList.add("main-content");
      mainContent.dataset.containerId = "main";
      this.element.querySelector(".tab-body").after(mainContent);
    }
    if ( mainContent ) {
      // Move .main-content into .sheet-body
      const sheetBody = document.createElement("div");
      sheetBody.classList.add("sheet-body");
      mainContent.after(sheetBody);
      sheetBody.replaceChildren(mainContent);

      // Move .tab-body into .main-content
      const tabBody = this.element.querySelector(".tab-body");
      if ( tabBody ) mainContent.append(tabBody);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onPosition(position) {
    super._onPosition(position);
    this._saveSheetPosition ??= foundry.utils.debounce(this.#saveSheetSize, 250);
    this._saveSheetPosition(position);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Apply attribution & reference tooltips
    this.element.querySelectorAll("[data-attribution],[data-reference-tooltip]").forEach(e => this._applyTooltips(e));

    // Collapse sidebar
    if ( this.tabGroups.primary ) {
      const sidebarCollapsed = !!game.user.getFlag("dnd5e", this._sidebarCollapsedKeyPath);
      this.element.classList.toggle("sidebar-collapsed", sidebarCollapsed);
    }

    // Play video elements.
    this.element.querySelectorAll("video").forEach(v => {
      if ( v.paused ) v.play();
    });

    // Display warnings
    const warnings = this.element.querySelector(".window-header .preparation-warnings");
    warnings?.toggleAttribute("hidden", (!game.user.isGM && this.actor.limited)
      || !this.actor._preparationWarnings?.length);

    if ( this.isEditable ) {
      // Class level changes
      for ( const element of this.element.querySelectorAll(".level-selector") ) {
        element.addEventListener("change", event => this.#changeLevel(event));
      }

      // Handle delta inputs
      this.element.querySelectorAll('input[type="text"][data-dtype="Number"]')
        .forEach(i => i.addEventListener("change", this._onChangeInputDelta.bind(this)));

      // Meter editing
      for ( const meter of this.element.querySelectorAll('.meter > [role="meter"]:has(> input)') ) {
        meter.addEventListener("click", event => this.#toggleMeter(event, true));
        meter.querySelector(":scope > input")?.addEventListener("blur", event => this.#toggleMeter(event, false));
      }
    }

    // Prevent default middle-click scrolling when locking a tooltip
    this.element.addEventListener("pointerdown", event => {
      if ( (event.button === 1) && document.getElementById("tooltip")?.classList.contains("active") ) {
        event.preventDefault();
      }
    });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  _addDocument(event, target) {
    if ( this.tabGroups.primary === "effects" ) return ActiveEffect.implementation.create({
      name: game.i18n.localize("DND5E.EffectNew"),
      icon: "icons/svg/aura.svg"
    }, { parent: this.actor, renderSheet: true });

    const types = this._addDocumentItemTypes(this.tabGroups.primary)
      .filter(type => !CONFIG.Item.dataModels[type].metadata?.singleton || !this.actor.itemTypes[type].length);
    if ( types.length > 1 ) return Item.implementation.createDialog({}, {
      parent: this.actor, pack: this.actor.pack, types
    });

    const type = types[0];
    return Item.implementation.create({
      type, name: game.i18n.format("DOCUMENT.New", { type: game.i18n.format(CONFIG.Item.typeLabels[type]) })
    }, { parent: this.actor, renderSheet: true });
  }

  /* -------------------------------------------- */

  /**
   * Determine the types of items that can be added depending on the current tab.
   * @param {string} tab  Currently viewed tab.
   * @returns {string[]}  Types of items to allow to create.
   */
  _addDocumentItemTypes(tab) {
    switch ( tab ) {
      case "features": return ["feat", "race", "background", "class", "subclass"];
      case "inventory": return Object.entries(CONFIG.Item.dataModels)
        .filter(([type, model]) => ("inventorySection" in model) && (type !== "backpack"))
        .map(([type]) => type);
      case "spells": return ["spell"];
      default: return [];
    }
  }

  /* -------------------------------------------- */

  /**
   * Respond to a new level being selected from the level selector.
   * @param {Event} event  The originating change.
   * @returns {Promise<any>}
   * @private
   */
  async #changeLevel(event) {
    const delta = Number(event.target.value);
    const classId = event.target.closest("[data-item-id]")?.dataset.itemId;
    if ( !delta || !classId ) return;
    const classItem = this.actor.items.get(classId);
    if ( !game.settings.get("dnd5e", "disableAdvancements") ) {
      const manager = AdvancementManager.forLevelChange(this.actor, classId, delta);
      if ( manager.steps.length ) {
        if ( delta > 0 ) return manager.render({ force: true });
        try {
          const shouldRemoveAdvancements = await AdvancementConfirmationDialog.forLevelDown(classItem);
          if ( shouldRemoveAdvancements ) return manager.render({ force: true });
        }
        catch(err) {
          return;
        }
      }
    }
    classItem.update({ "system.levels": classItem.system.levels + delta });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  changeTab(tab, group, options) {
    super.changeTab(tab, group, options);
    if ( group !== "primary" ) return;

    // Adjust create child tooltip
    const createChild = this.element.querySelector(".create-child");
    createChild?.setAttribute("aria-label", game.i18n.format("SIDEBAR.Create", {
      type: game.i18n.localize(`DOCUMENT.${tab === "effects" ? "ActiveEffect" : "Item"}`)
    }));

    // Toggle sidebar
    const sidebarCollapsed = game.user.getFlag("dnd5e", this._sidebarCollapsedKeyPath);
    if ( sidebarCollapsed !== undefined ) this._toggleSidebar(sidebarCollapsed);
  }

  /* -------------------------------------------- */

  /**
   * Handle following a warning link.
   * @this {BaseActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #inspectWarning(event, target) {
    if ( this._inspectWarning(event, target) === false ) return;
    switch ( target.dataset.target ) {
      case "armor":
        new ArmorClassConfig({ document: this.actor }).render({ force: true });
        break;
      default:
        const item = await fromUuid(target.dataset.target);
        item?.sheet.render({ force: true });
        break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle following a warning link.
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   * @returns {any}               Return `false` to prevent default behavior.
   * @protected
   */
  _inspectWarning(event, target) {}

  /* -------------------------------------------- */

  /**
   * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs.
   * @param {Event} event  Triggering event.
   * @protected
   */
  _onChangeInputDelta(event) {
    const input = event.target;
    const target = this.actor.items.get(input.closest("[data-item-id]")?.dataset.itemId) ?? this.actor;
    const { activityId } = input.closest("[data-activity-id]")?.dataset ?? {};
    const activity = target?.system.activities?.get(activityId);
    const result = parseInputDelta(input, activity ?? target);
    if ( (result !== undefined) && input.dataset.name ) {
      event.stopPropagation();
      // Special case handling for Item uses.
      if ( input.dataset.name === "system.uses.value" ) {
        target.update({ "system.uses.spent": target.system.uses.max - result });
      } else if ( activity && (input.dataset.name === "uses.value") ) {
        target.updateActivity(activityId, { "uses.spent": activity.uses.max - result });
      }
      else target.update({ [input.dataset.name]: result });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle editing an image via the file browser.
   * @this {BaseActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   * @returns {Promise<void>}
   */
  static async #onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document._source, attr);
    const defaultArtwork = this.document.constructor.getDefaultArtwork?.(this.document._source) ?? {};
    const defaultImage = foundry.utils.getProperty(defaultArtwork, attr);
    const fp = new CONFIG.ux.FilePicker({
      current,
      type: target.dataset.type,
      redirectToRoot: defaultImage ? [defaultImage] : [],
      callback: path => {
        const isVideo = foundry.helpers.media.VideoHelper.hasVideoExtension(path);
        if ( ((target instanceof HTMLVideoElement) && isVideo) || ((target instanceof HTMLImageElement) && !isVideo) ) {
          target.src = path;
        } else {
          const repl = document.createElement(isVideo ? "video" : "img");
          Object.assign(repl.dataset, target.dataset);
          if ( isVideo ) Object.assign(repl, {
            autoplay: true, muted: true, disablePictureInPicture: true, loop: true, playsInline: true
          });
          repl.src = path;
          target.replaceWith(repl);
        }
        this._onEditPortrait(attr, path);
      },
      position: {
        top: this.position.top + 40,
        left: this.position.left + 10
      }
    });
    await fp.browse();
  }

  /* -------------------------------------------- */

  /**
   * Handle editing the portrait.
   * @param {string} target  The target property being edited.
   * @param {string} path    The image or video path.
   * @protected
   */
  async _onEditPortrait(target, path) {
    if ( target.startsWith("token.") ) await this.token.update({ [target.slice(6)]: path });
    else {
      const submit = new Event("submit", { cancelable: true });
      this.form.dispatchEvent(submit);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle opening the preparation warnings dialog.
   * @this {BaseActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #openWarnings(event, target) {
    event.stopImmediatePropagation();
    const { top, left, height } = event.target.getBoundingClientRect();
    const { clientWidth } = document.documentElement;
    const dialog = this.form.querySelector("dialog.warnings");
    Object.assign(dialog.style, { top: `${top + height}px`, left: `${Math.min(left - 16, clientWidth - 300)}px` });
    dialog.showModal();
    dialog.addEventListener("click", () => dialog.close(), { once: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle resting the actor.
   * @this {BaseActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #rest(event, target) {
    if ( target.dataset.type === "short" ) this.actor.shortRest();
    else this.actor.longRest();
  }

  /* -------------------------------------------- */

  /**
   * Handle restoring a transformed action.
   * @this {BaseActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #restoreTransformation(event, target) {
    this.actor.revertOriginalForm();
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling from the sheet.
   * @this {BaseActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   * @returns {any}
   */
  static #roll(event, target) {
    if ( !target.classList.contains("rollable") ) return;
    if ( this._roll(event, target) === false ) return;
    switch ( target.dataset.type ) {
      case "ability":
        const ability = target.closest("[data-ability]")?.dataset.ability;
        if ( ability === "concentration" ) return this.actor.rollConcentration({ event, legacy: false });
        else if ( target.classList.contains("saving-throw") ) return this.actor.rollSavingThrow({ ability, event });
        else return this.actor.rollAbilityCheck({ ability, event });
      case "deathSave":
        return this.actor.rollDeathSave({ event, legacy: false });
      case "initiative":
        return this.actor.rollInitiativeDialog({ event });
      case "skill":
        return this.actor.rollSkill({ event, skill: target.closest("[data-key]")?.dataset.key });
      case "tool":
        return this.actor.rollToolCheck({ event, tool: target.closest("[data-key]")?.dataset.key });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling from the sheet.
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   * @returns {any}               Return `false` to prevent default behavior.
   * @protected
   */
  _roll(event, target) {}

  /* -------------------------------------------- */

  /**
   * Save the sheet's current size to preferences.
   * @param {ApplicationPosition} position
   */
  #saveSheetSize(position) {
    const { width, height } = position;
    const prefs = {};
    if ( width !== "auto" ) prefs.width = width;
    if ( height !== "auto" ) prefs.height = height;
    if ( foundry.utils.isEmpty(prefs) ) return;
    const key = `${this.actor.type}${this.actor.limited ? ":limited": ""}`;
    game.user.setFlag("dnd5e", `sheetPrefs.${key}`, prefs);
  }

  /* -------------------------------------------- */

  /**
   * Handle showing the Item's art.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #showArtwork(event, target) {
    new foundry.applications.apps.ImagePopout({
      src: target.getAttribute("src"),
      uuid: this.actor.uuid,
      window: { title: this.actor.name }
    }).render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle opening a configuration application.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   * @returns {any}
   */
  static #showConfiguration(event, target) {
    if ( this._showConfiguration(event, target) === false ) return;
    const config = { document: this.actor };

    if ( target.dataset.trait ) {
      config.trait = target.dataset.trait;
      if ( config.trait === "ci" ) config.position = { width: 400 };
      switch ( config.trait ) {
        case "di":
        case "dm":
        case "dr":
        case "dv": return new DamagesConfig(config).render({ force: true });
        case "languages": return new LanguagesConfig(config).render({ force: true });
        case "tool": return new ToolsConfig(config).render({ force: true });
        case "weapon": return new WeaponsConfig(config).render({ force: true });
        default: return new TraitsConfig(config).render({ force: true });
      }
    }

    switch ( target.dataset.config ) {
      case "ability":
        const ability = target.closest("[data-ability]")?.dataset.ability;
        if ( ability === "concentration" ) return new ConcentrationConfig(config).render({ force: true });
        return new AbilityConfig({ ...config, key: ability }).render({ force: true });
      case "armorClass":
        return new ArmorClassConfig(config).render({ force: true });
      case "creatureType":
        return new CreatureTypeConfig(this.actor.system.details.race?.id
          ? { document: this.actor.system.details.race, keyPath: "type" } : config).render({ force: true });
      case "death":
        return new DeathConfig(config).render({ force: true });
      case "hitDice":
        return new HitDiceConfig(config).render({ force: true });
      case "hitPoints":
        return new HitPointsConfig(config).render({ force: true });
      case "initiative":
        return new InitiativeConfig(config).render({ force: true });
      case "movement":
      case "senses":
        return new MovementSensesConfig({ ...config, type: target.dataset.config }).render({ force: true });
      case "skill":
        const skill = target.closest("[data-key]").dataset.key;
        return new SkillToolConfig({ ...config, trait: "skills", key: skill }).render({ force: true });
      case "tool":
        const tool = target.closest("[data-key]").dataset.key;
        return new SkillToolConfig({ ...config, trait: "tool", key: tool }).render({ force: true });
      case "skills":
        return new SkillsConfig(config).render({ force: true });
      case "source":
        return new SourceConfig(config).render({ force: true });
      case "spellSlots":
        return new SpellSlotsConfig(config).render({ force: true });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle opening a configuration application.
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   * @returns {any}               Return `false` to prevent default behavior.
   * @abstract
   */
  _showConfiguration(event, target) {}

  /* -------------------------------------------- */

  /**
   * Toggle editing hit points.
   * @param {PointerEvent} event  The triggering event.
   * @param {boolean} edit        Whether to toggle to the edit state.
   */
  #toggleMeter(event, edit) {
    const target = event.currentTarget.closest('[role="meter"]');
    if ( event.target.nodeName === "BUTTON" ) return;
    const label = target.querySelector(":scope > .label");
    const input = target.querySelector(":scope > input");
    label.hidden = edit;
    input.hidden = !edit;
    if ( edit ) input.focus();
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling a pip on the character sheet.
   * @this {BaseActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #togglePip(event, target) {
    const n = Number(target.closest("[data-n]")?.dataset.n);
    const prop = target.dataset.prop ?? target.closest("[data-prop]")?.dataset.prop;
    if ( !Number.isNumeric(n) || !prop ) return;
    let value = foundry.utils.getProperty(this.actor, prop);
    if ( (value === n) && prop.endsWith(".spent") ) value++;
    else if ( value === n ) value--;
    else value = n;
    this.submit({ updateData: { [prop]: value } });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the sidebar collapsed state.
   * @this {BaseActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #toggleSidebar(event, target) {
    const collapsed = this._toggleSidebar();
    game.user.setFlag("dnd5e", this._sidebarCollapsedKeyPath, collapsed);
  }

  /* -------------------------------------------- */

  /**
   * Toggle the sidebar collapsed state.
   * @param {boolean} [collapsed]  Force a particular collapsed state.
   * @returns {boolean}            The new collapsed state.
   * @protected
   */
  _toggleSidebar(collapsed) {
    this.element.classList.toggle("sidebar-collapsed", collapsed);
    collapsed = this.element.classList.contains("sidebar-collapsed");
    const collapser = this.form.querySelector(".sidebar-collapser");
    if ( !collapser ) return collapsed;
    const icon = collapser.querySelector("i");
    collapser.dataset.tooltip = `JOURNAL.View${collapsed ? "Expand" : "Collapse"}`;
    collapser.setAttribute("aria-label", game.i18n.localize(collapser.dataset.tooltip));
    icon.classList.remove("fa-caret-left", "fa-caret-right");
    icon.classList.add(`fa-caret-${collapsed ? "right" : "left"}`);
    return collapsed;
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);

    // Remove any flags that are false-ish
    for ( const [key, value] of Object.entries(submitData.flags?.dnd5e ?? {}) ) {
      if ( value ) continue;
      delete submitData.flags.dnd5e[key];
      if ( foundry.utils.hasProperty(this.document._source, `flags.dnd5e.${key}`) ) {
        submitData.flags.dnd5e[`-=${key}`] = null;
      }
    }

    // Correctly process data-edit video elements.
    form.querySelectorAll("video[data-edit]").forEach(v => {
      foundry.utils.setProperty(submitData, v.dataset.edit, v.src);
    });

    // Prevent wildcard textures from being clobbered.
    const proto = submitData.prototypeToken;
    if ( proto ) {
      const randomImg = proto.randomImg ?? this.actor.prototypeToken.randomImg;
      if ( randomImg ) delete submitData.prototypeToken;
    }

    return submitData;
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /**
   * Handling beginning a drag-drop operation on an Activity.
   * @param {DragEvent} event  The originating drag event.
   * @protected
   */
  _onDragActivity(event) {
    const { itemId } = event.target.closest("[data-item-id]").dataset;
    const { activityId } = event.target.closest("[data-activity-id]").dataset;
    const activity = this.actor.items.get(itemId)?.system.activities?.get(activityId);
    if ( activity ) event.dataTransfer.setData("text/plain", JSON.stringify(activity.toDragData()));
  }

  /* -------------------------------------------- */

  /**
   * Handling beginning a drag-drop operation on an Active Effect.
   * @param {DragEvent} event  The originating drag event.
   * @protected
   */
  _onDragEffect(event) {
    const collection = this.actor.items.get(event.currentTarget.dataset.parentId)?.effects ?? this.actor.effects;
    const effect = collection.get(event.currentTarget.dataset.effectId);
    if ( effect ) event.dataTransfer.setData("text/plain", JSON.stringify(effect.toDragData()));
  }

  /* -------------------------------------------- */

  /**
   * Handle beginning a drag-drop operation on an Item.
   * @param {DragEvent} event  The originating drag event.
   * @protected
   */
  _onDragItem(event) {
    const { itemId } = event.target.closest("[data-item-id]").dataset;
    const item = this.actor.items.get(itemId);
    if ( item ) event.dataTransfer.setData("text/plain", JSON.stringify(item.toDragData()));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDragStart(event) {
    if ( "link" in event.target.dataset ) return;

    // Add another deferred deactivation to catch the second pointerenter event that seems to be fired on Firefox.
    requestAnimationFrame(() => game.tooltip.deactivate());
    game.tooltip.deactivate();

    const li = event.currentTarget;
    if ( li.dataset.activityId ) return this._onDragActivity(event);
    if ( li.dataset.effectId ) return this._onDragEffect(event);
    if ( li.matches("[data-item-id] > .item-row") ) return this._onDragItem(event);

    super._onDragStart(event);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    event._behavior = this._dropBehavior(event);
    await super._onDrop(event);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropActor(event, actor) {
    const canPolymorph = game.user.isGM || (this.actor.isOwner && game.settings.get("dnd5e", "allowPolymorphing"));
    if ( !canPolymorph || (this.tabGroups.primary === "bastion") ) return;

    // Configure the transformation
    const settings = await TransformDialog.promptSettings(this.actor, actor, {
      transform: { settings: game.settings.get("dnd5e", "transformationSettings") }
    });
    if ( !settings ) return;
    await game.settings.set("dnd5e", "transformationSettings", settings.toObject());

    return this.actor.transformInto(actor, settings);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropItem(event, item) {
    if ( !this.actor.isOwner || (event._behavior === "none") ) return;

    // Handle moving out of container & item sorting
    if ( (event._behavior === "move") && (this.actor.uuid === item.parent?.uuid) ) {
      if ( item.system.container !== null ) await item.update({ "system.container": null });
      return this._onSortItem(event, item);
    }

    return this._onDropCreateItems(event, [item]);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropFolder(event, data) {
    const folder = await Folder.implementation.fromDropData(data);
    if ( !this.actor.isOwner || (event._behavior === "none") || (folder.type !== "Item") ) return;

    const items = await Promise.all(folder.contents.map(async item => {
      if ( !(item instanceof Item) ) item = await fromUuid(item.uuid);
      return item;
    }));
    return this._onDropCreateItems(event, items);
  }

  /* -------------------------------------------- */

  /**
   * Handle the final creation of dropped Item data on the Actor.
   * @param {DragEvent} event             The concluding DragEvent which provided the drop data.
   * @param {Item5e[]} items              The items requested for creation.
   * @param {DropEffectValue} [behavior]  The specific drop behavior.
   * @returns {Promise<Item5e[]>}
   * @protected
   */
  async _onDropCreateItems(event, items, behavior) {
    behavior ??= event._behavior;
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
        return this._onDropSingleItem(event, item);
      }
    });
    const created = await Item5e.createDocuments(toCreate, { pack: this.actor.pack, parent: this.actor, keepId: true });
    if ( behavior === "move" ) items.forEach(i => i.delete({ deleteContents: true }));
    return created;
  }

  /* -------------------------------------------- */

  /**
   * Handles dropping of a single item onto this character sheet.
   * @param {DragEvent} event            The concluding DragEvent which provided the drop data.
   * @param {object} itemData            The item data to create.
   * @returns {Promise<object|boolean>}  The item data to create after processing, or false if the item should not be
   *                                     created or creation has been otherwise handled.
   * @protected
   */
  async _onDropSingleItem(event, itemData) {
    // Check to make sure items of this type are allowed on this actor
    if ( this.constructor.unsupportedItemTypes.has(itemData.type) ) {
      ui.notifications.warn("DND5E.ACTOR.Warning.InvalidItem", {
        format: {
          itemType: game.i18n.localize(CONFIG.Item.typeLabels[itemData.type]),
          actorType: game.i18n.localize(CONFIG.Actor.typeLabels[this.actor.type])
        }
      });
      return false;
    }

    // Create a Consumable spell scroll on the Inventory tab
    if ( (itemData.type === "spell")
      && ((this.tabGroups.primary === "inventory") || (this.actor.type === "vehicle")) ) {
      const scroll = await Item5e.createScrollFromSpell(itemData);
      return scroll?.toObject?.() ?? false;
    }

    // Clean up data
    this._onDropResetData(event, itemData);

    // Stack identical consumables
    const stacked = this._onDropStackConsumables(event, itemData);
    if ( stacked ) return false;

    // Bypass normal creation flow for any items with advancement
    if ( this.actor.system.metadata?.supportsAdvancement && itemData.system.advancement?.length
        && !game.settings.get("dnd5e", "disableAdvancements") ) {
      // Ensure that this item isn't violating the singleton rule
      const dataModel = CONFIG.Item.dataModels[itemData.type];
      const singleton = dataModel?.metadata.singleton ?? false;
      if ( singleton && this.actor.itemTypes[itemData.type].length ) {
        ui.notifications.error("DND5E.ACTOR.Warning.Singleton", {
          format: {
            itemType: game.i18n.localize(CONFIG.Item.typeLabels[itemData.type]),
            actorType: game.i18n.localize(CONFIG.Actor.typeLabels[this.actor.type])
          }
        });
        return false;
      }

      const manager = AdvancementManager.forNewItem(this.actor, itemData);
      if ( manager.steps.length ) {
        manager.render(true);
        return false;
      }
    }

    // Let specific item types apply any changes from a drop event
    CONFIG.Item.dataModels[itemData.type]?.onDropCreate?.(event, this.actor, itemData);

    return itemData;
  }

  /* -------------------------------------------- */

  /**
   * Reset certain pieces of data stored on items when they are dropped onto the actor.
   * @param {DragEvent} event    The concluding DragEvent which provided the drop data.
   * @param {object} itemData    The item data requested for creation. **Will be mutated.**
   */
  _onDropResetData(event, itemData) {
    if ( !itemData.system ) return;
    ["attuned", "equipped", "prepared"].forEach(k => foundry.utils.deleteProperty(itemData.system, k));
  }

  /* -------------------------------------------- */

  /**
   * Stack identical consumables when a new one is dropped rather than creating a duplicate item.
   * @param {DragEvent} event                  The concluding DragEvent which provided the drop data.
   * @param {object} itemData                  The item data requested for creation.
   * @param {object} [options={}]
   * @param {string} [options.container=null]  ID of the container into which this item is being dropped.
   * @returns {Promise<Item5e>|null}           If a duplicate was found, returns the adjusted item stack.
   */
  _onDropStackConsumables(event, itemData, { container=null }={}) {
    const droppedSourceId = itemData._stats?.compendiumSource ?? itemData.flags?.core?.sourceId;
    if ( itemData.type !== "consumable" || !droppedSourceId ) return null;
    const similarItem = this.actor.sourcedItems.get(droppedSourceId, { legacy: false })
      ?.filter(i => (i.system.container === container) && (i.name === itemData.name))?.first();
    if ( !similarItem ) return null;
    return similarItem.update({
      "system.quantity": similarItem.system.quantity + Math.max(itemData.system.quantity, 1)
    });
  }

  /* -------------------------------------------- */
  /*  Filtering                                   */
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
   * @param {Item5e[]} items       The items to be filtered.
   * @param {Set<string>} filters  Filters applied to the item list.
   * @returns {Item5e[]}           Subset of input items limited by the provided filters.
   * @protected
   */
  _filterItems(items, filters) {
    const actions = ["action", "bonus", "reaction", "lair", "legendary"];
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
        if ( item.system.activities.every(a => a.activation?.type !== f) ) return false;
      }

      // Spell-specific filters
      if ( filters.has("ritual") && !item.system.properties?.has("ritual") ) return false;
      if ( filters.has("concentration") && !item.system.properties?.has("concentration") ) return false;
      if ( schoolFilter.size && !schoolFilter.has(item.system.school) ) return false;
      if ( classFilter.size && !classFilter.has(item.system.sourceClass) ) return false;
      if ( filters.has("prepared") ) return item.system.canPrepare && item.system.prepared;

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
  _filterItem(item, filters) {
    /** @import ContainerSheet from "../../item/container-sheet.mjs" */

    /**
     * A hook event that fires when a sheet filters an item.
     * @function dnd5e.filterItem
     * @memberof hookEvents
     * @param {BaseActorSheet|ContainerSheet} sheet     The sheet the item is being rendered on.
     * @param {Item5e} item                             The item being filtered.
     * @param {Set<string>} filters                     Filters applied to the Item.
     * @returns {false|void} Return false to hide the item, otherwise other filters will continue to apply.
     */
    if ( Hooks.call("dnd5e.filterItem", this, item, filters) === false ) return false;
  }

  /* -------------------------------------------- */
  /*  Sorting                                     */
  /* -------------------------------------------- */

  /** @override */
  _sortChildren(collection, mode) {
    switch ( collection ) {
      case "items": return this._sortItems(this.actor.items.contents, mode);
      case "effects": return this._sortEffects(Array.from(this.actor.allApplicableEffects()), mode);
    }
    return [];
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Can an item be expanded on the sheet?
   * @param {Item5e} item  Item on the sheet.
   * @returns {boolean}
   */
  canExpand(item) {
    return !["class", "subclass"].includes(item.type);
  }

  /* -------------------------------------------- */

  /**
   * Control whether the restore transformation button is visible.
   * @this {BaseActorSheet}
   * @returns {boolean}
   */
  static #canRestoreTransformation() {
    return this.isEditable && this.actor.isPolymorphed;
  }
}
