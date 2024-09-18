import CharacterData from "../../data/actor/character.mjs";
import * as Trait from "../../documents/actor/trait.mjs";
import { formatNumber } from "../../utils.mjs";
import CompendiumBrowser from "../compendium-browser.mjs";
import ContextMenu5e from "../context-menu.mjs";
import SheetConfig5e from "../sheet-config.mjs";
import ActorSheet5eCharacter from "./character-sheet.mjs";
import ActorSheetV2Mixin from "./sheet-v2-mixin.mjs";

/**
 * An Actor sheet for player character type actors.
 * @mixes ActorSheetV2
 */
export default class ActorSheet5eCharacter2 extends ActorSheetV2Mixin(ActorSheet5eCharacter) {
  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "sheet", "actor", "character", "vertical-tabs"],
      tabs: [{ navSelector: ".tabs", contentSelector: ".tab-body", initial: "details" }],
      dragDrop: [
        { dragSelector: ".item-list .item > .item-row", dropSelector: null },
        { dragSelector: ".item-list .item .activity-row", dropSelector: null },
        { dragSelector: ".containers .container", dropSelector: null },
        { dragSelector: ".favorites :is([data-item-id], [data-effect-id])", dropSelector: null },
        { dragSelector: ":is(.race, .background)[data-item-id]", dropSelector: null },
        { dragSelector: ".classes .gold-icon[data-item-id]", dropSelector: null },
        { dragSelector: "[data-key] .skill-name, [data-key] .tool-name", dropSelector: null },
        { dragSelector: ".spells-list .spell-header, .slots[data-favorite-id]", dropSelector: null }
      ],
      scrollY: [".main-content"],
      width: 800,
      height: 1000,
      resizable: true
    });
  }

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

  /** @override */
  static TABS = [
    { tab: "details", label: "DND5E.Details", icon: "fas fa-cog" },
    { tab: "inventory", label: "DND5E.Inventory", svg: "backpack" },
    { tab: "features", label: "DND5E.Features", icon: "fas fa-list" },
    { tab: "spells", label: "TYPES.Item.spellPl", icon: "fas fa-book" },
    { tab: "effects", label: "DND5E.Effects", icon: "fas fa-bolt" },
    { tab: "biography", label: "DND5E.Biography", icon: "fas fa-feather" }
  ];

  /**
   * Whether the user has manually opened the death save tray.
   * @type {boolean}
   * @protected
   */
  _deathTrayOpen = false;

  /* -------------------------------------------- */

  /** @override */
  get template() {
    if ( !game.user.isGM && this.actor.limited ) return "systems/dnd5e/templates/actors/limited-sheet-2.hbs";
    return "systems/dnd5e/templates/actors/character-sheet-2.hbs";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _render(force=false, options={}) {
    await super._render(force, options);
    if ( !this.rendered ) return;
    const context = options.renderContext ?? options.action;
    const data = options.renderData ?? options.data;
    const isUpdate = (context === "update") || (context === "updateActor");
    const hp = foundry.utils.getProperty(data ?? {}, "system.attributes.hp.value");
    if ( isUpdate && (hp === 0) ) this._toggleDeathTray(true);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = await super.getData(options);
    const { attributes, details, traits } = this.actor.system;

    // Class
    context.labels.class = Object.values(this.actor.classes).sort((a, b) => {
      return b.system.levels - a.system.levels;
    }).map(c => `${c.name} ${c.system.levels}`).join(" / ");

    // Exhaustion
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

    // Speed
    context.speed = Object.entries(CONFIG.DND5E.movementTypes).reduce((obj, [k, label]) => {
      const value = attributes.movement[k];
      if ( value > obj.value ) Object.assign(obj, { value, label });
      return obj;
    }, { value: 0, label: CONFIG.DND5E.movementTypes.walk });

    // Death Saves
    context.death.open = this._deathTrayOpen;

    // Ability Scores
    context.abilityRows = Object.entries(context.abilities).reduce((obj, [k, ability]) => {
      ability.key = k;
      ability.abbr = CONFIG.DND5E.abilities[k]?.abbreviation ?? "";
      ability.baseValue = context.source.abilities[k]?.value ?? 0;
      if ( obj.bottom.length > 5 ) obj.top.push(ability);
      else obj.bottom.push(ability);
      return obj;
    }, { top: [], bottom: [] });
    context.abilityRows.optional = Object.keys(CONFIG.DND5E.abilities).length - 6;

    // Saving Throws
    context.saves = {};
    for ( let ability of Object.values(context.abilities) ) {
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
        save: attributes.concentration.save
      };
    }

    // Size
    context.size = {
      label: CONFIG.DND5E.actorSizes[traits.size]?.label ?? traits.size,
      abbr: CONFIG.DND5E.actorSizes[traits.size]?.abbreviation ?? "—",
      mod: attributes.encumbrance.mod
    };

    // Skills & Tools
    for ( const [key, entry] of Object.entries(context.skills).concat(Object.entries(context.tools)) ) {
      entry.class = this.constructor.PROFICIENCY_CLASSES[context.editable ? entry.baseValue : entry.value];
      if ( key in CONFIG.DND5E.skills ) entry.reference = CONFIG.DND5E.skills[key].reference;
      else if ( key in CONFIG.DND5E.tools ) entry.reference = Trait.getBaseItemUUID(CONFIG.DND5E.tools[key].id);
    }

    // Character Background
    context.creatureType = {
      class: details.type.value === "custom" ? "none" : "",
      icon: CONFIG.DND5E.creatureTypes[details.type.value]?.icon ?? "icons/svg/mystery-man.svg",
      title: details.type.value === "custom"
        ? details.type.custom
        : CONFIG.DND5E.creatureTypes[details.type.value]?.label,
      reference: CONFIG.DND5E.creatureTypes[details.type.value]?.reference,
      subtitle: details.type.subtype
    };

    if ( details.race instanceof dnd5e.documents.Item5e ) context.race = details.race;
    if ( details.background instanceof dnd5e.documents.Item5e ) context.background = details.background;

    // Senses
    if ( foundry.utils.isEmpty(context.senses) ) delete context.senses;

    // Spellcasting
    context.spellcasting = [];
    for ( const item of Object.values(this.actor.classes).sort((a, b) => b.system.levels - a.system.levels) ) {
      const sc = item.spellcasting;
      if ( !sc?.progression || (sc.progression === "none") ) continue;
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
    }

    // Characteristics
    context.characteristics = [
      "alignment", "eyes", "height", "faith", "hair", "weight", "gender", "skin", "age"
    ].map(k => {
      const fields = CharacterData.schema.fields.details.fields;
      const field = fields[k];
      const name = `system.details.${k}`;
      return { name, label: field.label, value: foundry.utils.getProperty(this.actor, name) ?? "" };
    });

    // Favorites
    context.favorites = await this._prepareFavorites();
    context.favorites.sort((a, b) => a.sort - b.sort);

    // Epic Boons
    if ( context.system.details.xp.boonsEarned !== undefined ) {
      const pluralRules = new Intl.PluralRules(game.i18n.lang);
      context.epicBoonsEarned = game.i18n.format(
        `DND5E.ExperiencePointsBoons.${pluralRules.select(context.system.details.xp.boonsEarned ?? 0)}`,
        { number: formatNumber(context.system.details.xp.boonsEarned ?? 0, { signDisplay: "always" }) }
      );
    }

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareItems(context) {
    super._prepareItems(context);
    context.containers = context.inventory
      .findSplice(entry => entry.dataset.type === "container")
      ?.items?.sort((a, b) => a.sort - b.sort);
    context.inventory = context.inventory.filter(entry => entry.items.length);
    context.inventory.push({ label: "DND5E.Contents", items: [], dataset: { type: "all" } });
    context.inventory.forEach(section => {
      section.categories = [
        { activityPartial: "dnd5e.activity-column-price" },
        { activityPartial: "dnd5e.activity-column-weight" },
        { activityPartial: "dnd5e.activity-column-quantity" },
        { activityPartial: "dnd5e.activity-column-uses" },
        { activityPartial: "dnd5e.activity-column-controls" }
      ];
    });

    // Remove races & background as they are shown on the details tab instead.
    const features = context.features.filter(f => (f.dataset.type !== "background") && (f.dataset.type !== "race"));
    features.forEach(f => {
      if ( f.hasActions ) f.dataset.type = "active";
      else f.dataset.type = "passive";
    });

    // Add extra categories for features grouping.
    Object.values(this.actor.classes ?? {}).sort((a, b) => b.system.levels - a.system.levels).forEach(cls => {
      features.push({
        label: game.i18n.format("DND5E.FeaturesClass", { class: cls.name }),
        items: [],
        dataset: { type: cls.identifier }
      });
    });

    if ( this.actor.system.details.race instanceof dnd5e.documents.Item5e ) {
      features.push({ label: "DND5E.Species.Features", items: [], dataset: { type: "race" } });
    }

    if ( this.actor.system.details.background instanceof dnd5e.documents.Item5e ) {
      features.push({ label: "DND5E.FeaturesBackground", items: [], dataset: { type: "background" } });
    }

    features.push({ label: "DND5E.FeaturesOther", items: [], dataset: { type: "other" } });
    context.classes = features.findSplice(f => f.isClass)?.items;

    context.features = {
      sections: features,
      filters: [
        { key: "action", label: "DND5E.Action" },
        { key: "bonus", label: "DND5E.BonusAction" },
        { key: "reaction", label: "DND5E.Reaction" },
        { key: "sr", label: "DND5E.ShortRest" },
        { key: "lr", label: "DND5E.LongRest" },
        { key: "concentration", label: "DND5E.Concentration" },
        { key: "mgc", label: "DND5E.Item.Property.Magical" }
      ]
    };

    // TODO: Customise this per-section.
    features.forEach(section => {
      section.categories = [
        {
          classes: "item-uses", label: "DND5E.Uses", itemPartial: "dnd5e.column-uses",
          activityPartial: "dnd5e.activity-column-uses"
        },
        {
          classes: "item-recovery", label: "DND5E.Recovery", itemPartial: "dnd5e.column-recovery",
          activityPartial: "dnd5e.activity-column-recovery"
        },
        {
          classes: "item-controls", itemPartial: "dnd5e.column-feature-controls",
          activityPartial: "dnd5e.activity-column-controls"
        }
      ];
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".death-tab").on("click", () => this._toggleDeathTray());
    html.find("[data-action]").on("click", this._onAction.bind(this));

    // Apply special context menus for items outside inventory elements
    const featuresElement = html[0].querySelector(`[data-tab="features"] ${this.options.elements.inventory}`);
    if ( featuresElement ) {
      new ContextMenu5e(html, ".pills-lg [data-item-id], .favorites [data-item-id]", [], {
        onOpen: (...args) => featuresElement._onOpenContextMenu(...args)
      });
    }

    // Edit mode only.
    if ( this._mode === this.constructor.MODES.EDIT ) {
      html.find(".tab.details .item-action").on("click", this._onItemAction.bind(this));
    }

    if ( !this.isEditable ) {
      html[0].querySelectorAll('[data-action="findItem"]').forEach(el => el.classList.add("disabled"));
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _disableOverriddenFields(html) {
    // When in edit mode, field values will be the base value, rather than the derived value, so it should not be
    // necessary to disable them anymore.
  }

  /* -------------------------------------------- */

  /** @override */
  _getSubmitData(updateData={}) {
    // Skip over ActorSheet#_getSubmitData to allow for editing overridden values.
    return FormApplication.prototype._getSubmitData.call(this, updateData);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async activateEditor(name, options={}, initialContent="") {
    options.relativeLinks = true;
    options.plugins = {
      menu: ProseMirror.ProseMirrorMenu.build(ProseMirror.defaultSchema, {
        compact: true,
        destroyOnSave: false,
        onSave: () => this.saveEditor(name, { remove: false })
      })
    };
    return super.activateEditor(name, options, initialContent);
  }

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
  _onDragStart(event) {
    // Add another deferred deactivation to catch the second pointerenter event that seems to be fired on Firefox.
    requestAnimationFrame(() => game.tooltip.deactivate());
    game.tooltip.deactivate();

    const modes = CONFIG.DND5E.spellPreparationModes;

    const { key } = event.target.closest("[data-key]")?.dataset ?? {};
    const { level, preparationMode } = event.target.closest("[data-level]")?.dataset ?? {};
    const isSlots = event.target.closest("[data-favorite-id]") || event.target.classList.contains("spell-header");
    let type;
    if ( key in CONFIG.DND5E.skills ) type = "skill";
    else if ( key in CONFIG.DND5E.tools ) type = "tool";
    else if ( modes[preparationMode]?.upcast && (level !== "0") && isSlots ) type = "slots";
    if ( !type ) {
      if ( event.target.matches("[data-item-id] > .item-row") ) return this._onDragItem(event);
      else if ( event.target.matches("[data-item-id] [data-activity-id], [data-item-id][data-activity-id]") ) {
        return this._onDragActivity(event);
      }
      return super._onDragStart(event);
    }
    const dragData = { dnd5e: { action: "favorite", type } };
    if ( type === "slots" ) dragData.dnd5e.id = (preparationMode === "prepared") ? `spell${level}` : preparationMode;
    else dragData.dnd5e.id = key;
    event.dataTransfer.setData("application/json", JSON.stringify(dragData));
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
   * Handle the user performing some sheet action.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onAction(event) {
    const target = event.currentTarget;
    switch ( target.dataset.action ) {
      case "findItem":
        this._onFindItem(target.dataset.itemType, { classIdentifier: target.dataset.classIdentifier });
        break;
      case "removeFavorite": this._onRemoveFavorite(event); break;
      case "spellcasting": this._onToggleSpellcasting(event); break;
      case "toggleInspiration": this._onToggleInspiration(); break;
      case "useFavorite": this._onUseFavorite(event); break;
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeInput(event) {
    const { name } = event.target.dataset;
    const { itemId } = event.target.closest("[data-item-id]")?.dataset ?? {};
    const item = this.actor.items.get(itemId);
    if ( event.target.closest(".favorites") && name && item ) return item.update({ [name]: event.target.value });
    return super._onChangeInput(event);
  }

  /* -------------------------------------------- */

  /** @override */
  _onConfigureSheet(event) {
    event.preventDefault();
    new SheetConfig5e(this.document, {
      top: this.position.top + 40,
      left: this.position.left + ((this.position.width - DocumentSheet.defaultOptions.width) / 2)
    }).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Show available items of a given type.
   * @param {string} type                       The item type.
   * @param {object} [options={}]
   * @param {string} [options.classIdentifier]  Identifier of the class when finding a subclass.
   * @protected
   */
  async _onFindItem(type, { classIdentifier }={}) {
    if ( !this.isEditable ) return;
    const filters = { locked: { types: new Set([type]) } };
    if ( classIdentifier ) filters.locked.additional = { class: { [classIdentifier]: 1 } };
    const result = await CompendiumBrowser.selectOne({ filters });
    if ( result ) this._onDropItemCreate(await fromUuid(result));
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling inspiration.
   * @protected
   */
  _onToggleInspiration() {
    this.actor.update({ "system.attributes.inspiration": !this.actor.system.attributes.inspiration });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the character's primary spellcasting ability.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onToggleSpellcasting(event) {
    const ability = event.currentTarget.closest("[data-ability]")?.dataset.ability;
    this.actor.update({ "system.attributes.spellcasting": ability });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _filterItem(item) {
    if ( item.type === "container" ) return true;
  }

  /* -------------------------------------------- */
  /*  Favorites                                   */
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
    if ( data.type === "Activity" ) return this._onDropActivity(event, data);
    return super._onDrop(event);
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping an Activity onto the sheet.
   * @param {DragEvent} event  The originating drag event.
   * @param {object} data      The Activity drag data.
   * @returns {Promise<Actor5e|void>}
   * @protected
   */
  async _onDropActivity(event, data) {
    if ( !event.target.closest(".favorites") ) return;
    const activity = await fromUuid(data.uuid);
    if ( !activity ) return;
    const uuid = `${activity.item.getRelativeUUID(this.actor)}.Activity.${activity.id}`;
    return this._onDropFavorite(event, { type: "activity", id: uuid });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDropItem(event, data) {
    if ( !event.target.closest(".favorites") ) return super._onDropItem(event, data);
    const item = await Item.implementation.fromDropData(data);
    if ( item?.parent !== this.actor ) return super._onDropItem(event, data);
    const uuid = item.getRelativeUUID(this.actor);
    return this._onDropFavorite(event, { type: "item", id: uuid });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDropActiveEffect(event, data) {
    if ( !event.target.closest(".favorites") ) return super._onDropActiveEffect(event, data);
    const effect = await ActiveEffect.implementation.fromDropData(data);
    if ( effect.target !== this.actor ) return super._onDropActiveEffect(event, data);
    const uuid = effect.getRelativeUUID(this.actor);
    return this._onDropFavorite(event, { type: "effect", id: uuid });
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

  /**
   * Handle removing a favorite.
   * @param {PointerEvent} event  The triggering event.
   * @returns {Promise<Actor5e>|void}
   * @protected
   */
  _onRemoveFavorite(event) {
    const { favoriteId } = event.currentTarget.closest("[data-favorite-id]")?.dataset ?? {};
    if ( !favoriteId ) return;
    return this.actor.system.removeFavorite(favoriteId);
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
    const updates = SortingHelpers.performIntegerSort(source, { target, siblings });
    const favorites = this.actor.system.favorites.reduce((map, f) => map.set(f.id, { ...f }), new Map());
    for ( const { target, update } of updates ) {
      const favorite = favorites.get(target.id);
      foundry.utils.mergeObject(favorite, update);
    }
    return this.actor.update({ "system.favorites": Array.from(favorites.values()) });
  }

  /* -------------------------------------------- */

  /**
   * Handle using a favorited item.
   * @param {PointerEvent} event  The triggering event.
   * @returns {Promise|void}
   * @protected
   */
  async _onUseFavorite(event) {
    if ( !this.isEditable || (event.target.tagName === "INPUT") ) return;
    const { favoriteId } = event.currentTarget.closest("[data-favorite-id]").dataset;
    const favorite = await fromUuid(favoriteId, { relative: this.actor });
    if ( (favorite instanceof dnd5e.documents.Item5e) || event.currentTarget.dataset.activityId ) {
      return favorite.use({ legacy: false, event });
    }
    if ( favorite instanceof dnd5e.documents.ActiveEffect5e ) return favorite.update({ disabled: !favorite.disabled });
  }

  /* -------------------------------------------- */

  /**
   * Prepare favorites for display.
   * @returns {Promise<object>}
   * @protected
   */
  async _prepareFavorites() {
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
      if ( !favorite && ((type === "item") || (type === "effect")) ) return arr;
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
        effectId: type === "effect" ? favorite.id : null,
        parentId: (type === "effect") && (favorite.parent !== favorite.target) ? favorite.parent.id: null,
        activityId: type === "activity" ? favorite.id : null,
        preparationMode: (type === "slots") ? (/spell\d+/.test(id) ? "prepared" : id) : null,
        key: (type === "skill") || (type === "tool") ? id : null,
        toggle: toggle === undefined ? null : { applicable: true, value: toggle },
        quantity: quantity > 1 ? quantity : "",
        rollableClass: rollableClass.filterJoin(" "),
        css: css.filterJoin(" "),
        bareName: type === "slots",
        subtitle: Array.isArray(subtitle) ? subtitle.filterJoin(" &bull; ") : subtitle
      });
      return arr;
    }, []));
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
      const { value, max, level } = this.actor.system.spells[id] ?? {};
      const uses = { value, max, name: `system.spells.${id}.value` };
      if ( !/spell\d+/.test(id) ) return {
        uses, level,
        title: game.i18n.localize(`DND5E.SpellSlots${id.capitalize()}`),
        subtitle: [
          game.i18n.localize(`DND5E.SpellLevel${level}`),
          game.i18n.localize(`DND5E.Abbreviation${CONFIG.DND5E.spellcastingTypes[id]?.shortRest ? "SR" : "LR"}`)
        ],
        img: CONFIG.DND5E.spellcastingTypes[id]?.img || CONFIG.DND5E.spellcastingTypes.pact.img
      };

      const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
      const isSR = CONFIG.DND5E.spellcastingTypes.leveled.shortRest;
      return {
        uses, level,
        title: game.i18n.format(`DND5E.SpellSlotsN.${plurals.select(level)}`, { n: level }),
        subtitle: game.i18n.localize(`DND5E.Abbreviation${isSR ? "SR" : "LR"}`),
        img: CONFIG.DND5E.spellcastingTypes.leveled.img.replace("{id}", id)
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
        reference = Trait.getBaseItemUUID(CONFIG.DND5E.toolIds[id]);
        ({ img, name: title } = Trait.getBaseItem(reference, { indexOnly: true }));
      }
      else if ( type === "skill" ) ({ icon: img, label: title, reference } = CONFIG.DND5E.skills[id]);
      return { img, title, subtitle, modifier: total, passive, reference };
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  canExpand(item) {
    return !["background", "race"].includes(item.type) && super.canExpand(item);
  }
}
