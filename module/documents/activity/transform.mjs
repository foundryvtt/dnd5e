import TransformSheet from "../../applications/activity/transform-sheet.mjs";
import TransformUsageDialog from "../../applications/activity/transform-usage-dialog.mjs";
import CompendiumBrowser from "../../applications/compendium-browser.mjs";
import TransformActivityData from "../../data/activity/transform-data.mjs";
import { getSceneTargets, simplifyBonus } from "../../utils.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for transforming an actor into something else.
 */
export default class TransformActivity extends ActivityMixin(TransformActivityData) {
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
      sheetClass: TransformSheet,
      usage: {
        actions: {
          transformActor: TransformActivity.#transformActor
        },
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
    return game.user.can("ACTOR_CREATE") && (game.user.isGM || game.settings.get("dnd5e", "allowPolymorphing"));
  }

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /**
   * @typedef {ActivityUseConfiguration} TransformUseConfiguration
   * @property {Partial<TransformationConfiguration>} transform  Options for configuring transformation behavior.
   */

  /**
   * @typedef TransformationConfiguration
   * @property {string} profile  ID of the transformation profile to use.
   * @property {string} [uuid]   UUID of the creature to transform into.
   */

  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareUsageConfig(config) {
    config = super._prepareUsageConfig(config);
    config.transform ??= {};
    config.transform.profile ??= this.availableProfiles[0]?._id ?? null;
    return config;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _requiresConfigurationDialog(config) {
    return super._requiresConfigurationDialog(config) || (this.availableProfiles.length > 1);
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
    return [{
      label: game.i18n.localize("DND5E.TRANSFORM.Action.Transform"),
      icon: '<i class="fa-solid fa-frog" inert></i>',
      dataset: {
        action: "transformActor"
      }
    }].concat(super._usageChatButtons(message));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  shouldHideChatButton(button, message) {
    if ( button.dataset.action === "transformActor" ) return !this.canTransform;
    return super.shouldHideChatButton(button, message);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _finalizeUsage(config, results) {
    const profile = this.profiles.find(p => p._id === config.transform?.profile);
    if ( profile ) {
      const uuid = !this.transform.mode ? profile.uuid : await this.queryActor(profile);
      if ( uuid ) {
        if ( results.message instanceof ChatMessage ) results.message.setFlag("dnd5e", "transform.uuid", uuid);
        else foundry.utils.setProperty(results.message, "flags.dnd5e.transform.uuid", uuid);
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
    const targets = getSceneTargets();
    if ( !targets.length && game.user.character ) targets.push(game.user.character);
    if ( !targets.length ) {
      ui.notifications.warn("DND5E.ActionWarningNoToken", { localize: true });
      return;
    }

    const profileId = message.getFlag("dnd5e", "transform.profile");
    const profile = this.profiles.find(p => p._id === profileId) || this.profiles[0];
    const uuid = message.getFlag("dnd5e", "transform.uuid") ?? await this.queryActor(profile);
    const source = await fromUuid(uuid);
    if ( !source ) {
      ui.notifications.warn("DND5E.TRANSFORM.Warning.SourceActor", { localize: true });
      return;
    }

    for ( const token of targets ) {
      const actor = token instanceof Actor ? token : token.actor;
      await actor.transformInto(source, this.settings);
      // TODO: Create message for transformed actors
    }
  }
}
