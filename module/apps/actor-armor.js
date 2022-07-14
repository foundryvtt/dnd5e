/**
 * Interface for managing a character's armor calculation.
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
    // Clone actor and get AC data
    this.clone ??= this.object.clone();
    const ac = this.clone.system.attributes.ac;

    // Get configuration data for the calculation mode
    let cfg = CONFIG.DND5E.armorClasses[ac.calc];
    if ( !cfg ) {
      ac.calc = "flat";
      cfg = CONFIG.DND5E.armorClasses.flat;
      this.clone._prepareArmorClass();
    }

    // Return context data
    return {
      ac,
      calculations: CONFIG.DND5E.armorClasses,
      valueDisabled: !["flat", "natural"].includes(ac.calc),
      formula: ac.calc === "custom" ? ac.formula : cfg.formula,
      formulaDisabled: ac.calc !== "custom"
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const ac = foundry.utils.expandObject(formData).ac;
    return this.object.update({"system.attributes.ac": ac});
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    await super._onChangeInput(event);

    const ac = this.clone.system.attributes.ac;

    // Reference form data
    ac.calc = this.form["ac.calc"].value;
    const cfg = CONFIG.DND5E.armorClasses[ac.calc];
    const enableFlat = ["flat", "natural"].includes(ac.calc);

    // Handle changes to the calculation mode specifically
    ac.formula = this.form["ac.formula"].value;
    let flat = this.form["ac.flat"].value;
    if ( event.currentTarget.name === "ac.calc" ) {
      ac.formula = ac.calc === "custom" ? ac.formula : cfg.formula;
      if ( enableFlat ) flat = ac.flat;
    }

    // Recompute effective AC
    if ( enableFlat ) ac.flat = flat;
    this.clone._prepareArmorClass();

    // Update fields
    this.form["ac.formula"].value = ac.formula;
    this.form["ac.formula"].disabled = ac.calc !== "custom";
    this.form["ac.flat"].value = enableFlat ? ac.flat : ac.value;
    this.form["ac.flat"].disabled = !enableFlat;
  }
}
