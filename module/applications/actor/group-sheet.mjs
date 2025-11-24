import { convertWeight } from "../../utils.mjs";
import MultiActorSheet from "./api/multi-actor-sheet.mjs";
import Award from "../award.mjs";

/**
 * Extension of the base actor sheet for group actors.
 */
export default class GroupActorSheet extends MultiActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["group", "vertical-tabs"],
    position: {
      width: 700,
      height: 700
    },
    actions: {
      award: GroupActorSheet.#onAward,
      changePace: GroupActorSheet.#onChangePace,
      roll: GroupActorSheet.#onRoll,
      toggleInventory: GroupActorSheet.#onToggleInventory
    },
    tab: "members"
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {
      template: "systems/dnd5e/templates/actors/group/header.hbs"
    },
    members: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/group/members.hbs",
      templates: ["systems/dnd5e/templates/actors/group/member.hbs"],
      scrollable: [""]
    },
    inventory: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/group/inventory.hbs",
      templates: [
        "systems/dnd5e/templates/inventory/inventory.hbs", "systems/dnd5e/templates/inventory/activity.hbs",
        "systems/dnd5e/templates/inventory/containers.hbs", "systems/dnd5e/templates/inventory/encumbrance.hbs"
      ],
      scrollable: [".sidebar", ".body"]
    },
    biography: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/group/biography.hbs",
      scrollable: [""]
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
    { tab: "members", label: "DND5E.Group.Member.other", icon: "fa-solid fa-users"},
    { tab: "inventory", label: "DND5E.Inventory", svg: "systems/dnd5e/icons/svg/backpack.svg" },
    { tab: "biography", label: "DND5E.Biography", icon: "fa-solid fa-feather" }
  ];

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get inventorySource() {
    const inventorySource = this.actor.getFlag("dnd5e", "inventorySource") ?? "group";
    const { primaryVehicle } = this.actor.system;
    if ( (inventorySource === "vehicle") && primaryVehicle?.isOwner ) return primaryVehicle;
    return super.inventorySource;
  }

  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "members"
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _configureInventorySections(sections) {
    sections.forEach(s => s.minWidth = 200);
  }

  /* -------------------------------------------- */

  /**
   * Prepare the header context.
   * @param {ApplicationRenderContext} context     Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options      Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareHeaderContext(context, options) {
    context.showXP = game.settings.get("dnd5e", "levelingMode") !== "noxp";
    context.travelPace = this.actor.system.getTravelPace();
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareInventoryContext(context, options) {
    context = await super._prepareInventoryContext(context, options);
    context.members = [];
    for ( const { actor } of this.document.system.members ) {
      if ( !actor || (actor === this.inventorySource) ) continue;
      const { id, type, img, name, system, uuid } = actor;
      const member = { id, type, img, name, system, uuid };
      member.hiddenStats = !actor.testUserPermission(game.user, "OBSERVER");
      await this._prepareMemberEncumbrance(actor, member);
      context.members.push(member);
    }
    context.members.sort((a, b) => a.type.compare(b.type) || a.name.localeCompare(b.name, game.i18n.lang));
    if ( this.inventorySource.type === "vehicle" ) {
      context.encumbrance = await this.inventorySource.system.getEncumbrance();
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare members context.
   * @param {ApplicationRenderContext} context     Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options      Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareMembersContext(context, options) {
    context.sections = {
      character: { members: [], hasStats: true },
      npc: { members: [], label: "TYPES.Actor.npcPl", hasStats: true },
      vehicle: { members: [], label: "TYPES.Actor.vehiclePl" }
    };
    for ( const { actor } of this.document.system.members ) {
      if ( !actor ) continue;
      const { id, type, img, name, system, uuid } = actor;
      const section = context.sections[type];
      if ( !section ) continue;
      const member = { id, type, img, name, system, uuid };
      member.canView = actor.testUserPermission(game.user, "LIMITED");
      member.hiddenStats = !actor.testUserPermission(game.user, "OBSERVER");
      member.classes = member.hiddenStats ? [] : actor.itemTypes.class;
      await this._prepareMemberPortrait(actor, member);
      this._prepareMemberEncumbrance(actor, member);
      this._prepareMemberSkills(actor, member);
      switch ( type ) {
        case "character": await this._prepareCharacterContext(actor, member, options); break;
        case "npc": await this._prepareNPCContext(actor, member, options); break;
        case "vehicle": await this._prepareVehicleContext(actor, member, options); break;
      }
      section.members.push(member);
    }
    Object.values(context.sections).forEach(s => {
      s.members.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
    });
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "biography": return this._prepareDescriptionContext(context, options);
      case "header": return this._prepareHeaderContext(context, options);
      case "inventory": return this._prepareInventoryContext(context, options);
      case "members": return this._prepareMembersContext(context, options);
      case "tabs": return this._prepareTabsContext(context, options);
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Render a toggle for switching between inventories.
   * @protected
   */
  _renderInventoryToggle() {
    const groupInventory = this.inventorySource === this.actor;
    this.element.classList.toggle("vehicle-inventory", !groupInventory);
    const currency = this.element.querySelector(".inventory-element .currency");
    if ( !currency || !this.actor.isOwner || !this.actor.system.primaryVehicle?.isOwner ) return;
    currency.querySelectorAll("[name]").forEach(el => {
      el.dataset.name = el.name;
      el.name = "";
    });
    const button = this.element.ownerDocument.createElement("div");
    button.classList.add("split-button");
    button.innerHTML = `
      <button type="button" class="always-interactive split-control" data-action="toggleInventory"
              data-inventory="group" aria-pressed="${groupInventory}" data-tooltip
              aria-label="${game.i18n.localize("DND5E.Group.Action.Inventory.Group")}">
        <i class="fa-solid fa-list-ul fa-fw" inert></i>
      </button>
      <button type="button" class="always-interactive split-control" data-action="toggleInventory"
              data-inventory="vehicle" aria-pressed="${!groupInventory}" data-tooltip
              aria-label="${game.i18n.localize("DND5E.Group.Action.Inventory.Vehicle")}">
        <i class="fa-solid fa-wagon-covered fa-fw" inert></i>
      </button>
    `;
    currency.append(button);
    if ( !groupInventory ) this._renderCreateInventory();
  }

  /* -------------------------------------------- */
  /*  Member Preparation Helpers                  */
  /* -------------------------------------------- */

  /**
   * Prepare render context for player characters.
   * @param {Actor5e} actor                    The player character actor.
   * @param {object} context                   The render context.
   * @param {HandlebarsRenderOptions} options  Options which configure application rendering behavior.
   * @returns {Promise<void>}
   * @protected
   */
  async _prepareCharacterContext(actor, context, options) {
    const { originalClass } = context.system.details;
    const cls = actor.items.get(originalClass);
    if ( cls ) context.underlay = `var(--underlay-${cls.identifier})`;
  }

  /* -------------------------------------------- */

  /**
   * Prepare encumbrance context for members.
   * @param {Actor5e} actor   The actor instance.
   * @param {object} context  The render context.
   * @protected
   */
  async _prepareMemberEncumbrance(actor, context) {
    const encumbrance = actor.type === "vehicle"
      ? await actor.system.getEncumbrance()
      : actor.system.attributes.encumbrance;
    const { pct, max, value } = encumbrance;
    const defaultUnits = CONFIG.DND5E.encumbrance.baseUnits.default;
    const baseUnits = CONFIG.DND5E.encumbrance.baseUnits[actor.type] ?? defaultUnits;
    const systemUnits = game.settings.get("dnd5e", "metricWeightUnits") ? "metric" : "imperial";
    context.encumbrance = {
      pct,
      max: convertWeight(max, baseUnits[systemUnits], defaultUnits[systemUnits]),
      value: convertWeight(value, baseUnits[systemUnits], defaultUnits[systemUnits])
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare skills context for members.
   * @param {Actor5e} actor   The actor instance.
   * @param {object} context  The render context.
   * @protected
   */
  _prepareMemberSkills(actor, context) {
    context.skills = Object.fromEntries(Object.entries(actor.system.skills ?? {}).map(([key, skill]) => {
      const { ability, passive, total } = skill;
      const css = [actor.isOwner ? "rollable" : "", "skill"].filterJoin(" ");
      const label = game.i18n.format(actor.isOwner ? "DND5E.SkillRoll" : "DND5E.SkillTitle", {
        ability: CONFIG.DND5E.abilities[ability]?.label,
        skill: CONFIG.DND5E.skills[key]?.label
      });
      return [key, { css, label, passive, total }];
    }));
  }

  /* -------------------------------------------- */

  /**
   * Prepare render context for NPCs.
   * @param {Actor5e} actor                    The NPC actor.
   * @param {object} context                   The render context.
   * @param {HandlebarsRenderOptions} options  Options which configure application rendering behavior.
   * @returns {Promise<void>}
   * @protected
   */
  async _prepareNPCContext(actor, context, options) {
    context.underlay = `var(--underlay-npc-${actor.system.details.type.value})`;
  }

  /* -------------------------------------------- */

  /**
   * Prepare render context for vehicles.
   * @param {Actor5e} actor                    The vehicle actor.
   * @param {object} context                   The render context.
   * @param {HandlebarsRenderOptions} options  Options which configure application rendering behavior.
   * @returns {Promise<void>}
   * @protected
   */
  async _prepareVehicleContext(actor, context, options) {
    context.underlay = `var(--underlay-vehicle-${actor.system.details.type})`;
    context.isPrimaryVehicle = this.actor.system.primaryVehicle === actor;
    const { attributes } = actor.system;
    context.properties = [];
    if ( attributes.ac.value ) context.properties.push({ label: "DND5E.AC", value: attributes.ac.value });
    if ( attributes.hp.dt ) context.properties.push({ label: "DND5E.HITPOINTS.DT.abbr", value: attributes.hp.dt });
    const speed = attributes.travel.paces.max;
    if ( Number.isFinite(speed) ) context.properties.push({ label: "DND5E.Speed", value: speed });
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onClose(options) {
    super._onClose(options);
    this.actor.system.members.forEach(({ actor }) => {
      if ( actor ) delete actor.apps[this.id];
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.actor.system.members.forEach(({ actor }) => {
      if ( actor ) actor.apps[this.id] = this;
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this._renderInventoryToggle();
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Handle distributing XP & currency.
   * @this {GroupActorSheet}
   */
  static #onAward() {
    new Award({
      award: { savedDestinations: this.actor.getFlag("dnd5e", "awardDestinations") },
      origin: this.actor
    }).render({ force: true });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    if ( event.target.dataset.name?.startsWith("system.currency.") && (this.inventorySource.type === "vehicle") ) {
      return this.inventorySource.update({ [event.target.dataset.name]: event.target.value });
    }
    return super._onChangeForm(formConfig, event);
  }

  /* -------------------------------------------- */

  /**
   * Handle cycling travel pace.
   * @this {GroupActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onChangePace(event, target) {
    const increment = Number(target.dataset.increment);
    if ( Number.isNaN(increment) ) return;
    const paces = Object.keys(CONFIG.DND5E.travelPace);
    const current = paces.indexOf(this.actor.system._source.attributes.travel.pace);
    const next = (((current + increment) % paces.length) + paces.length) % paces.length;
    this.actor.update({ "system.attributes.travel.pace": paces[next] });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDropItem(event, item) {
    const { uuid } = event.target.closest("[data-uuid]")?.dataset ?? {};
    const target = await fromUuid(uuid);
    if ( target instanceof foundry.documents.Actor ) return target.sheet._onDropCreateItems(event, [item]);
    return super._onDropItem(event, item);
  }

  /* -------------------------------------------- */

  /**
   * Handle a roll for an individual group member.
   * @this {GroupActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onRoll(event, target) {
    const { type, key } = target.dataset;
    if ( type !== "skill" ) return;
    const { uuid } = target.closest("[data-uuid]")?.dataset ?? {};
    const { pace } = this.actor.system.getTravelPace();
    const actor = await fromUuid(uuid);
    if ( actor.isOwner ) actor?.rollSkill({ event, pace, skill: key });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the inventory view.
   * @this {GroupActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onToggleInventory(event, target) {
    const { inventory } = target.dataset;
    this.actor.setFlag("dnd5e", "inventorySource", inventory);
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _getEntryContextOptions() {
    return super._getEntryContextOptions().concat([{
      name: "DND5E.Group.Action.SetPrimaryVehicle",
      icon: '<i class="fa-solid fa-star"></i>',
      group: "state",
      condition: li => {
        return (foundry.utils.fromUuidSync(li.dataset.uuid)?.type === "vehicle")
          && (this.actor.system.primaryVehicle?.uuid !== li.dataset.uuid);
      },
      callback: async li => this.actor.update({ "system.primaryVehicle": (await fromUuid(li.dataset.uuid))?.id })
    }, {
      name: "DND5E.Group.Action.UnsetPrimaryVehicle",
      icon: '<i class="fa-regular fa-star"></i>',
      group: "state",
      condition: li => this.actor.system.primaryVehicle?.uuid === li.dataset.uuid,
      callback: () => this.actor.update({ "system.primaryVehicle": null })
    }]);
  }
}
