import ActivitySheet from "../../applications/activity/activity-sheet.mjs";
import ActivityUsageDialog from "../../applications/activity/activity-usage-dialog.mjs";
import AbilityTemplate from "../../canvas/ability-template.mjs";
import { ConsumptionError } from "../../data/activity/fields/consumption-targets-field.mjs";
import { damageRoll } from "../../dice/dice.mjs";
import PseudoDocumentMixin from "../mixins/pseudo-document.mjs";

/**
 * Mixin used to provide base logic to all activities.
 * @type {function(Class): Class}
 * @mixin
 */
export default Base => class extends PseudoDocumentMixin(Base) {
  /**
   * Configuration information for Activities.
   *
   * @typedef {PseudoDocumentsMetadata} ActivityMetadata
   * @property {string} type                              Type name of this activity.
   * @property {string} img                               Default icon.
   * @property {string} title                             Default title.
   * @property {typeof ActivitySheet} sheetClass          Sheet class used to configure this activity.
   * @property {object} usage
   * @property {Record<string, Function>} usage.actions   Actions that can be triggered from the chat card.
   * @property {string} usage.chatCard                    Template used to render the chat card.
   * @property {typeof ActivityUsageDialog} usage.dialog  Default usage prompt.
   */

  /**
   * Configuration information for this PseudoDocument.
   * @type {PseudoDocumentsMetadata}
   */
  static metadata = Object.freeze({
    name: "Activity",
    sheetClass: ActivitySheet,
    usage: {
      actions: {},
      chatCard: "systems/dnd5e/templates/chat/activity-card.hbs",
      dialog: ActivityUsageDialog
    }
  });

  /* -------------------------------------------- */

  /**
   * Perform the pre-localization of this data model.
   */
  static localize() {
    Localization.localizeDataModel(this);
    const fields = this.schema.fields;
    if ( fields.damage?.fields.parts ) {
      this._localizeSchema(fields.damage.fields.parts.element, ["DND5E.DAMAGE.FIELDS.damage.parts"]);
    }
    this._localizeSchema(fields.consumption.fields.targets.element, ["DND5E.CONSUMPTION.FIELDS.consumption.targets"]);
    this._localizeSchema(fields.uses.fields.recovery.element, ["DND5E.USES.FIELDS.uses.recovery"]);
  }

  /* -------------------------------------------- */

  /**
   * Perform pre-localization on the contents of a SchemaField. Necessary because the `localizeSchema` method
   * on `Localization` is private.
   * @param {SchemaField} schema
   * @param {string[]} prefixes
   * @internal
   */
  static _localizeSchema(schema, prefixes) {
    Localization.localizeDataModel({ schema }, { prefixes });
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Description used in chat message flavor for messages created with `rollDamage`.
   * @type {string}
   */
  get damageFlavor() {
    return game.i18n.localize("DND5E.DamageRoll");
  }

  /* -------------------------------------------- */

  /**
   * Create the data added to messages flags.
   * @type {object}
   */
  get messageFlags() {
    return {
      activity: { type: this.type, id: this.id, uuid: this.uuid },
      item: { type: this.item.type, id: this.item.id, uuid: this.item.uuid }
    };
  }

  /* -------------------------------------------- */

  /**
   * Consumption targets that can be use for this activity.
   * @type {Set<string>}
   */
  get validConsumptionTypes() {
    const types = new Set(Object.keys(CONFIG.DND5E.activityConsumptionTypes));
    if ( this.isSpell ) types.delete("spellSlots");
    return types;
  }

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /**
   * Configuration data for an activity usage being prepared.
   *
   * @typedef {object} ActivityUseConfiguration
   * @property {object|false} create
   * @property {boolean} create.measuredTemplate     Should this item create a template?
   * @property {object} concentration
   * @property {boolean} concentration.begin         Should this usage initiate concentration?
   * @property {string|null} concentration.end       ID of an active effect to end concentration on.
   * @property {object|false} consume
   * @property {boolean|number[]} consume.resources  Set to `true` or `false` to enable or disable all resource
   *                                                 consumption or provide a list of consumption target indexes
   *                                                 to only enable those targets.
   * @property {boolean} consume.spellSlot           Should this spell consume a spell slot?
   * @property {Event} event                         The browser event which triggered the item usage, if any.
   * @property {boolean|number} scaling              Number of steps above baseline to scale this usage, or `false` if
   *                                                 scaling is not allowed.
   * @property {object} spell
   * @property {number} spell.slot                   The spell slot to consume.
   */

  /**
   * Data for the activity activation configuration dialog.
   *
   * @typedef {object} ActivityDialogConfiguration
   * @property {boolean} [configure=true]  Display a configuration dialog for the item usage, if applicable?
   * @property {typeof ActivityActivationDialog} [applicationClass]  Alternate activation dialog to use.
   * @property {object} [options]          Options passed through to the dialog.
   */

  /**
   * Message configuration for activity usage.
   *
   * @typedef {object} ActivityMessageConfiguration
   * @property {boolean} [create=true]  Whether to automatically create a chat message (if true) or simply return
   *                                    the prepared chat message data (if false).
   * @property {object} [data={}]       Additional data used when creating the message.
   * @property {string} [rollMode]      The roll display mode with which to display (or not) the card.
   */

  /**
   * Details of final changes performed by the usage.
   *
   * @typedef {object} ActivityUsageResults
   * @property {ActiveEffect5e[]} effects              Active effects that were created or deleted.
   * @property {ChatMessage5e|object} message          The chat message created for the activation, or the message data
   *                                                   if `create` in ActivityMessageConfiguration was `false`.
   * @property {MeasuredTemplateDocument[]} templates  Created measured templates.
   * @property {ActivityUsageUpdates} updates          Updates to the actor & items.
   */

  /**
   * Activate this activity.
   * @param {ActivityUseConfiguration} usage        Configuration info for the activation.
   * @param {ActivityDialogConfiguration} dialog    Configuration info for the usage dialog.
   * @param {ActivityMessageConfiguration} message  Configuration info for the created chat message.
   * @returns {Promise<ActivityUsageResults|void>}  Details on the usage process if not canceled.
   */
  async use(usage={}, dialog={}, message={}) {
    if ( !this.item.isEmbedded ) return;
    if ( !this.item.isOwner ) {
      ui.notifications.error("DND5E.DocumentUseWarn", { localize: true });
      return;
    }

    // Create an item clone to work with throughout the rest of the process
    let item = this.item.clone({}, { keepId: true });
    let activity = item.system.activities.get(this.id);

    const usageConfig = activity._prepareUsageConfig(usage);

    const dialogConfig = foundry.utils.mergeObject({
      configure: true,
      applicationClass: this.metadata.usage.dialog
    }, dialog);

    const messageConfig = foundry.utils.mergeObject({
      create: true,
      data: {
        flags: {
          dnd5e: {
            ...this.messageFlags,
            messageType: "usage"
          }
        }
      }
    }, message);

    /**
     * A hook event that fires before an activity usage is configured.
     * @function dnd5e.preUseActivity
     * @memberof hookEvents
     * @param {Activity} activity                           Activity being used.
     * @param {ActivityUseConfiguration} usageConfig        Configuration info for the activation.
     * @param {ActivityDialogConfiguration} dialogConfig    Configuration info for the usage dialog.
     * @param {ActivityMessageConfiguration} messageConfig  Configuration info for the created chat message.
     * @returns {boolean}  Explicitly return `false` to prevent activity from being used.
     */
    if ( Hooks.call("dnd5e.preUseActivity", activity, usageConfig, dialogConfig, messageConfig) === false ) return;

    if ( "dnd5e.preUseItem" in Hooks.events ) {
      foundry.utils.logCompatibilityWarning(
        "The `dnd5e.preUseItem` hook has been deprecated and replaced with `dnd5e.preUseItem`.",
        { since: "DnD5e 4.0", until: "DnD5e 4.4" }
      );
      const { config, options } = this._createDeprecatedConfigs(usageConfig, dialogConfig, messageConfig);
      if ( Hooks.call("dnd5e.preUseItem", item, config, options) === false ) return;
      this._applyDeprecatedConfigs(usageConfig, dialogConfig, messageConfig, config, options);
    }

    // Display configuration window if necessary
    if ( dialogConfig.configure && activity._requiresConfigurationDialog(usageConfig) ) {
      try {
        await dialogConfig.applicationClass.create(activity, usageConfig, dialogConfig.options);
      } catch(err) {
        return;
      }
    }

    // Handle scaling
    activity._prepareUsageScaling(usageConfig, messageConfig, item);
    activity = item.system.activities.get(this.id);

    // Handle consumption
    const updates = await activity.consume(usageConfig, messageConfig);
    if ( updates === false ) return;
    const results = { effects: [], templates: [], updates };

    // Create concentration effect & end previous effects
    if ( usageConfig.concentration?.begin ) {
      const effect = await item.actor.beginConcentrating(item);
      if ( effect ) {
        results.effects ??= [];
        results.effects.push(effect);
        foundry.utils.setProperty(messageConfig.data, "flags.dnd5e.use.concentrationId", effect.id);
      }
      if ( usageConfig.concentration?.end ) {
        const deleted = await item.actor.endConcentration(usageConfig.concentration.end);
        results.effects.push(...deleted);
      }
    }

    // Create chat message
    messageConfig.data.rolls = (messageConfig.data.rolls ?? []).concat(updates.rolls);
    results.message = await activity._createUsageMessage(messageConfig);

    // Perform any final usage steps
    await activity._finalizeUsage(usageConfig, results);

    /**
     * A hook event that fires when an activity is activated.
     * @function dnd5e.postUseActivity
     * @memberof hookEvents
     * @param {Activity} activity                     Activity being activated.
     * @param {ActivityUseConfiguration} usageConfig  Configuration data for the activation.
     * @param {ActivityUsageResults} results          Final details on the activation.
     */
    Hooks.callAll("dnd5e.postUseActivity", activity, usageConfig, results);

    if ( "dnd5e.useItem" in Hooks.events ) {
      foundry.utils.logCompatibilityWarning(
        "The `dnd5e.useItem` hook has been deprecated and replaced with `dnd5e.postUseActivity`.",
        { since: "DnD5e 4.0", until: "DnD5e 4.4" }
      );
      const { config, options } = this._createDeprecatedConfigs(usageConfig, dialogConfig, messageConfig);
      Hooks.callAll("dnd5e.itemUsageConsumption", item, config, options, results.templates, results.effects, null);
    }

    return results;
  }

  /* -------------------------------------------- */

  /**
   * Consume this activation's usage.
   * @param {ActivityUseConfiguration} usageConfig        Usage configuration.
   * @param {ActivityMessageConfiguration} messageConfig  Configuration data for the chat message.
   * @returns {ActivityUsageUpdates|false}
   */
  async consume(usageConfig, messageConfig) {
    /**
     * A hook event that fires before an item's resource consumption is calculated.
     * @function dnd5e.preActivityConsumption
     * @memberof hookEvents
     * @param {Activity} activity                           Activity being activated.
     * @param {ActivityUseConfiguration} usageConfig        Configuration data for the activation.
     * @param {ActivityMessageConfiguration} messageConfig  Configuration info for the created chat message.
     * @returns {boolean}  Explicitly return `false` to prevent activity from being activated.
     */
    if ( Hooks.call("dnd5e.preActivityConsumption", this, usageConfig, messageConfig) === false ) return;

    if ( "dnd5e.preItemUsageConsumption" in Hooks.events ) {
      foundry.utils.logCompatibilityWarning(
        "The `dnd5e.preItemUsageConsumption` hook has been deprecated and replaced with `dnd5e.preActivityConsumption`.",
        { since: "DnD5e 4.0", until: "DnD5e 4.4" }
      );
      const { config, options } = this._createDeprecatedConfigs(usageConfig, {}, messageConfig);
      if ( Hooks.call("dnd5e.preItemUsageConsumption", item, config, options) === false ) return;
      this._applyDeprecatedConfigs(usageConfig, {}, messageConfig, config, options);
    }

    const updates = await this._prepareUsageUpdates(usageConfig);
    if ( !updates ) return false;

    foundry.utils.setProperty(messageConfig, "data.flags.dnd5e.use.consumed", usageConfig.consume);

    /**
     * A hook event that fires after an item's resource consumption is calculated, but before any updates are performed.
     * @function dnd5e.activityConsumption
     * @memberof hookEvents
     * @param {Activity} activity                           Activity being activated.
     * @param {ActivityUseConfiguration} usageConfig        Configuration data for the activation.
     * @param {ActivityMessageConfiguration} messageConfig  Configuration info for the created chat message.
     * @param {ActivityUsageUpdates} updates                Updates to apply to the actor and other documents.
     * @returns {boolean}  Explicitly return `false` to prevent activity from being activated.
     */
    if ( Hooks.call("dnd5e.activityConsumption", this, usageConfig, messageConfig, updates) === false ) return;

    if ( "dnd5e.itemUsageConsumption" in Hooks.events ) {
      foundry.utils.logCompatibilityWarning(
        "The `dnd5e.itemUsageConsumption` hook has been deprecated and replaced with `dnd5e.activityConsumption`.",
        { since: "DnD5e 4.0", until: "DnD5e 4.4" }
      );
      const { config, options } = this._createDeprecatedConfigs(usageConfig, {}, messageConfig);
      const usage = {
        actorUpdates: updates.actor,
        deleteIds: updates.delete,
        itemUpdates: updates.item.find(i => i._id === this.item.id),
        resourceUpdates: updates.item.filter(i => i._id !== this.item.id)
      };
      if ( Hooks.call("dnd5e.itemUsageConsumption", item, config, options, usage) === false ) return;
      this._applyDeprecatedConfigs(usageConfig, {}, messageConfig, config, options);
      updates.actor = usage.actorUpdates;
      updates.delete = usage.deleteIds;
      updates.item = usage.resourceUpdates;
      if ( !foundry.utils.isEmpty(usage.itemUpdates) ) updates.item.push({ _id: this.item.id, ...usage.itemUpdates });
    }

    // Merge activity changes into the item updates
    if ( !foundry.utils.isEmpty(updates.activity) ) {
      const itemIndex = updates.item.findIndex(i => i._id === this.item.id);
      const keyPath = `system.activities.${this.id}`;
      const activityUpdates = foundry.utils.expandObject(updates.activity);
      if ( itemIndex === -1 ) updates.item.push({ _id: this.item.id, [keyPath]: activityUpdates });
      else updates.item[itemIndex][keyPath] = activityUpdates;
    }

    // Update documents with consumption
    if ( !foundry.utils.isEmpty(updates.actor) ) await this.actor.update(updates.actor);
    if ( !foundry.utils.isEmpty(updates.delete) ) await this.actor.deleteEmbeddedDocuments("Item", updates.delete);
    if ( !foundry.utils.isEmpty(updates.item) ) await this.actor.updateEmbeddedDocuments("Item", updates.item);

    /**
     * A hook event that fires after an item's resource consumption is calculated and applied.
     * @function dnd5e.postActivityConsumption
     * @memberof hookEvents
     * @param {Activity} activity                           Activity being activated.
     * @param {ActivityUseConfiguration} usageConfig        Configuration data for the activation.
     * @param {ActivityMessageConfiguration} messageConfig  Configuration info for the created chat message.
     * @param {ActivityUsageUpdates} updates                Applied updates to the actor and other documents.
     * @returns {boolean}  Explicitly return `false` to prevent activity from being activated.
     */
    if ( Hooks.call("dnd5e.postActivityConsumption", this, usageConfig, messageConfig, updates) === false ) return;

    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Translate new config objects back into old config objects for deprecated hooks.
   * @param {ActivityUseConfiguration} usageConfig
   * @param {ActivityDialogConfiguration} dialogConfig
   * @param {ActivityMessageConfiguration} messageConfig
   * @returns {{ config: ItemUseConfiguration, options: ItemUseOptions }}
   * @internal
   */
  _createDeprecatedConfigs(usageConfig, dialogConfig, messageConfig) {
    return {
      config: {
        createMeasuredTemplate: usageConfig.create?.measuredTemplate ?? null,
        consumeResource: usageConfig.consume?.resources !== false ?? null,
        consumeSpellSlot: usageConfig.consume?.spellSlot !== false ?? null,
        consumeUsage: (usageConfig.consume?.resources.includes("itemUses")
          || usageConfig.consume?.resources.includes("activityUses")) ?? null,
        slotLevel: usageConfig.spell?.slot ?? null,
        resourceAmount: usageConfig.scaling ?? null,
        beginConcentrating: usageConfig.concentration?.begin ?? false,
        endConcentration: usageConfig.concentration?.end ?? null
      },
      options: {
        configureDialog: dialogConfig.configure,
        rollMode: messageConfig.rollMode,
        createMessage: messageConfig.create,
        flags: messageConfig.data?.flags,
        event: usageConfig.event
      }
    };
  }

  /* -------------------------------------------- */

  /**
   * Apply changes from old config objects back onto new config objects.
   * @param {ActivityUseConfiguration} usageConfig
   * @param {ActivityDialogConfiguration} dialogConfig
   * @param {ActivityMessageConfiguration} messageConfig
   * @param {ItemUseConfiguration} config
   * @param {ItemUseOptions} options
   * @internal
   */
  _applyDeprecatedConfigs(usageConfig, dialogConfig, messageConfig, config, options) {
    const usageTypes = ["activityUses", "itemUses"];
    let resources;
    if ( config.consumeResource && config.consumeUsage ) resources = true;
    else if ( config.consumeResource && (config.consumeUsage === false) ) {
      resources = Array.from(Object.keys(CONFIG.DND5E.activityConsumptionTypes)).filter(k => !usageTypes.includes(k));
    }
    else if ( (config.consumeResource === false) && config.consumeUsage ) resources = usageTypes;

    // Set property so long as the value is not undefined
    // Avoids problems with `mergeObject` overwriting values with `undefined`
    const set = (config, keyPath, value) => {
      if ( value === undefined ) return;
      foundry.utils.setProperty(config, keyPath, value);
    };

    set(usageConfig, "create.measuredTemplate", config.createMeasuredTemplate);
    set(usageConfig, "concentration.begin", config.beginConcentrating);
    set(usageConfig, "concentration.end", config.endConcentration);
    set(usageConfig, "consume.resources", resources);
    set(usageConfig, "consume.spellSlot", config.consumeSpellSlot);
    set(usageConfig, "scaling", config.resourceAmount);
    set(usageConfig, "spell.slot", config.slotLevel);
    set(dialogConfig, "configure", options.configureDialog);
    set(messageConfig, "create", options.createMessage);
    set(messageConfig, "rollMode", options.rollMode);
    if ( options.flags ) {
      messageConfig.data ??= {};
      messageConfig.data.flags = foundry.utils.mergeObject(messageConfig.data.flags ?? {}, options.flags);
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare usage configuration with the necessary defaults.
   * @param {ActivityUseConfiguration} config  Configuration object passed to the `use` method.
   * @returns {ActivityUseConfiguration}
   * @protected
   */
  _prepareUsageConfig(config) {
    config = foundry.utils.deepClone(config);

    if ( config.create !== false ) {
      config.create ??= {};
      config.create.measuredTemplate ??= !!this.target.template.type && this.target.prompt;
      // TODO: Handle permissions checks in `ActivityUsageDialog`
    }

    if ( config.consume !== false ) {
      config.consume ??= {};
      config.consume.resources ??= this.consumption.targets.length > 0;
      config.consume.spellSlot ??= this.requiresSpellSlot && this.consumption.spellSlot;
    }

    const levelingFlag = this.item.getFlag("dnd5e", "spellLevel");
    if ( levelingFlag ) {
      // Handle fixed scaling from spell scrolls
      config.scaling = false;
      config.spell ??= {};
      config.spell.slot = levelingFlag.value;
    }

    else {
      if ( this.canScale ) config.scaling ??= 0;
      else config.scaling = false;

      if ( this.requiresSpellSlot ) {
        const mode = this.item.system.preparation.mode;
        config.spell ??= {};
        config.spell.slot ??= (mode in this.actor.system.spells) ? mode : `spell${this.item.system.level}`;
      }
    }

    if ( this.item.requiresConcentration && !game.settings.get("dnd5e", "disableConcentration") ) {
      config.concentration ??= {};
      config.concentration.begin ??= true;
      const { effects } = this.actor.concentration;
      const limit = this.actor.system.attributes?.concentration?.limit ?? 0;
      if ( limit && (limit <= effects.size) ) config.concentration.end ??= effects.find(e => {
        const data = e.flags.dnd5e?.item?.data ?? {};
        return (data === this.id) || (data._id === this.id);
      })?.id ?? effects.first()?.id ?? null;
    }

    return config;
  }

  /* -------------------------------------------- */

  /**
   * Determine scaling values and update item clone if necessary.
   * @param {ActivityUseConfiguration} usageConfig        Configuration data for the activation.
   * @param {ActivityMessageConfiguration} messageConfig  Configuration data for the chat message.
   * @param {Item5e} item                                 Clone of the item that contains this activity.
   * @protected
   */
  _prepareUsageScaling(usageConfig, messageConfig, item) {
    const levelingFlag = this.item.getFlag("dnd5e", "spellLevel");
    if ( levelingFlag ) {
      usageConfig.scaling = Math.max(0, levelingFlag.value - levelingFlag.base);
    } else if ( this.isSpell ) {
      const level = this.actor.system.spells?.[usageConfig.spell?.slot]?.level;
      if ( level ) {
        usageConfig.scaling = level - item.system.level;
        foundry.utils.setProperty(messageConfig, "data.flags.dnd5e.use.spellLevel", level);
      }
    }

    if ( usageConfig.scaling ) {
      foundry.utils.setProperty(messageConfig, "data.flags.dnd5e.scaling", usageConfig.scaling);
      item.updateSource({ "flags.dnd5e.scaling": usageConfig.scaling });
      item.prepareFinalAttributes();
    }
  }

  /* -------------------------------------------- */

  /**
   * Update data produced by activity usage.
   *
   * @typedef {object} ActivityUsageUpdates
   * @property {object} activity  Updates applied to activity that performed the activation.
   * @property {object} actor     Updates applied to the actor that performed the activation.
   * @property {string[]} delete  IDs of items to be deleted from the actor.
   * @property {object[]} item    Updates applied to items on the actor that performed the activation.
   * @property {Roll[]} rolls     Any rolls performed as part of the activation.
   */

  /**
   * Calculate changes to actor, items, & this activity based on resource consumption.
   * @param {ActivityUseConfiguration} config  Usage configuration.
   * @returns {ActivityUsageUpdates|false}     Updates to perform, or `false` if a consumption error occured.
   * @protected
   */
  async _prepareUsageUpdates(config) {
    const updates = { activity: {}, actor: {}, delete: [], item: [], rolls: [] };
    if ( config.consume === false ) return updates;
    const errors = [];

    // Handle consumption targets
    if ( (config.consume === true) || config.consume.resources ) {
      const indexes = config.consume.resources === true ? this.consumption.targets.keys() : config.consume.resources;
      for ( const index of indexes ) {
        const target = this.consumption.targets[index];
        try {
          await target.consume(config, updates);
        } catch(err) {
          if ( err instanceof ConsumptionError ) errors.push(err);
          else throw err;
        }
      }
    }

    // Handle spell slot consumption
    if ( ((config.consume === true) || config.consume.spellSlot) && this.requiresSpellSlot ) {
      const mode = this.item.system.preparation.mode;
      const isLeveled = ["always", "prepared"].includes(mode);
      const slot = config.spell?.slot ?? (isLeveled ? `spell${this.item.system.level}` : mode);
      const slotData = this.actor.system.spells?.[slot];
      if ( slotData ) {
        if ( slotData.value ) {
          foundry.utils.mergeObject(updates.actor, { [`system.spells.${slot}.value`]: Math.max(slotData.value - 1, 0) });
        } else {
          const err = new ConsumptionError(game.i18n.format("DND5E.SpellCastNoSlots", {
            name: this.item.name, level: slotData.label
          }));
          errors.push(err);
        }
      }
    }

    // Ensure concentration can be handled
    if ( config.concentration?.begin ) {
      const { effects } = this.actor.concentration;
      // Ensure existing concentration effect exists when replacing concentration
      if ( config.concentration.end ) {
        const replacedEffect = effects.find(i => i.id === config.concentration.end);
        if ( !replacedEffect ) errors.push(
          new ConsumptionError(game.i18n.localize("DND5E.ConcentratingMissingItem"))
        );
      }

      // Cannot begin more concentrations than the limit
      else if ( effects.size >= this.actor.system.attributes?.concentration?.limit ) errors.push(
        new ConsumptionError(game.i18n.localize("DND5E.ConcentratingLimited"))
      );
    }

    errors.forEach(err => ui.notifications.error(err.message, { console: false }));
    return errors.length ? false : updates;
  }

  /* -------------------------------------------- */

  /**
   * Determine if the configuration dialog is required based on the configuration options. Does not guarantee a dialog
   * is shown if the dialog is suppressed in the activation dialog configuration.
   * @param {ActivityUseConfiguration} config
   * @returns {boolean}
   * @protected
   */
  _requiresConfigurationDialog(config) {
    const checkObject = obj => (foundry.utils.getType(obj) === "Object") && Object.values(obj).some(v => v);
    return config.concentration?.begin === true
      || checkObject(config.create)
      || checkObject(config.consume)
      || (config.scaling !== false);
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context used to render the usage chat card.
   * @returns {object}
   * @protected
   */
  async _usageChatContext() {
    const data = await this.item.system.getCardData();
    const properties = [...(data.tags ?? []), ...(data.properties ?? [])];
    const supplements = [];
    if ( (this.activation.type === "reaction") && this.activation.condition ) {
      supplements.push(`<strong>${game.i18n.localize("DND5E.Reaction")}</strong> ${this.activation.condition}`);
    }
    if ( data.materials?.value ) {
      supplements.push(`<strong>${game.i18n.localize("DND5E.Materials")}</strong> ${data.materials.value}`);
    }
    const buttons = this._usageChatButtons();
    return {
      activity: this,
      actor: this.item.actor,
      item: this.item,
      token: this.item.actor?.token,
      buttons: buttons.length ? buttons : null,
      description: data.description.chat,
      properties: properties.length ? properties : null,
      subtitle: this.description.chatFlavor ?? data.subtitle,
      supplements
    };
  }

  /* -------------------------------------------- */

  /**
   * @typedef {object} ActivityUsageChatButton
   * @property {string} label    Label to display on the button.
   * @property {string} icon     Icon to display on the button.
   * @property {string} classes  Classes for the button.
   * @property {object} dataset  Data attributes attached to the button.
   */

  /**
   * Create the buttons that will be displayed in chat.
   * @returns {ActivityUsageChatButton[]}
   * @protected
   */
  _usageChatButtons() {
    const buttons = [];

    if ( this.target?.template?.type ) buttons.push({
      label: game.i18n.localize("DND5E.TARGET.Action.PlaceTemplate"),
      icon: '<i class="fas fa-bullseye" inert></i>',
      dataset: {
        action: "placeTemplate"
      }
    });

    if ( this.consumption.targets.length ) buttons.push({
      label: game.i18n.localize("DND5E.CONSUMPTION.Action.ConsumeResource"),
      icon: '<i class="fa-solid fa-cubes-stacked" inert></i>',
      dataset: {
        action: "consumeResource"
      }
    });

    return buttons;
  }

  /* -------------------------------------------- */

  /**
   * Determine whether the provided button in a chat message should be visible.
   * @param {HTMLButtonElement} button  The button to check.
   * @param {ChatMessage5e} message     Chat message containing the button.
   * @returns {boolean}
   */
  shouldHideChatButton(button, message) {
    const flag = message.getFlag("dnd5e", "use.consumed");
    switch ( button.dataset.action ) {
      case "consumeResource": return (flag?.resources === true) || flag?.resources?.length;
      case "placeTemplate": return !game.user.can("TEMPLATE_CREATE") || !game.canvas.scene;
    }
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Display a chat message for this usage.
   * @param {ActivityMessageConfiguration} message  Configuration info for the created message.
   * @returns {Promise<ChatMessage5e|object>}
   * @protected
   */
  async _createUsageMessage(message) {
    const context = await this._usageChatContext();
    const messageConfig = foundry.utils.mergeObject({
      rollMode: game.settings.get("core", "rollMode"),
      data: {
        content: await renderTemplate(this.metadata.usage.chatCard, context),
        speaker: ChatMessage.getSpeaker({ actor: this.item.actor }),
        flags: {
          core: { canPopout: true }
        }
      }
    }, message);

    // If the Item was destroyed in the process, embed a copy of its data
    if ( !this.actor?.items.has(this.item.id) ) {
      foundry.utils.setProperty(messageConfig, "data.flags.dnd5e.item.data", this.item.toObject());
    }

    /**
     * A hook event that fires before an activity usage card is created.
     * @function dnd5e.preCreateUsageMessage
     * @memberof hookEvents
     * @param {Activity} activity                     Activity for which the card will be created.
     * @param {ActivityMessageConfiguration} message  Configuration info for the created message.
     */
    Hooks.callAll("dnd5e.preCreateUsageMessage", this, messageConfig);

    ChatMessage.applyRollMode(messageConfig.data, messageConfig.rollMode);
    const card = messageConfig.create === false ? messageConfig.data : await ChatMessage.create(messageConfig.data);

    /**
     * A hook event that fires after an activity usage card is created.
     * @function dnd5e.postCreateUsageMessage
     * @memberof hookEvents
     * @param {Activity} activity          Activity for which the card was created.
     * @param {ChatMessage5e|object} card  Created card or configuration data if not created.
     */
    Hooks.callAll("dnd5e.postCreateUsageMessage", this, card);

    return card;
  }

  /* -------------------------------------------- */

  /**
   * Perform any final steps of the activation including creating measured templates.
   * @param {ActivityUseConfiguration} config  Configuration data for the activation.
   * @param {ActivityUsageResults} results     Final details on the activation.
   * @protected
   */
  async _finalizeUsage(config, results) {
    results.templates = config.create?.measuredTemplate ? await this.#placeTemplate() : [];
  }

  /* -------------------------------------------- */
  /*  Rolling                                     */
  /* -------------------------------------------- */

  /**
   * Perform a damage roll.
   * @param {Partial<DamageRollProcessConfiguration>} config  Configuration information for the roll.
   * @param {Partial<BasicRollDialogConfiguration>} dialog    Configuration for the roll dialog.
   * @param {Partial<BasicRollMessageConfiguration>} message  Configuration for the roll message.
   * @returns {Promise<DamageRoll[]|void>}
   */
  async rollDamage(config={}, dialog={}, message={}) {
    const rollConfig = this.getDamageConfig(config);
    rollConfig.origin = this;

    const dialogConfig = foundry.utils.mergeObject({
      configure: true,
      options: {
        width: 400,
        top: config.event ? config.event.clientY - 80 : null,
        left: window.innerWidth - 710
      }
    }, dialog);

    const messageConfig = foundry.utils.mergeObject({
      create: true,
      data: {
        flavor: `${this.item.name} - ${this.damageFlavor}`,
        flags: {
          dnd5e: {
            ...this.messageFlags,
            messageType: "roll",
            roll: { type: "damage" },
            targets: this.constructor.getTargetDescriptors()
          }
        },
        speaker: ChatMessage.getSpeaker({ actor: this.actor })
      }
    }, message);

    /**
     * A hook event that fires before damage is rolled.
     * @function dnd5e.preRollDamageV2
     * @memberof hookEvents
     * @param {DamageRollProcessConfiguration} config  Configuration data for the pending roll.
     * @param {BasicRollDialogConfiguration} dialog    Presentation data for the roll configuration dialog.
     * @param {BasicRollMessageConfiguration} message  Configuration data for the roll's message.
     * @returns {boolean}                              Explicitly return `false` to prevent the roll.
     */
    if ( Hooks.call("dnd5e.preRollDamageV2", rollConfig, dialogConfig, messageConfig) === false ) return;

    const oldRollConfig = {
      actor: this.actor,
      rollConfigs: rollConfig.rolls.map(r => ({
        parts: r.parts,
        type: r.options?.type,
        types: r.options?.types,
        properties: r.options?.properties
      })),
      data: rollConfig.rolls[0]?.data ?? {},
      event: rollConfig.event,
      returnMultiple: rollConfig.returnMultiple,
      allowCritical: rollConfig.rolls[0]?.critical?.allow ?? rollConfig.critical?.allow ?? true,
      critical: rollConfig.rolls[0]?.isCritical,
      criticalBonusDice: rollConfig.rolls[0]?.critical?.bonusDice ?? rollConfig.critical?.bonusDice,
      criticalMultiplier: rollConfig.rolls[0]?.critical?.multiplier ?? rollConfig.critical?.multiplier,
      multiplyNumeric: rollConfig.rolls[0]?.critical?.multiplyNumeric ?? rollConfig.critical?.multiplyNumeric,
      powerfulCritical: rollConfig.rolls[0]?.critical?.powerfulCritical ?? rollConfig.critical?.powerfulCritical,
      criticalBonusDamage: rollConfig.rolls[0]?.critical?.bonusDamage ?? rollConfig.critical?.bonusDamage,
      fastForward: !dialogConfig.configure,
      title: dialogConfig.options.title,
      dialogOptions: dialogConfig.options,
      chatMessage: messageConfig.create,
      messageData: messageConfig.data,
      rollMode: messageConfig.rollMode,
      flavor: messageConfig.data.flavor
    };

    if ( "dnd5e.preRollDamage" in Hooks.events ) {
      foundry.utils.logCompatibilityWarning(
        "The `dnd5e.preRollDamage` hook has been deprecated and replaced with `dnd5e.preRollDamageV2`.",
        { since: "DnD5e 4.0", until: "DnD5e 4.4" }
      );
      if ( Hooks.call("dnd5e.preRollDamage", this.item, oldRollConfig) === false ) return;
    }

    const returnMultiple = oldRollConfig.returnMultiple;
    oldRollConfig.returnMultiple = true;

    const rolls = await damageRoll(oldRollConfig);
    if ( !rolls?.length ) return;
    const lastDamageTypes = rolls.reduce((obj, roll, index) => {
      if ( roll.options.type ) obj[index] = roll.options.type;
      return obj;
    }, {});
    if ( !foundry.utils.isEmpty(lastDamageTypes) ) {
      await this.item.setFlag("dnd5e", `last.${this.id}.damageType`, lastDamageTypes);
    }

    /**
     * A hook event that fires after damage has been rolled.
     * @function dnd5e.rollDamageV2
     * @memberof hookEvents
     * @param {DamageRoll[]} rolls        The resulting rolls.
     * @param {object} [data]
     * @param {Activity} [data.activity]  The activity that performed the roll.
     */
    Hooks.callAll("dnd5e.rollDamageV2", rolls, { activity: this });

    if ( "dnd5e.rollDamage" in Hooks.events ) {
      foundry.utils.logCompatibilityWarning(
        "The `dnd5e.rollDamage` hook has been deprecated and replaced with `dnd5e.rollDamageV2`.",
        { since: "DnD5e 4.0", until: "DnD5e 4.4" }
      );
      Hooks.callAll("dnd5e.rollDamage", this.item, returnMultiple ? rolls : rolls[0], ammoUpdate);
    }

    return rolls;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Activate listeners on a chat message.
   * @param {ChatMessage} message  Associated chat message.
   * @param {HTMLElement} html     Element in the chat log.
   */
  activateChatListeners(message, html) {
    html.addEventListener("click", event => {
      const target = event.target.closest("[data-action]");
      if ( target ) this.#onChatAction(event, target, message);
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle an action activated from an activity's chat message.
   * @param {PointerEvent} event     Triggering click event.
   * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
   * @param {ChatMessage5e} message  Message associated with the activation.
   */
  async #onChatAction(event, target, message) {
    const scaling = message.getFlag("dnd5e", "scaling") ?? 0;
    const item = scaling ? this.item.clone({ "flags.dnd5e.scaling": scaling }, { keepId: true }) : this.item;
    const activity = item.system.activities.get(this.id);

    const action = target.dataset.action;
    const handler = this.metadata.usage?.actions?.[action];
    target.disabled = true;
    try {
      if ( handler ) await handler.call(activity, event, target, message);
      else if ( action === "consumeResource" ) await this.#consumeResource(event, target, message);
      else if ( action === "placeTemplate" ) await this.#placeTemplate();
      else await activity._onChatAction(event, target, message);
    } catch(err) {
      Hooks.onError("Activity#onChatAction", err, { log: "error", notify: "error" });
    } finally {
      target.disabled = false;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle an action activated from an activity's chat message. Action handlers in metadata are called first.
   * This method is only called for actions which have no defined handler.
   * @param {PointerEvent} event     Triggering click event.
   * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
   * @param {ChatMessage5e} message  Message associated with the activation.
   * @protected
   */
  async _onChatAction(event, target, message) {}

  /* -------------------------------------------- */

  /**
   * Handle consuming resources from the chat card.
   * @param {PointerEvent} event     Triggering click event.
   * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
   * @param {ChatMessage5e} message  Message associated with the activation.
   */
  async #consumeResource(event, target, message) {
    const messageConfig = {};
    await this.consume({ consume: { resources: true }, event }, messageConfig);
    if ( !foundry.utils.isEmpty(messageConfig.data) ) await message.update(messageConfig.data);
  }

  /* -------------------------------------------- */

  /**
   * Handle placing a measured template in the scene.
   * @returns {MeasuredTemplateDocument[]}
   */
  async #placeTemplate() {
    const templates = [];
    try {
      for ( const template of AbilityTemplate.fromActivity(this) ) {
        const result = await template.drawPreview();
        if ( result ) templates.push(result);
      }
    } catch(err) {
      Hooks.onError("Activity#placeTemplate", err, {
        msg: game.i18n.localize("DND5E.TARGET.Warning.PlaceTemplate"),
        log: "error",
        notify: "error"
      });
    }
    return templates;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Activity.
   * @param {object} [options]
   * @param {boolean} [options.deterministic]  Whether to force deterministic values for data properties that could
   *                                           be either a die term or a flat term.
   * @returns {object}
   */
  getRollData(options) {
    const rollData = this.item.getRollData(options);
    rollData.mod = this.actor?.system.abilities?.[this.ability]?.mod ?? 0;
    return rollData;
  }

  /* -------------------------------------------- */

  /**
   * Important information on a targeted token.
   *
   * @typedef {object} TargetDescriptor5e
   * @property {string} uuid  The UUID of the target.
   * @property {string} img   The target's image.
   * @property {string} name  The target's name.
   * @property {number} ac    The target's armor class, if applicable.
   */

  /**
   * Grab the targeted tokens and return relevant information on them.
   * @returns {TargetDescriptor[]}
   */
  static getTargetDescriptors() {
    const targets = new Map();
    for ( const token of game.user.targets ) {
      const { name } = token;
      const { img, system, uuid } = token.actor ?? {};
      if ( uuid ) targets.set(uuid, { name, img, uuid, ac: system?.attributes?.ac?.value });
    }
    return Array.from(targets.values());
  }
};
