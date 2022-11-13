import TraitSelector from "../trait-selector.mjs";
import ActiveEffect5e from "../../documents/active-effect.mjs";

/**
 * Override and extend the core ItemSheet implementation to handle specific item types.
 */
export default class ItemSheet5e extends ItemSheet {
  constructor(...args) {
    super(...args);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 560,
      height: 400,
      classes: ["shaper", "sheet", "item"],
      resizable: true,
      scrollY: [".tab.details"],
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}],
      dragDrop: [{dragSelector: "[data-effect-id]", dropSelector: ".effects-list"}],
    });
  }



  /* -------------------------------------------- */

  /** @inheritdoc */
  get template() {
    return `systems/shaper/templates/items/${this.item.type}.hbs`;
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    const context = await super.getData(options);
    const item = context.item;
    const source = item.toObject();

    foundry.utils.mergeObject(context, {
      source: source.system,
      system: item.system,
      labels: item.labels,
      isEmbedded: item.isEmbedded,

      // Item Type, Status, and Details
      itemType: game.i18n.localize(`ITEM.Type${item.type.titleCase()}`),
      itemProperties: this._getItemProperties(),
      baseItems: await this._getItemBaseTypes(),
      isPhysical: item.system.hasOwnProperty("quantity"),

      // Enrich HTML description
      descriptionHTML: await TextEditor.enrichHTML(item.system.description.value, {
        secrets: item.isOwner,
        async: true,
        relativeTo: this.item
      }),

      // Action Details
      isHealing: item.system.actionType === "heal",
      hasAttackRoll: item.hasAttack,
      isLine: ["line", "wall"].includes(item.system.target?.type),

      // Prepare Active Effects
      effects: ActiveEffect5e.prepareActiveEffectCategories(item.effects)
    });

    // Set up config with proper spell components
    context.config = foundry.utils.mergeObject(CONFIG.SHAPER, {
      spellComponents: {...CONFIG.SHAPER.spellComponents, ...CONFIG.SHAPER.spellTags}
    }, {inplace: false});

    return context;
  }


  /* -------------------------------------------- */

  /**
   * Get the base weapons and tools based on the selected type.
   * @returns {Promise<object>}  Object with base items for this type formatted for selectOptions.
   * @protected
   */
  async _getItemBaseTypes() {
    const type = this.item.type;
    const baseIds = CONFIG.SHAPER[`${type}Ids`];
    if ( baseIds === undefined ) return {};

    const typeProperty = `${type}Type`;
    const baseType = foundry.utils.getProperty(this.item.system, typeProperty);

    const items = {};
    for ( const [name, id] of Object.entries(baseIds) ) {
      if ( baseType !== foundry.utils.getProperty(baseItem.system, typeProperty) ) continue;
      items[name] = baseItem.name;
    }
    return Object.fromEntries(Object.entries(items).sort((lhs, rhs) => lhs[1].localeCompare(rhs[1])));
  }

  /* -------------------------------------------- */

  /**
   * Get the Array of item properties which are used in the small sidebar of the description tab.
   * @returns {string[]}   List of property labels to be shown.
   * @private
   */
  _getItemProperties() {
    const props = [];
    const labels = this.item.labels;
    switch ( this.item.type ) {
      case "feat":
        props.push(labels.featType);
        break;
    }

    // Action type
    if ( this.item.system.actionType ) {
      props.push(CONFIG.SHAPER.itemActionTypes[this.item.system.actionType]);
    }

    // Action usage
    if ( !foundry.utils.isEmpty(this.item.system.activation) ) {
      props.push(labels.activation, labels.range, labels.target, labels.duration);
    }
    return props.filter(p => !!p);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  setPosition(position={}) {
    if ( !(this._minimized || position.height) ) {
      position.height = (this._tabs[0].active === "details") ? "auto" : this.options.height;
    }
    return super.setPosition(position);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async activateEditor(name, options={}, initialContent="") {
    options.relativeLinks = true;
    options.plugins = {
      menu: ProseMirror.ProseMirrorMenu.build(ProseMirror.defaultSchema, {
        compact: true,
        destroyOnSave: true,
        onSave: () => this.saveEditor(name, {remove: true})
      })
    };
    return super.activateEditor(name, options, initialContent);
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _getSubmitData(updateData={}) {
    const formData = foundry.utils.expandObject(super._getSubmitData(updateData));

    // Handle Damage array
    const damage = formData.system?.damage;
    if ( damage ) damage.parts = Object.values(damage?.parts || {}).map(d => [d[0] || "", d[1] || ""]);

    // Handle Resource Consumption
    const consume = formData.system?.consume;
    if ( consume?.type === "attribute" ) {
      switch (consume.label) {
        case 'hp':
          consume.target = "attributes.hp.value";
          break;
        case 'mp':
          consume.target = "attributes.mp.value";
          break;
      }
    }

    // Return the flattened submission data
    return foundry.utils.flattenObject(formData);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    if ( this.isEditable ) {
      html.find(".damage-control").click(this._onDamageControl.bind(this));
      html.find(".trait-selector").click(this._onConfigureTraits.bind(this));
      html.find(".effect-control").click(ev => {
        if ( this.item.isOwned ) return ui.notifications.warn("Managing Active Effects within an Owned Item is not currently supported and will be added in a subsequent update.");
        ActiveEffect5e.onManageActiveEffect(ev, this.item);
      });
    }
  }


  /* -------------------------------------------- */

  /**
   * Add or remove a damage part from the damage formula.
   * @param {Event} event             The original click event.
   * @returns {Promise<Item5e>|null}  Item with updates applied.
   * @private
   */
  async _onDamageControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new damage component
    if ( a.classList.contains("add-damage") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const damage = this.item.system.damage;
      return this.item.update({"system.damage.parts": damage.parts.concat([["", ""]])});
    }

    // Remove a damage component
    if ( a.classList.contains("delete-damage") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".damage-part");
      const damage = foundry.utils.deepClone(this.item.system.damage);
      damage.parts.splice(Number(li.dataset.damagePart), 1);
      return this.item.update({"system.damage.parts": damage.parts});
    }
  }
  /* -------------------------------------------- */

  /** @inheritdoc */
  _onDragStart(event) {
    const li = event.currentTarget;
    if ( event.target.classList.contains("content-link") ) return;

    // Create drag data
    let dragData;

    // Active Effect
    if ( li.dataset.effectId ) {
      const effect = this.item.effects.get(li.dataset.effectId);
      dragData = effect.toDragData();
    }

    if ( !dragData ) return;

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const item = this.item;
    
    /**
     * A hook event that fires when some useful data is dropped onto an ItemSheet5e.
     * @function shaper.dropItemSheetData
     * @memberof hookEvents
     * @param {Item5e} item                  The Item5e
     * @param {ItemSheet5e} sheet            The ItemSheet5e application
     * @param {object} data                  The data that has been dropped onto the sheet
     * @returns {boolean}                    Explicitly return `false` to prevent normal drop handling.
     */
    const allowed = Hooks.call("shaper.dropItemSheetData", item, this, data);
    if ( allowed === false ) return;

    switch ( data.type ) {
      case "ActiveEffect":
        return this._onDropActiveEffect(event, data);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle the dropping of ActiveEffect data onto an Item Sheet
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data
   * @param {object} data                      The data transfer extracted from the event
   * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const effect = await ActiveEffect.implementation.fromDropData(data);
    if ( !this.item.isOwner || !effect ) return false;
    if ( (this.item.uuid === effect.parent.uuid) || (this.item.uuid === effect.origin) ) return false;
    return ActiveEffect.create({
      ...effect.toObject(),
      origin: this.item.uuid,
    }, {parent: this.item});
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the TraitSelector application for selection various options.
   * @param {Event} event   The click event which originated the selection.
   * @private
   */
  _onConfigureTraits(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const options = {
      name: a.dataset.target,
      title: a.parentElement.innerText,
      choices: [],
      allowCustom: false
    };
    switch (a.dataset.options) {
      case "skills.choices":
        options.choices = CONFIG.SHAPER.skills;
        options.valueKey = null;
        options.labelKey = "label";
        break;
      case "skills":
        const skills = this.item.system.skills;
        const choices = skills.choices?.length ? skills.choices : Object.keys(CONFIG.SHAPER.skills);
        options.choices = Object.fromEntries(Object.entries(CONFIG.SHAPER.skills).filter(([s]) => choices.includes(s)));
        options.maximum = skills.number;
        options.labelKey = "label";
        break;
    }
    new TraitSelector(this.item, options).render(true);
  }



  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onSubmit(...args) {
    if ( this._tabs[0].active === "details" ) this.position.height = "auto";
    await super._onSubmit(...args);
  }
}
