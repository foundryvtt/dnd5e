import ActivitySheet from "../../applications/activity/activity-sheet.mjs";
import ActivityUsageDialog from "../../applications/activity/activity-usage-dialog.mjs";
import AbilityTemplate from "../../canvas/ability-template.mjs";
import { ConsumptionError } from "../../data/activity/fields/consumption-targets-field.mjs";
import { formatNumber, getTargetDescriptors, localizeSchema } from "../../utils.mjs";
import PseudoDocumentMixin from "../mixins/pseudo-document.mjs";

/**
 * @import { PseudoDocumentsMetadata } from "../mixins/pseudo-document.mjs";
 */

/**
 * Mixin used to provide base logic to all activities.
 * @template {BaseActivityData} T
 * @param {typeof T} Base  The base activity data class to wrap.
 * @returns {typeof Activity}
 * @mixin
 */
export default function ActivityMixin(Base) {
  class Activity extends PseudoDocumentMixin(Base) {
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
     * @type {Readonly<ActivityMetadata>}
     */
    static metadata = Object.freeze({
      name: "Activity",
      label: "DOCUMENT.DND5E.Activity",
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
      foundry.helpers.Localization.localizeDataModel(this);
      const fields = this.schema.fields;
      if ( fields.damage?.fields.parts ) {
        localizeSchema(fields.damage.fields.parts.element, ["DND5E.DAMAGE.FIELDS.damage.parts"]);
      }
      if ( fields.consumption ) {
        localizeSchema(fields.consumption.fields.targets.element, ["DND5E.CONSUMPTION.FIELDS.consumption.targets"]);
      }
      if ( fields.uses ) localizeSchema(fields.uses.fields.recovery.element, ["DND5E.USES.FIELDS.uses.recovery"]);
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
      localizeSchema(schema, prefixes);
    }

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Should this activity be able to be used?
     * @type {boolean}
     */
    get canUse() {
      return !this.item.getFlag("dnd5e", "riders.activity")?.includes(this.id);
    }

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
        item: { type: this.item.type, id: this.item.id, uuid: this.item.uuid },
        targets: getTargetDescriptors()
      };
    }

    /* -------------------------------------------- */

    /**
     * Relative UUID for this activity on an actor.
     * @type {string}
     */
    get relativeUUID() {
      return `.Item.${this.item.id}.Activity.${this.id}`;
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
     * @property {boolean} consume.action              Should action economy be tracked? Currently only handles
     *                                                 legendary actions.
     * @property {boolean|number[]} consume.resources  Set to `true` or `false` to enable or disable all resource
     *                                                 consumption or provide a list of consumption target indexes
     *                                                 to only enable those targets.
     * @property {boolean} consume.spellSlot           Should this spell consume a spell slot?
     * @property {Event} event                         The browser event which triggered the item usage, if any.
     * @property {boolean|number} scaling              Number of steps above baseline to scale this usage, or `false` if
     *                                                 scaling is not allowed.
     * @property {object} spell
     * @property {number} spell.slot                   The spell slot to consume.
     * @property {boolean} [subsequentActions=true]    Trigger subsequent actions defined by this activity.
     * @property {object} [cause]
     * @property {string} [cause.activity]             Relative UUID to the activity that caused this one to be used.
     *                                                 Activity must be on the same actor as this one.
     * @property {boolean|number[]} [cause.resources]  Control resource consumption on linked item.
     */

    /**
     * Data for the activity activation configuration dialog.
     *
     * @typedef {object} ActivityDialogConfiguration
     * @property {boolean} [configure=true]  Display a configuration dialog for the item usage, if applicable?
     * @property {typeof ActivityUsageDialog} [applicationClass]  Alternate activation dialog to use.
     * @property {object} [options]          Options passed through to the dialog.
     */

    /**
     * Message configuration for activity usage.
     *
     * @typedef {object} ActivityMessageConfiguration
     * @property {boolean} [create=true]     Whether to automatically create a chat message (if true) or simply return
     *                                       the prepared chat message data (if false).
     * @property {object} [data={}]          Additional data used when creating the message.
     * @property {boolean} [hasConsumption]  Was consumption available during activation.
     * @property {string} [rollMode]         The roll display mode with which to display (or not) the card.
     */

    /**
     * Details of final changes performed by the usage.
     *
     * @typedef {object} ActivityUsageResults
     * @property {ActiveEffect5e[]} effects              Active effects that were created or deleted.
     * @property {ChatMessage5e|object} message          The chat message created for the activation, or the message
     *                                                   data if `create` in ActivityMessageConfiguration was `false`.
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
      if ( !this.item.isEmbedded || this.item.pack ) return;
      if ( !this.item.isOwner ) {
        ui.notifications.error("DND5E.DocumentUseWarn", { localize: true });
        return;
      }
      if ( !this.canUse ) {
        ui.notifications.error("DND5E.ACTIVITY.Warning.UsageNotAllowed", { localize: true });
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
              messageType: "usage",
              use: {
                effects: this.applicableEffects?.map(e => e.id)
              }
            }
          }
        },
        hasConsumption: usageConfig.hasConsumption
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

      // Display configuration window if necessary
      if ( dialogConfig.configure && activity._requiresConfigurationDialog(usageConfig) ) {
        try {
          await dialogConfig.applicationClass.create(activity, usageConfig, dialogConfig.options);
        } catch(err) {
          return;
        }
      }

      // Handle scaling
      await activity._prepareUsageScaling(usageConfig, messageConfig, item);
      activity = item.system.activities.get(this.id);

      // Handle consumption
      const updates = await activity.consume(usageConfig, messageConfig);
      if ( updates === false ) return;
      const results = { effects: [], templates: [], updates };

      // Create concentration effect & end previous effects
      if ( usageConfig.concentration?.begin ) {
        const effect = await item.actor.beginConcentrating(activity, { "flags.dnd5e.scaling": usageConfig.scaling });
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
      activity._finalizeMessageConfig(usageConfig, messageConfig, results);
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
       * @returns {boolean}  Explicitly return `false` to prevent any subsequent actions from being triggered.
       */
      if ( Hooks.call("dnd5e.postUseActivity", activity, usageConfig, results) === false ) return results;

      // Trigger any primary action provided by this activity
      if ( usageConfig.subsequentActions !== false ) {
        activity._triggerSubsequentActions(usageConfig, results);
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
      if ( Hooks.call("dnd5e.preActivityConsumption", this, usageConfig, messageConfig) === false ) return false;

      const updates = await this._prepareUsageUpdates(usageConfig);
      if ( !updates ) return false;

      /**
       * A hook event that fires after an item's resource consumption is calculated, but before any updates are
       * performed.
       * @function dnd5e.activityConsumption
       * @memberof hookEvents
       * @param {Activity} activity                           Activity being activated.
       * @param {ActivityUseConfiguration} usageConfig        Configuration data for the activation.
       * @param {ActivityMessageConfiguration} messageConfig  Configuration info for the created chat message.
       * @param {ActivityUsageUpdates} updates                Updates to apply to the actor and other documents.
       * @returns {boolean}  Explicitly return `false` to prevent activity from being activated.
       */
      if ( Hooks.call("dnd5e.activityConsumption", this, usageConfig, messageConfig, updates) === false ) return false;

      const consumed = await this.#applyUsageUpdates(updates);
      if ( !foundry.utils.isEmpty(consumed) ) {
        foundry.utils.setProperty(messageConfig, "data.flags.dnd5e.use.consumed", consumed);
      }
      if ( usageConfig.cause?.activity ) {
        foundry.utils.setProperty(messageConfig, "data.flags.dnd5e.use.cause", usageConfig.cause.activity);
      }

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
      if ( Hooks.call("dnd5e.postActivityConsumption", this, usageConfig, messageConfig, updates) === false ) return false;

      return updates;
    }

    /* -------------------------------------------- */

    /**
     * @typedef ActivityConsumptionDescriptor
     * @property {{ keyPath: string, delta: number }[]} actor                 Changes for the actor.
     * @property {Record<string, { keyPath: string, delta: number }[]>} item  Changes for each item grouped by ID.
     */

    /**
     * Refund previously used consumption for an activity.
     * @param {ActivityConsumptionDescriptor} consumed  Data on the consumption that occurred.
     */
    async refund(consumed) {
      const updates = {
        activity: {}, actor: {}, create: consumed.deleted ?? [], delete: consumed.created ?? [], item: []
      };
      for ( const { keyPath, delta } of consumed.actor ?? [] ) {
        const value = foundry.utils.getProperty(this.actor, keyPath) - delta;
        if ( !Number.isNaN(value) ) updates.actor[keyPath] = value;
      }
      for ( const [id, changes] of Object.entries(consumed.item ?? {}) ) {
        const item = this.actor.items.get(id);
        if ( !item ) continue;
        const itemUpdate = {};
        for ( const { keyPath, delta } of changes ) {
          let currentValue;
          if ( keyPath.startsWith("system.activities") ) {
            const [id, ...kp] = keyPath.slice(18).split(".");
            currentValue = foundry.utils.getProperty(item.system.activities?.get(id) ?? {}, kp.join("."));
          } else currentValue = foundry.utils.getProperty(item, keyPath);
          const value = currentValue - delta;
          if ( !Number.isNaN(value) ) itemUpdate[keyPath] = value;
        }
        if ( !foundry.utils.isEmpty(itemUpdate) ) {
          itemUpdate._id = id;
          updates.item.push(itemUpdate);
        }
      }
      await this.#applyUsageUpdates(updates);
    }

    /* -------------------------------------------- */

    /**
     * Merge activity updates into the appropriate item updates and apply.
     * @param {ActivityUsageUpdates} updates
     * @returns {ActivityConsumptionDescriptor}  Information on consumption performed to store in message flag.
     */
    async #applyUsageUpdates(updates) {
      this._mergeActivityUpdates(updates);

      // Ensure no existing items are created again & no non-existent items try to be deleted
      updates.create = updates.create?.filter(i => !this.actor.items.has(i));
      updates.delete = updates.delete?.filter(i => this.actor.items.has(i));

      // Create the consumed flag
      const getDeltas = (document, updates) => {
        updates = foundry.utils.flattenObject(updates);
        return Object.entries(updates).map(([keyPath, value]) => {
          let currentValue;
          if ( keyPath.startsWith("system.activities") ) {
            const [id, ...kp] = keyPath.slice(18).split(".");
            currentValue = foundry.utils.getProperty(document.system.activities?.get(id) ?? {}, kp.join("."));
          } else currentValue = foundry.utils.getProperty(document, keyPath);
          const delta = value - currentValue;
          if ( delta && !Number.isNaN(delta) ) return { keyPath, delta };
          return null;
        }).filter(_ => _);
      };
      const consumed = {
        actor: getDeltas(this.actor, updates.actor),
        item: updates.item.reduce((obj, { _id, ...changes }) => {
          const deltas = getDeltas(this.actor.items.get(_id), changes);
          if ( deltas.length ) obj[_id] = deltas;
          return obj;
        }, {})
      };
      if ( foundry.utils.isEmpty(consumed.actor) ) delete consumed.actor;
      if ( foundry.utils.isEmpty(consumed.item) ) delete consumed.item;
      if ( updates.create?.length ) consumed.created = updates.create;
      if ( updates.delete?.length ) consumed.deleted = updates.delete.map(i => this.actor.items.get(i).toObject());

      // Update documents with consumption
      if ( !foundry.utils.isEmpty(updates.actor) ) await this.actor.update(updates.actor);
      if ( !foundry.utils.isEmpty(updates.create) ) {
        await this.actor.createEmbeddedDocuments("Item", updates.create, { keepId: true });
      }
      if ( !foundry.utils.isEmpty(updates.delete) ) await this.actor.deleteEmbeddedDocuments("Item", updates.delete);
      if ( !foundry.utils.isEmpty(updates.item) ) await this.actor.updateEmbeddedDocuments("Item", updates.item);

      return consumed;
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
      const linked = this.getLinkedActivity(config.cause?.activity);

      if ( config.create !== false ) {
        config.create ??= {};
        config.create.measuredTemplate ??= !!this.target.template.type && this.target.prompt;
        // TODO: Handle permissions checks in `ActivityUsageDialog`
      }

      const ignoreLinkedConsumption = this.isSpell && !this.consumption.spellSlot;
      if ( config.consume !== false ) {
        const hasActionConsumption = this.activation.type === "legendary";
        const hasResourceConsumption = this.consumption.targets.length > 0;
        const hasLinkedConsumption = (linked?.consumption.targets.length > 0) && !ignoreLinkedConsumption;
        const hasSpellSlotConsumption = this.requiresSpellSlot && this.consumption.spellSlot;
        config.consume ??= {};
        config.consume.action ??= hasActionConsumption;
        config.consume.resources ??= Array.from(this.consumption.targets.entries())
          .filter(([, target]) => !target.combatOnly || this.actor.inCombat)
          .map(([index]) => index);
        config.consume.spellSlot ??= !linked && hasSpellSlotConsumption;
        config.hasConsumption = hasActionConsumption || hasResourceConsumption || hasLinkedConsumption
          || (!linked && hasSpellSlotConsumption);
      }

      const levelingFlag = this.item.getFlag("dnd5e", "spellLevel");
      if ( levelingFlag ) {
        // Handle fixed scaling from spell scrolls
        config.scaling = false;
        config.spell ??= {};
        config.spell.slot = levelingFlag.value;
      }

      else {
        const canScale = linked ? linked.consumption.scaling.allowed : this.canScale;
        const linkedDelta = (linked?.spell?.level ?? Infinity) - this.item.system.level;
        if ( !canScale ) config.scaling = false;
        else if ( Number.isFinite(linkedDelta) ) config.scaling ??= linkedDelta;

        if ( this.requiresSpellSlot ) {
          const { level, method } = this.item.system;
          const model = CONFIG.DND5E.spellcasting[method];
          config.spell ??= {};
          config.spell.slot ??= linked?.spell?.level
            ? `spell${linked.spell.level}`
            : (model?.getSpellSlotKey(level) ?? `spell${level}`);
          const scaling = (this.actor.system.spells?.[config.spell.slot]?.level ?? 0) - this.item.system.level;
          if ( scaling > 0 ) config.scaling ??= scaling;
        }
        config.scaling ??= 0;
      }

      if ( this.requiresConcentration && !game.settings.get("dnd5e", "disableConcentration") ) {
        config.concentration ??= {};
        config.concentration.begin ??= true;
        const { effects } = this.actor.concentration;
        const limit = this.actor.system.attributes?.concentration?.limit ?? 0;
        if ( limit && (limit <= effects.size) ) config.concentration.end ??= effects.find(e => {
          const data = e.flags.dnd5e?.item?.data ?? {};
          return (data === this.id) || (data._id === this.id);
        })?.id ?? effects.first()?.id ?? null;
      }

      if ( linked ) {
        config.cause ??= {};
        config.cause.activity ??= linked.relativeUUID;
        config.cause.resources ??= (linked.consumption.targets.length > 0) && !ignoreLinkedConsumption;
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
    async _prepareUsageScaling(usageConfig, messageConfig, item) {
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
        if ( usageConfig.scaling !== item.flags.dnd5e?.scaling ) {
          item.actor._embeddedPreparation = true;
          item.updateSource({ "flags.dnd5e.scaling": usageConfig.scaling });
          delete item.actor._embeddedPreparation;
          item.prepareFinalAttributes();
        }
      }
    }

    /* -------------------------------------------- */

    /**
     * Update data produced by activity usage.
     *
     * @typedef {object} ActivityUsageUpdates
     * @property {object} activity  Updates applied to activity that performed the activation.
     * @property {object} actor     Updates applied to the actor that performed the activation.
     * @property {object[]} create  Full data for Items to create (with IDs maintained).
     * @property {string[]} delete  IDs of items to be deleted from the actor.
     * @property {object[]} item    Updates applied to items on the actor that performed the activation.
     * @property {Roll[]} rolls     Any rolls performed as part of the activation.
     */

    /**
     * Calculate changes to actor, items, & this activity based on resource consumption.
     * @param {ActivityUseConfiguration} config                  Usage configuration.
     * @param {object} [options={}]
     * @param {boolean} [options.returnErrors=false]             Return array of errors, rather than displaying them.
     * @returns {ActivityUsageUpdates|ConsumptionError[]|false}  Updates to perform, an array of ConsumptionErrors,
     *                                                           or `false` if a consumption error occurred.
     * @protected
     */
    async _prepareUsageUpdates(config, { returnErrors=false }={}) {
      const updates = { activity: {}, actor: {}, create: [], delete: [], item: [], rolls: [] };
      if ( config.consume === false ) return updates;
      const errors = [];

      // Handle action economy
      if ( ((config.consume === true) || config.consume.action) && (this.activation.type === "legendary") ) {
        const containsLegendaryConsumption = this.consumption.targets
          .find(t => (t.type === "attribute") && (t.target === "resources.legact.value"));
        const count = this.activation.value ?? 1;
        const legendary = this.actor.system.resources?.legact;
        if ( legendary && !containsLegendaryConsumption ) {
          let message;
          if ( legendary.value === 0 ) message = "DND5E.ACTIVATION.Warning.NoActions";
          else if ( count > legendary.value ) message = "DND5E.ACTIVATION.Warning.NotEnoughActions";
          if ( message ) {
            const err = new ConsumptionError(game.i18n.format(message, {
              type: game.i18n.localize("DND5E.LegendaryAction.Label"),
              required: formatNumber(count),
              available: formatNumber(legendary.value)
            }));
            errors.push(err);
          } else {
            updates.actor["system.resources.legact.spent"] = legendary.spent + count;
          }
        }
      }

      // Handle consumption targets
      if ( (config.consume === true) || config.consume.resources ) {
        const indexes = (config.consume === true) || (config.consume.resources === true)
          ? this.consumption.targets.keys() : config.consume.resources;
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

      // Handle consumption on a linked activity
      if ( config.cause ) {
        const linkedActivity = this.getLinkedActivity(config.cause.activity);
        if ( linkedActivity ) {
          const consume = {
            resources: (config.consume === true) || (config.cause?.resources === true)
              ? linkedActivity.consumption.targets.keys() : config.cause?.resources,
            spellSlot: false
          };
          const usageConfig = foundry.utils.mergeObject(config, { consume, cause: false }, { inplace: false });
          const results = await linkedActivity._prepareUsageUpdates(usageConfig, { returnErrors: true });
          if ( foundry.utils.getType(results) === "Object" ) {
            linkedActivity._mergeActivityUpdates(results);
            foundry.utils.mergeObject(updates.actor, results.actor);
            updates.delete.push(...results.delete);
            updates.item.push(...results.item);
            updates.rolls.push(...results.rolls);
            // Mark this item for deletion if it is linked to a cast activity that will be deleted
            const otherLinkedActivity = linkedActivity.type === "forward"
              ? linkedActivity.item.system.activities.get(linkedActivity.activity.id) : linkedActivity;
            if ( updates.delete.includes(linkedActivity.item.id)
              && (this.item.getFlag("dnd5e", "cachedFor") === otherLinkedActivity?.relativeUUID) ) {
              updates.delete.push(this.item.id);
            }
          } else if ( results?.length ) {
            errors.push(...results);
          }
        }
      }

      // Handle spell slot consumption
      else if ( ((config.consume === true) || config.consume.spellSlot)
        && this.requiresSpellSlot && this.consumption.spellSlot ) {
        const { method } = this.item.system.preparation;
        const spellcasting = CONFIG.DND5E.spellcasting[method];
        const effectiveLevel = this.item.system.level + (config.scaling ?? 0);
        const slot = config.spell?.slot ?? spellcasting?.getSpellSlotKey(effectiveLevel) ?? method;
        const slotData = this.actor.system.spells?.[slot];
        if ( slotData ) {
          if ( slotData.value ) {
            const newValue = Math.max(slotData.value - 1, 0);
            foundry.utils.mergeObject(updates.actor, { [`system.spells.${slot}.value`]: newValue });
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

      if ( !returnErrors ) errors.forEach(err => ui.notifications.error(err.message, { console: false }));
      return errors.length ? returnErrors ? errors : false : updates;
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
      const checkObject = obj => (foundry.utils.getType(obj) === "Object")
        && Object.values(obj).some(v => v === true || v?.length);
      return config.concentration?.begin === true
        || checkObject(config.create)
        || ((checkObject(config.consume) || (config.cause?.resources === true)) && config.hasConsumption)
        || (config.scaling !== false);
    }

    /* -------------------------------------------- */

    /**
     * Prepare the context used to render the usage chat card.
     * @param {ActivityMessageConfiguration} message  Configuration info for the created message.
     * @returns {object}
     * @protected
     */
    async _usageChatContext(message) {
      const data = await this.item.system.getCardData({ activity: this });
      const properties = [...(data.tags ?? []), ...(data.properties ?? [])];
      const supplements = [];
      if ( this.activation.condition ) {
        supplements.push(`<strong>${game.i18n.localize("DND5E.Trigger")}</strong> ${this.activation.condition}`);
      }
      if ( data.materials?.value ) {
        supplements.push(`<strong>${game.i18n.localize("DND5E.Materials")}</strong> ${data.materials.value}`);
      }
      const buttons = this._usageChatButtons(message);

      // Include spell level in the subtitle.
      if ( this.item.type === "spell" ) {
        const spellLevel = foundry.utils.getProperty(message, "data.flags.dnd5e.use.spellLevel");
        const { spellLevels, spellSchools } = CONFIG.DND5E;
        data.subtitle = [spellLevels[spellLevel], spellSchools[this.item.system.school]?.label].filterJoin(" &bull; ");
      }

      return {
        activity: this,
        actor: this.item.actor,
        item: this.item,
        token: this.item.actor?.token,
        buttons: buttons.length ? buttons : null,
        description: data.description,
        properties: properties.length ? properties : null,
        subtitle: this.description.chatFlavor || data.subtitle,
        supplements
      };
    }

    /* -------------------------------------------- */

    /**
     * Apply any final modifications to message config immediately before message is created.
     * @param {ActivityUseConfiguration} usageConfig        Configuration data for the activation.
     * @param {ActivityMessageConfiguration} messageConfig  Configuration data for the chat message.
     * @param {ActivityUsageResults} results                Final details on the activation.
     * @protected
     */
    _finalizeMessageConfig(usageConfig, messageConfig, results) {
      messageConfig.data.rolls = (messageConfig.data.rolls ?? []).concat(results.updates.rolls);
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
     * @param {ActivityMessageConfiguration} message  Configuration info for the created message.
     * @returns {ActivityUsageChatButton[]}
     * @protected
     */
    _usageChatButtons(message) {
      const buttons = [];

      if ( this.target?.template?.type ) buttons.push({
        label: game.i18n.localize("DND5E.TARGET.Action.PlaceTemplate"),
        icon: '<i class="fas fa-bullseye" inert></i>',
        dataset: {
          action: "placeTemplate"
        }
      });

      if ( message.hasConsumption ) buttons.push({
        label: game.i18n.localize("DND5E.CONSUMPTION.Action.ConsumeResource"),
        icon: '<i class="fa-solid fa-cubes-stacked" inert></i>',
        dataset: {
          action: "consumeResource"
        }
      }, {
        label: game.i18n.localize("DND5E.CONSUMPTION.Action.RefundResource"),
        icon: '<i class="fa-solid fa-clock-rotate-left"></i>',
        dataset: {
          action: "refundResource"
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
        case "consumeResource": return !!flag;
        case "refundResource": return !flag;
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
      const context = await this._usageChatContext(message);
      const messageConfig = foundry.utils.mergeObject({
        rollMode: game.settings.get("core", "rollMode"),
        data: {
          content: await foundry.applications.handlebars.renderTemplate(this.metadata.usage.chatCard, context),
          speaker: ChatMessage.getSpeaker({ actor: this.item.actor }),
          title: `${this.item.name} - ${this.name}`
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
      results.templates = config.create?.measuredTemplate ? await this.#placeTemplate() : [];
    }

    /* -------------------------------------------- */

    /**
     * Trigger a primary activation action defined by the activity (such as opening the attack dialog for attack rolls).
     * @param {ActivityUseConfiguration} config  Configuration data for the activation.
     * @param {ActivityUsageResults} results     Final details on the activation.
     * @protected
     */
    async _triggerSubsequentActions(config, results) {}

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
      rollConfig.hookNames = [...(config.hookNames ?? []), "damage"];
      rollConfig.subject = this;

      const dialogConfig = foundry.utils.mergeObject({
        options: {
          position: {
            width: 400,
            top: config.event ? config.event.clientY - 80 : null,
            left: window.innerWidth - 710
          },
          window: {
            title: this.damageFlavor,
            subtitle: this.item.name,
            icon: this.item.img
          }
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
              roll: { type: "damage" }
            }
          },
          speaker: ChatMessage.getSpeaker({ actor: this.actor })
        }
      }, message);

      const rolls = await CONFIG.Dice.DamageRoll.build(rollConfig, dialogConfig, messageConfig);
      if ( !rolls?.length ) return;

      const canUpdate = this.item.isOwner && !this.item.inCompendium;
      const lastDamageTypes = rolls.reduce((obj, roll, index) => {
        if ( roll.options.type ) obj[index] = roll.options.type;
        return obj;
      }, {});
      if ( canUpdate && !foundry.utils.isEmpty(lastDamageTypes)
        && (this.actor && this.actor.items.has(this.item.id)) ) {
        await this.item.setFlag("dnd5e", `last.${this.id}.damageType`, lastDamageTypes);
      }

      /**
       * A hook event that fires after damage has been rolled.
       * @function dnd5e.rollDamage
       * @memberof hookEvents
       * @param {DamageRoll[]} rolls       The resulting rolls.
       * @param {object} [data]
       * @param {Activity} [data.subject]  The activity that performed the roll.
       */
      Hooks.callAll("dnd5e.rollDamage", rolls, { subject: this });
      Hooks.callAll("dnd5e.rollDamageV2", rolls, { subject: this });

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
     * Construct context menu options for this Activity.
     * @returns {ContextMenuEntry[]}
     */
    getContextMenuOptions() {
      const entries = [];
      const compendiumLocked = this.item.collection?.locked;

      if ( this.item.isOwner && !compendiumLocked ) {
        entries.push({
          name: "DND5E.ContextMenuActionEdit",
          icon: '<i class="fas fa-pen-to-square fa-fw"></i>',
          callback: () => this.sheet.render({ force: true })
        }, {
          name: "DND5E.ContextMenuActionDuplicate",
          icon: '<i class="fas fa-copy fa-fw"></i>',
          callback: () => {
            const createData = this.toObject();
            delete createData._id;
            this.item.createActivity(createData.type, createData, { renderSheet: false });
          }
        }, {
          name: "DND5E.ContextMenuActionDelete",
          icon: '<i class="fas fa-trash fa-fw"></i>',
          callback: () => this.deleteDialog()
        });
      } else {
        entries.push({
          name: "DND5E.ContextMenuActionView",
          icon: '<i class="fas fa-eye fa-fw"></i>',
          callback: () => this.sheet.render({ force: true })
        });
      }

      if ( "favorites" in (this.actor?.system ?? {}) ) {
        const uuid = `${this.item.getRelativeUUID(this.actor)}.Activity.${this.id}`;
        const isFavorited = this.actor.system.hasFavorite(uuid);
        entries.push({
          name: isFavorited ? "DND5E.FavoriteRemove" : "DND5E.Favorite",
          icon: '<i class="fas fa-bookmark fa-fw"></i>',
          condition: () => this.item.isOwner && !compendiumLocked,
          callback: () => {
            if ( isFavorited ) this.actor.system.removeFavorite(uuid);
            else this.actor.system.addFavorite({ type: "activity", id: uuid });
          },
          group: "state"
        });
      }

      return entries;
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
        else if ( action === "refundResource" ) await this.#refundResource(event, target, message);
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
     * Handle context menu events on activities.
     * @param {Item5e} item         The Item the Activity belongs to.
     * @param {HTMLElement} target  The element the menu was triggered on.
     */
    static onContextMenu(item, target) {
      const { activityId } = target.closest("[data-activity-id]")?.dataset ?? {};
      const activity = item.system.activities?.get(activityId);
      if ( !activity ) return;
      const menuItems = activity.getContextMenuOptions();

      /**
       * A hook even that fires when the context menu for an Activity is opened.
       * @function dnd5e.getItemActivityContext
       * @memberof hookEvents
       * @param {Activity} activity             The Activity.
       * @param {HTMLElement} target            The element that menu was triggered on.
       * @param {ContextMenuEntry[]} menuItems  The context menu entries.
       */
      Hooks.callAll("dnd5e.getItemActivityContext", activity, target, menuItems);
      ui.context.menuItems = menuItems;
    }

    /* -------------------------------------------- */

    /**
     * Handle consuming resources from the chat card.
     * @param {PointerEvent} event     Triggering click event.
     * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
     * @param {ChatMessage5e} message  Message associated with the activation.
     */
    async #consumeResource(event, target, message) {
      const messageConfig = {};
      const scaling = message.getFlag("dnd5e", "scaling");
      const usageConfig = { consume: true, event, scaling };
      const linkedActivity = this.getLinkedActivity(message.getFlag("dnd5e", "use.cause"));
      if ( linkedActivity ) usageConfig.cause = {
        activity: linkedActivity.relativeUUID, resources: linkedActivity.consumption.targets.length > 0
      };
      await this.consume(usageConfig, messageConfig);
      if ( !foundry.utils.isEmpty(messageConfig.data) ) await message.update(messageConfig.data);
    }

    /* -------------------------------------------- */

    /**
     * Handle refunding consumption from a chat card.
     * @param {PointerEvent} event     Triggering click event.
     * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
     * @param {ChatMessage5e} message  Message associated with the activation.
     */
    async #refundResource(event, target, message) {
      const consumed = message.getFlag("dnd5e", "use.consumed");
      if ( !foundry.utils.isEmpty(consumed) ) {
        await this.refund(consumed);
        await message.unsetFlag("dnd5e", "use.consumed");
      }
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
     * Prepare activity favorite data.
     * @returns {Promise<FavoriteData5e>}
     */
    async getFavoriteData() {
      return {
        img: this.img,
        title: this.name,
        subtitle: [this.labels.activation, this.labels.recovery],
        range: this.range,
        uses: { ...this.uses, name: "uses.value" }
      };
    }

    /* -------------------------------------------- */

    /**
     * Retrieve a linked activity based on the provided relative UUID, or the stored `cachedFor` value.
     * @param {string} relativeUUID  Relative UUID for an activity on this actor.
     * @returns {Activity|null}
     */
    getLinkedActivity(relativeUUID) {
      if ( !this.actor ) return null;
      relativeUUID ??= this.item.getFlag("dnd5e", "cachedFor");
      return fromUuidSync(relativeUUID, { relative: this.actor, strict: false });
    }

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
      rollData.activity = { ...this };
      rollData.mod = this.actor?.system.abilities?.[this.ability]?.mod ?? 0;
      return rollData;
    }

    /* -------------------------------------------- */

    /**
     * Merge the activity updates into this activity's item updates.
     * @param {ActivityUsageUpdates} updates
     * @internal
     */
    _mergeActivityUpdates(updates) {
      if ( foundry.utils.isEmpty(updates.activity) ) return;
      const itemIndex = updates.item.findIndex(i => i._id === this.item.id);
      const keyPath = `system.activities.${this.id}`;
      const activityUpdates = foundry.utils.expandObject(updates.activity);
      if ( itemIndex === -1 ) updates.item.push({ _id: this.item.id, [keyPath]: activityUpdates });
      else updates.item[itemIndex][keyPath] = activityUpdates;
    }

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /** @override */
    static _createDialogTypes(parent) {
      return Object.entries(CONFIG.DND5E.activityTypes)
        .filter(([, { configurable }]) => configurable !== false)
        .map(([k]) => k);
    }
  }
  return Activity;
}
