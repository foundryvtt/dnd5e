/**
 * Application for configuring summoning information for an item.
 */
export default class SummoningConfig extends DocumentSheet {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "summoning-config"],
      dragDrop: [{ dragSelector: ".drag-bar", dropSelector: "form" }],
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
   * Shortcut to the summoning profiles.
   * @type {object[]}
   */
  get profiles() {
    return this.document.system.summons.profiles;
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
    context.profiles = this.profiles.map(p => {
      const profile = { id: p._id, ...p };
      if ( p.uuid ) profile.document = fromUuidSync(p.uuid);
      return profile;
    }).sort((lhs, rhs) => lhs.sort - rhs.sort);
    context.summons = this.document.system.summons;
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
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getSubmitData(...args) {
    const data = foundry.utils.expandObject(super._getSubmitData(...args));
    data.profiles = Object.values(data.profiles ?? {});
    const highestSort = this.profiles.reduce((sort, i) => i.sort > sort ? i.sort : sort, 0);

    switch ( data.action ) {
      case "add-profile":
        data.profiles.push({
          _id: foundry.utils.randomID(),
          sort: highestSort + CONST.SORT_INTEGER_DENSITY,
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
  _onDragStart(event) {
    const entry = event.target.closest("[data-profile-id]");
    if ( !entry ) return;
    event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "summoning-profile", item: this.document.uuid, profileId: entry.dataset.profileId
    }));
    const box = entry.getBoundingClientRect();
    event.dataTransfer.setDragImage(entry, box.width - 6, box.height / 2);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    // Try to extract the data
    const data = TextEditor.getDragEventData(event);

    // Handle re-ordering of list
    if ( data.item === this.document.uuid ) return this._onSortEntry(event, data);

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

  /* -------------------------------------------- */

  /**
   * Sort a profile on drop.
   * @param {DragEvent} event  Triggering drop event.
   * @param {object} data      Drag event data.
   */
  _onSortEntry(event, data) {
    const dropArea = event.target.closest("[data-profile-id]");
    const dragProfile = this.profiles.find(p => p._id === data?.profileId);
    const dropProfile = this.profiles.find(p => p._id === dropArea?.dataset.profileId);

    // Do nothing if dropped on itself
    if ( dragProfile === dropProfile ) return;

    const siblings = this.profiles.filter(e => e !== dragProfile).sort((lhs, rhs) => lhs.sort - rhs.sort);
    let sortBefore;
    let target = dropProfile;

    // If dropped outside any profile, sort to top or bottom of list
    if ( !target ) {
      const box = this.form.getBoundingClientRect();
      sortBefore = (event.clientY - box.y) < (box.height * .25);
      target = sortBefore ? siblings[0] : siblings[siblings.length - 1];
    }

    if ( !target ) return;

    const sortUpdates = SortingHelpers.performIntegerSort(dragProfile, { target, siblings, sortBefore });
    const updateData = sortUpdates.reduce((obj, { target, update }) => {
      obj[`profiles.${target._id}.sort`] = update.sort;
      return obj;
    }, {});
    this.submit({ updateData });
  }
}
