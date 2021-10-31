import Actor5e from "../actor/entity.js";
import ProficiencySelector from "../apps/proficiency-selector.js";
import TraitConfig from "../apps/trait-config.js";
import TraitSelector from "../apps/trait-selector.js";
import ActiveEffect5e from "../active-effect.js";

/**
 * Override and extend the core ItemSheet implementation to handle specific item types.
 * @extends {ItemSheet}
 */
export default class ItemSheet5e extends ItemSheet {
  constructor(...args) {
    super(...args);

    // Expand the default size of the class sheet
    if ( this.object.data.type === "class" ) {
      this.options.width = this.position.width = 600;
      this.options.height = this.position.height = 680;
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 560,
      height: 400,
      classes: ["dnd5e", "sheet", "item"],
      resizable: true,
      scrollY: [".tab.details"],
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}]
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get template() {
    const path = "systems/dnd5e/templates/items/";
    return `${path}/${this.item.data.type}.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    const data = super.getData(options);
    const itemData = data.data;
    data.labels = this.item.labels;
    data.config = CONFIG.DND5E;
    data.embedded = this.object.isEmbedded;
    data.editablePrototype = data.editable && !data.embedded;

    // Item Type, Status, and Details
    data.itemType = game.i18n.localize(`ITEM.Type${data.item.type.titleCase()}`);
    data.itemStatus = this._getItemStatus(itemData);
    data.itemProperties = this._getItemProperties(itemData);
    data.baseItems = await this._getItemBaseTypes(itemData);
    data.isPhysical = itemData.data.hasOwnProperty("quantity");

    // Potential consumption targets
    data.abilityConsumptionTargets = this._getItemConsumptionTargets(itemData);

    // Action Details
    data.hasAttackRoll = this.item.hasAttack;
    data.isHealing = itemData.data.actionType === "heal";
    data.isFlatDC = getProperty(itemData, "data.save.scaling") === "flat";
    data.isLine = ["line", "wall"].includes(itemData.data.target?.type);

    // Original maximum uses formula
    const sourceMax = foundry.utils.getProperty(this.item.data._source, "data.uses.max");
    if ( sourceMax ) itemData.data.uses.max = sourceMax;

    // Vehicles
    data.isCrewed = itemData.data.activation?.type === "crew";
    data.isMountable = this._isItemMountable(itemData);

    // Armor Class
    data.isArmor = this.item.isArmor;
    data.hasAC = data.isArmor || data.isMountable;
    data.hasDexModifier = data.isArmor && (itemData.data.armor?.type !== "shield");

    // Prepare Active Effects
    data.effects = ActiveEffect5e.prepareActiveEffectCategories(this.item.effects);

    // Prepare Traits
    if ( itemData.type === "background" ) {
      this._prepareTraits(itemData);
      await this._prepareGrantedTraits(data);
    }

    // Re-define the template data references (backwards compatible)
    data.item = itemData;
    data.data = itemData.data;
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Get the base weapons and tools based on the selected type.
   *
   * @param {object} item        Item data for the item being displayed
   * @returns {Promise<object>}  Object with base items for this type formatted for selectOptions.
   * @protected
   */
  async _getItemBaseTypes(item) {
    const type = item.type === "equipment" ? "armor" : item.type;
    const ids = CONFIG.DND5E[`${type}Ids`];
    if ( ids === undefined ) return {};

    const typeProperty = type === "armor" ? "armor.type" : `${type}Type`;
    const baseType = foundry.utils.getProperty(item.data, typeProperty);

    const items = await Object.entries(ids).reduce(async (acc, [name, id]) => {
      const baseItem = await ProficiencySelector.getBaseItem(id);
      const obj = await acc;
      if ( baseType !== foundry.utils.getProperty(baseItem.data, typeProperty) ) return obj;
      obj[name] = baseItem.name;
      return obj;
    }, {});

    return Object.fromEntries(Object.entries(items).sort((lhs, rhs) => lhs[1].localeCompare(rhs[1])));
  }

  /* -------------------------------------------- */

  /**
   * Get the valid item consumption targets which exist on the actor
   * @param {object} item         Item data for the item being displayed
   * @returns {{string: string}}   An object of potential consumption targets
   * @private
   */
  _getItemConsumptionTargets(item) {
    const consume = item.data.consume || {};
    if ( !consume.type ) return [];
    const actor = this.item.actor;
    if ( !actor ) return {};

    // Ammunition
    if ( consume.type === "ammo" ) {
      return actor.itemTypes.consumable.reduce((ammo, i) => {
        if ( i.data.data.consumableType === "ammo" ) {
          ammo[i.id] = `${i.name} (${i.data.data.quantity})`;
        }
        return ammo;
      }, {[item._id]: `${item.name} (${item.data.quantity})`});
    }

    // Attributes
    else if ( consume.type === "attribute" ) {
      const attributes = TokenDocument.implementation.getConsumedAttributes(actor.data.data);
      attributes.bar.forEach(a => a.push("value"));
      return attributes.bar.concat(attributes.value).reduce((obj, a) => {
        let k = a.join(".");
        obj[k] = k;
        return obj;
      }, {});
    }

    // Materials
    else if ( consume.type === "material" ) {
      return actor.items.reduce((obj, i) => {
        if ( ["consumable", "loot"].includes(i.data.type) && !i.data.data.activation ) {
          obj[i.id] = `${i.name} (${i.data.data.quantity})`;
        }
        return obj;
      }, {});
    }

    // Charges
    else if ( consume.type === "charges" ) {
      return actor.items.reduce((obj, i) => {

        // Limited-use items
        const uses = i.data.data.uses || {};
        if ( uses.per && uses.max ) {
          const label = uses.per === "charges"
            ? ` (${game.i18n.format("DND5E.AbilityUseChargesLabel", {value: uses.value})})`
            : ` (${game.i18n.format("DND5E.AbilityUseConsumableLabel", {max: uses.max, per: uses.per})})`;
          obj[i.id] = i.name + label;
        }

        // Recharging items
        const recharge = i.data.data.recharge || {};
        if ( recharge.value ) obj[i.id] = `${i.name} (${game.i18n.format("DND5E.Recharge")})`;
        return obj;
      }, {});
    }
    else return {};
  }

  /* -------------------------------------------- */

  /**
   * Get the text item status which is shown beneath the Item type in the top-right corner of the sheet.
   * @param {object} item    Copy of the item data being prepared for display.
   * @returns {string|null}  Item status string if applicable to item's type.
   * @private
   */
  _getItemStatus(item) {
    if ( item.type === "spell" ) {
      return CONFIG.DND5E.spellPreparationModes[item.data.preparation];
    }
    else if ( ["weapon", "equipment"].includes(item.type) ) {
      return game.i18n.localize(item.data.equipped ? "DND5E.Equipped" : "DND5E.Unequipped");
    }
    else if ( item.type === "tool" ) {
      return game.i18n.localize(item.data.proficient ? "DND5E.Proficient" : "DND5E.NotProficient");
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the Array of item properties which are used in the small sidebar of the description tab.
   * @param {object} item  Copy of the item data being prepared for display.
   * @returns {string[]}   List of property labels to be shown.
   * @private
   */
  _getItemProperties(item) {
    const props = [];
    const labels = this.item.labels;

    if ( item.type === "weapon" ) {
      props.push(...Object.entries(item.data.properties)
        .filter(e => e[1] === true)
        .map(e => CONFIG.DND5E.weaponProperties[e[0]]));
    }

    else if ( item.type === "spell" ) {
      props.push(
        labels.components,
        labels.materials,
        item.data.components.concentration ? game.i18n.localize("DND5E.Concentration") : null,
        item.data.components.ritual ? game.i18n.localize("DND5E.Ritual") : null
      );
    }

    else if ( item.type === "equipment" ) {
      props.push(CONFIG.DND5E.equipmentTypes[item.data.armor.type]);
      if ( this.item.isArmor || this._isItemMountable(item) ) props.push(labels.armor);
    }

    else if ( item.type === "feat" ) {
      props.push(labels.featType);
    }

    // Action type
    if ( item.data.actionType ) {
      props.push(CONFIG.DND5E.itemActionTypes[item.data.actionType]);
    }

    // Action usage
    if ( (item.type !== "weapon") && item.data.activation && !isObjectEmpty(item.data.activation) ) {
      props.push(
        labels.activation,
        labels.range,
        labels.target,
        labels.duration
      );
    }
    return props.filter(p => !!p);
  }

  /* -------------------------------------------- */

  /**
   * Prepare the data structure for traits data like languages, skills, and proficiencies
   * @param {object} itemData  Item data being prepared.
   * @private
   */
  _prepareTraits(itemData) {
    for ( const [type, data] of Object.entries(itemData.data.traits) ) {
      if ( !data ) continue;
      if ( ["armor", "weapon", "tool"].includes(type) ) {
        Actor5e.prepareProficiencies(data, type);
      } else {
        const choices = CONFIG.DND5E[type];
        if ( !choices || !data ) continue;
        data.selected = data.value.reduce((obj, t) => {
          obj[t] = choices[t];
          return obj;
        }, {});
      }
      if ( foundry.utils.isObjectEmpty(data.selected) ) data.selected = null;
    }
  }

  /* -------------------------------------------- */

  /**
   * Is this item a separate large object like a siege engine or vehicle component that is
   * usually mounted on fixtures rather than equipped, and has its own AC and HP.
   * @param {object} item  Copy of item data being prepared for display.
   * @returns {boolean}    Is item siege weapon or vehicle equipment?
   * @private
   */
  _isItemMountable(item) {
    const data = item.data;
    return (item.type === "weapon" && data.weaponType === "siege")
      || (item.type === "equipment" && data.armor.type === "vehicle");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  setPosition(position={}) {
    if ( !(this._minimized || position.height) ) {
      position.height = (this._tabs[0].active === "details") ? "auto" : this.options.height;
    }
    return super.setPosition(position);
  }

  /* -------------------------------------------- */
  /*  Granted Traits                              */
  /* -------------------------------------------- */

  /**
   * Prepare the labels and selection lists for granted traits (used by Background & Class items).
   * @param {object} data  Data being prepared.
   */
  async _prepareGrantedTraits(data) {
    const listFormatter = new Intl.ListFormat(game.i18n.lang, { type: "unit" });
    data.labels.grants = {};
    for ( const [type, config] of Object.entries(data.data.data.traits) ) {
      if ( this.object.isEmbedded ) {
        const choices = await ItemSheet5e._prepareTraitOptions(
          type, config.grants, config.choices, this.object.actor.getSelectedTraits(type),
          config.value, config.allowReplacements
        );
        config.available = choices;
        if ( choices ) {
          data.labels.grants[type] = game.i18n.format("DND5E.TraitConfigurationChoicesRemaining", {
            count: choices.remaining,
            type: TraitConfiguration.typeLabel(type, choices.remaining)
          });
        }
      } else {
        data.labels.grants[type] = listFormatter.format([
          ...config.grants.map(g => TraitConfig.keyLabel(type, g)),
          ...config.choices.map(c => TraitConfig.choiceLabel(type, c))
        ]);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Create a list of selectable options for the provided trait as well as how many still need to be fulfilled.
   * @param {string} type                        Trait affected by these grants.
   * @param {string[]} grants                    Grants that should be fulfilled.
   * @param {TraitChoices[]} choices             Choices that should be offered. 
   * @param {string[]} actorSelected             Values that have already been selected on the actor.
   * @param {string[]} itemSelected              Values that have already been selected on this item.
   * @param {boolean} [allowReplacements=false]  If a grant with limited choices has no available options,
   *                                             allow player to select from full list of options.
   * @returns {{
   *   choices: object,
   *   remaining: number
   * }|null}  Choices available for most permissive unfulfilled grant & number of remaining traits to select.
   */
  static async _prepareTraitOptions(type, grants, choices, actorSelected, itemSelected, allowReplacements=false) {
    let { available, allChoices } = await ItemSheet5e._prepareUnfulfilledGrants(
      type, grants, choices, actorSelected, itemSelected);

    // Remove any grants that have no choices remaining
    let unfilteredLength = available.length;
    available = available.filter(a => a.set.size > 0);

    // If all traits of this type are already assigned, then nothing new can be selected
    if ( foundry.utils.isObjectEmpty(allChoices) ) return null;

    // If replacements are allowed and there are grants with zero choices from their limited set,
    // display all remaining choices as an option
    if ( allowReplacements && (unfilteredLength > available.length) ) {
      return {
        choices: allChoices,
        remaining: unfilteredLength
      };
    }

    // Create a choices object featuring a union of choices from all remaining grants
    const remainingSet = new Set(available.flatMap(a => Array.from(a.set)));
    this._filterTraitObject(allChoices, Array.from(remainingSet), true);

    if ( foundry.utils.isObjectEmpty(allChoices) ) return null;
    return {
      choices: allChoices,
      remaining: available.length
    };
  }

  /* -------------------------------------------- */

  /**
   * Determine which of the provided grants, if any, still needs to be fulfilled.
   * @param {string} type                      Trait affected by these grants.
   * @param {string[]} grants                    Grants that should be fulfilled.
   * @param {TraitChoices[]} choices             Choices that should be offered. 
   * @param {string[]} actorSelected             Values that have already been selected on the actor.
   * @param {string[]} itemSelected              Values that have already been selected on this item.
   * @returns {{
   *   available: object[],
   *   allChoices: SelectChoices
   * }}  List of grants to be fulfilled and available choices.
   */
  static async _prepareUnfulfilledGrants(type, grants, choices, actorSelected, itemSelected) {
    const expandedGrants = [
      ...grants.map(g => [g]),
      ...choices.reduce((arr, choice) => {
        let count = choice.count;
        while ( count > 0 ) {
          arr.push(choice.choices ?? []);
          count -= 1;
        }
        return arr;
      }, [])
    ];

    // If all of the grants have been selected, no need to go further
    if ( expandedGrants.length <= itemSelected.length ) return { available: [], allChoices: {} };

    // Figure out how many choices each grant and sort by most restrictive first
    const allChoices = await TraitConfiguration.getTraitChoices(type);
    let available = expandedGrants.map(grant => ItemSheet5e._filterGrantChoices(allChoices, grant));
    const setSort = (lhs, rhs) => lhs.set.size - rhs.set.size;
    available.sort(setSort);

    // Remove any fulfilled grants
    for ( const selected of itemSelected ) {
      let foundMatch = false;
      available = available.filter(grant => {
        if ( foundMatch || !grant.set.has(selected) ) return true;
        foundMatch = true;
        return false;
      });
    }

    // Filter out any traits that have already been selected
    this._filterTraitObject(allChoices, actorSelected, false);
    available = available.map(a => this._filterGrantChoices(allChoices, Array.from(a.set)));

    return { available, allChoices };
  }

  /* -------------------------------------------- */

  /**
   * Turn a grant into a set of possible choices it provides.
   * @param {object} traits     Object containing all potential traits grouped into categories.
   * @param {string[]} choices  Choices to use when building trait list. Empty array means all traits passed through.
   * @returns {{
   *   choices: object,
   *   set: Set<string>
   * }}  Filtered object of nested choices and set of available choices.
   * @private
   */
  static _filterGrantChoices(traits, choices) {
    const choiceSet = choices => Object.entries(choices).reduce((set, [key, choice]) => {
      if ( choice.children ) choiceSet(choice.children).forEach(c => set.add(c));
      else set.add(key);
      return set;
    }, new Set());

    let traitsSet = foundry.utils.duplicate(traits);
    if ( choices.length > 0 ) ItemSheet5e._filterTraitObject(traitsSet, choices, true);
    return { choices: traitsSet, set: choiceSet(traitsSet) };
  }

  /* -------------------------------------------- */

  /**
   * Filters the provided trait object.
   * @param {object} traits    Object of traits to filter.
   * @param {string[]} filter  Array of keys to use when applying the filter.
   * @param {boolean} union    If true, only items in filter array will be included.
   *                           If false, only items not in the filter array will be included.
   * @private
   */
  static _filterTraitObject(traits, filter, union) {
    for ( const [key, trait] of Object.entries(traits) ) {
      if ( filter.includes(key) ) {
        if ( !union ) delete traits[key];
        continue;
      }

      let selectedChildren = false;
      if ( trait.children ) {
        this._filterTraitObject(trait.children, filter, union);
        if ( !foundry.utils.isObjectEmpty(trait.children) ) selectedChildren = true;
      }

      if ( union && !selectedChildren ) delete traits[key];
    }
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  _getSubmitData(updateData={}) {

    // Create the expanded update data object
    const fd = new FormDataExtended(this.form, {editors: this.editors});
    let data = fd.toObject();
    if ( updateData ) data = mergeObject(data, updateData);
    else data = expandObject(data);

    // Handle Damage array
    const damage = data.data?.damage;
    if ( damage ) damage.parts = Object.values(damage?.parts || {}).map(d => [d[0] || "", d[1] || ""]);

    // Return the flattened submission data
    return flattenObject(data);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    if ( this.isEditable ) {
      html.find(".damage-control").click(this._onDamageControl.bind(this));
      html.find(".delete-tag").click(this._onDeleteTag.bind(this));
      html.find(".trait-configuration").click(this._onConfigureTraits.bind(this));
      html.find(".trait-selector").click(this._onSelectTraits.bind(this));
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
      const damage = this.item.data.data.damage;
      return this.item.update({"data.damage.parts": damage.parts.concat([["", ""]])});
    }

    // Remove a damage component
    if ( a.classList.contains("delete-damage") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".damage-part");
      const damage = foundry.utils.deepClone(this.item.data.data.damage);
      damage.parts.splice(Number(li.dataset.damagePart), 1);
      return this.item.update({"data.damage.parts": damage.parts});
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the TraitSelector application for selection various options.
   * @param {Event} event   The click event which originated the selection.
   * @private
   */
  _onSelectTraits(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const options = {
      name: a.dataset.target,
      title: a.parentElement.innerText,
      choices: [],
      allowCustom: false
    };
    switch (a.dataset.options) {
      case "saves":
        options.choices = CONFIG.DND5E.abilities;
        options.valueKey = null;
        break;
      case "skills.choices":
        options.choices = CONFIG.DND5E.skills;
        options.valueKey = null;
        break;
      case "skills":
        const skills = this.item.data.data.skills;
        const choiceSet = skills.choices?.length ? skills.choices : Object.keys(CONFIG.DND5E.skills);
        options.choices =
          Object.fromEntries(Object.entries(CONFIG.DND5E.skills).filter(([skill]) => choiceSet.includes(skill)));
        options.maximum = skills.number;
        break;
    }
    new TraitSelector(this.item, options).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the TraitConfig application for configuring which traits
   * can be chosen by the player.
   * @param {Event} event  The click event which originated the configuration.
   * @private
   */
  _onConfigureTraits(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const options = {
      name: a.dataset.target,
      title: a.parentElement.innerText,
      type: a.dataset.type
    };
    new TraitConfig(this.item, options).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle the deletion of a tag when the delete tag link is clicked.
   * @param {Event} event         The click event that triggered the deletion.
   * @returns {Item5e|undefined}  Item with the updates applied (if they were applied).
   * @private
   */
  _onDeleteTag(event) {
    event.preventDefault();
    const tag = event.target.closest(".tag");
    const type = tag.dataset.type;
    const existingValues = this.object.data.data.traits[type]?.value ?? [];
    const index = existingValues.findIndex(v => v === tag.dataset.key);
    if ( index !== -1 ) {
      existingValues.splice(index, 1);
      const updateData = {};
      updateData[`data.traits.${type}.value`] = existingValues;
      return this.object.update(updateData);
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onSubmit(...args) {
    if ( this._tabs[0].active === "details" ) this.position.height = "auto";
    await super._onSubmit(...args);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    let addedTraits = {};
    const updateData = foundry.utils.expandObject(Object.fromEntries(Object.entries(formData).filter(([k, v]) => {
      if ( !k.startsWith("addedTrait:") ) return true;
      if ( v !== "" ) addedTraits[k.replace("addedTrait:", "")] = v;
      return false;
    })));
    for ( const [type, value] of Object.entries(addedTraits) ) {
      let existingValue = this.object.data.data.traits[type].value ?? [];
      existingValue.push(value);
      updateData[`data.traits.${type}.value`] = existingValue;
    }
    return this.object.update(updateData);
  }
}
