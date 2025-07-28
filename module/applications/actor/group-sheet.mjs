import BaseActorSheet from "./api/base-actor-sheet.mjs";
import ContextMenu5e from "../context-menu.mjs";
import { convertWeight } from "../../utils.mjs";
import Award from "../award.mjs";

/**
 * Extension of the base actor sheet for group actors.
 */
export default class GroupActorSheet extends BaseActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["group", "vertical-tabs"],
    position: {
      width: 700,
      height: 700
    },
    actions: {
      award: GroupActorSheet.#onAward,
      editDescription: GroupActorSheet.#onEditDescription,
      placeMembers: GroupActorSheet.#onPlaceMembers,
      removeMember: GroupActorSheet.#onRemoveMember,
      roll: GroupActorSheet.#onRoll
    },
    tab: "members"
  };

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
        "systems/dnd5e/templates/inventory/containers.hbs"
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

  /**
   * Application tabs.
   * @type {SheetTabDescriptor5e}
   */
  static TABS = [
    { tab: "members", label: "DND5E.Group.Member.other", icon: "fa-solid fa-swords"},
    { tab: "inventory", label: "DND5E.Inventory", svg: "systems/dnd5e/icons/svg/backpack.svg" },
    { tab: "biography", label: "DND5E.Biography", icon: "fa-solid fa-feather" }
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
      summary: await CONFIG.ux.TextEditor.enrichHTML(this.actor.system.description.summary, enrichmentOptions),
      full: await CONFIG.ux.TextEditor.enrichHTML(this.actor.system.description.full, enrichmentOptions)
    };
    if ( this.editingDescriptionTarget ) context.editingDescription = {
      target: this.editingDescriptionTarget,
      value: foundry.utils.getProperty(this.actor._source, this.editingDescriptionTarget)
    };

    return context;
  }

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
   * Prepare the header context.
   * @param {ApplicationRenderContext} context     Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options      Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareHeaderContext(context, options) {
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareInventoryContext(context, options) {
    context = await super._prepareInventoryContext(context, options);
    context.members = [];
    for ( const { actor } of this.document.system.members ) {
      const { id, type, img, name, system, uuid } = actor;
      const member = { id, type, img, name, system, uuid };
      this._prepareMemberEncumbrance(actor, member);
      context.members.push(member);
    }
    context.members.sort((a, b) => a.type.compare(b.type) || a.name.localeCompare(b.name, game.i18n.lang));
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare encumbrance context for members.
   * @param {Actor5e} actor   The actor instance.
   * @param {object} context  The render context.
   * @protected
   */
  _prepareMemberEncumbrance(actor, context) {
    const { pct, max, value } = actor.system.attributes.encumbrance;
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
   * Prepare portrait context for members.
   * @param {Actor5e} actor   The actor instance.
   * @param {object} context  The render context.
   * @protected
   */
  async _prepareMemberPortrait(actor, context) {
    const showTokenPortrait = this.actor.getFlag("dnd5e", "showTokenPortrait");
    const token = actor.isToken ? actor.token : actor.prototypeToken;
    let src = showTokenPortrait ? token.texture.src : actor.img;
    if ( showTokenPortrait && token?.randomImg ) {
      const images = await actor.getTokenImages();
      src = images[Math.floor(Math.random() * images.length)];
    }
    context.portrait = { src, isVideo: foundry.helpers.media.VideoHelper.hasVideoExtension(src) };
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
      const label = game.i18n.format("DND5E.SkillRoll", {
        ability: CONFIG.DND5E.abilities[ability]?.label,
        skill: CONFIG.DND5E.skills[key]?.label
      });
      return [key, { label, passive, total }];
    }));
  }

  /* -------------------------------------------- */

  /**
   * Prepare members context.
   * @param {ApplicationRenderContext} context     Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options      Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareMembersContext(context, options) {
    context.sections = {
      character: { members: [], hasStats: true },
      npc: { members: [], label: "TYPES.Actor.npcPl", hasStats: true },
      vehicle: { members: [], label: "TYPES.Actor.vehiclePl" }
    };
    for ( const { actor } of this.document.system.members ) {
      const { id, type, img, name, system, uuid } = actor;
      const section = context.sections[type];
      if ( !section ) continue;
      const member = { id, type, img, name, system, uuid };
      member.classes = actor.itemTypes.class;
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

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "biography": return this._prepareBiographyContext(context, options);
      case "header": return this._prepareHeaderContext(context, options);
      case "inventory": return this._prepareInventoryContext(context, options);
      case "members": return this._prepareMembersContext(context, options);
      case "tabs": return this._prepareTabsContext(context, options);
    }
    return context;
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
    context.underlay = `var(--underlay-vehicle-${actor.system.vehicleType})`;
    const { attributes } = actor.system;
    context.properties = [];
    if ( attributes.ac.value ) context.properties.push({ label: "DND5E.AC", value: attributes.ac.value });
    if ( attributes.hp.dt ) context.properties.push({ label: "DND5E.HITPOINTS.DT.Abbr", value: attributes.hp.dt });
    const speed = Math.max(...Object.values(attributes.movement.paces).map(p => p ?? -Infinity));
    if ( Number.isFinite(speed) ) context.properties.push({ label: "DND5E.Speed", value: speed });
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachFrameListeners() {
    super._attachFrameListeners();
    new ContextMenu5e(this.element, ".member[data-uuid]", this._getEntryContextOptions(), { jQuery: false });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if ( this.editingDescriptionTarget ) {
      this.element.querySelectorAll("prose-mirror").forEach(editor => editor.addEventListener("save", () => {
        this.editingDescriptionTarget = null;
        this.render();
      }));
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Handle distributing pooled XP.
   * @this {GroupActorSheet}
   */
  static #onAward() {
    new Award({
      award: { savedDestinations: this.actor.getFlag("dnd5e", "awardDestinations") },
      origin: this.actor
    }).render({ force: true });
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropActor(event, actor) {
    await this.actor.system.addMember(actor);
    return actor;
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
   * Handle expanding the description editor.
   * @this {GroupActorSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #onEditDescription(event, target) {
    if ( target.ariaDisabled ) return;
    this.editingDescriptionTarget = target.dataset.target;
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle placing group members.
   * @this {GroupActorSheet}
   */
  static #onPlaceMembers() {
    this.actor.system.placeMembers();
  }

  /* -------------------------------------------- */

  /**
   * Handle removing a group member.
   * @this {GroupActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   * @returns {Promise<Actor5e>}
   */
  static async #onRemoveMember(event, target) {
    return this.actor.system.removeMember(await fromUuid(target.closest(".member[data-uuid]")?.dataset.uuid));
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
    const actor = await fromUuid(uuid);
    actor?.rollSkill({ event, skill: key });
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Get context menu entries for group members.
   * @returns {ContextMenuEntry[]}
   * @protected
   */
  _getEntryContextOptions() {
    return [{
      name: "DND5E.Group.Action.View",
      icon: '<i class="fa-solid fa-eye"></i>',
      callback: async li => (await fromUuid(li.dataset.uuid))?.sheet.render(true)
    }, {
      name: "DND5E.Group.Action.Remove",
      icon: '<i class="fa-solid fa-xmark"></i>',
      callback: async li => this.actor.system.removeMember(await fromUuid(li.dataset.uuid))
    }];
  }

  /* -------------------------------------------- */
  /*  Sheet Configuration                         */
  /* -------------------------------------------- */

  /**
   * Augment the DocumentSheetConfig with additional options.
   * @param {DocumentSheetConfig} app  The application.
   * @param {HTMLElement} html         The rendered HTML.
   */
  static addDocumentSheetConfigOptions(app, html) {
    const { document: doc } = app.options;
    const showTokenPortrait = doc.getFlag("dnd5e", "showTokenPortrait");
    const artOptions = {
      false: game.i18n.localize("DND5E.Group.Config.Art.portraits"),
      true: game.i18n.localize("DND5E.Group.Config.Art.tokens")
    };
    const fieldset = document.createElement("fieldset");
    fieldset.innerHTML = `
      <legend>${game.i18n.localize("DND5E.Group.Config.Legend")}</legend>
      <div class="form-group">
        <label>${game.i18n.localize("DND5E.Group.Config.Art.Label")}</label>
        <div class="form-fields">
          <select name="flags.dnd5e.showTokenPortrait" data-dtype="Boolean">
            ${foundry.applications.handlebars.selectOptions(artOptions, { hash: { selected: showTokenPortrait } })}
          </select>
        </div>
      </div>
    `;
    html.querySelector("fieldset").insertAdjacentElement("afterend", fieldset);
    html.removeEventListener("submit", this._applyDocumentSheetConfigOptions);
    html.addEventListener("submit", this._applyDocumentSheetConfigOptions);
  }

  /* -------------------------------------------- */

  /**
   * Handle persisting additional sheet configuration options.
   * @param {SubmitEvent} event  The form submission event.
   * @protected
   */
  static _applyDocumentSheetConfigOptions(event) {
    const app = foundry.applications.instances.get(event.target.id);
    if ( !app?.document ) return;
    const submitData = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(event.target).object);
    if ( "flags" in submitData ) app.document.update({ flags: submitData.flags });
  }
}
