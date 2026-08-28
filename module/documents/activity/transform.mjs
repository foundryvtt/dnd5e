import TransformSheet from "../../applications/activity/transform-sheet.mjs";
import TransformUsageDialog from "../../applications/activity/transform-usage-dialog.mjs";
import CompendiumBrowser from "../../applications/compendium-browser.mjs";
import BaseTransformActivityData from "../../data/activity/transform-data.mjs";
import { getSceneTargets, simplifyBonus } from "../../utils.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * @import { TransformProfile } from "../../data/activity/_types.mjs";
 */

/**
 * Activity for transforming an actor into something else.
 */
export default class TransformActivity extends ActivityMixin(BaseTransformActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.TRANSFORM"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "transform",
      img: "systems/dnd5e/icons/svg/activity/transform.svg",
      title: "DND5E.TRANSFORM.Title",
      hint: "DND5E.TRANSFORM.Hint",
      sheetClass: TransformSheet,
      usage: {
        actions: {
          transformActor: TransformActivity.#transformActor
        },
        applyEffectsInChat: false,
        dialog: TransformUsageDialog
      }
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Does the user have permissions to transform?
   * @type {boolean}
   */
  get canTransform() {
    if ( this.transform.mode === "form" ) return this.actor.isOwner;
    return game.user.can("ACTOR_CREATE") && (game.user.isGM || game.settings.get("dnd5e", "allowPolymorphing"));
  }

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareUsageConfig(config) {
    config = super._prepareUsageConfig(config);
    config.transform ??= {};
    config.transform.profile ??= this.currentProfile ?? this.availableProfiles[0]?._id ?? null;
    return config;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _requiresConfigurationDialog(config) {
    let profilesCount = this.availableProfiles.length;
    if ( (this.transform.mode === "form") && this.transform.formless ) profilesCount += 1;
    return super._requiresConfigurationDialog(config) || (profilesCount > 1);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _finalizeMessageConfig(usageConfig, messageConfig, results) {
    await super._finalizeMessageConfig(usageConfig, messageConfig, results);
    if ( usageConfig.transform?.profile ) {
      foundry.utils.setProperty(messageConfig.data, "flags.dnd5e.transform.profile", usageConfig.transform.profile);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _usageChatButtons(message) {
    if ( !this.availableProfiles.length ) return super._usageChatButtons(message);
    const form = this.transform.mode === "form"
      ? this.effects.find(e => e._id === message.data?.flags?.dnd5e?.transform?.profile)?.getEffect()?.name
        ?? _loc("DND5E.TRANSFORM.NoForm") : null;
    return [{
      action: "transformActor",
      icon: "fa-solid fa-frog",
      label: { value: form ?? "DND5E.TRANSFORM.Action.Transform" }
    }].concat(super._usageChatButtons(message));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  shouldHideChatButton(button, message) {
    if ( button.action === "transformActor" ) return !this.canTransform;
    return super.shouldHideChatButton(button, message);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _finalizeUsage(config, results) {
    if ( this.transform.mode !== "form" ) {
      const profile = this.profiles.find(p => p._id === config.transform?.profile);
      if ( profile ) {
        const uuid = this.transform.mode ? await this.queryActor(profile) : profile.uuid;
        if ( uuid ) {
          if ( results.message instanceof ChatMessage ) await results.message.setFlag("dnd5e", "transform.uuid", uuid);
          else foundry.utils.setProperty(results.message, "flags.dnd5e.transform.uuid", uuid);
        }
      }
    }
    await super._finalizeUsage(config, results);
  }

  /* -------------------------------------------- */

  /**
   * Request a specific actor to transform into from the player.
   * @param {TransformProfile} profile  Profile used for transformation.
   * @returns {Promise<string|null>}    UUID of the actor to transform into or `null` if canceled.
   */
  async queryActor(profile) {
    const locked = { documentClass: "Actor", types: new Set(["npc"]), additional: {} };
    if ( profile.cr !== "" ) locked.additional = {
      cr: { max: simplifyBonus(profile.cr, this.getRollData({ deterministic: true })) }
    };
    const makeFilter = (data, key, negative) => locked.additional[key] = Array.from(data).reduce((obj, type) => {
      obj[type] = negative ? -1 : 1;
      return obj;
    }, {});
    if ( profile.sizes.size ) makeFilter(profile.sizes, "size");
    if ( profile.types.size ) makeFilter(profile.types, "type");
    if ( profile.movement.size ) makeFilter(profile.movement, "movement", true);
    return CompendiumBrowser.selectOne({ filters: { locked }});
  }

  /* -------------------------------------------- */

  /** @override */
  async _triggerSubsequentActions(config, results) {
    if ( this.transform.mode !== "form" ) return;
    const profile = results.message?.flags?.dnd5e?.transform?.profile
      ?? results.message?.data?.flags?.dnd5e?.transform?.profile;
    await this.#transformToForm(profile, {
      dependentOn: results.effects?.find(e =>
        (e.system.type === "concentrating") && (e.flags.dnd5e?.activity?.id === this.id)
      )?.uuid,
      scaling: config.scaling ? config.scaling : undefined,
      spellLevel: this.item.system.level
    });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle transforming selected actors from the chat card.
   * @this {TransformActivity}
   * @param {PointerEvent} event     Triggering click event.
   * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
   * @param {ChatMessage5e} message  Message associated with the activation.
   */
  static async #transformActor(event, target, message) {
    if ( this.transform.mode === "form" ) {
      await this.#transformToForm(message.getFlag("dnd5e", "transform.profile"), {
        dependentOn: message.getAssociatedActor()?.effects.get(message.system.concentration)?.uuid,
        scaling: message.system.scaling,
        spellLevel: message.system.level
      });
      return;
    }

    const targets = getSceneTargets();
    if ( !targets.length && game.user.character ) targets.push(game.user.character);
    if ( !targets.length ) {
      ui.notifications.warn("DND5E.ActionWarningNoToken");
      return;
    }

    const profileId = message.getFlag("dnd5e", "transform.profile");
    const profile = this.profiles.find(p => p._id === profileId) || this.profiles[0];
    const uuid = message.getFlag("dnd5e", "transform.uuid") ?? await this.queryActor(profile);
    const source = await fromUuid(uuid);
    if ( !source ) {
      ui.notifications.warn("DND5E.TRANSFORM.Warning.SourceActor");
      return;
    }

    for ( const token of targets ) {
      const actor = token instanceof Actor ? token : token.actor;
      await actor.transformInto(source, this.settings);
      // TODO: Create message for transformed actors
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle transforming the actor to a specific form.
   * @param {string} [profileId]  ID of the profile into which to transform.
   * @param {object} [flags={}]   Flags to apply to the created effect.
   */
  async #transformToForm(profileId, flags={}) {
    if ( this.transform.mode !== "form" ) return;
    const profile = this.applicableEffects.find(e => e._id === profileId);
    if ( !profile && !this.transform.formless ) return;

    const targets = new Set(getSceneTargets(this.actor, { checkBaseActor: true }).map(t => t.actor));
    if ( !targets.size ) targets.add(this.actor);
    const operations = [];
    for ( const target of targets ) {
      const item = target.items.get(this.item.id);
      if ( !item ) continue;
      const ids = [];
      const activityUuid = foundry.utils.buildRelativeUuid(this.uuid, target.uuid);
      for ( const profile of this.effects ) {
        const appliedEffect = target.effects.find(e =>
          (e.system.origin?.profile === profile._id) && (e.system.origin?.activity === activityUuid)
        );
        const sourceEffect = item.effects.get(profile._id);
        if ( (profile._id === profileId) && sourceEffect ) {
          const effectFlags = {
            flags: {
              dnd5e: flags
            },
            system: {
              origin: {
                activity: activityUuid,
                profile: profileId
              }
            }
          };

          // Effect already exists, reset its duration
          if ( appliedEffect ) operations.push({
            action: "update", documentName: "ActiveEffect", updates: [foundry.utils.mergeObject({
              _id: appliedEffect._id,
              disabled: false,
              duration: {
                expired: false
              },
              start: ActiveEffect.implementation.getEffectStart()
            }, effectFlags)], parent: target
          });

          // Create new effect
          else {
            const effectData = sourceEffect.clone(foundry.utils.mergeObject({
              disabled: false, _stats: { compendiumSource: null, duplicateSource: sourceEffect.uuid }
            }, effectFlags)).toObject();
            effectData.system.changes =
              await ActiveEffect.implementation.forApplication(effectData.system.changes, this, target);
            operations.push({ action: "create", documentName: "ActiveEffect", data: [effectData], parent: target });
          }
        }

        // Remove the existing effect
        else if ( appliedEffect ) ids.push(appliedEffect.id);
      }
      if ( ids.length ) operations.push({ action: "delete", documentName: "ActiveEffect", ids, parent: target });
    }
    await foundry.documents.modifyBatch(operations);
  }
}
