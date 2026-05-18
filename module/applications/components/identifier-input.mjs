import registry from "../../registry.mjs";

/**
 * Input that allows for entering properly validated identifiers and selecting from a pre-built list.
 */
export default class IdentifierInputElement extends foundry.applications.elements.AbstractFormInputElement {
  constructor(...args) {
    super(...args);
    this._value = this.getAttribute("value");
    this.#defaultValue = this._value;
    this.#typeRegistries = (this.getAttribute("types") ?? "")
      .split(",")
      .map(t => IdentifierInputElement.REGISTRY_MAP[t.trim()])
      .filter(_ => _);
  }

  /* -------------------------------------------- */

  /**
   * Value representing the custom entry in the select dropdown.
   * @type {string}
   */
  static CUSTOM = "__CUSTOM__";

  /* -------------------------------------------- */

  /**
   * Mapping of item types to registry entries.
   * @type {Record<string, ItemRegistry>}
   */
  static REGISTRY_MAP = {
    background: registry.backgrounds,
    class: registry.classes,
    race: registry.species,
    species: registry.species,
    subclass: registry.subclasses
  };

  /* -------------------------------------------- */

  /** @override */
  static tagName = "identifier-input";

  /* -------------------------------------------- */
  /*  Element Properties                          */
  /* -------------------------------------------- */

  /**
   * Default value set for the input.
   * @type {string}
   */
  #defaultValue;

  /* -------------------------------------------- */

  /**
   * Internal fields.
   * @type {{ input: HTMLInputElement, select: HTMLSelectElement }}
   */
  #internal = {
    input: null,
    select: null
  };

  /* -------------------------------------------- */

  /**
   * Is the internal <select> currently visible?
   * @type {boolean}
   */
  get #selectVisible() {
    return this.#internal.select?.hasAttribute("hidden") ?? false;
  }

  set #selectVisible(value) {
    this._primaryInput = value ? this.#internal.select ?? this.#internal.input : this.#internal.input;
    if ( !this.#internal.select ) return;
    this.#internal.input.toggleAttribute("hidden", value);
    this.#internal.select.toggleAttribute("hidden", !value);
  }

  /* -------------------------------------------- */

  /** @override */
  _toggleDisabled(disabled) {
    this._applyInputAttributes(this.#internal.input);
    if ( this.#internal.select ) this._applyInputAttributes(this.#internal.select);
  }

  /* -------------------------------------------- */

  /**
   * Registries that can provide identifier options.
   * @type {ItemRegistry[]}
   */
  #typeRegistries = [];

  /* -------------------------------------------- */
  /*  Element Lifecycle                           */
  /* -------------------------------------------- */

  /** @override */
  _buildElements() {
    const input = this.#internal.input = document.createElement("input");
    input.type = "text";
    input.pattern = dnd5e.utils.validators.IDENTIFIER_REGEX.source.slice(1, -1);
    input.placeholder = this.getAttribute("placeholder") ?? "";

    if ( !this.#typeRegistries.length ) return [input];

    const select = this.#internal.select = document.createElement("select");
    const addOption = (value, label, group) => {
      const option = document.createElement("option");
      option.innerText = label;
      option.value = value;
      (group ?? select).append(option);
    };
    addOption("", this.getAttribute("placeholder") ?? "");
    for ( const typeRegistry of this.#typeRegistries ) {
      if ( this.#typeRegistries.length > 1 ) {
        const groups = foundry.applications.fields.prepareSelectOptionGroups({ options: typeRegistry.groupedOptions });
        for ( const { group, options } of groups ) {
          const optgroup = document.createElement("optgroup");
          optgroup.label = group;
          select.append(optgroup);
          options.forEach(o => addOption(o.value, o.label, optgroup));
        }
      }
      else typeRegistry.options.forEach(o => addOption(o.value, o.label));
    }
    select.append(document.createElement("hr"));
    addOption(IdentifierInputElement.CUSTOM, game.i18n.localize("DND5E.IdentifierCustom"));

    return [input, select];
  }

  /* -------------------------------------------- */

  /** @override */
  _refresh() {
    // If value is an option in the <select> than set its value
    if ( this.#internal.select?.querySelector(`[value="${this.value}"]`) ) {
      this.#internal.select.value = this.value;
      this.#selectVisible = true;
    }

    // Otherwise set the input value
    else {
      this.#internal.input.value = this.value;
      this.#selectVisible = false;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _activateListeners() {
    const onChangeInput = this._onChangeInput.bind(this);
    this.#internal.input.addEventListener("change", onChangeInput);
    this.#internal.select?.addEventListener("change", onChangeInput);
    this.#internal.input.addEventListener("blur", event => {
      if ( event.target.value === "" ) this.#selectVisible = true;
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle changes to one of the internal fields.
   * @type {Event} event  Triggering change event.
   */
  _onChangeInput(event) {
    event.stopPropagation();

    // If "Custom Identifier" is selected, show input
    if ( event.target.value === IdentifierInputElement.CUSTOM ) {
      this.#internal.input.value = "";
      this.#internal.select.value = this.#defaultValue;
      this.#selectVisible = false;
      this.#internal.input.focus();
    }

    // Otherwise just set the value
    else this.value = event.target.value;
  }
}
