import MultiActorSheet from "./api/multi-actor-sheet.mjs";

/**
 * Extension of the base actor sheet for faction actors.
 */
export default class FactionActorSheet extends MultiActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["faction"],
    position: {
      width: 700,
      height: 700
    },
    tab: "members"
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {
      template: "systems/dnd5e/templates/actors/faction/header.hbs"
    },
    tabs: {
      template: "systems/dnd5e/templates/shared/horizontal-tabs.hbs",
      templates: ["templates/generic/tab-navigation.hbs"]
    },
    members: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/faction/members.hbs",
      scrollable: [""]
    },
    inventory: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/faction/inventory.hbs",
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
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static TABS = [
    { tab: "members", label: "DND5E.Group.Member.other" },
    { tab: "inventory", label: "DND5E.Inventory" },
    { tab: "biography", label: "DND5E.Biography" }
  ];

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "members"
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
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

  /**
   * Prepare members context.
   * @param {ApplicationRenderContext} context     Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options      Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareMembersContext(context, options) {
    const members = await this.actor.system.getMembers();
    context.members = await Promise.all(members.map(async ({ actor }, index) => {
      const { name, system, uuid } = actor;
      const member = { index, name, uuid };
      member.subtitle = [
        // TODO: Rank & role
      ].filterJoin(" • ");
      member.underlay = `var(--underlay-npc-${system.details.type.value})`;
      await this._prepareMemberPortrait(actor, member);
      return member;
    }));
    context.members = context.members.sort((a, b) => a.sort - b.sort);

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
    }
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
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  _openDocumentSheet(doc, options={}) {
    // Actor sheets are too large to render as children of the group sheet window.
    // If the group sheet is detached, open the actor sheet in its own detached window.
    if ( doc instanceof Actor ) {
      const { windowId } = this.window ?? {};
      const windowOptions = windowId ? { window: { detached: true, windowId } } : {};
      doc?.sheet?.render({ force: true, ...windowOptions, ...options });
    }
    else super._openDocumentSheet(doc, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDropActor(event, actor) {
    await super._onDropActor(event, actor);
    if ( actor ) actor.apps[this.id] = this;
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
}
