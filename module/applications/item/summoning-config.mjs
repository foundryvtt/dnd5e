/**
 * Application for configuring summoning information for an item.
 */
export default class SummoningConfig extends DocumentSheet {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "summoning-config"],
      dragDrop: [{ dropSelector: "form" }],
      template: "systems/dnd5e/templates/apps/summoning-config.hbs",
      width: 500,
      height: "auto",
      sheetConfig: false,
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true
    });
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Expanded states for each profile.
   * @type {Map<string, boolean>}
   */
  expandedProfiles = new Map();

  /* -------------------------------------------- */

  /**
   * Shortcut to the summoning profiles.
   * @type {object[]}
   */
  get profiles() {
    return this.document.system.summons?.profiles ?? [];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    return `${game.i18n.localize("DND5E.Summoning.Configuration")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    const context = await super.getData(options);
    context.isSpell = this.document.type === "spell";
    context.profiles = this.profiles.map(p => {
      const profile = { id: p._id, ...p, collapsed: this.expandedProfiles.get(p._id) ? "" : "collapsed" };
      if ( p.uuid ) profile.document = fromUuidSync(p.uuid);
      return profile;
    }).sort((lhs, rhs) =>
      (lhs.name || lhs.document?.name || "").localeCompare(rhs.name || rhs.document?.name || "", game.i18n.lang)
    );
    context.summons = this.document.system.summons;
    context.creatureSizes = Object.entries(CONFIG.DND5E.actorSizes).reduce((obj, [k, c]) => {
      obj[k] = { label: c.label, selected: context.summons?.creatureSizes.has(k) ? "selected" : "" };
      return obj;
    }, {});
    context.creatureTypes = Object.entries(CONFIG.DND5E.creatureTypes).reduce((obj, [k, c]) => {
      obj[k] = { label: c.label, selected: context.summons?.creatureTypes.has(k) ? "selected" : "" };
      return obj;
    }, {});
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Handling                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(jQuery) {
    super.activateListeners(jQuery);
    const html = jQuery[0];

    for ( const element of html.querySelectorAll("[data-action]") ) {
      element.addEventListener("click", event => this.submit({ updateData: {
        action: event.target.dataset.action,
        profileId: event.target.closest("[data-profile-id]")?.dataset.profileId
      } }));
    }

    for ( const element of html.querySelectorAll("multi-select") ) {
      element.addEventListener("change", this._onChangeInput.bind(this));
    }

    for ( const element of html.querySelectorAll(".collapsible") ) {
      element.addEventListener("click", event => {
        if ( event.target.closest(".collapsible-content") ) return;
        event.currentTarget.classList.toggle("collapsed");
        this.expandedProfiles.set(
          event.target.closest("[data-profile-id]").dataset.profileId,
          !event.currentTarget.classList.contains("collapsed")
        );
      });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getSubmitData(...args) {
    const data = foundry.utils.expandObject(super._getSubmitData(...args));
    data.creatureSizes ??= [];
    data.creatureTypes ??= [];
    data.profiles = Object.values(data.profiles ?? {});

    switch ( data.action ) {
      case "add-profile":
        data.profiles.push({
          _id: foundry.utils.randomID(),
          ...(data.addDetails ?? {})
        });
        break;
      case "delete-profile":
        data.profiles = data.profiles.filter(e => e._id !== data.profileId);
        break;
    }

    return data;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {
    this.document.update({"system.summons": formData});
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _canDragDrop() {
    return this.isEditable;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    // Try to extract the data
    const data = TextEditor.getDragEventData(event);

    // Handle dropping linked items
    if ( data?.type !== "Actor" ) return;
    const actor = await Actor.implementation.fromDropData(data);

    // Determine where this was dropped
    const existingProfile = event.target.closest("[data-profile-id]");
    const { profileId } = existingProfile?.dataset ?? {};

    // If dropped onto existing profile, add or replace link
    if ( profileId ) this.submit({ updateData: { [`profiles.${profileId}.uuid`]: actor.uuid } });

    // Otherwise create a new profile
    else this.submit({ updateData: { action: "add-profile", addDetails: { uuid: actor.uuid } } });
  }
}
