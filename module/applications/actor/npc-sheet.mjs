import { formatNumber, getPluralRules, simplifyBonus, splitSemicolons } from "../../utils.mjs";
import { createCheckboxInput } from "../fields.mjs";
import BaseActorSheet from "./api/base-actor-sheet.mjs";
import HabitatConfig from "./config/habitat-config.mjs";
import TreasureConfig from "./config/treasure-config.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * Extension of base actor sheet for NPCs.
 */
export default class NPCActorSheet extends BaseActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      editDescription: NPCActorSheet.#editDescription
    },
    classes: ["npc", "vertical-tabs"],
    position: {
      width: 700,
      height: 700
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {
      template: "systems/dnd5e/templates/actors/npc-header.hbs"
    },
    sidebarCollapser: {
      container: { classes: ["main-content"], id: "main" },
      template: "systems/dnd5e/templates/actors/npc-sidebar-collapser.hbs"
    },
    sidebar: {
      container: { classes: ["main-content"], id: "main" },
      template: "systems/dnd5e/templates/actors/npc-sidebar.hbs"
    },
    features: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/actor-features.hbs",
      templates: ["systems/dnd5e/templates/inventory/inventory.hbs", "systems/dnd5e/templates/inventory/activity.hbs"],
      scrollable: [""]
    },
    inventory: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/actor-inventory.hbs",
      templates: [
        "systems/dnd5e/templates/inventory/inventory.hbs", "systems/dnd5e/templates/inventory/activity.hbs",
        "systems/dnd5e/templates/inventory/encumbrance.hbs"
      ],
      scrollable: [""]
    },
    spells: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/creature-spells.hbs",
      scrollable: [""]
    },
    effects: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/actor-effects.hbs",
      scrollable: [""]
    },
    biography: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/npc-biography.hbs",
      scrollable: [""]
    },
    specialTraits: {
      classes: ["flexcol"],
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/creature-special-traits.hbs",
      scrollable: [""]
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

  /** @override */
  static TABS = [
    { tab: "features", label: "DND5E.Features", icon: "fas fa-list" },
    { tab: "inventory", label: "DND5E.Inventory", svg: "systems/dnd5e/icons/svg/backpack.svg" },
    { tab: "spells", label: "TYPES.Item.spellPl", icon: "fas fa-book" },
    { tab: "effects", label: "DND5E.Effects", icon: "fas fa-bolt" },
    { tab: "biography", label: "DND5E.Biography", icon: "fas fa-feather" },
    { tab: "specialTraits", label: "DND5E.SpecialTraits", icon: "fas fa-star" }
  ];

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Description currently being edited.
   * @type {string|null}
   */
  editingDescriptionTarget = null;

  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "features"
  };

  /* -------------------------------------------- */

  /** @override */
  _filters = {
    features: { name: "", properties: new Set() },
    effects: { name: "", properties: new Set() },
    inventory: { name: "", properties: new Set() },
    spells: { name: "", properties: new Set() }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _configureInventorySections(sections) {
    sections.forEach(s => s.minWidth = 200);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = {
      ...await super._prepareContext(options),
      important: !foundry.utils.isEmpty(this.actor.classes) || this.actor.system.traits.important,
      isNPC: true
    };
    context.hasClasses = context.itemCategories.classes?.length;
    context.spellbook = this._prepareSpellbook(context);
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "biography": return this._prepareBiographyContext(context, options);
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
   * Prepare rendering context for the biography tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareBiographyContext(context, options) {
    if ( this.actor.limited ) return context;

    const enrichmentOptions = {
      secrets: this.actor.isOwner, relativeTo: this.actor, rollData: context.rollData
    };
    context.enriched = {
      public: await TextEditor.enrichHTML(this.actor.system.details.biography.public, enrichmentOptions),
      value: await TextEditor.enrichHTML(this.actor.system.details.biography.value, enrichmentOptions)
    };
    if ( this.editingDescriptionTarget ) context.editingDescription = {
      target: this.editingDescriptionTarget,
      value: foundry.utils.getProperty(this.actor._source, this.editingDescriptionTarget)
    };

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
    const sections = Object.entries(CONFIG.DND5E.activityActivationTypes).reduce((obj, [id, config], i) => {
      const { header: label, passive } = config;
      if ( passive ) return obj;
      obj[id] ??= {
        id, label, order: (i + 1) * 100, items: [], minWidth: 210,
        columns: ["recovery", "uses", "roll", "formula", "controls"]
      };
      return obj;
    }, {});
    sections.passive = {
      id: "passive", label: "DND5E.Features", order: 0, items: [], minWidth: 210,
      columns: ["recovery", "uses", "roll", "formula", "controls"]
    };
    context.itemCategories.features?.forEach(i => {
      const ctx = context.itemContext[i.id];
      sections[ctx.group]?.items.push(i);
    });
    context.sections = customElements.get(this.options.elements.inventory).prepareSections(Object.values(sections));
    context.listControls = {
      label: "DND5E.FeatureSearch",
      list: "features",
      filters: [
        { key: "action", label: "DND5E.ACTIVATION.Type.Action.Label" },
        { key: "bonus", label: "DND5E.ACTIVATION.Type.BonusAction.Label" },
        { key: "reaction", label: "DND5E.ACTIVATION.Type.Reaction.Label" },
        { key: "legendary", label: "DND5E.ACTIVATION.Type.Legendary.Label" },
        { key: "lair", label: "DND5E.ACTIVATION.Type.Lair.Label" }
      ],
      sorting: [
        { key: "m", label: "SIDEBAR.SortModeManual", dataset: { icon: "fa-solid fa-arrow-down-short-wide" } },
        { key: "a", label: "SIDEBAR.SortModeAlpha", dataset: { icon: "fa-solid fa-arrow-down-a-z" } }
      ]
    };
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
    context.portrait = await this._preparePortrait(context);

    if ( this.actor.limited ) {
      const enrichmentOptions = { relativeTo: this.actor, rollData: context.rollData };
      context.enriched = {
        public: await TextEditor.enrichHTML(this.actor.system.details.biography.public, enrichmentOptions)
      };
      return context;
    }

    context.abilities = this._prepareAbilities(context);
    context.classes = context.itemCategories.classes;

    // Legendary Actions & Resistances
    const plurals = getPluralRules({ type: "ordinal" });
    const resources = context.source.resources;
    for ( const res of ["legact", "legres"] ) {
      const { max, value } = resources[res];
      context[res] = Array.fromRange(max, 1).map(n => {
        const i18n = res === "legact" ? "LegendaryAction" : "LegendaryResistance";
        const filled = value >= n;
        const classes = ["pip"];
        if ( filled ) classes.push("filled");
        return {
          n: max - n, filled,
          tooltip: `DND5E.${i18n}.Label`,
          label: game.i18n.format(`DND5E.${i18n}.Ordinal.${plurals.select(n)}`, { n }),
          classes: classes.join(" ")
        };
      });
    }
    context.hasLegendaries = resources.legact.max || resources.legres.max
      || (context.modernRules && resources.lair.value) || (!context.modernRules && resources.lair.initiative);

    // Visibility
    if ( this._mode === this.constructor.MODES.PLAY ) {
      context.showDeathSaves = context.important && !context.system.attributes.hp.value;
      context.showInitiativeScore = game.settings.get("dnd5e", "rulesVersion") === "modern";
    }
    context.showLoyalty = context.important && game.settings.get("dnd5e", "loyaltyScore") && game.user.isGM;
    context.showRests = game.user.isGM || (this.actor.isOwner && game.settings.get("dnd5e", "allowRests"));

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareInventoryContext(context, options) {
    context = await super._prepareInventoryContext(context, options);
    context.encumbrance = context.system.attributes.encumbrance;
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
    const { attributes, details } = context.system;

    // Habitat
    if ( details.habitat.value.length || details.habitat.custom ) {
      const { habitat } = details;
      const any = details.habitat.value.find(({ type }) => type === "any");
      context.habitat = [
        ...habitat.value.map(({ type, subtype }) => {
          let { label } = CONFIG.DND5E.habitats[type] ?? {};
          if ( label && (!any || (type === "any")) ) {
            if ( subtype ) label = game.i18n.format("DND5E.Habitat.Subtype", { type: label, subtype });
            return { label };
          }
          return null;
        }, []).filter(_ => _),
        ...splitSemicolons(habitat.custom).map(label => ({ label }))
      ].sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
    }

    // Senses
    context.senses = this._prepareSenses(context);
    if ( this.actor.system.skills.prc ) context.senses.push({
      key: "passivePerception",
      label: game.i18n.localize("DND5E.PassivePerception"),
      value: this.actor.system.skills.prc.passive
    });

    // Skills & Tools
    const skillSetting = game.settings.get("dnd5e", "defaultSkills");
    context.skills = this._prepareSkillsTools(context, "skills")
      .filter(v => v.value || skillSetting.has(v.key) || v.bonuses.check || v.bonuses.passive);
    context.tools = this._prepareSkillsTools(context, "tools");

    // Speed
    context.speed = [
      ...Object.entries(CONFIG.DND5E.movementTypes).map(([k, { label }]) => {
        const value = attributes.movement[k];
        if ( !value ) return null;
        const data = { label, value };
        if ( (k === "fly") && attributes.movement.hover ) data.icons = [{
          icon: "fas fa-cloud", label: game.i18n.localize("DND5E.MovementHover")
        }];
        return data;
      }),
      ...splitSemicolons(attributes.movement.special).map(label => ({ label }))
    ].filter(_ => _);

    // Traits
    context.traits = this._prepareTraits(context);

    // Treasure
    if ( details?.treasure?.value.size ) {
      const any = details.treasure.value.has("any");
      context.treasure = Array.from(details.treasure.value)
        .map(id => {
          const { label } = CONFIG.DND5E.treasure[id] ?? {};
          if ( label && (!any || (id === "any")) ) return { label };
          return null;
        }, [])
        .filter(_ => _)
        .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
    }

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareSpecialTraitsContext(context, options) {
    context = await super._prepareSpecialTraitsContext(context, options);

    context.flags.sections.unshift({
      label: game.i18n.localize("DND5E.NPC.Label"),
      fields: [{
        field: this.document.system.schema.fields.traits.fields.important,
        input: createCheckboxInput,
        name: "system.traits.important",
        value: context.source.traits.important
      }]
    });

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareSpellsContext(context, options) {
    context = await super._prepareSpellsContext(context, options);
    context.classSpellcasting = Object.values(this.actor.classes).some(c => c.spellcasting?.levels);

    const { abilities, attributes, bonuses } = this.actor.system;
    context.spellcasting = [];
    const msak = simplifyBonus(bonuses.msak.attack, context.rollData);
    const rsak = simplifyBonus(bonuses.rsak.attack, context.rollData);
    const spellcaster = Object.values(this.actor.spellcastingClasses)[0];
    const ability = spellcaster?.spellcasting.ability ?? attributes.spellcasting;
    const spellAbility = abilities[ability];
    const mod = spellAbility?.mod ?? 0;
    const attackBonus = msak === rsak ? msak : 0;
    context.spellcasting.push({
      label: game.i18n.format("DND5E.SpellcastingClass", {
        class: spellcaster?.name ?? game.i18n.format("DND5E.NPC.Label")
      }),
      level: spellcaster?.system.levels ?? attributes.spell.level,
      ability: {
        ability, mod,
        label: CONFIG.DND5E.abilities[ability]?.label
      },
      attack: mod + attributes.prof + attackBonus,
      save: spellAbility?.dc ?? 0,
      noSpellcaster: !spellcaster,
      concentration: {
        mod: attributes.concentration.save,
        tooltip: game.i18n.format("DND5E.AbilityConfigure", { ability: game.i18n.localize("DND5E.Concentration") })
      }
    });

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Render a button for creating items in the inventory tab.
   * @protected
   */
  _renderCreateInventory() {
    const button = document.createElement("button");
    Object.assign(button, {
      type: "button", className: "create-child gold-button",
      ariaLabel: game.i18n.format("SIDEBAR.Create", { type: game.i18n.localize("DOCUMENT.Item") })
    });
    button.dataset.action = "addDocument";
    button.insertAdjacentHTML("beforeend", '<i class="fa-solid fa-plus" inert></i>');
    this.element.querySelector('[data-application-part="inventory"] .bottom').append(button);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderFrame(options) {
    const html = await super._renderFrame(options);
    this._renderSourceFrame(html);
    html.querySelector(".header-elements")?.insertAdjacentHTML("beforeend", '<div class="cr-xp"></div>');
    return html;
  }

  /* -------------------------------------------- */
  /*  Item Preparation Helpers                    */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _assignItemCategories(item) {
    if ( ["class", "subclass"].includes(item.type) ) return new Set(["classes"]);
    const categories = super._assignItemCategories(item);
    if ( item.type === "weapon" ) categories.add("features");
    return categories;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareItem(item, ctx) {
    await super._prepareItem(item, ctx);
    const isPassive = item.system.properties?.has("trait")
      || CONFIG.DND5E.activityActivationTypes[item.system.activities?.contents[0]?.activation.type]?.passive;
    ctx.group = isPassive ? "passive" : item.system.activities?.contents[0]?.activation.type || "passive";
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this._renderSource();

    if ( !this.actor.limited ) {
      this._renderCreateInventory();
      this._renderAttunement(context, options);
      this._renderSpellbook(context, options);
    }

    const elements = this.element.querySelector(".header-elements .cr-xp");
    if ( !elements || this.actor.limited ) return;
    const xp = this.actor.system.details.xp.value;
    elements.innerText = xp === null ? "" : game.i18n.format("DND5E.ExperiencePoints.Format", {
      value: formatNumber(xp)
    });

    if ( this.editingDescriptionTarget ) {
      this.element.querySelectorAll("prose-mirror").forEach(editor => editor.addEventListener("save", () => {
        this.editingDescriptionTarget = null;
        this.render();
      }));
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _addDocumentItemTypes(tab) {
    const types = super._addDocumentItemTypes(tab);
    if ( tab === "features" ) types.push("weapon");
    return types;
  }

  /* -------------------------------------------- */

  /**
   * Handle expanding the description editor.
   * @this {NPCActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #editDescription(event, target) {
    if ( target.ariaDisabled ) return;
    this.editingDescriptionTarget = target.dataset.target;
    this.render();
  }

  /* -------------------------------------------- */

  /** @override */
  _showConfiguration(event, target) {
    let app;
    const config = { document: this.actor };
    switch ( target.dataset.config ) {
      case "habitat":
        app = new HabitatConfig(config);
        break;
      case "treasure":
        app = new TreasureConfig(config);
        break;
    }
    if ( app ) {
      app.render({ force: true });
      return false;
    }
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);

    // Convert CR
    let cr = submitData.system?.details?.cr;
    if ( (cr === "") || (cr === "—") ) foundry.utils.setProperty(submitData, "system.details.cr", null);
    else {
      cr = { "1/8": 0.125, "⅛": 0.125, "1/4": 0.25, "¼": 0.25, "1/2": 0.5, "½": 0.5 }[cr] || parseFloat(cr);
      if ( Number.isNaN(cr) ) cr = null;
      else foundry.utils.setProperty(submitData, "system.details.cr", cr < 1 ? cr : parseInt(cr));
    }

    return submitData;
  }
}
