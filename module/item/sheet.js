import { AdvancementManager } from "../advancement/advancement-manager.js";
import ProficiencySelector from "../apps/proficiency-selector.js";
import TraitSelector from "../apps/trait-selector.js";
import ActiveEffect5e from "../active-effect.js";

/**
 * Override and extend the core ItemSheet implementation to handle specific item types.
 * @extends {ItemSheet}
 */
export default class ItemSheet5e extends ItemSheet {

  /**
   * Whether advancements on embedded items should be configurable.
   * @type {boolean}
   */
  advancementConfigurationMode = false;

  /* -------------------------------------------- */

  constructor(...args) {
    super(...args);

    // Expand the default size of the class sheet
    if ( this.object.data.type === "class" ) {
      this.options.width = this.position.width = 600;
      this.options.height = this.position.height = 680;
    } else if ( this.object.data.type === "subclass" ) {
      this.options.height = this.position.height = 540;
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
    data.config.spellComponents = {...data.config.spellComponents, ...data.config.spellTags};
    data.isEmbedded = this.item.isEmbedded;
    data.advancementEditable = (this.advancementConfigurationMode || !data.isEmbedded) && data.editable;

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

    // Advancement
    data.advancement = this._getItemAdvancement(this.item);

    // Prepare Active Effects
    data.effects = ActiveEffect5e.prepareActiveEffectCategories(this.item.effects);

    // Re-define the template data references (backwards compatible)
    data.item = itemData;
    data.data = itemData.data;
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Get the display object used to show the advancement tab.
   * @param {Item5e} item  The item for which the advancement is being prepared.
   * @returns {object}     Object with advancement data grouped by levels.
   */
  _getItemAdvancement(item) {
    const configMode = !item.parent || this.advancementConfigurationMode;
    const maxLevel = !configMode ? item.data.data.levels ?? item.class?.data.data.levels
      ?? item.parent.data.data.details.level : -1;
    const data = {};

    // Improperly configured advancements
    if ( item.advancement.needingConfiguration.length ) {
      data.unconfigured = {
        items: item.advancement.needingConfiguration.map(advancement => ({
          id: advancement.id,
          order: advancement.constructor.order,
          title: advancement.title,
          icon: advancement.icon,
          classRestriction: advancement.data.classRestriction,
          configured: false
        })),
        configured: "partial"
      };
    }

    // All other advancements by level
    for ( let [level, advancements] of Object.entries(item.advancement.byLevel) ) {
      if ( !configMode ) advancements = advancements.filter(a => a.appliesToClass);
      const items = advancements.map(advancement => ({
        id: advancement.id,
        order: advancement.sortingValueForLevel(level),
        title: advancement.titleForLevel(level, { configMode }),
        icon: advancement.icon,
        classRestriction: advancement.data.classRestriction,
        summary: advancement.summaryForLevel(level, { configMode }),
        configured: advancement.configuredForLevel(level)
      }));
      if ( !items.length ) continue;
      data[level] = {
        items: items.sort((a, b) => a.order.localeCompare(b.order)),
        configured: (level > maxLevel) ? false : items.some(a => !a.configured) ? "partial" : "full"
      };
    }

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

    // Hit Dice
    else if ( consume.type === "hitDice" ) {
      return {
        smallest: game.i18n.localize("DND5E.ConsumeHitDiceSmallest"),
        ...CONFIG.DND5E.hitDieTypes.reduce((obj, hd) => { obj[hd] = hd; return obj; }, {}),
        largest: game.i18n.localize("DND5E.ConsumeHitDiceLargest")
      };
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
    switch ( item.type ) {
      case "class":
        return game.i18n.format("DND5E.LevelCount", {ordinal: item.data.levels.ordinalString()});
      case "equipment":
      case "weapon":
        return game.i18n.localize(item.data.equipped ? "DND5E.Equipped" : "DND5E.Unequipped");
      case "spell":
        return CONFIG.DND5E.spellPreparationModes[item.data.preparation];
      case "tool":
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
        labels.components.vsm,
        labels.materials,
        ...labels.components.tags
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

    // Check max uses formula
    if ( data.data?.uses?.max ) {
      const maxRoll = new Roll(data.data.uses.max);
      if ( !maxRoll.isDeterministic ) {
        data.data.uses.max = this.object.data._source.data.uses.max;
        this.form.querySelector("input[name='data.uses.max']").value = data.data.uses.max;
        return ui.notifications.error(game.i18n.format("DND5E.FormulaCannotContainDiceError", {
          name: game.i18n.localize("DND5E.LimitedUses")
        }));
      }
    }

    // Check class identifier
    if ( data.data.identifier ) {
      const dataRgx = new RegExp(/^([a-z0-9_-]+)$/i);
      const match = data.data.identifier.match(dataRgx);
      if ( !match ) {
        data.data.identifier = this.object.data._source.data.identifier;
        this.form.querySelector("input[name='data.identifier']").value = data.data.identifier;
        return ui.notifications.error(game.i18n.localize("DND5E.IdentifierError"));
      }
    }

    // Return the flattened submission data
    return flattenObject(data);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    if ( this.isEditable ) {
      html.find(".damage-control").click(this._onDamageControl.bind(this));
      html.find(".trait-selector").click(this._onConfigureTraits.bind(this));
      html.find(".effect-control").click(ev => {
        if ( this.item.isOwned ) return ui.notifications.warn("Managing Active Effects within an Owned Item is not currently supported and will be added in a subsequent update.");
        ActiveEffect5e.onManageActiveEffect(ev, this.item);
      });
      html.find(".advancement .item-control").click(this._onAdvancementAction.bind(this));
      // TODO: Remove this when UUID links are supported in v10
      html.find(".actor-item-link").click(this._onClickContentLink.bind(this));
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
   * Handle creating the advancement selection window when the add button is pressed.
   * @param {Event} event  The click event which originated the creation.
   * @returns {Promise}
   */
  _onAdvancementAction(event) {
    const cl = event.currentTarget.classList;
    if ( cl.contains("item-add") ) return game.dnd5e.advancement.AdvancementSelection.createDialog(this.item);

    if ( cl.contains("modify-choices") ) {
      const level = event.currentTarget.closest("li")?.dataset.level;
      const manager = AdvancementManager.forModifyChoices(this.item.actor, this.item.id, Number(level));
      if ( manager.steps.length ) manager.render(true);
      return;
    }

    if ( cl.contains("toggle-configuration") ) {
      this.advancementConfigurationMode = !this.advancementConfigurationMode;
      return this.render();
    }

    const id = event.currentTarget.closest("li.item")?.dataset.id;
    const advancement = this.item.advancement.byId[id];
    if ( !advancement ) return;

    if ( cl.contains("item-edit") ) {
      const config = new advancement.constructor.metadata.apps.config(advancement);
      return config.render(true);
    } else if ( cl.contains("item-delete") ) {
      return this.item.deleteAdvancement(id);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking on "actor-item-link" content links. Note: This method will be removed in 1.7 when it can
   * be replaced by UUID links in core.
   * @param {Event} event  Triggering click event.
   * @private
   */
  _onClickContentLink(event) {
    event.stopPropagation();
    const actor = game.actors.get(event.target.dataset.actor);
    const item = actor?.items.get(event.target.dataset.id);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onSubmit(...args) {
    if ( this._tabs[0].active === "details" ) this.position.height = "auto";
    await super._onSubmit(...args);
  }
}
