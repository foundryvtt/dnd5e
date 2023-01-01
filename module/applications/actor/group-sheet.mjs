import ActorMovementConfig from "./movement-config.mjs";
import ActorSheet5e from "./base-sheet.mjs";

/**
 * A character sheet for group-type Actors.
 * The functionality of this sheet is sufficiently different from other Actor types that we extend the base
 * Foundry VTT ActorSheet instead of the ActorSheet5e abstraction used for character, npc, and vehicle types.
 */
export default class GroupActorSheet extends ActorSheet {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "group"],
      template: "systems/dnd5e/templates/actors/group-sheet.hbs",
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "members"}],
      scrollY: [".inventory .inventory-list"],
      width: 620,
      height: 620
    });
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    const context = super.getData(options);
    context.system = context.data.system;

    // Membership
    const {sections, stats} = this.#prepareMembers();
    Object.assign(context, stats);
    context.sections = sections;

    // Movement
    context.movement = this.#prepareMovementSpeed();

    // Inventory
    context.inventory = this.#prepareInventory(context.items);
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
    const formatter = new Intl.ListFormat(game.i18n.lang, {style: "long", type: "conjunction"});
    const members = [];
    if ( stats.nMembers ) members.push(`${stats.nMembers} ${game.i18n.localize("DND5E.GroupMembers")}`);
    if ( stats.nVehicles ) members.push(`${stats.nVehicles} ${game.i18n.localize("DND5E.GroupVehicles")}`);
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
      character: {label: "ACTOR.TypeCharacterPl", members: []},
      npc: {label: "ACTOR.TypeNpcPl", members: []},
      vehicle: {label: "ACTOR.TypeVehiclePl", members: []}
    };
    for ( const member of this.object.system.members ) {
      const m = {
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
      m.hp.max = hp.max + (hp.tempmax || 0);
      m.hp.pct = Math.clamped((m.hp.current / m.hp.max) * 100, 0, 100).toFixed(2);
      m.hp.color = dnd5e.documents.Actor5e.getHPColor(m.hp.current, m.hp.max).css;
      stats.currentHP += m.hp.current;
      stats.maxHP += m.hp.max;

      if ( member.type === "vehicle" ) stats.nVehicles++;
      else stats.nMembers++;
      sections[member.type].members.push(m);
    }
    for ( const [k, section] of Object.entries(sections) ) {
      if ( !section.members.length ) delete sections[k];
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
   * @param {object[]} items      Prepared rendering data for owned items
   * @returns {Object<string,object>}
   */
  #prepareInventory(items) {

    // Categorize as weapons, equipment, containers, and loot
    const sections = {
      weapon: {label: "ITEM.TypeWeaponPl", items: [], hasActions: false, dataset: {type: "weapon"}},
      equipment: {label: "ITEM.TypeEquipmentPl", items: [], hasActions: false, dataset: {type: "equipment"}},
      consumable: {label: "ITEM.TypeConsumablePl", items: [], hasActions: false, dataset: {type: "consumable"}},
      backpack: {label: "ITEM.TypeContainerPl", items: [], hasActions: false, dataset: {type: "backpack"}},
      loot: {label: "ITEM.TypeLootPl", items: [], hasActions: false, dataset: {type: "loot"}}
    };

    // Classify items
    for ( const item of items ) {
      const {quantity} = item.system;
      item.isStack = Number.isNumeric(quantity) && (quantity > 1);
      item.canToggle = false;
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
      member.apps[this.id] = this;
    }
    return super._render(force, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async close(options={}) {
    for ( const member of this.object.system.members ) {
      delete member.apps[this.id];
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
      html.find(".action-button").click(this._onClickActionButton.bind(this));
      html.find(".item-control").click(this._onClickItemControl.bind(this));
      html.find(".item .rollable h4").click(event => this._onClickItemName(event));
      new ContextMenu(html, ".item-list .item", [], {onOpen: this._onItemContext.bind(this)});
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
      case "convertCurrency":
        Dialog.confirm({
          title: `${game.i18n.localize("DND5E.CurrencyConvert")}`,
          content: `<p>${game.i18n.localize("DND5E.CurrencyConvertHint")}</p>`,
          yes: () => this.actor.convertCurrency()
        });
        break;
      case "removeMember":
        const removeMemberId = button.closest("li.group-member").dataset.actorId;
        this.object.system.removeMember(removeMemberId);
        break;
      case "movementConfig":
        const movementConfig = new ActorMovementConfig(this.object);
        movementConfig.render(true);
        break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle clicks to item control buttons on the group sheet.
   * @param {PointerEvent} event      The initiating click event
   * @protected
   */
  _onClickItemControl(event) {
    event.preventDefault();
    const button = event.currentTarget;
    switch ( button.dataset.action ) {
      case "itemCreate":
        this._createItem(button);
        break;
      case "itemDelete":
        const deleteLi = event.currentTarget.closest(".item");
        const deleteItem = this.actor.items.get(deleteLi.dataset.itemId);
        deleteItem.deleteDialog();
        break;
      case "itemEdit":
        const editLi = event.currentTarget.closest(".item");
        const editItem = this.actor.items.get(editLi.dataset.itemId);
        editItem.sheet.render(true);
        break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle workflows to create a new Item directly within the Group Actor sheet.
   * @param {HTMLElement} button      The clicked create button
   * @returns {Item5e}                The created embedded Item
   * @protected
   */
  _createItem(button) {
    const type = button.dataset.type;
    const system = {...button.dataset};
    delete system.type;
    const name = game.i18n.format("DND5E.ItemNew", {type: game.i18n.localize(`ITEM.Type${type.capitalize()}`)});
    const itemData = {name, type, system};
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /* -------------------------------------------- */

  /**
   * Handle activation of a context menu for an embedded Item document.
   * Dynamically populate the array of context menu options.
   * Reuse the item context options provided by the base ActorSheet5e class.
   * @param {HTMLElement} element       The HTML element for which the context menu is activated
   * @protected
   */
  _onItemContext(element) {
    const item = this.actor.items.get(element.dataset.itemId);
    if ( !item ) return;
    ui.context.menuItems = ActorSheet5e.prototype._getItemContextOptions.call(this, item);
    Hooks.call("dnd5e.getItemContextOptions", item, ui.context.menuItems);
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

  /**
   * Handle clicks on an item name to expand its description
   * @param {PointerEvent} event      The initiating click event
   * @protected
   */
  _onClickItemName(event) {
    game.system.applications.actor.ActorSheet5e.prototype._onItemSummary.call(this, event);
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
}
