import AdvancementManager from "../../advancement/advancement-manager.mjs";
import ProficiencySelector from "../proficiency-selector.mjs";
import TraitSelector from "../trait-selector.mjs";
import ActiveEffect5e from "../../documents/active-effect.mjs";

/**
 * Override and extend the core ItemSheet implementation to handle specific item types.
 */
export default class ItemSheet5e extends ItemSheet {
  constructor(...args) {
    super(...args);

    // Expand the default size of the class sheet
    if ( this.object.type === "class" ) {
      this.options.width = this.position.width = 600;
      this.options.height = this.position.height = 680;
    }
    else if ( this.object.type === "subclass" ) {
      this.options.height = this.position.height = 540;
    }

    // TEMP: This should be built into the packs etc
    // Transform Weapon/Spell usage data structure
    else if ( ["weapon", "spell", "feat", "equipment", "consumable"].includes(this.object.type) ) {

      // IF usageProfile property is empty - Try to generate one?
      if (this.object.system.usageProfiles.length <= 0) {

        const buildDamageObject = (damage, fromVersatile = false) => {

          if (damage && damage?.parts) {

            // This just takes the parts and defines a new one with versatile damage
            return {
              parts: (fromVersatile) ? ([
                [
                  damage.versatile,
                  damage.parts[0][1]
                ]
              ]) : damage.parts
            };
          }
        };

        // Items seemingly aren't localised so profileNames are fine in EN?

        const usageProfiles = [
          foundry.utils.mergeObject(
            foundry.utils.deepClone(game.system.template.Item.templates.usageProfile),
            {
              _id: foundry.utils.randomID(),
              profileName: "Default",
              activation: this.object.system.activation,
              duration: this.object.system.duration,
              target: this.object.system.target,
              range: this.object.system.range,
              uses: this.object.system.uses,
              consume: this.object.system.consume,
              ability: this.object.system.ability,
              actionType: this.object.system.actionType,
              attackBonus: this.object.system.attackBonus,
              chatFlavor: this.object.system.chatFlavor,
              critical: this.object.system.critical,
              damage: buildDamageObject(this.object.system.damage),
              formula: this.object.system.formula,
              save: this.object.system.save,
              scaling: this.object.system.scaling
            }
          )
        ];

        if (this.object.system.properties?.ver === true) {

          usageProfiles.push(
            foundry.utils.mergeObject(
              foundry.utils.deepClone(game.system.template.Item.templates.usageProfile),
              {
                _id: foundry.utils.randomID(),
                profileName: "Versatile",
                activation: this.object.system.activation,
                duration: this.object.system.duration,
                target: this.object.system.target,
                range: this.object.system.range,
                uses: this.object.system.uses,
                consume: this.object.system.consume,
                ability: this.object.system.ability,
                actionType: this.object.system.actionType,
                attackBonus: this.object.system.attackBonus,
                chatFlavor: this.object.system.chatFlavor,
                critical: this.object.system.critical,
                damage: buildDamageObject(this.object.system.damage, true),
                formula: this.object.system.formula,
                save: this.object.system.save,
                scaling: this.object.system.scaling
              }
            )
          );
        }

        Reflect.deleteProperty(this.object.system, "activation");
        Reflect.deleteProperty(this.object.system, "duration");
        Reflect.deleteProperty(this.object.system, "target");
        Reflect.deleteProperty(this.object.system, "range");
        Reflect.deleteProperty(this.object.system, "uses");
        Reflect.deleteProperty(this.object.system, "consume");
        Reflect.deleteProperty(this.object.system, "ability");
        Reflect.deleteProperty(this.object.system, "actionType");
        Reflect.deleteProperty(this.object.system, "attackBonus");
        Reflect.deleteProperty(this.object.system, "chatFlavor");
        Reflect.deleteProperty(this.object.system, "critical");
        Reflect.deleteProperty(this.object.system, "damage");
        Reflect.deleteProperty(this.object.system, "formula");
        Reflect.deleteProperty(this.object.system, "save");
        Reflect.deleteProperty(this.object.system, "scaling");

        this.object.system.usageProfiles = usageProfiles;
      }
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
      dragDrop: [{dragSelector: "[data-effect-id]", dropSelector: ".effects-list"}],
      selectedUsageProfile: 0 // TODO: usageProfileIndex work in-progress - Can this be stored on options and used throughout?
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
    const isMountable = this._isItemMountable(item);

    // TODO: usageProfileIndex work in-progress
    const usageProfileIndex = 0;

    foundry.utils.mergeObject(context, {
      source: source.system,
      system: item.system,
      labels: item.labels,
      isEmbedded: item.isEmbedded,
      advancementEditable: (this.advancementConfigurationMode || !item.isEmbedded) && context.editable,

      // Item Type, Status, and Details
      itemType: game.i18n.localize(`ITEM.Type${item.type.titleCase()}`),
      itemStatus: this._getItemStatus(),
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
      hasAttackRoll: item.hasAttack(usageProfileIndex),
      isHealing: item.isHealing(usageProfileIndex),
      isFlatDC: item.isFlatDC(usageProfileIndex),
      isLine: item.hasLineTarget(usageProfileIndex),

      // Vehicles
      isCrewed: item.system?.usageProfiles?.[usageProfileIndex]?.activation?.type === "crew",
      isMountable,

      // Armor Class
      isArmor: item.isArmor,
      hasAC: item.isArmor || isMountable,
      hasDexModifier: item.isArmor && (item.system.armor?.type !== "shield"),

      // Advancement
      advancement: this._getItemAdvancement(item),

      // Prepare Active Effects
      effects: ActiveEffect5e.prepareActiveEffectCategories(item.effects)
    });

    // Potential consumption targets
    context.abilityConsumptionTargets = this._getItemConsumptionTargets(usageProfileIndex);

    /** @deprecated */
    Object.defineProperty(context, "data", {
      get() {
        const msg = `You are accessing the "data" attribute within the rendering context provided by the ItemSheet5e
        class. This attribute has been deprecated in favor of "system" and will be removed in a future release`;
        foundry.utils.logCompatibilityWarning(msg, { since: "DnD5e 2.0", until: "DnD5e 2.2" });
        return context.system;
      }
    });

    // Set up config with proper spell components
    context.config = foundry.utils.mergeObject(CONFIG.DND5E, {
      spellComponents: {...CONFIG.DND5E.spellComponents, ...CONFIG.DND5E.spellTags}
    }, {inplace: false});

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Get the display object used to show the advancement tab.
   * @param {Item5e} item  The item for which the advancement is being prepared.
   * @returns {object}     Object with advancement data grouped by levels.
   */
  _getItemAdvancement(item) {
    const advancement = {};
    const configMode = !item.parent || this.advancementConfigurationMode;
    const maxLevel = !configMode
      ? (item.system.levels ?? item.class?.system.levels ?? item.parent.system.details.level) : -1;

    // Improperly configured advancements
    if ( item.advancement.needingConfiguration.length ) {
      advancement.unconfigured = {
        items: item.advancement.needingConfiguration.map(a => ({
          id: a.id,
          order: a.constructor.order,
          title: a.title,
          icon: a.icon,
          classRestriction: a.data.classRestriction,
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
      const baseItem = await ProficiencySelector.getBaseItem(id);
      if ( baseType !== foundry.utils.getProperty(baseItem.system, typeProperty) ) continue;
      items[name] = baseItem.name;
    }
    return Object.fromEntries(Object.entries(items).sort((lhs, rhs) => lhs[1].localeCompare(rhs[1])));
  }

  /* -------------------------------------------- */

  /**
   * Get the valid item consumption targets which exist on the actor
   * @returns {Object<string>}   An object of potential consumption targets
   * @private
   * @param {number} usageProfileIndex Which Usage-Profile is being used to roll
   */
  _getItemConsumptionTargets(usageProfileIndex) {
    const usageProfile = this.item.system?.usageProfiles?.[usageProfileIndex];
    const consume = usageProfile?.consume || {};
    if ( !consume.type ) return [];
    const actor = this.item.actor;
    if ( !actor ) return {};

    // Ammunition
    if ( consume.type === "ammo" ) {
      return actor.itemTypes.consumable.reduce((ammo, i) => {
        if ( i.system.consumableType === "ammo" ) ammo[i.id] = `${i.name} (${i.system.quantity})`;
        return ammo;
      }, {[this.item.id]: `${this.item.name} (${this.item.system.quantity})`});
    }

    // Attributes
    else if ( consume.type === "attribute" ) {
      const attributes = TokenDocument.implementation.getConsumedAttributes(actor.system);
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
        if ( ["consumable", "loot"].includes(i.type) && !i.system?.usageProfiles?.[0]?.activation ) {
          obj[i.id] = `${i.name} (${i.system.quantity})`;
        }
        return obj;
      }, {});
    }

    // Charges
    else if ( consume.type === "charges" ) {
      return actor.items.reduce((obj, i) => {

        // Limited-use items
        const uses = i.system?.usageProfiles?.[0]?.uses || {};
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
   * @private
   */
  _getItemStatus() {
    switch ( this.item.type ) {
      case "class":
        return game.i18n.format("DND5E.LevelCount", {ordinal: this.item.system.levels.ordinalString()});
      case "equipment":
      case "weapon":
        return game.i18n.localize(this.item.system.equipped ? "DND5E.Equipped" : "DND5E.Unequipped");
      case "spell":
        return CONFIG.DND5E.spellPreparationModes[this.item.system.preparation];
      case "tool":
        return game.i18n.localize(this.item.system.proficient ? "DND5E.Proficient" : "DND5E.NotProficient");
    }
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
      case "equipment":
        props.push(CONFIG.DND5E.equipmentTypes[this.item.system.armor.type]);
        if ( this.item.isArmor || this._isItemMountable(this.item) ) props.push(labels.armor);
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
    if ( this.item.system?.usageProfiles?.[0]?.actionType ) {
      props.push(CONFIG.DND5E.itemActionTypes[this.item.system?.usageProfiles?.[0]?.actionType]);
    }

    // Action usage
    if ( (this.item.type !== "weapon") && !foundry.utils.isEmpty(this.item.system?.usageProfiles?.[0]?.activation) ) {
      props.push(labels.activation, labels.range, labels.target, labels.duration);
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
    return ((item.type === "weapon") && (item.system.weaponType === "siege"))
      || (item.type === "equipment" && (item.system.armor.type === "vehicle"));
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

    // Handle usageProfiles distinctly as merging arrays is difficult for this
    const changesToUsageProfiles = formData.system?.usageProfiles;
    if ( changesToUsageProfiles ) {

      // For every usageProfile apply submission changes
      formData.system.usageProfiles = foundry.utils.deepClone(this.item.system.usageProfiles)
        .map((currentUsageProfile, index) => {
          const changesToUsageProfile = changesToUsageProfiles[index];

          // IF the usageProfile hasn't been updated - skip
          if (!changesToUsageProfile) { return currentUsageProfile; }

          // Handle Damage array
          const damage = changesToUsageProfile?.damage;
          if ( damage ) damage.parts = Object.values(damage?.parts || {}).map(d => [d[0] || "", d[1] || ""]);

          // Handle max uses formula
          const uses = changesToUsageProfile?.uses;
          if ( uses?.max ) {
            const maxRoll = new Roll(uses.max);
            if ( !maxRoll.isDeterministic ) {
              uses.max = currentUsageProfile.uses.max;
              this.form.querySelector(`input[name='system.usageProfiles.${this.options.selectedUsageProfile}.uses.max']`).value = uses.max;
              ui.notifications.error(game.i18n.format("DND5E.FormulaCannotContainDiceError", {
                name: game.i18n.localize("DND5E.LimitedUses")
              }));
            }
          }

          // Merge existing usageProfile into this update
          return foundry.utils.mergeObject(currentUsageProfile, changesToUsageProfile);
        });
    }

    // Check class identifier
    if ( formData.system?.identifier ) {
      const dataRgx = new RegExp(/^([a-z0-9_-]+)$/i);
      const match = formData.system.identifier.match(dataRgx);
      if ( !match ) {
        formData.system.identifier = this.item._source.system.identifier;
        this.form.querySelector("input[name='system.identifier']").value = formData.system.identifier;
        return ui.notifications.error(game.i18n.localize("DND5E.IdentifierError"));
      }
    }

    // Return the flattened submission data
    return foundry.utils.flattenObject(formData);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".usage-profile-control").click(this._onUsageProfileControl.bind(this));
    if ( this.isEditable ) {
      html.find(".damage-control").click(this._onDamageControl.bind(this));
      html.find(".trait-selector").click(this._onConfigureTraits.bind(this));
      html.find(".effect-control").click(ev => {
        if ( this.item.isOwned ) return ui.notifications.warn("Managing Active Effects within an Owned Item is not currently supported and will be added in a subsequent update.");
        ActiveEffect5e.onManageActiveEffect(ev, this.item);
      });
      html.find(".advancement .item-control").click(event => {
        const t = event.currentTarget;
        if ( t.dataset.action ) this._onAdvancementAction(t, t.dataset.action);
      });
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
   * Add, remove, or navigate usage-profiles within the items sheet.
   * @param {Event} event             The original click event.
   * @returns {Promise<Item5e>|null}  Item with updates applied.
   * @private
   */
  async _onUsageProfileControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new usage-profile
    if ( this.isEditable && a.classList.contains("usage-profile-add") ) {
      await this._onSubmit(event);  // Submit any unsaved changes

      console.debug(`ItemSheet5e | Added a new Usage-Profile to ${JSON.stringify(this?.item?.name)}`);

      // Navigate to new page
      this.options.selectedUsageProfile = this.item.system.usageProfiles.length;

      return this.item.update({ "system.usageProfiles": this.item.system.usageProfiles.concat([{ _id: foundry.utils.randomID() }]) });
    }

    // Remove a usage-profile
    else if ( this.isEditable && a.classList.contains("usage-profile-delete") ) {
      await this._onSubmit(event);  // Submit any unsaved changes

      console.debug(`ItemSheet5e | Removed a Usage-Profile from ${JSON.stringify(this?.item?.name)}`);

      if (this.item.system.usageProfiles.length) {

        const usageProfiles = foundry.utils.deepClone(this.item.system.usageProfiles);
        usageProfiles.splice(usageProfiles.findIndex(e => e._id === a.dataset.usageProfileDeleteId), 1);

        // Navigate to previous page if it exists
        this.options.selectedUsageProfile = this.options.selectedUsageProfile - 1 || 0;

        return this.item.update({ "system.usageProfiles": usageProfiles });
      }
    }

    // Clone a usage-profile
    else if ( this.isEditable && a.classList.contains("usage-profile-clone") ) {
      await this._onSubmit(event);  // Submit any unsaved changes

      console.debug(`ItemSheet5e | Cloned a Usage-Profile within ${JSON.stringify(this?.item?.name)}`);

      // Get the Usage-Profile we want to clone
      const targetUsageProfile = this.item.system.usageProfiles.find(e => e._id === a.dataset.usageProfileCloneId);

      // Navigate to new page
      this.options.selectedUsageProfile = this.item.system.usageProfiles.length;

      return this.item.update({
        "system.usageProfiles": this.item.system.usageProfiles.concat([
          foundry.utils.mergeObject(
            foundry.utils.deepClone(targetUsageProfile),
            { _id: foundry.utils.randomID() }
          )
        ])
      });
    }

    // Navigate usage-profiles
    else if ( a.classList.contains("usage-profile-navigate") ) {
      await this._onSubmit(event);  // Submit any unsaved changes

      const targetUsageProfileIndex = parseInt(a.dataset.targetUsageProfileIndex || 0);
      console.debug(`ItemSheet5e | Navigated Usage-Profile within ${JSON.stringify(this?.item?.name)} from ${
        JSON.stringify(this.item?.system?.usageProfiles?.[this.options.selectedUsageProfile]?.profileName || game.i18n.localize("DND5E.Untitled"))
      } to ${
        JSON.stringify(this.item?.system?.usageProfiles?.[targetUsageProfileIndex]?.profileName || game.i18n.localize("DND5E.Untitled"))
      }`);

      // Apply new profile and re-render the sheet
      this.options.selectedUsageProfile = targetUsageProfileIndex;
      this._render();
    }

    return null;
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

      const usageProfiles = foundry.utils.deepClone(this.item.system.usageProfiles);
      const usageProfile = usageProfiles?.[this.options.selectedUsageProfile];
      if ( !usageProfile?.damage ) usageProfile.damage = { parts: [] };
      usageProfile.damage.parts.push(["", ""]);

      return this.item.update({"system.usageProfiles": usageProfiles});
    }

    // Remove a damage component
    else if ( a.classList.contains("delete-damage") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".damage-part");

      const usageProfiles = foundry.utils.deepClone(this.item.system.usageProfiles);
      usageProfiles[this.options.selectedUsageProfile].damage.parts.splice(li.dataset.damagePart, 1);

      return this.item.update({"system.usageProfiles": usageProfiles});
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
   * @returns {Promise}
   */
  _onAdvancementAction(target, action) {
    const id = target.closest(".advancement-item")?.dataset.id;
    const advancement = this.item.advancement.byId[id];
    if ( ["edit", "delete", "duplicate"].includes(action) && !advancement ) return;
    switch (action) {
      case "add": return game.dnd5e.advancement.AdvancementSelection.createDialog(this.item);
      case "edit": return new advancement.constructor.metadata.apps.config(advancement).render(true);
      case "delete": return this.item.deleteAdvancement(id);
      case "duplicate": return this.item.duplicateAdvancement(id);
      case "modify-choices":
        const level = target.closest("li")?.dataset.level;
        const manager = AdvancementManager.forModifyChoices(this.item.actor, this.item.id, Number(level));
        if ( manager.steps.length ) manager.render(true);
        return;
      case "toggle-configuration":
        this.advancementConfigurationMode = !this.advancementConfigurationMode;
        return this.render();
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onSubmit(...args) {
    if ( this._tabs[0].active === "details" ) this.position.height = "auto";
    await super._onSubmit(...args);
  }
}
