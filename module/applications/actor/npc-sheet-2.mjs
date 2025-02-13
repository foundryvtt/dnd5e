import ActorSheet5eNPC from "./npc-sheet.mjs";
import ActorSheetV2Mixin from "./sheet-v2-mixin.mjs";
import { createCheckboxInput } from "../fields.mjs";
import { simplifyBonus, splitSemicolons } from "../../utils.mjs";

/**
 * An Actor sheet for NPCs.
 * @mixes ActorSheetV2
 */
export default class ActorSheet5eNPC2 extends ActorSheetV2Mixin(ActorSheet5eNPC) {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "sheet", "actor", "npc", "vertical-tabs"],
      width: 700,
      height: 700,
      resizable: true,
      scrollY: [".sheet-body"],
      tabs: [{ navSelector: ".tabs", contentSelector: ".tab-body", initial: "features" }],
      dragDrop: [
        { dragSelector: ".item-list .item > .item-row", dropSelector: null },
        { dragSelector: ".item-list .item .activity-row", dropSelector: null }
      ]
    });
  }

  /** @override */
  static TABS = [
    { tab: "features", label: "DND5E.Features", icon: "fas fa-list" },
    { tab: "inventory", label: "DND5E.Inventory", svg: "backpack" },
    { tab: "spells", label: "TYPES.Item.spellPl", icon: "fas fa-book" },
    { tab: "effects", label: "DND5E.Effects", icon: "fas fa-bolt" },
    { tab: "biography", label: "DND5E.Biography", icon: "fas fa-feather" },
    { tab: "special-traits", label: "DND5E.SpecialTraits", icon: "fas fa-star" }
  ];

  /**
   * The description currently being edited.
   * @type {string|null}
   */
  editingDescriptionTarget = null;

  /* -------------------------------------------- */

  /** @override */
  get template() {
    if ( !game.user.isGM && this.actor.limited ) return "systems/dnd5e/templates/actors/limited-sheet-2.hbs";
    return "systems/dnd5e/templates/actors/npc-sheet-2.hbs";
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderOuter() {
    const html = await super._renderOuter();
    this._renderSourceOuter(html);
    // XP value.
    html[0].querySelector(".header-elements")?.insertAdjacentHTML("beforeend", '<div class="cr-xp"></div>');
    return html;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _render(force=false, options={}) {
    await super._render(force, options);
    this._renderSource();
    const [elements] = this.element.find(".header-elements");
    if ( !elements || this.actor.limited ) return;
    const xp = this.actor.system.details.xp.value;
    elements.querySelector(".cr-xp").innerHTML = xp === null ? "" : game.i18n.format("DND5E.ExperiencePoints.Format", {
      value: new Intl.NumberFormat(game.i18n.lang).format(xp)
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = await super.getData(options);
    const { attributes, details, resources, traits } = this.actor.system;
    context.encumbrance = attributes.encumbrance;

    // Ability Scores
    Object.entries(context.abilities).forEach(([k, ability]) => {
      ability.key = k;
      ability.abbr = CONFIG.DND5E.abilities[k]?.abbreviation ?? "";
      ability.baseValue = context.source.abilities[k]?.value ?? 0;
      ability.icon = CONFIG.DND5E.abilities[k]?.icon;
    });

    // Important NPCs
    context.important = !foundry.utils.isEmpty(this.actor.classes) || traits.important;

    if ( this._mode === this.constructor.MODES.PLAY ) {
      context.showDeathSaves = context.important && !attributes.hp.value;
      context.showInitiativeScore = game.settings.get("dnd5e", "rulesVersion") === "modern";
    }

    // Loyalty
    context.showLoyalty = context.important && game.settings.get("dnd5e", "loyaltyScore") && game.user.isGM;

    // Habitat
    if ( details?.habitat?.value.length || details?.habitat?.custom ) {
      const { habitat } = details;
      const any = details.habitat.value.find(({ type }) => type === "any");
      context.habitat = habitat.value.reduce((arr, { type, subtype }) => {
        let { label } = CONFIG.DND5E.habitats[type] ?? {};
        if ( label && (!any || (type === "any")) ) {
          if ( subtype ) label = game.i18n.format("DND5E.Habitat.Subtype", { type: label, subtype });
          arr.push({ label });
        }
        return arr;
      }, [])
        .concat(splitSemicolons(habitat.custom).map(label => ({ label })))
        .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
    }

    // Treasure
    if ( details?.treasure?.value.size ) {
      const any = details.treasure.value.has("any");
      context.treasure = details.treasure.value.reduce((arr, id) => {
        const { label } = CONFIG.DND5E.treasure[id] ?? {};
        if ( label && (!any || (id === "any")) ) arr.push({ label });
        return arr;
      }, []).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
    }

    // Speed
    context.speed = Object.entries(CONFIG.DND5E.movementTypes).reduce((obj, [k, label]) => {
      const value = attributes.movement[k];
      if ( value ) {
        obj[k] = { label, value };
        if ( (k === "fly") && attributes.movement.hover ) obj.fly.icons = [{
          icon: "fas fa-cloud", label: game.i18n.localize("DND5E.MovementHover")
        }];
      }
      return obj;
    }, {});

    // Skills & Tools
    const skillSetting = new Set(game.settings.get("dnd5e", "defaultSkills"));
    context.skills = Object.fromEntries(Object.entries(context.skills).filter(([k, v]) => {
      return v.value || skillSetting.has(k) || v.bonuses.check || v.bonuses.passive;
    }));

    // Senses
    if ( this.actor.system.skills.prc ) {
      context.senses.passivePerception = {
        label: game.i18n.localize("DND5E.PassivePerception"), value: this.actor.system.skills.prc.passive
      };
    }

    // Legendary Actions & Resistances
    const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
    ["legact", "legres"].forEach(res => {
      const { max, value } = resources[res];
      context[res] = Array.fromRange(max, 1).map(n => {
        const i18n = res === "legact" ? "LegendaryAction" : "LegendaryResistance";
        const filled = value >= n;
        const classes = ["pip"];
        if ( filled ) classes.push("filled");
        return {
          n, filled,
          tooltip: `DND5E.${i18n}.Label`,
          label: game.i18n.format(`DND5E.${i18n}.Ordinal.${plurals.select(n)}`, { n }),
          classes: classes.join(" ")
        };
      });
    });
    context.hasLegendaries = resources.legact.max || resources.legres.max
      || (context.modernRules && resources.lair.value) || (!context.modernRules && resources.lair.initiative);

    // Spellcasting
    this._prepareSpellcasting(context);

    // Biographies
    const enrichmentOptions = {
      secrets: this.actor.isOwner, relativeTo: this.actor, rollData: context.rollData
    };

    context.enriched = {
      public: await TextEditor.enrichHTML(this.actor.system.details.biography.public, enrichmentOptions),
      value: context.biographyHTML
    };

    if ( this.editingDescriptionTarget ) {
      context.editingDescriptionTarget = this.editingDescriptionTarget;
      context.enriched.editing = this.editingDescriptionTarget.endsWith("public")
        ? context.enriched.public
        : context.enriched.value;
    }

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareFlags() {
    const flags = super._prepareFlags();
    const source = (this._mode === this.constructor.MODES.PLAY ? this.document : this.document._source);

    flags.sections.unshift({
      label: game.i18n.localize("DND5E.NPC.Label"),
      fields: [{
        field: this.document.system.schema.fields.traits.fields.important,
        input: createCheckboxInput,
        name: "system.traits.important",
        value: source.system.traits.important
      }]
    });

    return flags;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareItems(context) {
    super._prepareItems(context);
    const classes = [];
    const inventory = {};
    const inventoryTypes = Object.entries(CONFIG.Item.dataModels)
      .filter(([, model]) => model.metadata?.inventoryItem)
      .sort(([, lhs], [, rhs]) => (lhs.metadata.inventoryOrder - rhs.metadata.inventoryOrder));
    for ( const [type] of inventoryTypes ) {
      inventory[type] = { label: `${CONFIG.Item.typeLabels[type]}Pl`, items: [], dataset: { type } };
      if ( type === "container" ) context.containers = inventory.container.items;
    }
    const features = context.features.filter(section => {
      if ( section.dataset.type === "loot" ) {
        section.items.forEach(i => inventory[i.type]?.items.push(i));
        return false;
      }
      if ( (section.dataset.type === "feat") ) {
        if ( !("activation.type" in section.dataset) ) section.dataset.type = "passive";
        for ( let i = section.items.length; i--; ) {
          const item = section.items[i];
          if ( (item.type === "class") || (item.type === "subclass") ) {
            classes.push(item);
            section.items.splice(i, 1);
            context.itemContext[item.id].prefixedImage = item.img ? foundry.utils.getRoute(item.img) : null;
          }
        }
      }
      if ( section.dataset.type === "weapon" ) inventory.weapon.items = section.items;
      return true;
    });
    // TODO: These labels should be pluralised.
    Object.entries(CONFIG.DND5E.abilityActivationTypes).forEach(([type, label]) => features.push({
      label, items: [], hasActions: true, dataset: { type }
    }));
    context.features = {
      sections: features,
      filters: [
        { key: "action", label: "DND5E.Action" },
        { key: "bonus", label: "DND5E.BonusAction" },
        { key: "reaction", label: "DND5E.Reaction" },
        { key: "legendary", label: "DND5E.LegendaryAction.Label" },
        { key: "lair", label: "DND5E.LAIR.Action.Label" }
      ]
    };
    features.forEach(section => {
      section.categories = [
        {
          classes: "item-uses", label: "DND5E.Uses", itemPartial: "dnd5e.column-uses",
          activityPartial: "dnd5e.activity-column-uses"
        },
        {
          classes: "item-roll", label: "DND5E.SpellHeader.Roll", itemPartial: "dnd5e.column-roll",
          activityPartial: "dnd5e.activity-column-roll"
        },
        {
          classes: "item-formula", label: "DND5E.SpellHeader.Formula", itemPartial: "dnd5e.column-formula",
          activityPartial: "dnd5e.activity-column-formula"
        },
        {
          classes: "item-controls", itemPartial: "dnd5e.column-feature-controls",
          activityPartial: "dnd5e.activity-column-controls"
        }
      ];
    });
    context.inventory = Object.values(inventory);
    context.inventory.push({ label: "DND5E.Contents", items: [], dataset: { type: "all" } });
    context.inventory.forEach(section => {
      section.categories = [
        { activityPartial: "dnd5e.activity-column-price" },
        { activityPartial: "dnd5e.activity-column-weight" },
        { activityPartial: "dnd5e.activity-column-quantity" },
        { activityPartial: "dnd5e.activity-column-uses" }
      ];
    });
    context.classes = classes;
    context.hasClasses = classes.length;
  }

  /* -------------------------------------------- */

  /**
   * Prepare spellcasting data for display.
   * @param {object} context  The display context.
   * @protected
   */
  _prepareSpellcasting(context) {
    const { abilities, attributes, bonuses } = this.actor.system;
    context.spellcasting = [];
    const msak = simplifyBonus(bonuses.msak.attack, context.rollData);
    const rsak = simplifyBonus(bonuses.rsak.attack, context.rollData);
    // TODO: Consider if we want to handle multiclassing for NPC spellcasters.
    const spellcaster = Object.values(this.actor.classes).find(cls => cls.system.spellcasting.progression !== "none");
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
        label: CONFIG.DND5E.abilities[ability]?.abbreviation
      },
      attack: mod + attributes.prof + attackBonus,
      save: spellAbility?.dc ?? 0,
      noSpellcaster: !spellcaster,
      concentration: {
        mod: attributes.concentration.save,
        tooltip: game.i18n.format("DND5E.AbilityConfigure", { ability: game.i18n.localize("DND5E.Concentration") })
      }
    });
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".short-rest").on("click", this._onShortRest.bind(this));
    html.find(".long-rest").on("click", this._onLongRest.bind(this));

    if ( this.isEditable ) {
      html.find(".editor-edit").on("click", this._onEditBiography.bind(this));
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onShowPortrait(event) {
    if ( !event.target.closest(".death-saves") ) return super._onShowPortrait();
  }

  /* -------------------------------------------- */

  /**
   * Take a short rest, calling the relevant function on the Actor instance.
   * @param {Event} event             The triggering click event.
   * @returns {Promise<RestResult>}  Result of the rest action.
   * @protected
   */
  async _onShortRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.shortRest();
  }

  /* -------------------------------------------- */

  /**
   * Take a long rest, calling the relevant function on the Actor instance.
   * @param {Event} event             The triggering click event.
   * @returns {Promise<RestResult>}  Result of the rest action.
   * @protected
   */
  async _onLongRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.longRest();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async activateEditor(name, options={}, initialContent="") {
    options.relativeLinks = true;
    options.plugins = {
      menu: ProseMirror.ProseMirrorMenu.build(ProseMirror.defaultSchema, {
        compact: true,
        destroyOnSave: true,
        onSave: () => {
          this.saveEditor(name, { remove: true });
          this.editingDescriptionTarget = null;
        }
      })
    };
    return super.activateEditor(name, options, initialContent);
  }

  /* -------------------------------------------- */

  /**
   * Handle editing a biography section.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onEditBiography(event) {
    const { target } = event.currentTarget.closest("[data-target]").dataset;
    this.editingDescriptionTarget = target;
    this.render();
  }
}
