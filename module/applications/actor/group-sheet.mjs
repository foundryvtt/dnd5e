import Item5e from "../../documents/item.mjs";
import { formatCR, formatNumber } from "../../utils.mjs";
import Award from "../award.mjs";
import MovementSensesConfig from "../shared/movement-senses-config.mjs";
import ActorSheetMixin from "./sheet-mixin.mjs";

/**
 * A character sheet for group-type Actors.
 * The functionality of this sheet is sufficiently different from other Actor types that we extend the base
 * Foundry VTT ActorSheet instead of the ActorSheet5e abstraction used for character, npc, and vehicle types.
 */
export default class GroupActorSheet extends ActorSheetMixin(foundry.appv1?.sheets?.ActorSheet ?? ActorSheet) {

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
    context.isGM = game.user.isGM;

    // Membership
    const {sections, stats} = this.#prepareMembers();
    Object.assign(context, stats);
    context.sections = sections;

    // Movement
    context.movement = this.#prepareMovementSpeed();

    // XP
    if ( game.settings.get("dnd5e", "levelingMode") !== "noxp" ) context.xp = context.system.details.xp;

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
    const displayXP = game.settings.get("dnd5e", "levelingMode") !== "noxp";
    for ( const [index, memberData] of this.object.system.members.entries() ) {
      const member = memberData.actor;
      const multiplier = type === "encounter" ? (memberData.quantity.value ?? 1) : 1;

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
      m.hp.max = Math.max(0, hp.effectiveMax);
      m.hp.pct = Math.clamp((m.hp.current / m.hp.max) * 100, 0, 100).toFixed(2);
      m.hp.color = dnd5e.documents.Actor5e.getHPColor(m.hp.current, m.hp.max).css;
      stats.currentHP += (m.hp.current * multiplier);
      stats.maxHP += (m.hp.max * multiplier);

      // Challenge
      if ( member.type === "npc" ) {
        m.cr = formatCR(member.system.details.cr);
        if ( displayXP ) m.xp = formatNumber(member.system.details.xp.value * multiplier);
      }

      if ( member.type === "vehicle" ) stats.nVehicles += multiplier;
      else stats.nMembers += multiplier;
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

    // Remove items in containers & sort remaining
    context.items = context.items
      .filter(i => !this.actor.items.has(i.system.container) && (i.type !== "spell"))
      .sort((a, b) => (a.sort || 0) - (b.sort || 0));

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
        const award = new Award({
          award: { savedDestinations: this.actor.getFlag("dnd5e", "awardDestinations") },
          origin: this.object
        });
        award.render(true);
        break;
      case "longRest":
        this.actor.longRest({ advanceTime: true });
        break;
      case "movementConfig":
        new MovementSensesConfig({ document: this.actor, type: "movement" }).render({ force: true });
        break;
      case "placeMembers":
        this.actor.system.placeMembers();
        break;
      case "removeMember":
        const removeMemberId = button.closest("li.group-member").dataset.actorId;
        this.actor.system.removeMember(removeMemberId);
        break;
      case "rollQuantities":
        this.actor.system.rollQuantities();
        break;
      case "shortRest":
        this.actor.shortRest({ advanceTime: true });
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
  async _onDropItem(event, data) {
    const behavior = this._dropBehavior(event, data);
    if ( !this.actor.isOwner || (behavior === "none") ) return false;
    const item = await Item.implementation.fromDropData(data);

    // Handle moving out of container & item sorting
    if ( (behavior === "move") && (this.actor.uuid === item.parent?.uuid) ) {
      if ( item.system.container !== null ) await item.update({"system.container": null});
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

  /** @override */
  async _onDropItemCreate(itemData, event, behavior) {
    let items = itemData instanceof Array ? itemData : [itemData];

    // Filter out items already in containers to avoid creating duplicates
    const containers = new Set(items.filter(i => i.type === "container").map(i => i._id));
    items = items.filter(i => !containers.has(i.system.container));

    // Create the owned items & contents as normal
    const toCreate = await Item5e.createWithContents(items, {
      transformFirst: item => this._onDropSingleItem(item.toObject(), event)
    });
    const created = await Item5e.createDocuments(toCreate, { pack: this.actor.pack, parent: this.actor, keepId: true });
    if ( behavior === "move" ) items.forEach(i => fromUuid(i.uuid).then(d => d?.delete({ deleteContents: true })));
    return created;
  }

  /* -------------------------------------------- */

  /**
   * Handles dropping of a single item onto this group sheet.
   * @param {object} itemData            The item data to create.
   * @param {DragEvent} event            The concluding DragEvent which provided the drop data.
   * @returns {Promise<object|boolean>}  The item data to create after processing, or false if the item should not be
   *                                     created or creation has been otherwise handled.
   * @protected
   */
  async _onDropSingleItem(itemData, event) {

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
      return scroll?.toObject?.();
    }

    // Stack identical consumables
    const stacked = this._onDropStackConsumables(itemData);
    if ( stacked ) return false;

    return itemData;
  }
}
