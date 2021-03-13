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
      sizes: CONFIG.DND5E.actorSizes
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
    html.find("input[name='custom']").focusin(this._onCustomFieldFocused.bind(this, html));
  }

  /**
   * Select the custom radio button when the custom text field is focused.
   * @param {Event} event     The original click event
   * @private
   */
  _onCustomFieldFocused(html, event) {
    html.find("input[name='value']").val(["custom"]);
  }
}
