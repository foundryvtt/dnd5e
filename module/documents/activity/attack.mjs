import AttackSheet from "../../applications/activity/attack-sheet.mjs";
import AttackActivityData from "../../data/activity/attack-data.mjs";
import { d20Roll } from "../../dice/dice.mjs";
import { getTargetDescriptors } from "../../utils.mjs";
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
    if ( this.damage.parts.length || this.item.system.properties?.has("amm") ) buttons.push({
      label: game.i18n.localize("DND5E.Damage"),
      icon: '<i class="fa-solid fa-burst" inert></i>',
      dataset: {
        action: "rollDamage"
      }
    });
    return buttons.concat(super._usageChatButtons());
  }

  /* -------------------------------------------- */
  /*  Rolling                                     */
  /* -------------------------------------------- */

  /**
   * @typedef {D20RollProcessConfiguration} AttackRollProcessConfiguration
   * @param {string|boolean} [ammunition]  Specific ammunition to consume, or `false` to prevent any ammo consumption.
   * @param {string} [attackMode]          Mode to use for making the attack and rolling damage.
   */

  /**
   * @typedef {object} AmmunitionUpdate
   * @property {string} id        ID of the ammunition item to update.
   * @property {boolean} destroy  Will the ammunition item be deleted?
   * @property {number} quantity  New quantity after the ammunition is spent.
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
    const targets = getTargetDescriptors();

    let ammunitionOptions;
    const selectedAmmunition = config.ammunition ?? this.item.getFlag("dnd5e", `last.${this.id}.ammunition`);
    if ( this.item.system.properties?.has("amm") && this.actor ) ammunitionOptions = this.actor.items
      .filter(i => (i.type === "consumable") && (i.system.type?.value === "ammo")
        && (!this.item.system.ammunition?.type || (i.system.type.subtype === this.item.system.ammunition.type)))
      .map(i => ({
        value: i.id, label: `${i.name} (${i.system.quantity})`, item: i,
        disabled: !i.system.quantity, selected: i.id === selectedAmmunition
      }))
      .sort((lhs, rhs) => lhs.label.localeCompare(rhs.label, game.i18n.lang));
    if ( (foundry.utils.getType(selectedAmmunition) !== "string") && ammunitionOptions?.[0] ) {
      ammunitionOptions[0].selected = true;
    }

    const selectedAttackMode = config.attackMode ?? this.item.getFlag("dnd5e", `last.${this.id}.attackMode`);
    const attackModes = Array.from(this.item.system.attackModes)
      .map(m => ({ ...m, selected: m.value === selectedAttackMode }));

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

    const masteryOptions = this.item.system.masteryOptions;
    if ( config.mastery ) rollConfig.rolls[0].options.mastery = config.mastery;
    else {
      const stored = this.item.getFlag("dnd5e", `last.${this.id}.mastery`);
      const match = masteryOptions?.find(m => m.value === stored);
      if ( match ) {
        rollConfig.rolls[0].options.mastery = stored;
        match.selected = true;
      }
    }
    if ( masteryOptions?.length ) rollConfig.rolls[0].options.mastery ??= masteryOptions[0].value;

    const dialogConfig = foundry.utils.mergeObject({
      configure: true,
      options: {
        width: 400,
        top: config.event ? config.event.clientY - 80 : null,
        left: window.innerWidth - 710,
        ammunitionOptions: rollConfig.ammunition !== false ? ammunitionOptions : undefined,
        attackModes,
        masteryOptions: (masteryOptions?.length > 1) && !config.mastery ? masteryOptions : undefined
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
            roll: { type: "attack" }
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
      mastery: rollConfig.rolls[0].options.mastery,
      elvenAccuracy: rollConfig.elvenAccuracy,
      halflingLucky: rollConfig.halflingLucky,
      reliableTalent: rollConfig.rolls[0].options.minimum === 10,
      fastForward: !dialogConfig.configure,
      ammunitionOptions: dialogConfig.options.ammunitionOptions,
      attackModes: dialogConfig.options.attackModes,
      masteryOptions: dialogConfig.options.masteryOptions,
      title: `${this.item.name} - ${game.i18n.localize("DND5E.AttackRoll")}`,
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

    const flags = {};
    const ammo = this.actor?.items.get(roll.options.ammunition);
    let ammoUpdate = null;
    if ( ammo ) {
      ammoUpdate = { id: ammo.id, quantity: Math.max(0, ammo.system.quantity - 1) };
      ammoUpdate.destroy = ammo.system.uses.autoDestroy && (ammoUpdate.quantity === 0);
      flags.ammunition = roll.options.ammunition;
    }
    if ( roll.options.attackMode ) flags.attackMode = roll.options.attackMode;
    if ( roll.options.mastery ) flags.mastery = roll.options.mastery;
    if ( !foundry.utils.isEmpty(flags) ) await this.item.setFlag("dnd5e", `last.${this.id}`, flags);

    /**
     * A hook event that fires after an attack has been rolled but before any ammunition is consumed.
     * @function dnd5e.rollAttackV2
     * @memberof hookEvents
     * @param {D20Roll[]} rolls                        The resulting rolls.
     * @param {object} data
     * @param {AttackActivity} data.activity           The activity that performed the attack.
     * @param {AmmunitionUpdate|null} data.ammoUpdate  Any updates related to ammo consumption for this attack.
     */
    Hooks.callAll("dnd5e.rollAttackV2", [roll], { activity: this, ammoUpdate });

    if ( "dnd5e.rollAttack" in Hooks.events ) {
      foundry.utils.logCompatibilityWarning(
        "The `dnd5e.rollAttack` hook has been deprecated and replaced with `dnd5e.rollAttackV2`.",
        { since: "DnD5e 4.0", until: "DnD5e 4.4" }
      );
      const oldAmmoUpdate = [{ _id: ammoUpdate.id, "system.quantity": ammoUpdate.quantity }];
      Hooks.callAll("dnd5e.rollAttack", this.item, roll, oldAmmoUpdate);
      if ( oldAmmoUpdate[0] ) {
        ammoUpdate.id = oldAmmoUpdate[0]._id;
        ammoUpdate.quantity = foundry.utils.getProperty(oldAmmoUpdate[0], "system.quantity");
      }
    }

    // Commit ammunition consumption on attack rolls resource consumption if the attack roll was made
    if ( ammoUpdate?.destroy ) {
      // If ammunition was deleted, store a copy of it in the roll message
      const data = ammo.toObject();
      const id = rollConfig.event?.target.closest("[data-message-id]")?.dataset.messageId;
      const attackMessage = dnd5e.registry.messages.messages(id, "attack").pop();
      await attackMessage?.setFlag("dnd5e", "roll.ammunitionData", data);
      await this.actor?.deleteEmbeddedDocuments("Item", [ammoUpdate.id]);
    }
    else if ( ammoUpdate ) await this.actor?.updateEmbeddedDocuments("Item", [
      { _id: ammoUpdate.id, "system.quantity": ammoUpdate.quantity }
    ]);

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
    const attackMode = lastAttack?.getFlag("dnd5e", "roll.attackMode");

    // Fetch the ammunition used with the last attack roll
    let ammunition;
    const actor = lastAttack?.getAssociatedActor();
    if ( actor ) {
      const storedData = lastAttack.getFlag("dnd5e", "roll.ammunitionData");
      ammunition = storedData
        ? new Item.implementation(storedData, { parent: actor })
        : actor.items.get(lastAttack.getFlag("dnd5e", "roll.ammunition"));
    }

    this.rollDamage({ event, ammunition, attackMode });
  }
}
