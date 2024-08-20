import AttackSheet from "../../applications/activity/attack-sheet.mjs";
import AttackActivityData from "../../data/activity/attack-data.mjs";
import { d20Roll } from "../../dice/dice.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for making attacks and rolling damage.
 */
export default class AttackActivity extends ActivityMixin(AttackActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.ATTACK"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "attack",
      img: "systems/dnd5e/icons/svg/activity/attack.svg",
      title: "DND5E.ATTACK.Title.one",
      sheetClass: AttackSheet,
      usage: {
        actions: {
          rollAttack: AttackActivity.#rollAttack,
          rollDamage: AttackActivity.#rollDamage
        }
      }
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /** @override */
  _usageChatButtons() {
    const buttons = [{
      label: game.i18n.localize("DND5E.Attack"),
      icon: '<i class="dnd5e-icon" data-src="systems/dnd5e/icons/svg/trait-weapon-proficiencies.svg" inert></i>',
      dataset: {
        action: "rollAttack"
      }
    }];
    if ( this.damage.parts.length ) buttons.push({
      label: game.i18n.localize("DND5E.Damage"),
      icon: '<i class="fa-solid fa-burst" inert></i>',
      dataset: {
        action: "rollDamage"
      }
    });
    return buttons;
  }

  /* -------------------------------------------- */
  /*  Rolling                                     */
  /* -------------------------------------------- */

  /**
   * @typedef {D20RollProcessConfiguration} AttackRollProcessConfiguration
   * @param {string} [attackMode]  Mode to use for making the attack and rolling damage.
   */

  /**
   * Perform an attack roll.
   * @param {AttackRollProcessConfiguration} config  Configuration information for the roll.
   * @param {BasicRollDialogConfiguration} dialog    Configuration for the roll dialog.
   * @param {BasicRollMessageConfiguration} message  Configuration for the roll message.
   * @returns {Promise<D20Roll[]|void>}
   */
  async rollAttack(config={}, dialog={}, message={}) {
    const { parts, data } = this.getAttackData();
    const targets = this.constructor.getTargetDescriptors();

    let ammoUpdate = [];
    // TODO: Handle ammunition consumption
    // const consume = this.system.consume;
    // const ammo = this.hasAmmo ? this.actor.items.get(consume.target) : null;
    // if ( ammo ) {
    //   const q = ammo.system.quantity;
    //   const consumeAmount = consume.amount ?? 0;
    //   if ( q && (q - consumeAmount >= 0) ) {
    //     title += ` [${ammo.name}]`;
    //   }
    //
    //   // Get pending ammunition update
    //   const usage = this._getUsageUpdates({consumeResource: true});
    //   if ( usage === false ) return null;
    //   ammoUpdate = usage.resourceUpdates ?? [];
    // }

    const rollConfig = foundry.utils.mergeObject({
      elvenAccuracy: this.actor?.getFlag("dnd5e", "elvenAccuracy")
        && CONFIG.DND5E.characterFlags.elvenAccuracy.abilities.includes(this.ability),
      halflingLucky: this.actor?.getFlag("dnd5e", "halflingLucky")
    }, config);
    rollConfig.origin = this;
    rollConfig.rolls = [{
      parts, data,
      options: {
        criticalSuccess: this.criticalThreshold,
        target: targets.length === 1 ? targets[0].ac : undefined
      }
    }].concat(config.rolls ?? []);

    const dialogConfig = foundry.utils.mergeObject({
      configure: true,
      options: {
        width: 400,
        top: config.event ? config.event.clientY - 80 : null,
        left: window.innerWidth - 710,
        attackModes: this.item.system.attackModes
      }
    }, dialog);

    const messageConfig = foundry.utils.mergeObject({
      create: true,
      data: {
        flavor: `${this.item.name} - ${game.i18n.localize("DND5E.AttackRoll")}`,
        flags: {
          dnd5e: {
            ...this.messageFlags,
            messageType: "roll",
            roll: { type: "attack" },
            targets
          }
        },
        speaker: ChatMessage.getSpeaker({ actor: this.actor })
      }
    }, message);

    /**
     * A hook event that fires before an attack is rolled.
     * @function dnd5e.preRollAttackV2
     * @memberof hookEvents
     * @param {AttackRollProcessConfiguration} config  Configuration data for the pending roll.
     * @param {BasicRollDialogConfiguration} dialog    Presentation data for the roll configuration dialog.
     * @param {BasicRollMessageConfiguration} message  Configuration data for the roll's message.
     * @returns {boolean}                              Explicitly return `false` to prevent the roll.
     */
    if ( Hooks.call("dnd5e.preRollAttackV2", rollConfig, dialogConfig, messageConfig) === false ) return;

    const oldRollConfig = {
      actor: this.actor,
      parts: rollConfig.rolls[0].parts,
      data: rollConfig.rolls[0].data,
      event: rollConfig.event,
      advantage: rollConfig.rolls[0].options.advantage,
      disadvantage: rollConfig.rolls[0].options.disadvantage,
      critical: rollConfig.rolls[0].options.criticalSuccess,
      fumble: rollConfig.rolls[0].options.criticalFailure,
      targetValue: rollConfig.rolls[0].options.target,
      elvenAccuracy: rollConfig.elvenAccuracy,
      halflingLucky: rollConfig.halflingLucky,
      reliableTalent: rollConfig.rolls[0].options.minimum === 10,
      fastForward: !dialogConfig.configure,
      attackModes: dialogConfig.options.attackModes,
      title: dialogConfig.options.title,
      dialogOptions: dialogConfig.options,
      chatMessage: messageConfig.create,
      messageData: messageConfig.data,
      rollMode: messageConfig.rollMode,
      flavor: messageConfig.data.flavor
    };

    if ( "dnd5e.preRollAttack" in Hooks.events ) {
      foundry.utils.logCompatibilityWarning(
        "The `dnd5e.preRollAttack` hook has been deprecated and replaced with `dnd5e.preRollAttackV2`.",
        { since: "DnD5e 4.0", until: "DnD5e 4.4" }
      );
      if ( Hooks.call("dnd5e.preRollAttack", this.item, oldRollConfig) === false ) return;
    }

    const roll = await d20Roll(oldRollConfig);
    if ( roll === null ) return;

    /**
     * A hook event that fires after an attack has been rolled but before any ammunition is consumed.
     * @function dnd5e.rollAttackV2
     * @memberof hookEvents
     * @param {D20Roll[]} rolls               The resulting rolls.
     * @param {object} data
     * @param {AttackActivity} data.activity  The activity that performed the attack.
     * @param {object[]} data.ammoUpdate      Any updates related to ammo consumption for this attack.
     */
    Hooks.callAll("dnd5e.rollAttackV2", [roll], { activity: this, ammoUpdate });

    if ( "dnd5e.rollAttack" in Hooks.events ) {
      foundry.utils.logCompatibilityWarning(
        "The `dnd5e.rollAttack` hook has been deprecated and replaced with `dnd5e.rollAttackV2`.",
        { since: "DnD5e 4.0", until: "DnD5e 4.4" }
      );
      Hooks.callAll("dnd5e.rollAttack", this.item, roll, ammoUpdate);
    }

    // Commit ammunition consumption on attack rolls resource consumption if the attack roll was made
    if ( ammoUpdate.length ) await this.actor?.updateEmbeddedDocuments("Item", ammoUpdate);

    /**
     * A hook event that fires after an attack has been rolled and ammunition has been consumed.
     * @function dnd5e.postRollAttack
     * @memberof hookEvents
     * @param {D20Roll[]} rolls               The resulting rolls.
     * @param {object} data
     * @param {AttackActivity} data.activity  The activity that performed the attack.
     */
    Hooks.callAll("dnd5e.postRollAttack", [roll], { activity: this });

    return [roll];
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle performing an attack roll.
   * @this {AttackActivity}
   * @param {PointerEvent} event     Triggering click event.
   * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
   * @param {ChatMessage5e} message  Message associated with the activation.
   */
  static #rollAttack(event, target, message) {
    this.rollAttack({ event });
  }

  /* -------------------------------------------- */

  /**
   * Handle performing a damage roll.
   * @this {AttackActivity}
   * @param {PointerEvent} event     Triggering click event.
   * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
   * @param {ChatMessage5e} message  Message associated with the activation.
   */
  static #rollDamage(event, target, message) {
    const lastAttack = message.getAssociatedRolls("attack").pop();
    const mode = lastAttack?.getFlag("dnd5e", "roll.mode");
    this.rollDamage({ event, mode });
  }
}
