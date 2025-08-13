import { formatNumber } from "../../utils.mjs";
import AdvancementManager from "../advancement/advancement-manager.mjs";
import CompendiumBrowser from "../compendium-browser.mjs";
import ContextMenu5e from "../context-menu.mjs";
import BaseActorSheet from "./api/base-actor-sheet.mjs";
import Item5e from "../../documents/item.mjs";
import * as Trait from "../../documents/actor/trait.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * Extension of base actor sheet for characters.
 */
export default class CharacterActorSheet extends BaseActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      deleteFavorite: CharacterActorSheet.#deleteFavorite,
      deleteOccupant: CharacterActorSheet.#deleteOccupant,
      findItem: CharacterActorSheet.#findItem,
      setSpellcastingAbility: CharacterActorSheet.#setSpellcastingAbility,
      toggleDeathTray: CharacterActorSheet.#toggleDeathTray,
      toggleInspiration: CharacterActorSheet.#toggleInspiration,
      useFacility: CharacterActorSheet.#useFacility,
      useFavorite: CharacterActorSheet.#useFavorite
    },
    classes: ["character", "vertical-tabs"],
    position: {
      width: 800,
      height: 1000
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {
      template: "systems/dnd5e/templates/actors/character-header.hbs"
    },
    sidebar: {
      container: { classes: ["main-content"], id: "main" },
      template: "systems/dnd5e/templates/actors/character-sidebar.hbs"
    },
    details: {
      classes: ["col-2"],
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/character-details.hbs",
      scrollable: [""]
    },
    inventory: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/character-inventory.hbs",
      templates: [
        "systems/dnd5e/templates/inventory/inventory.hbs", "systems/dnd5e/templates/inventory/activity.hbs",
        "systems/dnd5e/templates/inventory/encumbrance.hbs", "systems/dnd5e/templates/inventory/containers.hbs"
      ],
      scrollable: [""]
    },
    features: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/character-features.hbs",
      templates: ["systems/dnd5e/templates/inventory/inventory.hbs", "systems/dnd5e/templates/inventory/activity.hbs"],
      scrollable: [""]
    },
    spells: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/creature-spells.hbs",
      templates: ["systems/dnd5e/templates/inventory/inventory.hbs", "systems/dnd5e/templates/inventory/activity.hbs"],
      scrollable: [""]
    },
    effects: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/actor-effects.hbs",
      scrollable: [""]
    },
    biography: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/character-biography.hbs",
      scrollable: [""]
    },
    bastion: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/character-bastion.hbs",
      scrollable: [""]
    },
    specialTraits: {
      classes: ["flexcol"],
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/creature-special-traits.hbs",
      scrollable: [""]
    },
    abilityScores: {
      template: "systems/dnd5e/templates/actors/character-ability-scores.hbs"
    },
    warnings: {
      template: "systems/dnd5e/templates/actors/parts/actor-warnings-dialog.hbs"
    },
    tabs: {
      id: "tabs",
      classes: ["tabs-right"],
      template: "systems/dnd5e/templates/shared/sidebar-tabs.hbs"
    }
  };

  /* -------------------------------------------- */

  /**
   * Proficiency class names.
   * @enum {string}
   */
  static PROFICIENCY_CLASSES = {
    0: "none",
    0.5: "half",
    1: "full",
    2: "double"
  };

  /* -------------------------------------------- */

  /** @override */
  static TABS = [
    { tab: "details", label: "DND5E.Details", icon: "fas fa-cog" },
    { tab: "inventory", label: "DND5E.Inventory", svg: "systems/dnd5e/icons/svg/backpack.svg" },
    { tab: "features", label: "DND5E.Features", icon: "fas fa-list" },
    { tab: "spells", label: "TYPES.Item.spellPl", icon: "fas fa-book" },
    { tab: "effects", label: "DND5E.Effects", icon: "fas fa-bolt" },
    { tab: "biography", label: "DND5E.Biography", icon: "fas fa-feather" },
    { tab: "bastion", label: "DND5E.Bastion.Label", icon: "fas fa-chess-rook" },
    { tab: "specialTraits", label: "DND5E.SpecialTraits", icon: "fas fa-star" }
  ];

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Whether the user has manually opened the death save tray.
   * @type {boolean}
   * @protected
   */
  _deathTrayOpen = false;

  /* -------------------------------------------- */

  /** @override */
  _filters = {
    features: { name: "", properties: new Set() },
    effects: { name: "", properties: new Set() },
    inventory: { name: "", properties: new Set() },
    spells: { name: "", properties: new Set() }
  };

  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "details"
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _configureInventorySections(sections) {
    sections.forEach(s => {
      s.minWidth = 250;
      if ( s.id === "weapons" ) s.columns = ["price", "weight", "quantity", "charges", "roll", "formula", "controls"];
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = {
      ...await super._prepareContext(options),
      abilityRows: {
        bottom: [], top: [], optional: Object.keys(CONFIG.DND5E.abilities).length - 6
      },
      isCharacter: true
    };
    context.spellbook = this._prepareSpellbook(context);
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "abilityScores": return this._prepareAbilityScoresContext(context, options);
      case "bastion": return this._prepareBastionContext(context, options);
      case "biography": return this._prepareBiographyContext(context, options);
      case "details": return this._prepareDetailsContext(context, options);
      case "effects": return this._prepareEffectsContext(context, options);
      case "features": return this._prepareFeaturesContext(context, options);
      case "header": return this._prepareHeaderContext(context, options);
      case "inventory": return this._prepareInventoryContext(context, options);
      case "sidebar": return this._prepareSidebarContext(context, options);
      case "specialTraits": return this._prepareSpecialTraitsContext(context, options);
      case "spells": return this._prepareSpellsContext(context, options);
      case "tabs": return this._prepareTabsContext(context, options);
      default: return context;
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the ability scores.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareAbilityScoresContext(context, options) {
    for ( const ability of this._prepareAbilities(context) ) {
      if ( context.abilityRows.bottom.length > 5 ) context.abilityRows.top.push(ability);
      else context.abilityRows.bottom.push(ability);
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the bastion tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareBastionContext(context, options) {
    context.bastion = {
      description: await TextEditor.enrichHTML(this.actor.system.bastion.description, {
        secrets: this.actor.isOwner, relativeTo: this.actor, rollData: context.rollData
      })
    };
    context.defenders = [];
    context.facilities = { basic: { chosen: [] }, special: { chosen: [] } };

    for ( const facility of context.itemCategories.facilities ?? [] ) {
      const ctx = context.itemContext[facility.id] ?? {};
      context.defenders.push(...ctx.defenders.map(({ actor }) => {
        if ( !actor ) return null;
        const { img, name, uuid } = actor;
        return { img, name, uuid, facility: facility.id };
      }).filter(_ => _));
      if ( ctx.isSpecial ) context.facilities.special.chosen.push(ctx);
      else context.facilities.basic.chosen.push(ctx);
    }

    for ( const [type, facilities] of Object.entries(context.facilities) ) {
      const config = CONFIG.DND5E.facilities.advancement[type];
      let [, available] = Object.entries(config).reverse().find(([level]) => {
        return level <= this.actor.system.details.level;
      }) ?? [];
      facilities.value = facilities.chosen.filter(({ free }) => (type === "basic") || !free).length;
      facilities.max = available ?? 0;
      available = (available ?? 0) - facilities.value;
      facilities.available = Array.fromRange(Math.max(0, available)).map(() => {
        return { label: `DND5E.FACILITY.AvailableFacility.${type}.free` };
      });
    }

    if ( !context.facilities.basic.available.length ) {
      context.facilities.basic.available.push({ label: "DND5E.FACILITY.AvailableFacility.basic.build" });
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the biography tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareBiographyContext(context, options) {
    const enrichmentOptions = {
      secrets: this.actor.isOwner, relativeTo: this.actor, rollData: context.rollData
    };
    context.enriched = {
      label: "DND5E.Biography",
      value: await TextEditor.enrichHTML(this.actor.system.details.biography.value, enrichmentOptions)
    };

    // Characteristics
    context.characteristics = [
      "alignment", "eyes", "height", "faith", "hair", "weight", "gender", "skin", "age"
    ].map(k => {
      const field = this.actor.system.schema.fields.details.fields[k];
      const name = `system.details.${k}`;
      return {
        name, label: field.label,
        value: foundry.utils.getProperty(this.actor, name) ?? "",
        source: foundry.utils.getProperty(this.actor._source, name) ?? ""
      };
    });

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the details tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareDetailsContext(context, options) {
    const { details, traits } = this.actor.system;

    // Origin
    context.creatureType = {
      class: details.type.value === "custom" ? "none" : "",
      icon: CONFIG.DND5E.creatureTypes[details.type.value]?.icon ?? "icons/svg/mystery-man.svg",
      title: details.type.value === "custom"
        ? details.type.custom
        : CONFIG.DND5E.creatureTypes[details.type.value]?.label,
      reference: CONFIG.DND5E.creatureTypes[details.type.value]?.reference,
      subtitle: details.type.subtype
    };
    if ( details.race instanceof dnd5e.documents.Item5e ) context.species = details.race;
    if ( details.background instanceof dnd5e.documents.Item5e ) context.background = details.background;
    context.labels.size = CONFIG.DND5E.actorSizes[traits.size]?.label ?? traits.size;

    // Saving Throws
    context.saves = {};
    for ( let ability of Object.values(this._prepareAbilities(context)) ) {
      ability = context.saves[ability.key] = { ...ability };
      ability.class = this.constructor.PROFICIENCY_CLASSES[context.editable ? ability.baseProf : ability.proficient];
      ability.hover = CONFIG.DND5E.proficiencyLevels[ability.proficient];
    }
    if ( this.actor.statuses.has(CONFIG.specialStatusEffects.CONCENTRATING) || context.editable ) {
      context.saves.concentration = {
        isConcentration: true,
        class: "colspan concentration",
        label: game.i18n.localize("DND5E.Concentration"),
        abbr: game.i18n.localize("DND5E.Concentration"),
        save: context.system.attributes.concentration.save
      };
    }

    // Senses
    context.senses = this._prepareSenses(context);

    // Skills & Tools
    context.skills = this._prepareSkillsTools(context, "skills");
    context.tools = this._prepareSkillsTools(context, "tools");
    for ( const [key, entry] of Object.entries(context.skills).concat(Object.entries(context.tools)) ) {
      entry.class = this.constructor.PROFICIENCY_CLASSES[context.editable ? entry.baseValue : entry.value];
      if ( key in CONFIG.DND5E.skills ) entry.reference = CONFIG.DND5E.skills[key].reference;
      else if ( key in CONFIG.DND5E.tools ) entry.reference = Trait.getBaseItemUUID(CONFIG.DND5E.tools[key].id);
    }

    // Traits
    context.traits = this._prepareTraits(context);

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectsContext(context, options) {
    context = await super._prepareEffectsContext(context, options);
    context.hasConditions = true;
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the features tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareFeaturesContext(context, options) {
    // Classes
    context.subclasses = context.itemCategories.subclasses ?? [];
    context.classes = (context.itemCategories.classes ?? [])
      .sort((lhs, rhs) => rhs.system.levels - lhs.system.levels);
    for ( const cls of context.classes ) {
      const ctx = context.itemContext[cls.id] ??= {};
      const subclass = context.subclasses.findSplice(s => s.system.classIdentifier === cls.identifier);
      if ( !subclass ) {
        const subclassAdvancement = cls.advancement.byType.Subclass?.[0];
        if ( subclassAdvancement && (subclassAdvancement.level <= cls.system.levels) ) ctx.needsSubclass = true;
      }
    }

    // List
    const Inventory = customElements.get(this.options.elements.inventory);
    const columns = Inventory.mapColumns([{ id: "uses", order: 200 }, "recovery", "controls"]);
    const sections = [
      { columns, id: "active", label: "DND5E.FeatureActive", order: 100, groups: { activation: "active" }, items: [] },
      { columns, id: "passive", label: "DND5E.FeaturePassive", order: 200, groups: { activation: "passive" } },
      ...Object.values(this.actor.classes ?? {})
        .sort((a, b) => b.system.levels - a.system.levels)
        .map((cls, i) => {
          return {
            columns, id: cls.identifier, order: i * 100, groups: { origin: cls.identifier },
            label: game.i18n.format("DND5E.FeaturesClass", { class: cls.name })
          };
        }),
      this.actor.system.details.race instanceof Item5e ? {
        columns, id: "species", label: "DND5E.Species.Features", order: 1000, groups: { origin: "species" }
      } : null,
      this.actor.system.details.background instanceof Item5e ? {
        columns, id: "background", label: "DND5E.FeaturesBackground", order: 2000, groups: { origin: "background" }
      } : null,
      { columns, id: "other", label: "DND5E.FeaturesOther", order: 3000, groups: { origin: "other" } }
    ].filter(_ => _);
    sections[0].items = [...(context.itemCategories.features ?? []), ...context.subclasses];
    context.sections = Inventory.prepareSections(sections);
    context.listControls = {
      label: "DND5E.FeatureSearch",
      list: "features",
      filters: [
        { key: "action", label: "DND5E.Action" },
        { key: "bonus", label: "DND5E.BonusAction" },
        { key: "reaction", label: "DND5E.Reaction" },
        { key: "sr", label: "DND5E.REST.Short.Label" },
        { key: "lr", label: "DND5E.REST.Long.Label" },
        { key: "concentration", label: "DND5E.Concentration" },
        { key: "mgc", label: "DND5E.ITEM.Property.Magical" }
      ],
      sorting: [
        { key: "m", label: "SIDEBAR.SortModeManual", dataset: { icon: "fa-solid fa-arrow-down-short-wide" } },
        { key: "a", label: "SIDEBAR.SortModeAlpha", dataset: { icon: "fa-solid fa-arrow-down-a-z" } }
      ],
      grouping: [
        {
          key: "origin",
          label: "DND5E.FilterGroupOrigin",
          dataset: { icon: "fa-solid fa-layer-group", classes: "active" }
        },
        { key: "activation", label: "DND5E.FilterGroupOrigin", dataset: { icon: "fa-solid fa-layer-group" } }
      ]
    };

    // TODO: Add this warning during data preparation instead
    // const message = game.i18n.format("DND5E.SubclassMismatchWarn", {
    //   name: subclass.name, class: subclass.system.classIdentifier
    // });
    // context.warnings.push({ message, type: "warning" });
    context.showClassDrop = !context.classes.length || (this._mode === this.constructor.MODES.EDIT);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the header.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareHeaderContext(context, options) {
    if ( this.actor.limited ) {
      context.portrait = await this._preparePortrait(context);
      return context;
    }

    // Classes Label
    context.labels.class = Object.values(this.actor.classes).sort((a, b) => {
      return b.system.levels - a.system.levels;
    }).map(c => `${c.name} ${c.system.levels}`).join(" / ");

    // Experience & Epic Boons
    if ( context.system.details.xp.boonsEarned !== undefined ) {
      const pluralRules = new Intl.PluralRules(game.i18n.lang);
      context.epicBoonsEarned = game.i18n.format(
        `DND5E.ExperiencePoints.Boons.${pluralRules.select(context.system.details.xp.boonsEarned ?? 0)}`,
        { number: formatNumber(context.system.details.xp.boonsEarned ?? 0, { signDisplay: "always" }) }
      );
    }

    // Visibility
    context.showExperience = game.settings.get("dnd5e", "levelingMode") !== "noxp";
    context.showRests = game.user.isGM || (this.actor.isOwner && game.settings.get("dnd5e", "allowRests"));

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareInventoryContext(context, options) {
    context.itemCategories.inventory = context.itemCategories.inventory?.filter(i => i.type !== "container");
    context = await super._prepareInventoryContext(context, options);
    context.size = {
      label: CONFIG.DND5E.actorSizes[this.actor.system.traits.size]?.label ?? this.actor.system.traits.size,
      abbr: CONFIG.DND5E.actorSizes[this.actor.system.traits.size]?.abbreviation ?? "—",
      mod: this.actor.system.attributes.encumbrance.mod
    };
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the sidebar.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareSidebarContext(context, options) {
    const { attributes } = this.actor.system;
    context.portrait = await this._preparePortrait(context);

    // Death Saves
    const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
    context.death = {
      open: this._deathTrayOpen
    };
    for ( const deathSave of ["success", "failure"] ) {
      context.death[deathSave] = [];
      for ( let i = 1; i < 4; i++ ) {
        const n = deathSave === "failure" ? i : 4 - i;
        const i18nKey = `DND5E.DeathSave${deathSave.titleCase()}Label`;
        const filled = attributes.death[deathSave] >= n;
        const classes = ["pip"];
        if ( filled ) classes.push("filled");
        if ( deathSave === "failure" ) classes.push("failure");
        context.death[deathSave].push({
          n, filled,
          tooltip: i18nKey,
          label: game.i18n.localize(`${i18nKey}N.${plurals.select(n)}`),
          classes: classes.join(" ")
        });
      }
    }

    // Exhaustion
    if ( CONFIG.DND5E.conditionTypes.exhaustion ) {
      const max = CONFIG.DND5E.conditionTypes.exhaustion.levels;
      context.exhaustion = Array.fromRange(max, 1).reduce((acc, n) => {
        const label = game.i18n.format("DND5E.ExhaustionLevel", { n });
        const classes = ["pip"];
        const filled = attributes.exhaustion >= n;
        if ( filled ) classes.push("filled");
        if ( n === max ) classes.push("death");
        const pip = { n, label, filled, tooltip: label, classes: classes.join(" ") };

        if ( n <= max / 2 ) acc.left.push(pip);
        else acc.right.push(pip);
        return acc;
      }, { left: [], right: [] });
    }

    // Favorites
    context.favorites = await this._prepareFavorites();

    // Speed
    context.speed = Object.entries(CONFIG.DND5E.movementTypes).reduce((obj, [k, { label }]) => {
      const value = attributes.movement[k];
      if ( value > obj.value ) Object.assign(obj, { value, label });
      return obj;
    }, { value: 0, label: CONFIG.DND5E.movementTypes.walk?.label });

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareSpellsContext(context, options) {
    context = await super._prepareSpellsContext(context, options);

    // Spellcasting
    context.spellcasting = [];
    const spellcastingClasses = Object.values(this.actor.spellcastingClasses)
      .sort((lhs, rhs) => rhs.system.levels - lhs.system.levels);
    for ( const item of spellcastingClasses ) {
      const sc = item.spellcasting;
      const ability = this.actor.system.abilities[sc.ability];
      const mod = ability?.mod ?? 0;
      const name = item.system.spellcasting.progression === sc.progression ? item.name : item.subclass?.name;
      context.spellcasting.push({
        label: game.i18n.format("DND5E.SpellcastingClass", { class: name }),
        ability: { mod, ability: sc.ability },
        attack: sc.attack,
        preparation: sc.preparation,
        primary: this.actor.system.attributes.spellcasting === sc.ability,
        save: sc.save
      });
      const key = item.system.spellcasting.progression === sc.progression ? item.identifier : item.subclass?.identifier;
      context.listControls.filters.push({ key, label: name });
    }

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareTabsContext(context, options) {
    const { basic, special } = CONFIG.DND5E.facilities.advancement;
    const threshold = Math.min(...Object.keys(basic), ...Object.keys(special));
    const showBastion = game.settings.get("dnd5e", "bastionConfiguration")?.enabled
      && (this.actor.system.details.level >= threshold);
    if ( !showBastion && (this.tabGroups.primary === "bastion") ) this.tabGroups.primary = "details";

    context = await super._prepareTabsContext(context, options);

    if ( !showBastion ) context.tabs.findSplice(t => t.tab === "bastion");
    return context;
  }

  /* -------------------------------------------- */
  /*  Actor Preparation Helpers                   */
  /* -------------------------------------------- */

  /**
   * Prepare favorites for display.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {Promise<object>}
   * @protected
   */
  async _prepareFavorites(context) {
    // Legacy resources
    const resources = Object.entries(this.actor.system.resources).reduce((arr, [k, r]) => {
      const { value, max, sr, lr, label } = r;
      const source = this.actor._source.system.resources[k];
      if ( label && max ) arr.push({
        id: `resources.${k}`,
        type: "resource",
        img: "icons/svg/upgrade.svg",
        resource: { value, max, source },
        css: "uses",
        title: label,
        subtitle: [
          sr ? game.i18n.localize("DND5E.AbbreviationSR") : null,
          lr ? game.i18n.localize("DND5E.AbbreviationLR") : null
        ].filterJoin(" &bull; ")
      });
      return arr;
    }, []);

    return resources.concat(await this.actor.system.favorites.reduce(async (arr, f) => {
      const { id, type, sort } = f;
      const favorite = await fromUuid(id, { relative: this.actor });
      if ( !favorite && ((type === "item") || (type === "effect") || (type === "activity")) ) return arr;
      arr = await arr;

      let data;
      if ( type === "item" ) data = await favorite.system.getFavoriteData();
      else if ( (type === "effect") || (type === "activity") ) data = await favorite.getFavoriteData();
      else data = await this._getFavoriteData(type, id);
      if ( !data ) return arr;
      let {
        img, title, subtitle, value, uses, quantity, modifier, passive,
        save, range, reference, toggle, suppressed, level
      } = data;

      if ( foundry.utils.getType(save?.ability) === "Set" ) save = {
        ...save, ability: save.ability.size > 2
          ? game.i18n.localize("DND5E.AbbreviationDC")
          : Array.from(save.ability).map(k => CONFIG.DND5E.abilities[k]?.abbreviation).filterJoin(" / ")
      };

      const css = [];
      if ( uses?.max ) {
        css.push("uses");
        uses.value = Math.round(uses.value);
      }
      else if ( modifier !== undefined ) css.push("modifier");
      else if ( save?.dc ) css.push("save");
      else if ( value !== undefined ) css.push("value");

      if ( toggle === false ) css.push("disabled");
      if ( uses?.max > 99 ) css.push("uses-sm");
      if ( modifier !== undefined ) {
        const value = Number(modifier.replace?.(/\s+/g, "") ?? modifier);
        if ( !isNaN(value) ) modifier = value;
      }

      const rollableClass = [];
      if ( this.isEditable && (type !== "slots") ) rollableClass.push("rollable");
      if ( type === "skill" ) rollableClass.push("skill-name");
      else if ( type === "tool" ) rollableClass.push("tool-name");

      if ( suppressed ) subtitle = game.i18n.localize("DND5E.Suppressed");
      const itemId = type === "item" ? favorite.id : type === "activity" ? favorite.item.id : null;
      arr.push({
        id, img, type, title, value, uses, sort, save, modifier, passive, range, reference, suppressed, level, itemId,
        draggable: ["item", "effect"].includes(type),
        effectId: type === "effect" ? favorite.id : null,
        parentId: (type === "effect") && (favorite.parent !== favorite.target) ? favorite.parent.id: null,
        activityId: type === "activity" ? favorite.id : null,
        key: (type === "skill") || (type === "tool") ? id : null,
        toggle: toggle === undefined ? null : { applicable: true, value: toggle },
        quantity: quantity > 1 ? quantity : "",
        rollableClass: rollableClass.filterJoin(" "),
        css: css.filterJoin(" "),
        bareName: type === "slots",
        subtitle: Array.isArray(subtitle) ? subtitle.filterJoin(" &bull; ") : subtitle
      });
      return arr;
    }, [])).sort((a, b) => a.sort - b.sort);
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for a favorited entry.
   * @param {"skill"|"tool"|"slots"} type  The type of favorite.
   * @param {string} id                    The favorite's identifier.
   * @returns {Promise<FavoriteData5e|void>}
   * @protected
   */
  async _getFavoriteData(type, id) {
    // Spell slots
    if ( type === "slots" ) {
      const { value, max, level, type: method } = this.actor.system.spells?.[id] ?? {};
      const model = CONFIG.DND5E.spellcasting[method];
      const uses = { value, max, name: `system.spells.${id}.value` };
      if ( !model || model.isSingleLevel ) return {
        uses, level, method,
        title: game.i18n.localize(`DND5E.SpellSlots${id.capitalize()}`),
        subtitle: [
          game.i18n.localize(`DND5E.SpellLevel${level}`),
          game.i18n.localize(`DND5E.Abbreviation${model?.isSR ? "SR" : "LR"}`)
        ],
        img: model?.img || CONFIG.DND5E.spellcasting.pact.img
      };

      const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
      return {
        uses, level, method,
        title: game.i18n.format(`DND5E.SpellSlotsN.${plurals.select(level)}`, { n: level }),
        subtitle: game.i18n.localize(`DND5E.Abbreviation${model.isSR ? "SR" : "LR"}`),
        img: model.img.replace("{id}", id)
      };
    }

    // Skills & Tools
    else {
      const data = this.actor.system[`${type}s`]?.[id];
      if ( !data ) return;
      const { total, ability, passive } = data ?? {};
      const subtitle = game.i18n.format("DND5E.AbilityPromptTitle", {
        ability: CONFIG.DND5E.abilities[ability].label
      });
      let img;
      let title;
      let reference;
      if ( type === "tool" ) {
        reference = Trait.getBaseItemUUID(CONFIG.DND5E.tools[id]?.id);
        ({ img, name: title } = Trait.getBaseItem(reference, { indexOnly: true }));
      }
      else if ( type === "skill" ) ({ icon: img, label: title, reference } = CONFIG.DND5E.skills[id]);
      return { img, title, subtitle, modifier: total, passive, reference };
    }
  }

  /* -------------------------------------------- */
  /*  Item Preparation Helpers                    */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _assignItemCategories(item) {
    switch ( item.type ) {
      case "background": return new Set(["background"]);
      case "class": return new Set(["classes"]);
      case "facility": return new Set(["facilities"]);
      case "race": return new Set(["species"]);
      case "subclass": return new Set(["subclasses"]);
      default: return super._assignItemCategories(item);
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare context for a facility.
   * @param {Item5e} item  Item being prepared for display.
   * @param {object} ctx   Item specific context.
   * @protected
   */
  async _prepareItemFacility(item, ctx) {
    const { id, img, labels, name, system } = item;
    const { building, craft, defenders, disabled, free, hirelings, progress, size, trade, type } = system;
    const subtitle = [
      building.built ? CONFIG.DND5E.facilities.sizes[size].label : game.i18n.localize("DND5E.FACILITY.Build.Unbuilt")
    ];
    if ( trade.stock.max ) subtitle.push(`${trade.stock.value ?? 0} &sol; ${trade.stock.max}`);
    Object.assign(ctx, {
      id, labels, name, building, disabled, free, progress,
      craft: craft.item ? await fromUuid(craft.item) : null,
      creatures: await this._prepareItemFacilityLivestock(trade),
      defenders: await this._prepareItemFacilityOccupants(defenders),
      executing: CONFIG.DND5E.facilities.orders[progress.order]?.icon,
      hirelings: await this._prepareItemFacilityOccupants(hirelings),
      img: foundry.utils.getRoute(img),
      isSpecial: type.value === "special",
      subtitle: subtitle.join(" &bull; ")
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare facility livestock for display.
   * @param {object} trade  Facility trade information.
   * @returns {Promise<object[]>}
   * @protected
   */
  async _prepareItemFacilityLivestock(trade) {
    const creatures = await this._prepareItemFacilityOccupants(trade.creatures);
    const pending = trade.pending.creatures;
    return [
      ...(await Promise.all((pending ?? []).map(async (uuid, index) => {
        return { index, actor: await fromUuid(uuid), pending: true };
      }))),
      ...creatures
    ];
  }

  /* -------------------------------------------- */

  /**
   * Prepare facility occupants for display.
   * @param {FacilityOccupants} occupants  The occupants.
   * @returns {Promise<object[]>}
   * @protected
   */
  _prepareItemFacilityOccupants(occupants) {
    const { max, value } = occupants;
    return Promise.all(Array.fromRange(max).map(async index => {
      const uuid = value[index];
      if ( uuid ) return { index, actor: await fromUuid(uuid) };
      return { empty: true };
    }));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareItemFeature(item, ctx) {
    if ( item.type === "facility" ) return this._prepareItemFacility(item, ctx);

    super._prepareItemFeature(item, ctx);

    const [originId] = (item.getFlag("dnd5e", "advancementRoot") ?? item.getFlag("dnd5e", "advancementOrigin"))
      ?.split(".") ?? [];
    const group = this.actor.items.get(originId);
    ctx.groups.origin = "other";
    switch ( group?.type ) {
      case "race": ctx.groups.origin = "species"; break;
      case "background": ctx.groups.origin = "background"; break;
      case "class": ctx.groups.origin = group.identifier; break;
      case "subclass": ctx.groups.origin = group.class?.identifier ?? "other"; break;
    }

    ctx.groups.activation = item.system.properties?.has("trait") || !item.system.activities?.size
      ? "passive"
      : "active";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareItemPhysical(item, ctx) {
    ctx.concealDetails = !game.user.isGM && (item.system.identified === false);
    ctx.isStack = Number.isNumeric(item.system.quantity) && (item.system.quantity !== 1);

    if ( item.system.attunement ) ctx.attunement = item.system.attuned ? {
      icon: "fa-sun",
      cls: "attuned",
      title: "DND5E.AttunementAttuned"
    } : {
      icon: "fa-sun",
      cls: "not-attuned",
      title: CONFIG.DND5E.attunementTypes[item.system.attunement]
    };

    return super._prepareItemPhysical(item, ctx);
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);

    // Apply special context menus for items outside inventory elements
    const featuresElement = this.element.querySelector(`[data-tab="features"] ${this.options.elements.inventory}`);
    if ( featuresElement ) new ContextMenu5e(
      this.element, ".pills-lg [data-item-id], .favorites [data-item-id], .facility[data-item-id]", [],
      { onOpen: (...args) => featuresElement._onOpenContextMenu(...args), jQuery: false }
    );
    const inventoryElement = this.element.querySelector(`[data-tab="inventory"] ${this.options.elements.inventory}`);
    if ( inventoryElement ) new ContextMenu5e(
      this.element, ".containers [data-item-id]", [],
      { onOpen: (...args) => featuresElement._onOpenContextMenu(...args), jQuery: false }
    );
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    if ( !this.actor.limited ) {
      this._renderAttunement(context, options);
      this._renderSpellbook(context, options);
    }

    // Show death tray at 0 HP
    const renderContext = options.renderContext ?? options.action;
    const renderData = options.renderData ?? options.data;
    const isUpdate = (renderContext === "update") || (renderContext === "updateActor");
    const hp = foundry.utils.getProperty(renderData ?? {}, "system.attributes.hp.value");
    if ( isUpdate && (hp === 0) ) this._toggleDeathTray(true);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle removing a favorite.
   * @this {CharacterActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #deleteFavorite(event, target) {
    const { favoriteId } = target.closest("[data-favorite-id]")?.dataset ?? {};
    if ( favoriteId ) this.actor.system.removeFavorite(favoriteId);
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting an occupant from a facility.
   * @this {CharacterActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #deleteOccupant(event, target) {
    const { facilityId } = target.closest("[data-facility-id]")?.dataset ?? {};
    const { prop } = target.closest("[data-prop]")?.dataset ?? {};
    const { index } = target.closest("[data-index]")?.dataset ?? {};
    const facility = this.actor.items.get(facilityId);
    if ( !facility || !prop || (index === undefined) ) return;

    // Prompt to clear a pending trade
    if ( target.closest(".occupant-slot.pending") ) {
      const result = await foundry.applications.api.DialogV2.confirm({
        content: `
          <p>
            <strong>${game.i18n.localize("AreYouSure")}</strong> ${game.i18n.localize("DND5E.Bastion.Trade.Invalid")}
          </p>
        `,
        window: {
          icon: "fa-solid fa-coins",
          title: "DND5E.Bastion.Trade.Cancel"
        },
        position: { width: 400 }
      }, { rejectClose: false });
      if ( result ) facility.update({
        system: {
          progress: { max: null, order: "", value: null },
          trade: {
            pending: { creatures: [], operation: null }
          }
        }
      });
    }

    // Remove the occupant
    else {
      let { value } = foundry.utils.getProperty(facility, prop);
      value = value.filter((_, i) => i !== Number(index));
      facility.update({ [`${prop}.value`]: value });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle finding an available item of a given type.
   * @this {CharacterActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #findItem(event, target) {
    if ( !this.isEditable ) return;
    const { classIdentifier, facilityType, itemType: type } = target.dataset;
    const filters = { locked: { types: new Set([type]) } };

    if ( classIdentifier ) filters.locked.additional = { class: { [classIdentifier]: 1 } };
    if ( type === "class" ) {
      const existingIdentifiers = new Set(Object.keys(this.actor.classes));
      filters.initial = { additional: { properties: { sidekick: -1 } } };
      filters.locked.arbitrary = [{ o: "NOT", v: { k: "system.identifier", o: "in", v: existingIdentifiers } }];
    }
    if ( type === "facility" ) {
      const otherType = facilityType === "basic" ? "special" : "basic";
      filters.locked.additional = {
        type: { [facilityType]: 1, [otherType]: -1 },
        level: { max: this.actor.system.details.level }
      };
    }

    const result = await CompendiumBrowser.selectOne({ filters });
    if ( result ) this._onDropCreateItems(event, [game.items.fromCompendium(await fromUuid(result), { keepId: true })]);
  }

  /* -------------------------------------------- */

  /**
   * Handle setting the character's spellcasting ability.
   * @this {CharacterActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #setSpellcastingAbility(event, target) {
    const ability = target.closest("[data-ability]")?.dataset.ability;
    this.submit({ updateData: { "system.attributes.spellcasting": ability } });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the death saves tray.
   * @this {CharacterActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #toggleDeathTray(event, target) {
    this._toggleDeathTray();
  }

  /* -------------------------------------------- */

  /**
   * Toggle the death save tray.
   * @param {boolean} [open]  Force a particular open state.
   * @protected
   */
  _toggleDeathTray(open) {
    const tray = this.form.querySelector(".death-tray");
    const tab = tray.querySelector(".death-tab");
    tray.classList.toggle("open", open);
    this._deathTrayOpen = tray.classList.contains("open");
    tab.dataset.tooltip = `DND5E.DeathSave${this._deathTrayOpen ? "Hide" : "Show"}`;
    tab.setAttribute("aria-label", game.i18n.localize(tab.dataset.tooltip));
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling inspiration.
   * @this {CharacterActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #toggleInspiration(event, target) {
    this.submit({ updateData: { "system.attributes.inspiration": !this.actor.system.attributes.inspiration } });
  }

  /* -------------------------------------------- */

  /**
   * Handle using a facility.
   * @this {CharacterActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #useFacility(event, target) {
    const { facilityId } = target.closest("[data-facility-id]")?.dataset ?? {};
    const facility = this.actor.items.get(facilityId);
    facility?.use({ legacy: false, chooseActivity: true, event });
  }

  /* -------------------------------------------- */

  /**
   * Handle using a favorited item.
   * @this {CharacterActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #useFavorite(event, target) {
    if ( !this.isEditable || (event.target.tagName === "INPUT") ) return;
    const { favoriteId } = target.closest("[data-favorite-id]").dataset;
    const favorite = await fromUuid(favoriteId, { relative: this.actor });
    if ( (favorite instanceof dnd5e.documents.Item5e) || target.dataset.activityId ) {
      if ( favorite.type === "container" ) favorite.sheet.render({ force: true });
      else favorite.use({ event });
    }
    else if ( favorite instanceof dnd5e.dataModels.activity.BaseActivityData ) favorite.use({ event });
    else if ( favorite instanceof dnd5e.documents.ActiveEffect5e ) favorite.update({ disabled: !favorite.disabled });
    else {
      const { key } = target.closest("[data-key]")?.dataset ?? {};
      if ( key ) {
        if ( target.classList.contains("skill-name") ) this.actor.rollSkill({ event, skill: key });
        else if ( target.classList.contains("tool-name") ) this.actor.rollToolCheck({ event, tool: key });
      }
    }
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @override */
  _defaultDropBehavior(event, data) {
    if ( data.dnd5e?.action === "favorite" || (["Activity", "Item"].includes(data.type)
      && event.target.closest(".favorites")) ) return "link";
    return super._defaultDropBehavior(event, data);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDragStart(event) {
    const methods = CONFIG.DND5E.spellcasting;
    const { key } = event.target.closest("[data-key]")?.dataset ?? {};
    const { level, method } = event.target.closest("[data-level]")?.dataset ?? {};
    const isSlots = event.target.closest("[data-favorite-id]") || event.target.classList.contains("items-header");
    let type;
    if ( key in CONFIG.DND5E.skills ) type = "skill";
    else if ( key in CONFIG.DND5E.tools ) type = "tool";
    else if ( methods[method]?.slots && (level !== "0") && isSlots ) type = "slots";
    if ( !type ) return super._onDragStart(event);

    // Add another deferred deactivation to catch the second pointerenter event that seems to be fired on Firefox.
    requestAnimationFrame(() => game.tooltip.deactivate());
    game.tooltip.deactivate();

    const dragData = { dnd5e: { action: "favorite", type } };
    if ( type === "slots" ) dragData.dnd5e.id = methods[method].getSpellSlotKey(Number(level));
    else dragData.dnd5e.id = key;
    event.dataTransfer.setData("application/json", JSON.stringify(dragData));
    event.dataTransfer.effectAllowed = "link";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    if ( !event.target.closest(".favorites") ) return super._onDrop(event);
    const dragData = event.dataTransfer.getData("application/json") || event.dataTransfer.getData("text/plain");
    if ( !dragData ) return super._onDrop(event);
    let data;
    try {
      data = JSON.parse(dragData);
    } catch(e) {
      console.error(e);
      return;
    }
    const { action, type, id } = data.dnd5e ?? {};
    if ( action === "favorite" ) return this._onDropFavorite(event, { type, id });
    if ( data.type === "Activity" ) {
      const activity = await fromUuid(data.uuid);
      if ( activity ) return this._onDropActivity(event, activity);
    }
    return super._onDrop(event);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDropActiveEffect(event, effect) {
    if ( !event.target.closest(".favorites") || (effect.target !== this.actor) ) {
      return super._onDropActiveEffect(event, effect);
    }
    const uuid = effect.getRelativeUUID(this.actor);
    return this._onDropFavorite(event, { type: "effect", id: uuid });
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping an Activity onto the sheet.
   * @param {DragEvent} event    The originating drag event.
   * @param {Activity} activity  The dropped Activity document.
   * @returns {Promise<Actor5e|void>}
   * @protected
   */
  async _onDropActivity(event, activity) {
    if ( !event.target.closest(".favorites") || (activity.actor !== this.actor) ) return;
    const uuid = `${activity.item.getRelativeUUID(this.actor)}.Activity.${activity.id}`;
    return this._onDropFavorite(event, { type: "activity", id: uuid });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDropActor(event, actor) {
    if ( !event.target.closest(".facility-occupants") || !actor.uuid ) return super._onDropActor(event, actor);
    const { facilityId } = event.target.closest("[data-facility-id]").dataset;
    const facility = this.actor.items.get(facilityId);
    if ( !facility ) return;
    const { prop } = event.target.closest("[data-prop]").dataset;
    const { max, value } = foundry.utils.getProperty(facility, prop);
    if ( (value.length + 1) > max ) return;
    return facility.update({ [`${prop}.value`]: [...value, actor.uuid] });
  }

  /* -------------------------------------------- */

  /**
   * Handle an owned item or effect being dropped in the favorites area.
   * @param {DragEvent} event            The triggering event.
   * @param {ActorFavorites5e} favorite  The favorite that was dropped.
   * @returns {Promise<Actor5e>|void}
   * @protected
   */
  _onDropFavorite(event, favorite) {
    if ( this.actor.system.hasFavorite(favorite.id) ) return this._onSortFavorites(event, favorite.id);
    return this.actor.system.addFavorite(favorite);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDropItem(event, item) {
    if ( !event.target.closest(".favorites") || (item.parent !== this.actor) ) return super._onDropItem(event, item);
    const uuid = item.getRelativeUUID(this.actor);
    return this._onDropFavorite(event, { type: "item", id: uuid });
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropSingleItem(event, itemData) {
    // Increment the number of class levels a character instead of creating a new item
    if ( itemData.type === "class" ) {
      const charLevel = this.actor.system.details.level;
      itemData.system.levels = Math.min(itemData.system.levels, CONFIG.DND5E.maxLevel - charLevel);
      if ( itemData.system.levels <= 0 ) {
        const err = game.i18n.format("DND5E.MaxCharacterLevelExceededWarn", { max: CONFIG.DND5E.maxLevel });
        ui.notifications.error(err);
        return;
      }

      const cls = this.actor.itemTypes.class.find(c => c.identifier === itemData.system.identifier);
      if ( cls ) {
        const priorLevel = cls.system.levels;
        if ( !game.settings.get("dnd5e", "disableAdvancements") ) {
          const manager = AdvancementManager.forLevelChange(this.actor, cls.id, itemData.system.levels);
          if ( manager.steps.length ) {
            manager.render({ force: true });
            return;
          }
        }
        cls.update({ "system.levels": priorLevel + itemData.system.levels });
        return;
      }
    }

    // If a subclass is dropped, ensure it doesn't match another subclass with the same identifier
    else if ( itemData.type === "subclass" ) {
      const other = this.actor.itemTypes.subclass.find(i => i.identifier === itemData.system.identifier);
      if ( other ) {
        const err = game.i18n.format("DND5E.SubclassDuplicateError", { identifier: other.identifier });
        ui.notifications.error(err);
        return;
      }
      const cls = this.actor.itemTypes.class.find(i => i.identifier === itemData.system.classIdentifier);
      if ( cls && cls.subclass ) {
        const err = game.i18n.format("DND5E.SubclassAssignmentError", { class: cls.name, subclass: cls.subclass.name });
        ui.notifications.error(err);
        return;
      }
    }

    return super._onDropSingleItem(event, itemData);
  }

  /* -------------------------------------------- */

  /**
   * Handle re-ordering the favorites list.
   * @param {DragEvent} event  The drop event.
   * @param {string} srcId     The identifier of the dropped favorite.
   * @returns {Promise<Actor5e>|void}
   * @protected
   */
  _onSortFavorites(event, srcId) {
    const dropTarget = event.target.closest("[data-favorite-id]");
    if ( !dropTarget ) return;
    let source;
    let target;
    const targetId = dropTarget.dataset.favoriteId;
    if ( srcId === targetId ) return;
    const siblings = this.actor.system.favorites.filter(f => {
      if ( f.id === targetId ) target = f;
      else if ( f.id === srcId ) source = f;
      return f.id !== srcId;
    });
    const updates = foundry.utils.performIntegerSort(source, { target, siblings });
    const favorites = this.actor.system.favorites.reduce((map, f) => map.set(f.id, { ...f }), new Map());
    for ( const { target, update } of updates ) {
      const favorite = favorites.get(target.id);
      foundry.utils.mergeObject(favorite, update);
    }
    return this.actor.update({ "system.favorites": Array.from(favorites.values()) });
  }

  /* -------------------------------------------- */
  /*  Filtering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _filterItem(item, filters) {
    const allowed = super._filterItem(item, filters);
    if ( allowed !== undefined ) return allowed;
    if ( item.type === "container" ) return true;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  canExpand(item) {
    return !["background", "race", "facility"].includes(item.type) && super.canExpand(item);
  }
}
