import ActivityUsageDialog from "../../applications/activity/activity-usage-dialog.mjs";
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
   * @property {object} usage
   * @property {string} usage.chatCard                    Template used to render the chat card.
   * @property {typeof ActivityUsageDialog} usage.dialog  Default usage prompt.
   */

  /**
   * Configuration information for this PseudoDocument.
   * @type {PseudoDocumentsMetadata}
   */
  static metadata = Object.freeze({
    name: "Activity",
    usage: {
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
   * Is scaling possible with this activity?
   * @type {boolean}
   */
  get canScale() {
    return this.consumption.scaling.allowed || (this.isSpell && this.item.system.level > 0);
  }

  /* -------------------------------------------- */

  /**
   * Can this activity's damage be scaled?
   * @type {boolean}
   */
  get canScaleDamage() {
    return this.consumption.scaling.allowed || this.isSpell;
  }

  /* -------------------------------------------- */

  /**
   * Is this activity on a spell?
   * @type {boolean}
   */
  get isSpell() {
    return this.item.type === "spell";
  }

  /* -------------------------------------------- */

  /**
   * Does activating this activity consume a spell slot?
   * @type {boolean}
   */
  get requiresSpellSlot() {
    if ( !this.isSpell || !this.actor?.system.spells ) return false;
    // TODO: Check against specific preparation modes here
    return this.item.system.level > 0;
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
   * @property {boolean|string[]} consume.resources  Set to `true` or `false` to enable or disable all resource
   *                                                 consumption or provide a list of consumption type keys defined in
   *                                                 `CONFIG.DND5E.activityConsumptionTypes` to only enable those types.
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
    item.prepareData();
    item.prepareFinalAttributes();
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
            activity: { type: this.type, id: this.id, uuid: this.uuid },
            item: { type: this.item.type, id: this.item.id, uuid: this.item.uuid }
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

    foundry.utils.mergeObject(usageConfig, {
      create: {
        measuredTemplate: config.createMeasuredTemplate
      },
      concentration: {
        begin: config.beginConcentrating,
        end: config.endConcentration
      },
      consume: {
        resources,
        spellSlot: config.consumeSpellSlot
      },
      scaling: config.resourceAmount,
      spell: {
        slot: config.slotLevel
      }
    });
    foundry.utils.mergeObject(dialogConfig, {
      configure: options.configureDialog
    });
    foundry.utils.mergeObject(messageConfig, {
      create: options.createMessage,
      rollMode: options.rollMode,
      data: {
        flags: options.flags
      }
    });
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
      config.create.measuredTemplate ??= !!this.target.template.type;
      // TODO: Re-implement `system.target.prompt` from item data
      // TODO: Handle permissions checks in `ActivityUsageDialog`
    }

    if ( config.consume !== false ) {
      config.consume ??= {};
      config.consume.resources ??= this.consumption.targets.length > 0;
      config.consume.spellSlot ??= this.requiresSpellSlot;
    }

    if ( this.canScale ) config.scaling ??= 0;
    else config.scaling = false;

    if ( this.isSpell ) {
      const mode = this.item.system.preparation.mode;
      config.spell ??= {};
      config.spell.slot ??= (mode in this.actor.system.spells) ? mode : `spell${this.item.system.level}`;
    }

    if ( this.item.requiresConcentration && !game.settings.get("dnd5e", "disableConcentration") ) {
      config.concentration ??= {};
      config.concentration.begin ??= true;
      const { effects } = this.actor.concentration;
      const limit = this.actor.system.attributes?.concentration?.limit ?? 0;
      if ( limit && (limit <= effects.size) ) config.concentration.end = effects.find(e => {
        const data = e.flags.dnd5e?.itemData ?? {};
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
    // TODO: Implement scaling
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
   * @returns {ActivityUsageUpdates}
   * @protected
   */
  async _prepareUsageUpdates(config) {
    const updates = { activity: {}, actor: {}, delete: [], item: [], rolls: [] };
    // TODO: Handle consumption
    return updates;
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
    return {
      activity: this,
      actor: this.item.actor,
      item: this.item,
      token: this.item.actor?.token,
      buttons: null,
      description: data.description.chat,
      properties: properties.length ? properties : null,
      subtitle: this.description.chatFlavor ?? data.subtitle,
      supplements
    };
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
    results.templates = [];
    if ( config.create?.measuredTemplate ) {
      try {
        for ( const template of dnd5e.canvas.AbilityTemplate.fromActivity(this) ) {
          const result = await template.drawPreview();
          if ( result ) results.templates.push(result);
        }
      } catch(err) {
        Hooks.onError("Activity#use", err, {
          msg: game.i18n.localize("DND5E.PlaceTemplateError"),
          log: "error",
          notify: "error"
        });
      }
    }
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
};
