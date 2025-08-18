import PhysicalItemTemplate from "../../../data/item/templates/physical-item.mjs";
import ContextMenu5e from "../../context-menu.mjs";
import BaseActorSheet from "./base-actor-sheet.mjs";

/**
 * An abstract class that implements functionality for sheets that contain multiple actors.
 * @extends {BaseActorSheet}
 */
export default class MultiActorSheet extends BaseActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      editDescription: MultiActorSheet.#onEditDescription,
      placeMembers: MultiActorSheet.#onPlaceMembers,
      removeMember: MultiActorSheet.#onRemoveMember
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Description currently being edited.
   * @type {string|null}
   */
  editingDescriptionTarget = null;

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the description tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareDescriptionContext(context, options) {
    const { full, summary } = this.actor.system.description;
    const enrichmentOptions = {
      secrets: this.actor.isOwner, relativeTo: this.actor, rollData: context.rollData
    };
    context.enriched = {
      label: "DND5E.Description",
      summary: await CONFIG.ux.TextEditor.enrichHTML(summary, enrichmentOptions),
      full: await CONFIG.ux.TextEditor.enrichHTML(full, enrichmentOptions)
    };
    context.enriched.value = full ? context.enriched.full : context.enriched.summary;
    if ( this.editingDescriptionTarget ) context.editingDescription = {
      target: this.editingDescriptionTarget,
      value: foundry.utils.getProperty(this.actor._source, this.editingDescriptionTarget)
    };

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "biography": return this._prepareDescriptionContext(context, options); // Limited sheets.
    }
    return context;
  }

  /* -------------------------------------------- */
  /*  Member Preparation                          */
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
    const defaults = Actor.implementation.getDefaultArtwork(actor._source);
    let src = showTokenPortrait ? token.texture.src : actor.img;
    if ( showTokenPortrait && token?.randomImg ) {
      const images = await actor.getTokenImages();
      src = images[Math.floor(Math.random() * images.length)];
    }
    if ( !src ) src = showTokenPortrait ? defaults.texture.src : defaults.img;
    context.portrait = { src, isVideo: foundry.helpers.media.VideoHelper.hasVideoExtension(src) };
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

  /** @override */
  async _onDropActor(event, actor) {
    await this.actor.system.addMember(actor);
    return actor;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDropCreateItems(event, items, behavior) {
    let foundNonPhysical = false;
    items = items.filter(item => {
      if ( !item.system.constructor._schemaTemplates?.includes(PhysicalItemTemplate) ) {
        foundNonPhysical = true;
        return false;
      }
      return true;
    });
    if ( foundNonPhysical ) ui.notifications.warn("DND5E.Group.Warning.PhysicalItemOnly", { localize: true });
    return super._onDropCreateItems(event, items, behavior);
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
   * @this {MultiActorSheet}
   */
  static #onPlaceMembers() {
    this.actor.system.placeMembers();
  }

  /* -------------------------------------------- */

  /**
   * Handle removing a group member.
   * @this {MultiActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   * @returns {Promise<Actor5e>}
   */
  static async #onRemoveMember(event, target) {
    return this.actor.system.removeMember(await fromUuid(target.closest(".member[data-uuid]")?.dataset.uuid));
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
