import { formatCR, formatWeight, getPluralRules, parseDelta } from "../../utils.mjs";
import CompendiumBrowser from "../compendium-browser.mjs";
import ContextMenu5e from "../context-menu.mjs";
import BaseActorSheet from "./api/base-actor-sheet.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * @import { CrewArea5e } from "./_types.mjs";
 */

/**
 * Extension of base actor sheet for vehicles.
 */
export default class VehicleActorSheet extends BaseActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      adjustCrew: VehicleActorSheet.#onAdjustCrew,
      browseActors: VehicleActorSheet.#onBrowseActors,
      createItem: VehicleActorSheet.#onCreateItem,
      removeMember: VehicleActorSheet.#onRemoveMember,
      toggleEditInline: VehicleActorSheet.#onToggleEditInline,
      uncrew: VehicleActorSheet.#onUncrew,
      useItem: VehicleActorSheet.#onUseItem
    },
    classes: ["vehicle"],
    position: {
      width: 700,
      height: 800
    },
    tab: "inventory"
  };

  /* -------------------------------------------- */

  /**
   * FIXME: Wart
   * @type {Record<number, string>}
   */
  static COVER = {
    .5: "EFFECT.DND5E.StatusHalfCover",
    .75: "EFFECT.DND5E.StatusThreeQuartersCover",
    1: "EFFECT.DND5E.StatusTotalCover"
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    sidebarCollapser: {
      template: "systems/dnd5e/templates/actors/parts/sidebar-collapser.hbs"
    },
    sidebar: {
      template: "systems/dnd5e/templates/actors/vehicle/sidebar.hbs",
      templates: [
        "systems/dnd5e/templates/actors/parts/actor-trait-line.hbs",
        "systems/dnd5e/templates/actors/parts/actor-trait-pills.hbs"
      ],
      scrollable: [""]
    },
    stations: {
      template: "systems/dnd5e/templates/actors/vehicle/stations.hbs",
      templates: ["systems/dnd5e/templates/inventory/inventory.hbs", "systems/dnd5e/templates/inventory/activity.hbs"],
      scrollable: [""]
    },
    tabs: {
      template: "systems/dnd5e/templates/shared/horizontal-tabs.hbs",
      templates: ["templates/generic/tab-navigation.hbs"]
    },
    inventory: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/actor-inventory.hbs",
      templates: [
        "systems/dnd5e/templates/inventory/inventory.hbs", "systems/dnd5e/templates/inventory/activity.hbs",
        "systems/dnd5e/templates/inventory/containers.hbs", "systems/dnd5e/templates/inventory/encumbrance.hbs"
      ],
      scrollable: [""]
    },
    crew: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/vehicle/crew.hbs",
      scrollable: [""]
    },
    effects: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/actor-effects.hbs",
      scrollable: [""]
    },
    description: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/vehicle/description.hbs",
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static TABS = [
    { tab: "inventory", label: "DND5E.VEHICLE.Tabs.Cargo" },
    { tab: "crew", label: "DND5E.VEHICLE.Tabs.CrewPassengers", condition: this.vehicleHasCrew },
    { tab: "effects", label: "DND5E.Effects" },
    { tab: "description", label: "DND5E.Description" }
  ];

  /* -------------------------------------------- */

  /** @override */
  static unsupportedItemTypes = new Set(["background", "class", "facility", "race", "spell", "subclass"]);

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "inventory"
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _configureInventorySections(sections) {
    sections.forEach(s => s.minWidth = 180);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.options = {
      showAbilities: this.actor.getFlag("dnd5e", "showVehicleAbilities"),
      showInitiative: this.actor.getFlag("dnd5e", "showVehicleInitiative"),
      showQuality: this.actor.getFlag("dnd5e", "showVehicleQuality")
    };
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare crew context.
   * @param {object} context  Shared context provided by _prepareContext.
   * @param {object} options  Application render options.
   * @returns {Promise<object>}
   * @protected
   */
  async _prepareCrewContext(context, options) {
    const { groupCrew, resolveCrew } = this.constructor;
    if ( context.system.crew.value.length ) {
      const crew = groupCrew(context.system.crew.value);
      const unassigned = { ...crew };
      const { stations=[] } = context.itemCategories;
      const assigned = stations.flatMap(i => i.system.crew.value).reduce((obj, uuid) => {
        const max = crew[uuid];
        if ( !max ) return obj;
        obj[uuid] ??= 0;
        obj[uuid]++;
        unassigned[uuid]--;
        return obj;
      }, {});
      context.crew = { assigned: await resolveCrew(assigned), unassigned: await resolveCrew(unassigned, crew) };
    }

    if ( context.system.passengers.value.length ) {
      const passengers = groupCrew(context.system.passengers.value);
      context.passengers = await resolveCrew(passengers);
    }

    context.tab.cssClass += ` sheet-crew ${context.crew?.assigned.value.length ? "has-assigned" : ""}`;
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare description context.
   * @param {object} context  Shared context provided by _prepareContext.
   * @param {object} options  Application render options.
   * @returns {Promise<object>}
   * @protected
   */
  async _prepareDescriptionContext(context, options) {
    context.tab.cssClass += ` sheet-description ${context.editable ? "editing" : ""}`;
    context.description = await TextEditor.enrichHTML(this.actor.system.details.biography.value, {
      secrets: this.actor.isOwner, relativeTo: this.actor, rollData: context.rollData
    });
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

  /** @inheritDoc */
  async _prepareInventoryContext(context, options) {
    context = await super._prepareInventoryContext(context, options);
    context.encumbrance = await this.actor.system.getEncumbrance();
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "crew": return this._prepareCrewContext(context, options);
      case "description": return this._prepareDescriptionContext(context, options);
      case "effects": return this._prepareEffectsContext(context, options);
      case "inventory": return this._prepareInventoryContext(context, options);
      case "sidebar": return this._prepareSidebarContext(context, options);
      case "stations": return this._prepareStationsContext(context, options);
      default: return context;
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare sidebar context.
   * @param {object} context  Shared context provided by _prepareContext.
   * @param {object} options  Application render options.
   * @returns {object}
   * @protected
   */
  _prepareSidebarContext(context, options) {
    const { attributes } = this.actor.system;
    const { actions } = attributes;
    context.traits = this._prepareTraits(context);
    context.properties ??= {};
    context.properties.hp = [];
    if ( attributes.hp.dt ) context.properties.hp.push({ label: "DND5E.HITPOINTS.DT.abbr", value: attributes.hp.dt });
    if ( attributes.hp.mt ) context.properties.hp.push({
      label: "DND5E.VEHICLE.Mishap.label", value: attributes.hp.mt
    });
    if ( !actions.stations && actions.max ) {
      const plurals = getPluralRules({ type: "ordinal" });
      context.actions = Array.fromRange(actions.max, 1).map(n => {
        const filled = actions.value >= n;
        const classes = ["pip"];
        if ( filled ) classes.push("filled");
        return {
          filled,
          n: actions.max - n,
          label: game.i18n.format(`DND5E.VEHICLE.Actions.Ordinal.${plurals.select(n)}`, { n }),
          classes: classes.join(" ")
        };
      });
    }
    context.showTravelPace = !!context.system.attributes.travel.paces.max;
    context.showTravelSpeed = !!context.system.attributes.travel.speeds.max;
    context.showCombatSpeed = !!context.system.attributes.movement.max
      || (context.editable && !context.showTravelPace && !context.showTravelSpeed);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare stations context.
   * @param {object} context  Shared context provided by _prepareContext.
   * @param {object} options  Application render options.
   * @returns {Promise<object>}
   * @protected
   */
  async _prepareStationsContext(context, options) {
    const Inventory = customElements.get(this.options.elements.inventory);
    const columns = Inventory.mapColumns(["uses", "controls"]);
    const sections = Object.fromEntries(["features", "bonus", "reaction"].map((id, i) => {
      const { header } = CONFIG.DND5E.activityActivationTypes[id] ?? {};
      const label = id === "features" ? "DND5E.Features" : header;
      return [id, { columns, id, label, order: (i + 1) * 100, items: [], minWidth: 170 }];
    }));
    context.itemCategories.features?.forEach(i => {
      let group = i.system.activities?.contents[0]?.activation.type;
      if ( (group !== "bonus") && (group !== "reaction") ) group = "features";
      sections[group].items.push(i);
    });
    context.itemCategories.stations?.sort((a, b) => a.sort - b.sort);
    context.itemCategories.features?.sort((a, b) => a.sort - b.sort);
    if ( context.itemCategories.features?.length ) {
      context.features = Inventory.prepareSections(Object.values(sections));
    }
    if ( context.system.draft.value.length ) context.drafted = await this._prepareDraftAnimals();
    context.abilities = this._prepareAbilities(context);
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderFrame(options) {
    const html = await super._renderFrame(options);
    this._renderSourceFrame(html);
    return html;
  }

  /* -------------------------------------------- */
  /*  Actor Preparation Helpers                   */
  /* -------------------------------------------- */

  /**
   * Prepare render context for draft animals.
   * @returns {Promise<object>}
   * @protected
   */
  async _prepareDraftAnimals() {
    const { baseUnits, draftMultiplier } = CONFIG.DND5E.encumbrance;
    const unitSystem = game.settings.get("dnd5e", "metricWeightUnits") ? "metric" : "imperial";
    const units = baseUnits.default[unitSystem];
    return Promise.all(this.actor.system.draft.value.map(async uuid => {
      const actor = await fromUuid(uuid);
      const { system } = actor;
      const capacity = (actor.system.attributes?.encumbrance?.max || 0) * draftMultiplier;
      const subtitle = [
        CONFIG.DND5E.actorSizes[system.traits?.size]?.label,
        system.details?.type?.label,
        capacity ? formatWeight(capacity, units) : null
      ].filterJoin(" • ");
      return { actor, capacity, subtitle, uuid };
    }));
  }

  /* -------------------------------------------- */
  /*  Item Preparation Helpers                    */
  /* -------------------------------------------- */

  /** @override */
  _assignItemCategories(item) {
    if ( item.type === "container" ) return new Set(["containers", "inventory"]);
    if ( item.type === "facility" ) return new Set(["facilities"]);
    if ( item.system.isMountable ) return new Set(["stations"]);
    if ( "inventorySection" in item.system.constructor ) return new Set(["inventory"]);
    return new Set(["features"]);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareItemPhysical(item, ctx) {
    await super._prepareItemPhysical(item, ctx);
    if ( !item.system.isMountable ) return;
    const { COVER } = this.constructor;
    const { armor, cover, crew, hp } = item.system;
    const subtitles = [];
    if ( COVER[cover] ) subtitles.push(game.i18n.localize(COVER[cover]));
    if ( armor?.value ) subtitles.push(`${game.i18n.localize("DND5E.AC")} ${armor.value}`);
    if ( hp?.dt ) subtitles.push(`${game.i18n.localize("DND5E.HITPOINTS.DT.abbr")} ${hp.dt}`);
    if ( subtitles.length ) ctx.subtitle = subtitles.join(" • ");
    if ( item.type === "weapon" ) {
      const enrichmentOptions = { secrets: item.isOwner, relativeTo: item, rollData: item.getRollData() };
      const damage = Array.from(item.system.activities.values()).flatMap(a => a.damage?.parts ?? []);
      ctx.enriched = {
        attack: await TextEditor.enrichHTML("[[/attack extended]]", enrichmentOptions)
      };
      if ( damage.length ) {
        ctx.enriched.damage = await TextEditor.enrichHTML("[[/damage extended]]", enrichmentOptions);
      }
    }
    ctx.crew = await Promise.all(Array.fromRange(Math.max(crew.max ?? -1, crew.value.length)).map(async index => {
      const uuid = crew.value[index];
      if ( uuid ) return { index, actor: await fromUuid(uuid) };
      return { empty: true };
    }));
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);

    // Apply special context menus for items outside inventory elements.
    const cargoElement = this.element.querySelector('[data-tab="inventory"] .inventory-element');
    if ( cargoElement ) new ContextMenu5e(this.element, ".station[data-item-id]", [], {
      onOpen: (...args) => cargoElement._onOpenContextMenu(...args), jQuery: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    this._renderContainers(context, options);
    await super._onRender(context, options);
    if ( !this.actor.limited ) this._renderCreateInventory();
    for ( const input of this.element.querySelectorAll('[data-action="toggleEditInline"] input[hidden]') ) {
      input.addEventListener("blur", event => VehicleActorSheet.#onToggleEditInline.call(this, event, input));
    }
    const hasStations = context.editable
      || context.itemCategories.features?.length
      || context.itemCategories.stations?.length
      || context.system.draft.value.length
      || this.actor.getFlag("dnd5e", "showVehicleAbilities");
    this.element.classList.toggle("has-stations", !!hasStations);
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Handle adjustments to the crew roster.
   * @this {VehicleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onAdjustCrew(event, target) {
    const input = target.parentElement.querySelector("input");
    const value = Number(input.value) + Number(target.dataset.delta);
    if ( Number.isNaN(value) ) return;
    input.value = value;
    input._debouncedChange ??= foundry.utils.debounce(() => {
      input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    }, 250);
    input._debouncedChange();
  }

  /* -------------------------------------------- */

  /**
   * Spawn a compendium browser for browsing Actors.
   * @this {VehicleActorSheet}
   */
  static #onBrowseActors() {
    new CompendiumBrowser({
      filters: {
        locked: {
          documentClass: "Actor",
          types: new Set(["npc"])
        }
      }
    }).render({ force: true });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeInputDelta(event) {
    const input = event.target;
    const { area } = input.closest("[data-area]")?.dataset ?? {};
    const { uuid } = input.closest("[data-uuid]")?.dataset ?? {};
    if ( !area || !uuid || !input.closest(".crew-quantity") ) return super._onChangeInputDelta(event);
    let value = input.value;
    if ( /^\d+$/.test(value) || (value[0] === "=") ) {
      value = parseDelta(value) + Number(input.nextElementSibling.value);
    }
    return this.actor.system.adjustCrew(area, uuid, value);
  }

  /* -------------------------------------------- */

  /**
   * Handle creating an item.
   * @this {VehicleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   * @returns {Promise<Item5e>}
   */
  static #onCreateItem(event, target) {
    const Item = getDocumentClass("Item");
    const { type } = target.closest("[data-type]")?.dataset ?? {};
    const name = game.i18n.format("DOCUMENT.New", { type: game.i18n.localize(Item.metadata.label) });
    const createData = { name, type };
    if ( type === "equipment" ) createData["system.type.value"] = "vehicle";
    else if ( type === "weapon" ) createData["system.type.value"] = "siege";
    return Item.create(createData, { parent: this.actor, renderSheet: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing a draft animal.
   * @this {VehicleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onRemoveMember(event, target) {
    const { uuid } = target.closest("[data-uuid]")?.dataset ?? {};
    const draft = [...this.actor.system.draft.value];
    const removed = draft.findSplice(u => u === uuid);
    if ( removed ) this.actor.update({ "system.draft.value": draft });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling an inline value editor.
   * @this {VehicleActorSheet}
   * @param {Event} event         The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onToggleEditInline(event, target) {
    target = target.closest('[data-action="toggleEditInline"]');
    const edit = event.type !== "blur";
    const display = target.querySelectorAll(".display");
    const input = target.querySelector("input");
    if ( !display.length || !input ) return;
    target.classList.toggle("rollable", !edit);
    display.forEach(el => el.hidden = edit);
    input.hidden = !edit;
    if ( edit ) input.focus();
  }

  /* -------------------------------------------- */

  /**
   * Handle uncrewing a station.
   * @this {VehicleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onUncrew(event, target) {
    const { uuid } = target.closest("[data-uuid]")?.dataset ?? {};
    const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
    const item = this.actor.items.get(itemId);
    if ( !item ) return;
    const crew = [...item.system.crew.value];
    crew.findSplice(u => u === uuid);
    item.update({ "system.crew.value": crew });
  }

  /* -------------------------------------------- */

  /**
   * Handle using an action station.
   * @this {VehicleActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onUseItem(event, target) {
    this._onUseItem(event, target);
  }

  /* -------------------------------------------- */

  /**
   * Handle using an action station.
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   * @protected
   */
  _onUseItem(event, target) {
    const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
    const item = this.actor.items.get(itemId);
    item?.use({ event });
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDragStart(event) {
    const { area } = event.target.closest("[data-area]")?.dataset ?? {};
    const { uuid } = event.target.closest("[data-uuid]")?.dataset ?? {};
    const { itemId } = event.target.closest("[data-item-id]")?.dataset ?? {};
    const { type } = foundry.utils.parseUuid(uuid) ?? {};
    if ( !area || (type !== "Actor") ) return super._onDragStart(event);
    event.dataTransfer.setData("text/plain", JSON.stringify({ area, itemId, type, uuid }));
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropActor(event, actor) {
    if ( !actor.system.isCreature ) return;
    let { area: src, itemId } = TextEditor.getDragEventData(event);
    const { area: dest="crew" } = event.target?.closest("[data-area]")?.dataset ?? {};
    if ( !itemId ) itemId = event.target?.closest("[data-item-id]")?.dataset.itemId;
    if ( src === dest ) return;
    const item = this.actor.items.get(itemId);
    if ( item && ((src === "draft") || (dest === "draft")) ) return this._onAssignCrew(actor, item, dest, { src });
    return this._onAdjustCrew(actor, dest, { src });
  }

  /* -------------------------------------------- */
  /*  Crew Management                             */
  /* -------------------------------------------- */

  /**
   * Handle adjusting a crew member's area or adding a new one.
   * @param {Actor5e} actor             The actor.
   * @param {CrewArea5e} dest           The destination area.
   * @param {object} [options]
   * @param {CrewArea5e} [options.src]  An optional area the crew member came from.
   * @protected
   */
  _onAdjustCrew(actor, dest, { src }={}) {
    const updates = {};
    if ( src ) Object.assign(updates, this.actor.system.getCrewUpdates(src, actor.uuid, "-1"));
    Object.assign(updates, this.actor.system.getCrewUpdates(dest, actor.uuid, "+1"));
    if ( !foundry.utils.isEmpty(updates) ) this.actor.update(updates);
  }

  /* -------------------------------------------- */

  /**
   * Handle assigning or unassigned a crew member to a station.
   * @param {Actor5e} actor            The actor.
   * @param {Item5e} item              The station.
   * @param {CrewArea5e} dest          The destination area.
   * @param {object} [options]
   * @param {CrewArea5e} [options.src] An optional area the crew member came from.
   * @protected
   */
  _onAssignCrew(actor, item, dest, { src }={}) {
    const itemUpdates = { _id: item.id };
    const actorUpdates = { items: [itemUpdates] };
    let crew = foundry.utils.getProperty(item, "system.crew.value");

    // Case 1 - Assigning to a station.
    if ( dest === "draft" ) {
      // Prevent assigning a non-crew-member.
      if ( src && (src !== "crew") ) return;
      // The actor may not be a crew member yet. If so, add them to the crew.
      if ( !src ) Object.assign(actorUpdates, this.actor.system.getCrewUpdates("crew", actor.uuid, "+1"));
      foundry.utils.setProperty(itemUpdates, "system.crew.value", crew.concat(actor.uuid));
      this.actor.update(actorUpdates);
    }

    // Case 2 - Unassigning from a station.
    else {
      crew = [...crew];
      if ( !crew.findSplice(u => u === actor.uuid) ) return;
      item.update({ "system.crew.value": crew });
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Group crew by UUID.
   * @param {string[]} crew  The crew UUIDs.
   * @returns {Record<string, number>}
   */
  static groupCrew(crew) {
    return crew.reduce((obj, uuid) => {
      obj[uuid] ??= 0;
      obj[uuid]++;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * Resolve crew UUIDs.
   * @param {Record<string, number>} group     The counts for this group.
   * @param {Record<string, number>} [counts]  The true counts.
   * @returns {Promise<{ total: number, value: Array<{ actor: object, quantity: number, uuid: string }> }>}
   */
  static async resolveCrew(group, counts) {
    let total = 0;
    const value = Object.entries(group).filter(([, quantity]) => quantity).map(async ([uuid, quantity]) => {
      total += quantity;
      const actor = await fromUuid(uuid);
      const { img, name, system } = actor;
      const cr = system.details?.cr ?? system.details?.level;
      const subtitle = [
        CONFIG.DND5E.actorSizes[system.traits?.size]?.label,
        system.details?.type?.label,
        system.details?.cr ? game.i18n.format("DND5E.CRLabel", { cr: formatCR(system.details.cr) }) : null,
        system.details?.level ? game.i18n.format("DND5E.LevelNumber", { level: system.details.level }) : null
      ].filterJoin(" • ");
      return { uuid, quantity, actor: { cr, img, name, subtitle }, diff: (counts?.[uuid] ?? 0) - quantity };
    });
    return {
      total,
      value: (await Promise.all(value)).sort((a, b) => {
        return ((b.actor.cr ?? 0) - (a.actor.cr ?? 0))
          || (a.quantity - b.quantity)
          || a.actor.name.localeCompare(b.actor.name, game.i18n.lang);
      })
    };
  }

  /* -------------------------------------------- */

  /**
   * Determine if the sheet should show a Crew & Passengers tab.
   * @param {Actor5e} vehicle  The vehicle.
   * @returns {boolean}
   */
  static vehicleHasCrew(vehicle) {
    const { crew, passengers } = vehicle.system;
    return !!(crew.max || passengers.max);
  }
}
