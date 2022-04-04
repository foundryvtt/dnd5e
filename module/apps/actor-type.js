import Actor5e from "../actor/entity.js";

/**
 * A specialized form used to select from a checklist of attributes, traits, or properties
 * @extends {FormApplication}
 */
export default class ActorTypeConfig extends FormApplication {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "actor-type", "trait-selector"],
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

  /** @inheritdoc */
  get title() {
    return `${game.i18n.localize("DND5E.CreatureTypeTitle")}: ${this.object.name}`;
  }

  /* -------------------------------------------- */

  /** @override */
  get id() {
    return `actor-type-${this.object.id}`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {

    // Get current value or new default
    let attr = foundry.utils.getProperty(this.object.data.data, "details.type");
    if ( foundry.utils.getType(attr) !== "Object" ) attr = {
      value: (attr in CONFIG.DND5E.creatureTypes) ? attr : "humanoid",
      subtype: "",
      swarm: "",
      custom: ""
    };

    // Populate choices
    const types = {};
    for ( let [k, v] of Object.entries(CONFIG.DND5E.creatureTypes) ) {
      types[k] = {
        label: game.i18n.localize(v),
        chosen: attr.value === k
      };
    }

    // Return data for rendering
    return {
      types: types,
      custom: {
        value: attr.custom,
        label: game.i18n.localize("DND5E.CreatureTypeSelectorCustom"),
        chosen: attr.value === "custom"
      },
      subtype: attr.subtype,
      swarm: attr.swarm,
      sizes: Array.from(Object.entries(CONFIG.DND5E.actorSizes)).reverse().reduce((obj, e) => {
        obj[e[0]] = e[1];
        return obj;
      }, {}),
      preview: Actor5e.formatCreatureType(attr) || "–"
    };
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const typeObject = foundry.utils.expandObject(formData);
    return this.object.update({ "data.details.type": typeObject });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("input[name='custom']").focusin(this._onCustomFieldFocused.bind(this));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onChangeInput(event) {
    super._onChangeInput(event);
    const typeObject = foundry.utils.expandObject(this._getSubmitData());
    this.form.preview.value = Actor5e.formatCreatureType(typeObject) || "—";
  }

  /* -------------------------------------------- */

  /**
   * Select the custom radio button when the custom text field is focused.
   * @param {FocusEvent} event      The original focusin event
   * @private
   */
  _onCustomFieldFocused(event) {
    this.form.querySelector("input[name='value'][value='custom']").checked = true;
    this._onChangeInput(event);
  }
}
