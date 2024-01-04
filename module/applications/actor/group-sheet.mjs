import Item5e from "../../documents/item.mjs";
import { formatCR, formatNumber } from "../../utils.mjs";
import Award from "../award.mjs";
import ActorMovementConfig from "./movement-config.mjs";
import ActorSheetMixin from "./sheet-mixin.mjs";

/**
 * A character sheet for group-type Actors.
 * The functionality of this sheet is sufficiently different from other Actor types that we extend the base
 * Foundry VTT ActorSheet instead of the ActorSheet5e abstraction used for character, npc, and vehicle types.
 */
export default class GroupActorSheet extends ActorSheetMixin(ActorSheet) {

  /**
   * IDs for items on the sheet that have been expanded.
   * @type {Set<string>}
   * @protected
   */
  _expanded = new Set();

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "group"],
      template: "systems/dnd5e/templates/actors/group-sheet.hbs",
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "members"}],
      scrollY: ["dnd5e-inventory .inventory-list"],
      width: 620,
      height: 620,
      elements: {
        inventory: "dnd5e-inventory"
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * A set of item types that should be prevented from being dropped on this type of actor sheet.
   * @type {Set<string>}
   */
  static unsupportedItemTypes = new Set(["background", "race", "class", "subclass", "feat"]);

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    const context = super.getData(options);
    context.system = this.actor.system;
    context.items = Array.from(this.actor.items);
    context.config = CONFIG.DND5E;

    // Membership
    const {sections, stats} = this.#prepareMembers();
    Object.assign(context, stats);
    context.sections = sections;

    // Movement
    context.movement = this.#prepareMovementSpeed();

    // XP
    if ( !game.settings.get("dnd5e", "disableExperienceTracking") ) context.xp = context.system.details.xp;

    // Inventory
    context.itemContext = {};
    context.inventory = this.#prepareInventory(context);
    context.elements = this.options.elements;
    context.expandedData = {};
    for ( const id of this._expanded ) {
      const item = this.actor.items.get(id);
      if ( item ) context.expandedData[id] = await item.getChatData({secrets: this.actor.isOwner});
    }
    context.inventoryFilters = false;
    context.rollableClass = this.isEditable ? "rollable" : "";

    // Biography HTML
    context.descriptionFull = await TextEditor.enrichHTML(this.actor.system.description.full, {
      secrets: this.actor.isOwner,
      rollData: context.rollData,
      async: true,
      relativeTo: this.actor
    });

    // Summary tag
    context.summary = this.#getSummary(stats);

    // Text labels
    context.labels = {
      currencies: Object.entries(CONFIG.DND5E.currencies).reduce((obj, [k, c]) => {
        obj[k] = c.label;
        return obj;
      }, {})
    };
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare a localized summary of group membership.
   * @param {{nMembers: number, nVehicles: number}} stats     The number of members in the group
   * @returns {string}                                        The formatted summary string
   */
  #getSummary(stats) {
    const formatter = game.i18n.getListFormatter({ style: "long", type: "conjunction" });
    const rule = new Intl.PluralRules(game.i18n.lang);
    const members = [];
    if ( stats.nMembers ) {
      members.push(`${stats.nMembers} ${game.i18n.localize(`DND5E.Group.Member.${rule.select(stats.nMembers)}`)}`);
    }
    if ( stats.nVehicles ) {
      members.push(`${stats.nVehicles} ${game.i18n.localize(`DND5E.Group.Vehicle.${rule.select(stats.nVehicles)}`)}`);
    }
    if ( !members.length ) return game.i18n.localize("DND5E.GroupSummaryEmpty");
    return game.i18n.format("DND5E.GroupSummary", {members: formatter.format(members)});
  }

  /* -------------------------------------------- */

  /**
   * Prepare membership data for the sheet.
   * @returns {{sections: object, stats: object}}
   */
  #prepareMembers() {
    const stats = {
      currentHP: 0,
      maxHP: 0,
      nMembers: 0,
      nVehicles: 0
    };
    const sections = {
      character: {label: `${CONFIG.Actor.typeLabels.character}Pl`, members: []},
      npc: {label: `${CONFIG.Actor.typeLabels.npc}Pl`, members: []},
      vehicle: {label: `${CONFIG.Actor.typeLabels.vehicle}Pl`, members: []}
    };
    const type = this.actor.system.type.value;
    const displayXP = !game.settings.get("dnd5e", "disableExperienceTracking");
    for ( const [index, memberData] of this.object.system.members.entries() ) {
      const member = memberData.actor;

      const m = {
        index,
        ...memberData,
        actor: member,
        id: member.id,
        name: member.name,
        img: member.img,
        hp: {},
        displayHPValues: member.testUserPermission(game.user, "OBSERVER")
      };

      // HP bar
      const hp = member.system.attributes.hp;
      m.hp.current = hp.value + (hp.temp || 0);
      m.hp.max = Math.max(0, hp.max + (hp.tempmax || 0));
      m.hp.pct = Math.clamped((m.hp.current / m.hp.max) * 100, 0, 100).toFixed(2);
      m.hp.color = dnd5e.documents.Actor5e.getHPColor(m.hp.current, m.hp.max).css;
      stats.currentHP += (m.hp.current * m.quantity.value);
      stats.maxHP += (m.hp.max * m.quantity.value);

      // Challenge
      if ( member.type === "npc" ) {
        m.cr = formatCR(member.system.details.cr);
        if ( displayXP ) m.xp = formatNumber(member.system.details.xp.value * m.quantity.value);
      }

      if ( member.type === "vehicle" ) stats.nVehicles++;
      else stats.nMembers++;
      sections[member.type].members.push(m);
    }
    for ( const [k, section] of Object.entries(sections) ) {
      if ( !section.members.length ) delete sections[k];
      else {
        section.displayHPColumn = type !== "encounter";
        section.displayQuantityColumn = type === "encounter";
        section.displayChallengeColumn = (type === "encounter") && (k === "npc");
      }
    }
    return {sections, stats};
  }

  /* -------------------------------------------- */

  /**
   * Prepare movement speed data for rendering on the sheet.
   * @returns {{secondary: string, primary: string}}
   */
  #prepareMovementSpeed() {
    const movement = this.object.system.attributes.movement;
    let speeds = [
      [movement.land, `${game.i18n.localize("DND5E.MovementLand")} ${movement.land}`],
      [movement.water, `${game.i18n.localize("DND5E.MovementWater")} ${movement.water}`],
      [movement.air, `${game.i18n.localize("DND5E.MovementAir")} ${movement.air}`]
    ];
    speeds = speeds.filter(s => s[0]).sort((a, b) => b[0] - a[0]);
    const primary = speeds.shift();
    return {
      primary: `${primary ? primary[1] : "0"}`,
      secondary: speeds.map(s => s[1]).join(", ")
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare inventory items for rendering on the sheet.
   * @param {object} context  Prepared rendering context.
   * @returns {Object<string,object>}
   */
  #prepareInventory(context) {

    // Categorize as weapons, equipment, containers, and loot
    const sections = {};
    for ( const type of ["weapon", "equipment", "consumable", "container", "loot"] ) {
      sections[type] = {label: `${CONFIG.Item.typeLabels[type]}Pl`, items: [], hasActions: false, dataset: {type}};
    }

    // Classify items
    for ( const item of context.items ) {
      const ctx = context.itemContext[item.id] ??= {};
      const {quantity} = item.system;
      ctx.isStack = Number.isNumeric(quantity) && (quantity > 1);
      ctx.canToggle = false;
      ctx.isExpanded = this._expanded.has(item.id);
      ctx.hasUses = item.hasLimitedUses;
      if ( (item.type in sections) && (item.type !== "loot") ) sections[item.type].items.push(item);
      else sections.loot.items.push(item);
    }
    return sections;
  }

  /* -------------------------------------------- */
  /*  Rendering Workflow                          */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _render(force, options={}) {
    for ( const member of this.object.system.members) {
      member.actor.apps[this.id] = this;
    }
    return super._render(force, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async close(options={}) {
    for ( const member of this.object.system.members ) {
      delete member.actor.apps[this.id];
    }
    return super.close(options);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".group-member .name").click(this._onClickMemberName.bind(this));
    if ( this.isEditable ) {
      // Input focus and update
      const inputs = html.find("input");
      inputs.focus(ev => ev.currentTarget.select());
      inputs.addBack().find('[type="text"][data-dtype="Number"]').change(this._onChangeInputDelta.bind(this));
      html.find(".action-button").click(this._onClickActionButton.bind(this));
      html.find(".item .rollable h4").click(event => this._onItemSummary(event));
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle clicks to action buttons on the group sheet.
   * @param {PointerEvent} event      The initiating click event
   * @protected
   */
  _onClickActionButton(event) {
    event.preventDefault();
    const button = event.currentTarget;
    switch ( button.dataset.action ) {
      case "award":
        const award = new Award(this.object);
        award.render(true);
        break;
      case "removeMember":
        const removeMemberId = button.closest("li.group-member").dataset.actorId;
        this.object.system.removeMember(removeMemberId);
        break;
      case "rollQuantities":
        this.object.system.rollQuantities();
        break;
      case "movementConfig":
        const movementConfig = new ActorMovementConfig(this.object);
        movementConfig.render(true);
        break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle clicks on member names in the members list.
   * @param {PointerEvent} event      The initiating click event
   * @protected
   */
  _onClickMemberName(event) {
    event.preventDefault();
    const member = event.currentTarget.closest("li.group-member");
    const actor = game.actors.get(member.dataset.actorId);
    if ( actor ) actor.sheet.render(true, {focus: true});
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropActor(event, data) {
    if ( !this.isEditable ) return;
    const cls = getDocumentClass("Actor");
    const sourceActor = await cls.fromDropData(data);
    if ( !sourceActor ) return;
    return this.object.system.addMember(sourceActor);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropItemCreate(itemData) {
    const items = itemData instanceof Array ? itemData : [itemData];

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
   * Handles dropping of a single item onto this group sheet.
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
    if ( itemData.type === "spell" ) {
      const scroll = await Item5e.createScrollFromSpell(itemData);
      return scroll.toObject();
    }

    // Stack identical consumables
    const stacked = this._onDropStackConsumables(itemData);
    if ( stacked ) return false;

    return itemData;
  }
}
