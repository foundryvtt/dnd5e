import BaseConfigSheet from "./base-config.mjs";

/**
 * Interface for managing a character's armor calculation.
 */
export default class ResourceConfig extends BaseConfigSheet {
  constructor(...args) {
    super(...args);

    /**
     * Cloned copy of the actor for previewing changes.
     * @type {Actor5e}
     */
    this.clone = this.document.clone();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "actor-resource-config"],
      template: "systems/dnd5e/templates/apps/actor-resource.hbs",
      width: 500,
      height: "auto",
      sheetConfig: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `${game.i18n.localize("DND5E.ResourceConfig")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const source = this.clone.system.toObject().resources;
    return {
      resources: ["primary", "secondary", "tertiary"].map(key => {
        return {
          key: key, src: source[key],
          displayLabel: `DND5E.Resource${key.capitalize()}`,
          ...this.clone.system.resources[key]
        };
      })
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _getActorOverrides() {
    return Object.keys(foundry.utils.flattenObject(this.document.overrides?.system?.resources || {}));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const res = foundry.utils.expandObject(formData).resources;
    return this.document.update({"system.resources": res});
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    await super._onChangeInput(event);
    const target = event.currentTarget;

    // Update clone with new data & re-render
    const value = (target.type === "checkbox") ? target.checked : target.value;
    this.clone.updateSource({ [`system.${target.name}`]: value });
    this.clone.prepareData();
    this.render();
  }
}
