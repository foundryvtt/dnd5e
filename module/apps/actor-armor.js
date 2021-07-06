/**
 * Interface for managing a character's armor calculation.
 *
 * @extends {DocumentSheet}
 */
export default class ActorArmorConfig extends DocumentSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "actor-armor-config",
      classes: ["dnd5e", "actor-armor-config"],
      template: "systems/dnd5e/templates/apps/actor-armor.html",
      width: 320,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `${game.i18n.localize("DND5E.ArmorConfig")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const data = {
      config: CONFIG.DND5E,
      ac: foundry.utils.deepClone(foundry.utils.getProperty(this.object.data, "data.attributes.ac")),
      preview: this.object._computeArmorClass(this.object.data.data, { ignoreFlat: true }),
      formulaDisabled: false
    };

    if ( data.ac.calc !== "custom" ) {
      data.ac.formula = CONFIG.DND5E.armorClasses[data.ac.calc]?.formula || "";
      data.formulaDisabled = true;
    }

    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const data = foundry.utils.expandObject(formData).ac;
    return this.object.update({"data.attributes.ac": data});
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    await super._onChangeInput(event);
    const calc = this.form["ac.calc"].value;
    this.form["ac.formula"].disabled = calc !== "custom";
    if ( calc !== "custom" ) this.form["ac.formula"].value = CONFIG.DND5E.armorClasses[calc]?.formula || "";
    const data = mergeObject(this.object.toObject(false), {
      'data.attributes.ac': {calc, formula: this.form["ac.formula"].value}
    });
    this.form["ac.flat"].placeholder = this.object._computeArmorClass(data.data, { ignoreFlat: true });
  }
}
