import ActorSheet5eCharacter from "./character-sheet.mjs";

/**
 * An Actor sheet for player character type actors.
 */
export default class ActorSheet5eCharacter2 extends ActorSheet5eCharacter {
  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "sheet", "actor", "character"],
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
    const { attributes } = this.actor.system;

    context.labels.class = Object.values(this.actor.classes).sort((a, b) => {
      return b.system.levels - a.system.levels;
    }).map(c => `${c.name} ${c.system.levels}`).join(" / ");

    context.editMode = this._mode === this.constructor.MODES.EDIT;
    if ( context.editMode ) context.cssClass += " edit-mode";

    context.exhaustion = Array.fromRange(6, 1).map(n => {
      const label = game.i18n.format("DND5E.ExhaustionLevel", { n });
      const classes = ["pip"];
      const filled = attributes.exhaustion >= n;
      if ( filled ) classes.push("filled");
      if ( n === 6 ) classes.push("death");
      return { n, label, filled, tooltip: label, classes: classes.join(" ") };
    });

    context.speed = Object.entries(CONFIG.DND5E.movementTypes).reduce((obj, [k, label]) => {
      const value = attributes.movement[k];
      if ( value > obj.value ) Object.assign(obj, { value, label });
      return obj;
    }, { value: 0, label: CONFIG.DND5E.movementTypes.walk });

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".pips[data-prop]").on("click", this._onTogglePip.bind(this));
    html.find(".speed-tooltip").on("pointerover", this._onHoverSpeed.bind(this));
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

  /* -------------------------------------------- */

  /**
   * Handle toggling a pip on the character sheet.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onTogglePip(event) {
    const n = Number(event.target.closest("[data-n]")?.dataset.n);
    if ( !n || isNaN(n) ) return;
    const prop = event.currentTarget.dataset.prop;
    let value = foundry.utils.getProperty(this.actor, prop);
    if ( value === n ) value--;
    else value = n;
    return this.actor.update({ [prop]: value });
  }

  /* -------------------------------------------- */

  /**
   * Handle showing a breakdown of all this character's movement speeds.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onHoverSpeed(event) {
    if ( this._mode !== this.constructor.MODES.PLAY ) return;
    const { movement } = this.actor.system.attributes;
    const units = movement.units || Object.keys(CONFIG.DND5E.movementUnits)[0];
    const contents = Object.entries(CONFIG.DND5E.movementTypes).reduce((html, [k, label]) => {
      const value = movement[k];
      if ( value ) html += `
        <div class="row">
          <i class="fas ${k}"></i>
          <span class="value">${value} <span class="units">${units}</span></span>
          <span class="label">${label}</span>
        </div>
      `;
      return html;
    }, "");
    if ( !contents ) return;
    game.tooltip.activate(event.currentTarget, {
      text: contents,
      direction: TooltipManager.TOOLTIP_DIRECTIONS.DOWN,
      cssClass: "property-attribution"
    });
  }
}
