import Actor5e from "../actor/entity.js";

/**
 * A specialized form used to select from a checklist of attributes, traits, or properties
 * @implements {FormApplication}
 */
export default class ActorTypeConfig extends FormApplication {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "actor-type",
      classes: ["dnd5e"],
      title: "Actor Creature Type",
      template: "systems/dnd5e/templates/apps/actor-type.html",
      width: 280,
      height: "auto",
      choices: {},
      allowCustom: true,
      minimum: 0,
      maximum: null
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {

    // Get current values
    let attr = getProperty(this.object.data.data, 'details.type');
    if ( getType(attr) !== "Object" ) attr = {
      value: attr ?? "",
      subtype: "",
      swarm: { isSwarm: false, size: "" },
      custom: ""
    };

    let types = {};
    // Populate choices
    for ( let [k, v] of Object.entries(CONFIG.DND5E.creatureTypes) ) {
      types[k] = {
        label: game.i18n.localize(v),
        chosen: attr.value.includes(k)
      }
    }
    types["custom"] = {
      label: game.i18n.localize("DND5E.CreatureTypeSelectorCustom"),
      chosen: (attr.value === "custom")
    };

    // Return data
    return {
      types: types,
      subtype: attr.subtype,
      swarm: attr.swarm,
      custom: attr.custom,
      sizes: CONFIG.DND5E.actorSizes,
      preview: Actor5e.formatCreatureType(attr) || "–"
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const typeObject = foundry.utils.expandObject(formData);
    this.object.update({ 'data.details.type': typeObject });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("input[name='custom']").focusin(this._onCustomFieldFocused.bind(this, html[0]));
    html.find("input[name='swarm.isSwarm']").change(this._onSwarmCheckboxChanged.bind(this, html[0]));

    // Set initial visibility
    this._onSwarmCheckboxChanged(html[0]);
  }

  /** @override */
  _onChangeInput(event) {
    super._onChangeInput(event);

    const typeObject = foundry.utils.expandObject(this._getSubmitData());
    this._element.find(".type-preview").text(Actor5e.formatCreatureType(typeObject) || "—");
  }

  /**
   * Select the custom radio button when the custom text field is focused.
   * @param {HTMLElement} html      HTML object of the form area
   * @param {Event} event           The original click event
   * @private
   */
  _onCustomFieldFocused(html, event) {
    html.querySelector("input[name='value'][value='custom']").checked = true;
    this._onChangeInput(event);
  }

  /**
   * Toggle the visibility of the swarm size field when the swarm checkbox is changed.
   * @param {HTMLElement} html      HTML object of the form area
   * @param {Event} event           The original click event
   * @private
   */
  _onSwarmCheckboxChanged(html, event) {
    const checked = html.querySelector("input[name='swarm.isSwarm']").checked;
    html.querySelector("select[name='swarm.size']").parentElement.style.opacity = checked ? 1 : 0;
  }
}
