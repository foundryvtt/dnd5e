import ActorSheet5eCharacter from "./character-sheet.mjs";

/**
 * An Actor sheet for player character type actors.
 */
export default class ActorSheet5eCharacter2 extends ActorSheet5eCharacter {
  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "character2"],
      width: 800,
      height: 1000,
      resizable: true
    });
  }

  /**
   * Available sheet modes.
   * @enum {number}
   */
  static MODES = {
    PLAY: 1,
    EDIT: 2
  };

  /**
   * The mode the sheet is currently in.
   * @type {ActorSheet5eCharacter2.MODES}
   * @protected
   */
  _mode = this.constructor.MODES.PLAY;

  /* -------------------------------------------- */

  /** @override */
  get template() {
    return "systems/dnd5e/templates/actors/character-sheet-2.hbs";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderOuter() {
    const html = await super._renderOuter();
    const header = html[0].querySelector(".window-header");

    // Add edit <-> play slide toggle.
    const toggle = document.createElement("slide-toggle");
    toggle.classList.add("mode-slider");
    toggle.dataset.tooltip = "DND5E.SheetModeEdit";
    toggle.setAttribute("aria-label", game.i18n.localize("DND5E.SheetModeEdit"));
    toggle.addEventListener("change", this._onChangeSheetMode.bind(this));
    toggle.addEventListener("dblclick", event => event.stopPropagation());
    header.insertAdjacentElement("afterbegin", toggle);

    // Adjust header buttons.
    header.querySelectorAll(".header-button").forEach(btn => {
      const label = btn.querySelector(":scope > i").nextSibling;
      btn.dataset.tooltip = label.textContent;
      btn.setAttribute("aria-label", label.textContent);
      label.remove();
    });
    return html;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = await super.getData(options);

    context.labels.class = Object.values(this.actor.classes).sort((a, b) => {
      return b.system.levels - a.system.levels;
    }).map(c => `${c.name} ${c.system.levels}`).join(" / ");

    context.editMode = this._mode === this.constructor.MODES.EDIT;
    if ( context.editMode ) context.cssClass += " edit-mode";

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  _disableOverriddenFields(html) {
    // When in edit mode, field values will be the base value, rather than the derived value, so it should not be
    // necessary to disable them anymore.
  }

  /* -------------------------------------------- */

  /** @override */
  _getSubmitData(updateData={}) {
    // Skip over ActorSheet#_getSubmitData to allow for editing overridden values.
    return FormApplication.prototype._getSubmitData.call(this, updateData);
  }

  /* -------------------------------------------- */

  /**
   * Handle the user toggling the sheet mode.
   * @param {Event} event  The triggering event.
   * @protected
   */
  _onChangeSheetMode(event) {
    const { MODES } = this.constructor;
    const toggle = event.currentTarget;
    const label = game.i18n.localize(`DND5E.SheetMode${toggle.checked ? "Play" : "Edit"}`);
    toggle.dataset.tooltip = label;
    toggle.setAttribute("aria-label", label);
    this._mode = toggle.checked ? MODES.EDIT : MODES.PLAY;
    this.render();
  }
}
