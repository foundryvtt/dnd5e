import CompendiumBrowser from "../compendium-browser.mjs";
import MultiActorSheet from "./api/multi-actor-sheet.mjs";

/**
 * Extension of the base actor sheet for faction actors.
 */
export default class FactionActorSheet extends MultiActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      browse: FactionActorSheet.#onBrowse
    },
    classes: ["faction"],
    position: {
      width: 500,
      height: "auto"
    },
    tab: "description",
    window: {
      resizable: false
    }
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
    description: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/group/biography.hbs",
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static TABS = [
    { tab: "members", label: "DND5E.Group.Member.other", condition: this.showMembersTab },
    { tab: "description", label: "DND5E.Description" }
  ];

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "description"
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
    const categories = CONFIG.DND5E.factionCategories;
    context.category = {
      label: categories[this.actor.system.type.value]?.label,
      options: Object.entries(categories).map(([value, { label }]) => ({ label, value }))
    };
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
      const { name, uuid } = actor;
      const member = { index, name, uuid };
      member.subtitle = [
        // TODO: Rank & role
      ].filterJoin(" • ");
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
      case "description": return this._prepareDescriptionContext(context, options);
      case "header": return this._prepareHeaderContext(context, options);
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
  async _onClose(options) {
    super._onClose(options);
    this.actor.system.getMembers().then(members =>
      members.forEach(({ actor }) => delete actor.apps[this.id])
    );
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.actor.system.getMembers().then(members =>
      members.forEach(({ actor }) => actor.apps[this.id] = this)
    );
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    this._renderContainers(context, options);
    await super._onRender(context, options);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle opening the compendium browser to add actors.
   * @this {FactionActorSheet}
   */
  static async #onBrowse() {
    if ( !this.isEditable ) return;
    const results = await CompendiumBrowser.select({
      filters: {
        locked: {
          documentClass: "Actor",
          types: new Set(["character", "npc"])
        }
      },
      selection: {
        min: 1
      }
    });
    if ( results ) {
      const actors = await Promise.all(results.map(fromUuid));
      this.actor.system.addMember(...actors);
    }
  }

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

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Whether to show the members tab.
   * @param {Actor5e} actor                  The group actor.
   * @param {object} [options]
   * @param {ApplicationV2} [options.sheet]  The sheet instance if called in a sheet context.
   * @returns {boolean}
   */
  static showMembersTab(actor, { sheet }={}) {
    return actor.system.members.length || (sheet?.isEditable && sheet.isEditMode);
  }
}
