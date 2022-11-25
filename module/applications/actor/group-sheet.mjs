import ActorMovementConfig from "./movement-config.mjs";

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

    // Membership
    const {sections, stats} = this.#prepareMembers();
    Object.assign(context, stats);
    context.sections = sections;

    // Movement
    context.movement = this.#prepareMovementSpeed();

    // Biography HTML
    context.descriptionFull = await TextEditor.enrichHTML(this.actor.system.description.full, {
      secrets: this.actor.isOwner,
      rollData: context.rollData,
      async: true,
      relativeTo: this.actor
    });

    // Summary tag
    context.summary = game.i18n.format("DND5E.GroupSummary", {
      members: [
        stats.nMembers ? `${stats.nMembers} ${game.i18n.localize("DND5E.GroupMembers")}` : "",
        stats.nVehicles ? `${stats.nVehicles} ${game.i18n.localize("DND5E.GroupVehicles")}` : ""
      ].filterJoin(` ${game.i18n.localize("and")} `)
    })
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare membership data for the sheet.
   */
  #prepareMembers() {
    const stats = {
      currentHP: 0,
      maxHP: 0,
      nMembers: 0,
      nVehicles: 0
    }
    const sections = {
      character: {label: "Player Characters", members: []},
      npc: {label: "Non-Player Characters", members: []},
      vehicle: {label: "Vehicles", members: []}
    };
    for ( const member of this.object.system.members ) {
      const m = {
        actor: member,
        id: member.id,
        name: member.name,
        img: member.img,
        hp: {}
      };

      // HP bar
      const hp = member.system.attributes.hp;
      m.hp.current = hp.value + (hp.temp || 0);
      m.hp.max = hp.max + (hp.tempmax || 0);
      m.hp.pct = Math.clamped((m.hp.current / m.hp.max) * 100, 0, 100).toFixed(2);
      m.hp.color = dnd5e.documents.Actor5e.getHPColor(m.hp.current, m.hp.max).css;
      stats.currentHP += m.hp.current;
      stats.maxHP += m.hp.max;

      if ( member.type !== "vehicle" ) stats.nMembers++;
      else stats.nVehicles++;
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
    speeds = speeds.filter(s => !!s[0]).sort((a, b) => b[0] - a[0]);
    const primary = speeds.shift();
    return {
      primary: `${primary ? primary[1] : "0"}`,
      secondary: speeds.map(s => s[1]).join(", ")
    };
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
    html.find(".group-member .name").click(this.#onClickMemberName.bind(this));
    html.find(".action-button").click(this.#onClickActionButton.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle clicks to action buttons on the group sheet.
   * @param {PointerEvent} event      The initiating click event
   */
  #onClickActionButton(event) {
    event.preventDefault();
    const button = event.currentTarget;
    switch ( button.dataset.action ) {
      case "removeMember":
        const removeMemberId = button.closest("li.group-member").dataset.actorId;
        return this.object.system.removeMember(removeMemberId);
      case "movementConfig":
        const movementConfig = new ActorMovementConfig(this.object);
        return movementConfig.render(true);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle clicks on member names in the members list.
   * @param {PointerEvent} event      The initiating click event
   */
  #onClickMemberName(event) {
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
}
