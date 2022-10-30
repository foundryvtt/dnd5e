import AdvancementManager from "../advancement/advancement-manager.mjs";
import AdvancementMigrationDialog from "../advancement/advancement-migration-dialog.mjs";
import TraitSelector from "../trait-selector.mjs";
import ActiveEffect5e from "../../documents/active-effect.mjs";
import * as Trait from "../../documents/actor/trait.mjs";

/**
 * Override and extend the core ItemSheet implementation to handle specific item types.
 */
export default class ItemSheet5e extends ItemSheet {
  constructor(object, options={}) {
    if ( object.type === "backpack" ) {
      options.tabs = [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "contents"}];
    }

    super(object, options);

    switch ( this.object.type ) {
      case "backpack":
        this.options.width = this.position.width = 600;
        this.options.height = this.position.height = 540;
        break;
      case "class":
        this.options.width = this.position.width = 600;
        this.options.height = this.position.height = 680;
        break;
      case "subclass":
        this.options.height = this.position.height = 540;
        break;
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
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}],
      dragDrop: [
        {dragSelector: "[data-effect-id]", dropSelector: ".effects-list"},
        {dragSelector: ".advancement-item", dropSelector: ".advancement"},
        {dragSelector: ".items-list .item", dropSelector: null}
      ]
    });
  }

  /* -------------------------------------------- */

  /**
   * Whether advancements on embedded items should be configurable.
   * @type {boolean}
   */
  advancementConfigurationMode = false;

  /* -------------------------------------------- */

  /** @inheritdoc */
  get template() {
    return `systems/dnd5e/templates/items/${this.item.type}.hbs`;
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    const context = await super.getData(options);
    const item = context.item;
    const source = item.toObject();

    // Game system configuration
    context.config = CONFIG.DND5E;

    // Item rendering data
    foundry.utils.mergeObject(context, {
      source: source.system,
      system: item.system,
      labels: item.labels,
      isEmbedded: item.isEmbedded,
      advancementEditable: (this.advancementConfigurationMode || !item.isEmbedded) && context.editable,
      rollData: this.item.getRollData(),

      // Item Type, Status, and Details
      itemType: game.i18n.localize(CONFIG.Item.typeLabels[this.item.type]),
      itemStatus: this._getItemStatus(),
      itemProperties: this._getItemProperties(),
      baseItems: await this._getItemBaseTypes(),
      isPhysical: item.system.hasOwnProperty("quantity"),

      // Action Details
      isHealing: item.system.actionType === "heal",
      isFlatDC: item.system.save?.scaling === "flat",
      isLine: ["line", "wall"].includes(item.system.target?.type),

      // Vehicles
      isCrewed: item.system.activation?.type === "crew",

      // Armor Class
      hasDexModifier: item.isArmor && (item.system.armor?.type !== "shield"),

      // Advancement
      advancement: this._getItemAdvancement(item),

      // Prepare Active Effects
      effects: ActiveEffect5e.prepareActiveEffectCategories(item.effects)
    });
    context.abilityConsumptionTargets = this._getItemConsumptionTargets();

    // Container contents
    if ( this.item.type === "backpack" ) {
      context.items = Array.from(await item.system.contents);
      context.itemContext = {};

      context.capacity = { max: item.system.capacity.value };
      if ( item.system.capacity.type === "weight" ) {
        context.capacity.value = await item.system.contentsWeight;
        context.capacity.units = game.i18n.localize("DND5E.AbbreviationLbs"); // TODO: Support metric
      } else {
        context.capacity.value = await item.system.contentsCount;
        context.capacity.units = game.i18n.localize("DND5E.ItemContainerCapacityItems");
      }
      context.capacity.pct = (context.capacity.value / context.capacity.max) * 100;

      for ( let item of context.items ) {
        const ctx = context.itemContext[item.id] ??= {};
        ctx.totalWeight = (await item.system.totalWeight).toNearest(0.1);
        ctx.isStack = item.system.quantity > 1;
      }

      context.items = context.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }

    // Special handling for specific item types
    switch ( item.type ) {
      case "feat":
        const featureType = CONFIG.DND5E.featureTypes[item.system.type?.value];
        if ( featureType ) {
          context.itemType = featureType.label;
          context.featureSubtypes = featureType.subtypes;
        }
        break;
      case "spell":
        context.spellComponents = {...CONFIG.DND5E.spellComponents, ...CONFIG.DND5E.spellTags};
        break;
    }

    // Enrich HTML description
    context.descriptionHTML = await TextEditor.enrichHTML(item.system.description.value, {
      secrets: item.isOwner,
      async: true,
      relativeTo: this.item,
      rollData: context.rollData
    });
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Get the display object used to show the advancement tab.
   * @param {Item5e} item  The item for which the advancement is being prepared.
   * @returns {object}     Object with advancement data grouped by levels.
   */
  _getItemAdvancement(item) {
    if ( !item.system.advancement ) return {};
    const advancement = {};
    const configMode = !item.parent || this.advancementConfigurationMode;
    const maxLevel = !configMode
      ? (item.system.levels ?? item.class?.system.levels ?? item.parent.system.details?.level ?? -1) : -1;

    // Improperly configured advancements
    if ( item.advancement.needingConfiguration.length ) {
      advancement.unconfigured = {
        items: item.advancement.needingConfiguration.map(a => ({
          id: a.id,
          order: a.constructor.order,
          title: a.title,
          icon: a.icon,
          classRestriction: a.classRestriction,
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
        classRestriction: advancement.classRestriction,
        summary: advancement.summaryForLevel(level, { configMode }),
        configured: advancement.configuredForLevel(level)
      }));
      if ( !items.length ) continue;
      advancement[level] = {
        items: items.sort((a, b) => a.order.localeCompare(b.order)),
        configured: (level > maxLevel) ? false : items.some(a => !a.configured) ? "partial" : "full"
      };
    }
    return advancement;
  }

  /* -------------------------------------------- */

  /**
   * Get the base weapons and tools based on the selected type.
   * @returns {Promise<object>}  Object with base items for this type formatted for selectOptions.
   * @protected
   */
  async _getItemBaseTypes() {
    const type = this.item.type === "equipment" ? "armor" : this.item.type;
    const baseIds = CONFIG.DND5E[`${type}Ids`];
    if ( baseIds === undefined ) return {};

    const typeProperty = type === "armor" ? "armor.type" : `${type}Type`;
    const baseType = foundry.utils.getProperty(this.item.system, typeProperty);

    const items = {};
    for ( const [name, id] of Object.entries(baseIds) ) {
      const baseItem = await Trait.getBaseItem(id);
      if ( baseType !== foundry.utils.getProperty(baseItem?.system, typeProperty) ) continue;
      items[name] = baseItem.name;
    }
    return Object.fromEntries(Object.entries(items).sort((lhs, rhs) => lhs[1].localeCompare(rhs[1])));
  }

  /* -------------------------------------------- */

  /**
   * Get the valid item consumption targets which exist on the actor
   * @returns {Object<string>}   An object of potential consumption targets
   * @private
   */
  _getItemConsumptionTargets() {
    const consume = this.item.system.consume || {};
    if ( !consume.type ) return [];
    const actor = this.item.actor;
    if ( !actor ) return {};

    // Ammunition
    if ( consume.type === "ammo" ) {
      return actor.itemTypes.consumable.reduce((ammo, i) => {
        if ( i.system.consumableType === "ammo" ) ammo[i.id] = `${i.name} (${i.system.quantity})`;
        return ammo;
      }, {});
    }

    // Attributes
    else if ( consume.type === "attribute" ) {
      const attrData = game.dnd5e.isV10 ? actor.system : actor.type;
      const attributes = TokenDocument.implementation.getConsumedAttributes(attrData);
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
        if ( ["consumable", "loot"].includes(i.type) && !i.system.activation ) {
          obj[i.id] = `${i.name} (${i.system.quantity})`;
        }
        return obj;
      }, {});
    }

    // Charges
    else if ( consume.type === "charges" ) {
      return actor.items.reduce((obj, i) => {

        // Limited-use items
        const uses = i.system.uses || {};
        if ( uses.per && uses.max ) {
          const label = uses.per === "charges"
            ? ` (${game.i18n.format("DND5E.AbilityUseChargesLabel", {value: uses.value})})`
            : ` (${game.i18n.format("DND5E.AbilityUseConsumableLabel", {max: uses.max, per: uses.per})})`;
          obj[i.id] = i.name + label;
        }

        // Recharging items
        const recharge = i.system.recharge || {};
        if ( recharge.value ) obj[i.id] = `${i.name} (${game.i18n.format("DND5E.Recharge")})`;
        return obj;
      }, {});
    }
    else return {};
  }

  /* -------------------------------------------- */

  /**
   * Get the text item status which is shown beneath the Item type in the top-right corner of the sheet.
   * @returns {string|null}  Item status string if applicable to item's type.
   * @protected
   */
  _getItemStatus() {
    switch ( this.item.type ) {
      case "class":
        return game.i18n.format("DND5E.LevelCount", {ordinal: this.item.system.levels.ordinalString()});
      case "equipment":
      case "weapon":
        return game.i18n.localize(this.item.system.equipped ? "DND5E.Equipped" : "DND5E.Unequipped");
      case "feat":
        const typeConfig = CONFIG.DND5E.featureTypes[this.item.system.type.value];
        if ( typeConfig?.subtypes ) return typeConfig.subtypes[this.item.system.type.subtype] ?? null;
        break;
      case "spell":
        return CONFIG.DND5E.spellPreparationModes[this.item.system.preparation];
      case "tool":
        return CONFIG.DND5E.proficiencyLevels[this.item.system.prof?.multiplier || 0];
    }
    return null;
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
      case "consumable":
        for ( const [k, v] of Object.entries(this.item.system.properties ?? {}) ) {
          if ( v === true ) props.push(CONFIG.DND5E.physicalWeaponProperties[k]);
        }
        break;
      case "equipment":
        props.push(CONFIG.DND5E.equipmentTypes[this.item.system.armor.type]);
        if ( this.item.isArmor || this.item.isMountable ) props.push(labels.armor);
        break;
      case "feat":
        props.push(labels.featType);
        break;
      case "spell":
        props.push(labels.components.vsm, labels.materials, ...labels.components.tags);
        break;
      case "weapon":
        for ( const [k, v] of Object.entries(this.item.system.properties) ) {
          if ( v === true ) props.push(CONFIG.DND5E.weaponProperties[k]);
        }
        break;
    }

    // Action type
    if ( this.item.system.actionType ) {
      props.push(CONFIG.DND5E.itemActionTypes[this.item.system.actionType]);
    }

    // Action usage
    if ( (this.item.type !== "weapon") && !foundry.utils.isEmpty(this.item.system.activation) ) {
      props.push(labels.activation, labels.range, labels.target, labels.duration);
    }
    return props.filter(p => !!p);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  setPosition(position={}) {
    if ( !(this._minimized || position.height) ) {
      position.height = (this._tabs[0].active === "details") ? "auto" : Math.max(this.height, this.options.height);
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

    // Check max uses formula
    const uses = formData.system?.uses;
    if ( uses?.max ) {
      const maxRoll = new Roll(uses.max);
      if ( !maxRoll.isDeterministic ) {
        uses.max = this.item._source.system.uses.max;
        this.form.querySelector("input[name='system.uses.max']").value = uses.max;
        return ui.notifications.error(game.i18n.format("DND5E.FormulaCannotContainDiceError", {
          name: game.i18n.localize("DND5E.LimitedUses")
        }));
      }
    }

    // Check duration value formula
    const duration = formData.system?.duration;
    if ( duration?.value ) {
      const durationRoll = new Roll(duration.value);
      if ( !durationRoll.isDeterministic ) {
        duration.value = this.item._source.system.duration.value;
        this.form.querySelector("input[name='system.duration.value']").value = duration.value;
        return ui.notifications.error(game.i18n.format("DND5E.FormulaCannotContainDiceError", {
          name: game.i18n.localize("DND5E.Duration")
        }));
      }
    }

    // Check class identifier
    if ( formData.system?.identifier && !dnd5e.utils.validators.isValidIdentifier(formData.system.identifier) ) {
      formData.system.identifier = this.item._source.system.identifier;
      this.form.querySelector("input[name='system.identifier']").value = formData.system.identifier;
      return ui.notifications.error(game.i18n.localize("DND5E.IdentifierError"));
    }

    // Return the flattened submission data
    return foundry.utils.flattenObject(formData);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".item .item-name.rollable h4").click(event => this._onItemSummary(event));
    html.find(".item-edit").click(this._onItemEdit.bind(this));

    if ( this.isEditable ) {
      html.find(".damage-control").click(this._onDamageControl.bind(this));
      html.find(".trait-selector").click(this._onConfigureTraits.bind(this));
      html.find(".effect-control").click(ev => {
        const unsupported = game.dnd5e.isV10 && this.item.isOwned;
        if ( unsupported ) return ui.notifications.warn("Managing Active Effects within an Owned Item is not currently supported and will be added in a subsequent update.");
        ActiveEffect5e.onManageActiveEffect(ev, this.item);
      });
      html.find(".advancement .item-control").click(event => {
        const t = event.currentTarget;
        if ( t.dataset.action ) this._onAdvancementAction(t, t.dataset.action);
      });
      html.find(".item-delete").click(this._onItemDelete.bind(this));
    }
    if ( this.item.isEmbedded && this.item.actor.isOwner ) {
      html.find(".rollable .item-image").click(event => this._onItemUse(event));
    } else {
      html.find(".rollable").each((i, el) => el.classList.remove("rollable"));
    }

    // Advancement context menu
    const contextOptions = this._getAdvancementContextMenuOptions();
    /**
     * A hook event that fires when the context menu for the advancements list is constructed.
     * @function dnd5e.getItemAdvancementContext
     * @memberof hookEvents
     * @param {jQuery} html                      The HTML element to which the context options are attached.
     * @param {ContextMenuEntry[]} entryOptions  The context menu entries.
     */
    Hooks.call("dnd5e.getItemAdvancementContext", html, contextOptions);
    if ( contextOptions ) new ContextMenu(html, ".advancement-item", contextOptions);
  }

  /* -------------------------------------------- */

  /**
   * Get the set of ContextMenu options which should be applied for advancement entries.
   * @returns {ContextMenuEntry[]}  Context menu entries.
   * @protected
   */
  _getAdvancementContextMenuOptions() {
    const condition = li => (this.advancementConfigurationMode || !this.isEmbedded) && this.isEditable;
    return [
      {
        name: "DND5E.AdvancementControlEdit",
        icon: "<i class='fas fa-edit fa-fw'></i>",
        condition,
        callback: li => this._onAdvancementAction(li[0], "edit")
      },
      {
        name: "DND5E.AdvancementControlDuplicate",
        icon: "<i class='fas fa-copy fa-fw'></i>",
        condition: li => {
          const id = li[0].closest(".advancement-item")?.dataset.id;
          const advancement = this.item.advancement.byId[id];
          return condition(li) && advancement?.constructor.availableForItem(this.item);
        },
        callback: li => this._onAdvancementAction(li[0], "duplicate")
      },
      {
        name: "DND5E.AdvancementControlDelete",
        icon: "<i class='fas fa-trash fa-fw' style='color: rgb(255, 65, 65);'></i>",
        condition,
        callback: li => this._onAdvancementAction(li[0], "delete")
      }
    ];
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
  async _onDragStart(event) {
    const li = event.currentTarget;
    if ( event.target.classList.contains("content-link") ) return;

    // Create drag data
    let dragData;

    // Active Effect
    if ( li.dataset.effectId ) {
      const effect = this.item.effects.get(li.dataset.effectId);
      dragData = effect.toDragData();
    }

    // Advancement
    else if ( li.classList.contains("advancement-item") ) {
      dragData = this.item.advancement.byId[li.dataset.id]?.toDragData();
    }

    // Item
    else if ( li.dataset.itemId ) {
      const item = await this.item.system.getContainedItem(li.dataset.itemId);
      dragData = item?.toDragData();
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
     * @function dnd5e.dropItemSheetData
     * @memberof hookEvents
     * @param {Item5e} item                  The Item5e
     * @param {ItemSheet5e} sheet            The ItemSheet5e application
     * @param {object} data                  The data that has been dropped onto the sheet
     * @returns {boolean}                    Explicitly return `false` to prevent normal drop handling.
     */
    const allowed = Hooks.call("dnd5e.dropItemSheetData", item, this, data);
    if ( allowed === false ) return;

    switch ( data.type ) {
      case "ActiveEffect":
        return this._onDropActiveEffect(event, data);
      case "Item":
      // TODO: Handle dropping folders into containers
        if ( this.item.type === "backpack" ) return this._onDropItem(event, data);
      case "Advancement":
        return this._onDropAdvancement(event, data);
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
      origin: this.item.uuid
    }, {parent: this.item});
  }

  /* -------------------------------------------- */

  /**
   * Handle the dropping of an advancement or item with advancements onto the advancements tab.
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data.
   * @param {object} data                      The data transfer extracted from the event.
   */
  async _onDropAdvancement(event, data) {
    let advancements;
    let showDialog = false;
    if ( data.type === "Advancement" ) {
      advancements = [await fromUuid(data.uuid)];
    } else if ( data.type === "Item" ) {
      const item = await Item.implementation.fromDropData(data);
      if ( !item ) return false;
      advancements = Object.values(item.advancement.byId);
      showDialog = true;
    } else {
      return false;
    }
    advancements = advancements.filter(a => {
      return !this.item.advancement.byId[a.id]
        && a.constructor.metadata.validItemTypes.has(this.item.type)
        && a.constructor.availableForItem(this.item);
    });

    // Display dialog prompting for which advancements to add
    if ( showDialog ) {
      try {
        advancements = await AdvancementMigrationDialog.createDialog(this.item, advancements);
      } catch(err) {
        return false;
      }
    }

    if ( !advancements.length ) return false;
    if ( this.item.isEmbedded && !game.settings.get("dnd5e", "disableAdvancements") ) {
      const manager = AdvancementManager.forNewAdvancement(this.item.actor, this.item.id, advancements);
      if ( manager.steps.length ) return manager.render(true);
    }

    // If no advancements need to be applied, just add them to the item
    const advancementArray = foundry.utils.deepClone(this.item.system.advancement);
    advancementArray.push(...advancements.map(a => a.toObject()));
    this.item.update({"system.advancement": advancementArray});
  }

  /* -------------------------------------------- */

  /**
   * Handle the dropping of Item data onto an Item Sheet.
   * @param {DragEvent} event          The concluding DragEvent which contains the drop data.
   * @param {object} data              The data transfer extracted from the event.
   * @returns {Promise<Item|boolean>}  The created Item object or `false` if it couldn't be created.
   */
  async _onDropItem(event, data) {
    const item = await Item.implementation.fromDropData(data);
    if ( !this.item.isOwner || !item ) return false;

    // If item already exists in this container, just adjust its sorting
    if ( item.system.container === this.item.id ) {
      return this._onSortItem(event, item);
    }

    // Prevent dropping containers within themselves
    const parentContainers = await this.item.system.allContainers();
    if ( (this.item.uuid === item.uuid) || parentContainers.includes(item) ) {
      return ui.notifications.error(game.i18n.localize("DND5E.ContainerRecursiveError"));
    }

    // If item already exists in same DocumentCollection, just adjust its container property
    if ( (item.actor === this.item.actor) && (item.pack === this.item.pack) ) {
      return item.update({"system.container": this.item.id});
    }

    // Otherwise, create a new item in this context
    const context = {pack: this.item.pack, parent: this.item.actor};
    const itemData = foundry.utils.mergeObject(item.toObject(), {"system.container": this.item.id});
    const newItem = await Item.create(itemData, context);

    // Check to see if item is container. If so, copy over all of its contents also
    const contents = await item.system.contents;
    if ( contents ) {
      const contentsData = contents.reduce((arr, c) => {
        arr.push(foundry.utils.mergeObject(c.toObject(), {"system.container": newItem.id}));
        return arr;
      }, []);
      await Item.createDocuments(contentsData, context);
    }

    return newItem;
  }

  /* -------------------------------------------- */

  /**
   * Handle a drop event for an existing contained Item to sort it relative to its siblings.
   * @param {DragEvent} event  The concluding DragEvent.
   * @param {Item5e} item      The item that needs to be sorted.
   */
  async _onSortItem(event, item) {
    const dropTarget = event.target.closest("[data-item-id]");
    if ( !dropTarget ) return;
    const contents = await this.item.system.contents;
    const target = contents.get(dropTarget.dataset.itemId);

    // Don't sort on yourself
    if ( item.id === target.id ) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for ( const el of dropTarget.parentElement.children ) {
      const siblingId = el.dataset.itemId;
      if ( siblingId && (siblingId !== item.id) ) siblings.push(contents.get(siblingId));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(item, {target, siblings});
    const updateData = sortUpdates.map(u => {
      const update = u.update;
      update._id = u.target.id;
      return update;
    });

    // Perform the update
    Item.updateDocuments(updateData, {pack: this.item.pack, parent: this.item.actor});
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
      allowCustom: false,
      suppressWarning: true
    };
    switch (a.dataset.options) {
      case "saves":
        options.choices = CONFIG.DND5E.abilities;
        options.valueKey = null;
        options.labelKey = "label";
        break;
      case "skills.choices":
        options.choices = CONFIG.DND5E.skills;
        options.valueKey = null;
        options.labelKey = "label";
        break;
      case "skills":
        const skills = this.item.system.skills;
        const choices = skills.choices?.length ? skills.choices : Object.keys(CONFIG.DND5E.skills);
        options.choices = Object.fromEntries(Object.entries(CONFIG.DND5E.skills).filter(([s]) => choices.includes(s)));
        options.maximum = skills.number;
        options.labelKey = "label";
        break;
    }
    new TraitSelector(this.item, options).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle one of the advancement actions from the buttons or context menu.
   * @param {Element} target  Button or context menu entry that triggered this action.
   * @param {string} action   Action being triggered.
   * @returns {Promise|void}
   */
  _onAdvancementAction(target, action) {
    const id = target.closest(".advancement-item")?.dataset.id;
    const advancement = this.item.advancement.byId[id];
    let manager;
    if ( ["edit", "delete", "duplicate"].includes(action) && !advancement ) return;
    switch (action) {
      case "add": return game.dnd5e.applications.advancement.AdvancementSelection.createDialog(this.item);
      case "edit": return new advancement.constructor.metadata.apps.config(advancement).render(true);
      case "delete":
        if ( this.item.isEmbedded && !game.settings.get("dnd5e", "disableAdvancements") ) {
          manager = AdvancementManager.forDeletedAdvancement(this.item.actor, this.item.id, id);
          if ( manager.steps.length ) return manager.render(true);
        }
        return this.item.deleteAdvancement(id);
      case "duplicate": return this.item.duplicateAdvancement(id);
      case "modify-choices":
        const level = target.closest("li")?.dataset.level;
        manager = AdvancementManager.forModifyChoices(this.item.actor, this.item.id, Number(level));
        if ( manager.steps.length ) manager.render(true);
        return;
      case "toggle-configuration":
        this.advancementConfigurationMode = !this.advancementConfigurationMode;
        return this.render();
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle using an item from the Actor sheet, obtaining the Item instance, and dispatching to its use method.
   * @param {Event} event  The triggering click event.
   * @protected
   */
  async _onItemUse(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = await this.item.system.getContainedItem(itemId);
    item?.use({}, {event});
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling and items expanded description.
   * @param {Event} event   Triggering event.
   * @protected
   */
  async _onItemSummary(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = await this.item.system.getContainedItem(li.dataset.itemId);
    if ( !item ) return;
    const chatData = await item.getChatData({secrets: this.item.actor?.isOwner ?? false});

    if ( li.classList.contains("expanded") ) {
      let summary = $(li.querySelector(".item-summary"));
      summary.slideUp(200, () => summary.remove());
      li.classList.remove("expanded");
    } else {
      // TODO: Replace with template to support inline container contents list
      const div = $(`<div class="item-summary">${chatData.description.value}</div>`);
      const props = $('<div class="item-properties"></div>');
      chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
      div.append(props);
      $(li).append(div.hide());
      div.slideDown(200); // TODO: Replace with non-jQuery implementation
      li.classList.add("expanded");
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle editing an item in a container.
   * @param {Event} event  The originating click event.
   * @protected
   */
  async _onItemEdit(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = await this.item.system.getContainedItem(itemId);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting an item from a container.
   * @param {Event} event  The originating click event.
   * @protected
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = await this.item.system.getContainedItem(itemId);
    item?.deleteDialog();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onSubmit(...args) {
    if ( this._tabs[0].active === "details" ) this.position.height = "auto";
    await super._onSubmit(...args);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async deleteDialog(options={}) {
    // TODO: Display custom delete dialog when deleting a container with contents
    return super.deleteDialog(options);
  }
}
