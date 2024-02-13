import * as Trait from "../../documents/actor/trait.mjs";
import BaseConfigSheet from "./base-config.mjs";

/**
 * A specialized application used to modify actor traits.
 *
 * @param {Actor5e} actor                       Actor for whose traits are being edited.
 * @param {string} trait                        Trait key as defined in CONFIG.traits.
 * @param {object} [options={}]
 * @param {boolean} [options.allowCustom=true]  Support user custom trait entries.
 */
export default class TraitSelector extends BaseConfigSheet {
  constructor(actor, trait, options={}) {
    if ( !CONFIG.DND5E.traits[trait] ) throw new Error(
      `Cannot instantiate TraitSelector with a trait not defined in CONFIG.DND5E.traits: ${trait}.`
    );
    if ( ["saves", "skills"].includes(trait) ) throw new Error(
      `TraitSelector does not support selection of ${trait}. That should be handled through `
      + "that type's more specialized configuration application."
    );

    super(actor, options);

    /**
     * Trait key as defined in CONFIG.traits.
     * @type {string}
     */
    this.trait = trait;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trait-selector",
      classes: ["dnd5e", "trait-selector", "subconfig"],
      template: "systems/dnd5e/templates/apps/trait-selector.hbs",
      width: 320,
      height: "auto",
      sheetConfig: false,
      allowCustom: true
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get id() {
    return `${this.constructor.name}-${this.trait}-Actor-${this.document.id}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `${this.document.name}: ${Trait.traitLabel(this.trait)}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const path = Trait.actorKeyPath(this.trait);
    const data = foundry.utils.getProperty(this.document, path);
    if ( !data ) return super.getData();

    return {
      ...super.getData(),
      choices: await Trait.choices(this.trait, { chosen: data.value }),
      custom: data.custom,
      customPath: "custom" in data ? `${path}.custom` : null,
      bypasses: "bypasses" in data ? Object.entries(CONFIG.DND5E.itemProperties).reduce((obj, [k, v]) => {
        if ( v.isPhysical ) obj[k] = { label: v.label, chosen: data.bypasses.has(k) };
        return obj;
      }, {}) : null,
      bypassesPath: "bypasses" in data ? `${path}.bypasses` : null
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    for ( const checkbox of html[0].querySelectorAll("input[type='checkbox']") ) {
      if ( checkbox.checked ) this._onToggleCategory(checkbox);
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _getActorOverrides() {
    const overrides = super._getActorOverrides();
    const path = Trait.actorKeyPath(this.trait);
    this.#addOverriddenChoices("choices", Trait.changeKeyPath(this.trait), overrides);
    this.#addOverriddenChoices("bypasses", `${path}.bypasses`, overrides);
    const pathCustom = `${path}.custom`;
    const sourceCustom = foundry.utils.getProperty(this.document._source, pathCustom);
    const currentCustom = foundry.utils.getProperty(this.document, pathCustom);
    if ( sourceCustom !== currentCustom ) overrides.push(pathCustom);
    return overrides;
  }

  /* -------------------------------------------- */

  /**
   * Add choices that have been overridden.
   * @param {string} prefix       The initial form prefix under which the choices are grouped.
   * @param {string} path         Path in actor data.
   * @param {string[]} overrides  The list of fields that are currently modified by Active Effects. *Will be mutated.*
   */
  #addOverriddenChoices(prefix, path, overrides) {
    const source = new Set(foundry.utils.getProperty(this.document._source, path) ?? []);
    const current = foundry.utils.getProperty(this.document, path) ?? new Set();
    const delta = current.symmetricDifference(source);
    for ( const choice of delta ) overrides.push(`${prefix}.${choice}`);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    super._onChangeInput(event);

    if ( event.target.name?.startsWith("choices") ) this._onToggleCategory(event.target);
  }

  /* -------------------------------------------- */

  /**
   * Enable/disable all children when a category is checked.
   * @param {HTMLElement} checkbox  Checkbox that was changed.
   * @protected
   */
  _onToggleCategory(checkbox) {
    const children = checkbox.closest("li")?.querySelector("ol");
    if ( !children ) return;

    for ( const child of children.querySelectorAll("input[type='checkbox']") ) {
      child.checked = child.disabled = checkbox.checked;
    }
  }

  /* -------------------------------------------- */

  /**
   * Filter a list of choices that begin with the provided key for update.
   * @param {string} prefix    The initial form prefix under which the choices are grouped.
   * @param {string} path      Path in actor data where the final choices will be saved.
   * @param {object} formData  Form data being prepared. *Will be mutated.*
   * @protected
   */
  _prepareChoices(prefix, path, formData) {
    const chosen = new Set();
    for ( const key of Object.keys(formData).filter(k => k.startsWith(`${prefix}.`)) ) {
      if ( formData[key] ) chosen.add(key.replace(`${prefix}.`, ""));
      delete formData[key];
    }

    // Add choices from the source that have been removed by an override: if we didn't, the override would be persisted
    const source = new Set(foundry.utils.getProperty(this.document._source, path));
    const current = foundry.utils.getProperty(this.document, path);
    for ( const choice of source.difference(current) ) chosen.add(choice);

    formData[path] = Array.from(chosen).sort((a, b) => a.localeCompare(b, "en"));
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const path = Trait.actorKeyPath(this.trait);
    const data = foundry.utils.getProperty(this.document, path);

    this._prepareChoices("choices", Trait.changeKeyPath(this.trait), formData);
    if ( "bypasses" in data ) this._prepareChoices("bypasses", `${path}.bypasses`, formData);

    return this.object.update(formData);
  }
}
