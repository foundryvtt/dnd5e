import AttackSheet from "../../applications/activity/attack-sheet.mjs";
import AttackRollConfigurationDialog from "../../applications/dice/attack-configuration-dialog.mjs";
import BaseAttackActivityData from "../../data/activity/attack-data.mjs";
import TargetsField from "../../data/chat-message/fields/targets-field.mjs";
import D20RollModificationField from "../../data/shared/d20-roll-modification-field.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * @import {
 *   AttackRollDialogConfiguration, AttackRollProcessConfiguration, BasicRollMessageConfiguration, D20RollConfiguration
 * } from "../../dice/_types.mjs";
 * @import { AmmunitionUpdate } from "./_types.mjs";
 */

/**
 * Activity for making attacks and rolling damage.
 */
export default class AttackActivity extends ActivityMixin(BaseAttackActivityData) {
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
      hint: "DND5E.ATTACK.Hint",
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
  _usageChatButtons(message) {
    const buttons = [{
      action: "rollAttack",
      icon: "systems/dnd5e/icons/svg/trait-weapon-proficiencies.svg",
      label: { value: "DND5E.Attack" }
    }];
    if ( this.damage.parts.length || this.item.system.properties?.has("amm") ) buttons.push({
      action: "rollDamage",
      icon: "fa-solid fa-burst",
      label: { value: "DND5E.Damage" }
    });
    return buttons.concat(super._usageChatButtons(message));
  }

  /* -------------------------------------------- */

  /** @override */
  async _triggerSubsequentActions(config, results) {
    this.rollAttack({ event: config.event }, {}, { data: { system: { origin: results.message?.id } } });
  }

  /* -------------------------------------------- */
  /*  Rolling                                     */
  /* -------------------------------------------- */

  /**
   * Perform an attack roll.
   * @param {AttackRollProcessConfiguration} config  Configuration information for the roll.
   * @param {AttackRollDialogConfiguration} dialog   Configuration for the roll dialog.
   * @param {BasicRollMessageConfiguration} message  Configuration for the roll message.
   * @returns {Promise<D20Roll[]|null>}
   */
  async rollAttack(config={}, dialog={}, message={}) {
    const targets = TargetsField.getDescriptors();

    if ( (this.item.type === "weapon") && (this.item.system.quantity === 0) ) {
      ui.notifications.warn("DND5E.ATTACK.Warning.NoQuantity");
    }

    const buildConfig = this._buildAttackConfig.bind(this);

    const rollConfig = foundry.utils.mergeObject({
      ability: this.item.getFlag("dnd5e", `last.${this.id}.ability`),
      ammunition: this.item.getFlag("dnd5e", `last.${this.id}.ammunition`),
      attackMode: this.item.getFlag("dnd5e", `last.${this.id}.attackMode`),
      halflingLucky: this.actor?.getFlag("dnd5e", "halflingLucky"),
      mastery: this.item.getFlag("dnd5e", `last.${this.id}.mastery`),
      target: targets.length === 1 ? targets[0].ac : undefined
    }, config);

    const abilityOptions = this._getAbilityOptions();
    if ( abilityOptions.length && !abilityOptions.find(a => a.value === rollConfig.ability) ) {
      rollConfig.ability = abilityOptions[0]?.value;
    }
    const ammunitionOptions = this.item.system.ammunitionOptions ?? [];
    if ( ammunitionOptions.length ) ammunitionOptions.unshift({ value: "", label: "" });
    if ( rollConfig.ammunition === undefined ) rollConfig.ammunition = ammunitionOptions?.[1]?.value;
    else if ( !ammunitionOptions?.find(m => m.value === rollConfig.ammunition) ) {
      rollConfig.ammunition = ammunitionOptions?.[0]?.value;
    }
    const attackModeOptions = this.item.system.attackModes;
    if ( !attackModeOptions?.find(m => m.value === rollConfig.attackMode) ) {
      rollConfig.attackMode = attackModeOptions?.[0]?.value;
    }
    const masteryOptions = this.item.system.masteryOptions;
    if ( !masteryOptions?.find(m => m.value === rollConfig.mastery) ) {
      rollConfig.mastery = masteryOptions?.[0]?.value;
    }

    const rollData = this.getRollData({ roll: { ability: rollConfig.ability, attackMode: rollConfig.attackMode } });
    const { advantage, disadvantage } = this.actor ? D20RollModificationField.combineFields(this.actor.system, [
      "rolls.attack", `rolls.attack.${this.getActionType(rollConfig.attackMode)}`
    ], { rules: { category: "attack", actor: this.actor, item: this.item, rollData } }) : {};

    rollConfig.hookNames = [...(config.hookNames ?? []), "attack", "d20Test"];
    rollConfig.rolls = [CONFIG.Dice.D20Roll.mergeConfigs({
      options: {
        advantage, disadvantage,
        ammunition: rollConfig.ammunition,
        attackMode: rollConfig.attackMode,
        criticalSuccess: this.criticalThreshold,
        mastery: rollConfig.mastery
      }
    }, config.rolls?.shift())].concat(config.rolls ?? []);
    rollConfig.subject = this;

    const dialogConfig = foundry.utils.mergeObject({
      applicationClass: AttackRollConfigurationDialog,
      options: {
        abilityOptions,
        ammunitionOptions: rollConfig.ammunition !== false ? ammunitionOptions : [],
        attackModeOptions,
        buildConfig,
        masteryOptions: (masteryOptions?.length > 1) && !config.mastery ? masteryOptions : [],
        position: {
          top: config.event ? config.event.clientY - 80 : null,
          left: window.innerWidth - 710
        },
        window: {
          title: _loc("DND5E.AttackRoll"),
          subtitle: this.item.name,
          icon: this.item.img
        }
      }
    }, dialog);

    const messageConfig = foundry.utils.mergeObject({
      create: true,
      data: {
        flavor: `${this.item.name} - ${_loc("DND5E.AttackRoll")}`,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        system: { ...this.messageSources, targets },
        type: "attack"
      }
    }, message);

    const rolls = await CONFIG.Dice.D20Roll.buildConfigure(rollConfig, dialogConfig, messageConfig);
    await CONFIG.Dice.D20Roll.buildEvaluate(rolls, rollConfig, messageConfig);
    if ( !rolls.length ) return null;
    const { ability, ammunition, mastery, attackMode: mode } = rolls[0].options;
    for ( const [key, value] of Object.entries({ ability, ammunition, mastery, mode }) ) {
      if ( value ) foundry.utils.setProperty(messageConfig.data, `system.${key}`, value);
    }
    await CONFIG.Dice.D20Roll.buildPost(rolls, rollConfig, messageConfig);

    const flags = {};
    let ammoUpdate = null;

    const canUpdate = this.item.isOwner && !this.item.inCompendium;
    if ( rolls[0].options.ability ) flags.ability = rolls[0].options.ability;
    if ( rolls[0].options.ammunition ) {
      const ammo = this.actor?.items.get(rolls[0].options.ammunition);
      if ( ammo ) {
        if ( !ammo.system.properties?.has("ret") ) {
          ammoUpdate = { id: ammo.id, quantity: Math.max(0, ammo.system.quantity - 1) };
          ammoUpdate.destroy = ammo.system.uses.autoDestroy && (ammoUpdate.quantity === 0);
        }
        flags.ammunition = rolls[0].options.ammunition;
      }
    } else if ( rolls[0].options.attackMode?.startsWith("thrown") && !this.item.system.properties?.has("ret") ) {
      ammoUpdate = { id: this.item.id, quantity: Math.max(0, this.item.system.quantity - 1) };
    } else if ( !rolls[0].options.ammunition && dialogConfig.options?.ammunitionOptions?.length ) {
      flags.ammunition = "";
    }
    if ( rolls[0].options.attackMode ) flags.attackMode = rolls[0].options.attackMode;
    else if ( rollConfig.attackMode ) rolls[0].options.attackMode = rollConfig.attackMode;
    if ( rolls[0].options.mastery ) flags.mastery = rolls[0].options.mastery;
    if ( canUpdate && !foundry.utils.isEmpty(flags) && (this.actor && this.actor.items.has(this.item.id)) ) {
      await this.item.setFlag("dnd5e", `last.${this.id}`, flags);
    }

    /**
     * A hook event that fires after an attack has been rolled but before any ammunition is consumed.
     * @function dnd5e.rollAttack
     * @memberof hookEvents
     * @param {D20Roll[]} rolls                        The resulting rolls.
     * @param {object} data
     * @param {AttackActivity|null} data.subject       The Activity that performed the attack.
     * @param {AmmunitionUpdate|null} data.ammoUpdate  Any updates related to ammo consumption for this attack.
     */
    Hooks.callAll("dnd5e.rollAttack", rolls, { subject: this, ammoUpdate });
    Hooks.callAll("dnd5e.rollAttackV2", rolls, { subject: this, ammoUpdate });

    // Commit ammunition consumption on attack rolls resource consumption if the attack roll was made
    if ( canUpdate && ammoUpdate?.destroy ) {
      // If ammunition was deleted, store a copy of it in the roll message
      const deleted = [this.actor.items.get(ammoUpdate.id).toObject()];
      const messageId = messageConfig.data?.system?.origin
        ?? rollConfig.event?.target.closest("[data-message-id]")?.dataset.messageId;
      const attackMessage = dnd5e.registry.messages.get(messageId, "attack")?.pop();
      await attackMessage?.update({ "system.deltas": { deleted } });
      await this.actor.deleteEmbeddedDocuments("Item", [ammoUpdate.id]);
    }
    else if ( canUpdate && ammoUpdate ) await this.actor?.updateEmbeddedDocuments("Item", [
      { _id: ammoUpdate.id, "system.quantity": ammoUpdate.quantity }
    ]);

    /**
     * A hook event that fires after an attack has been rolled and ammunition has been consumed.
     * @function dnd5e.postRollAttack
     * @memberof hookEvents
     * @param {D20Roll[]} rolls                   The resulting rolls.
     * @param {object} data
     * @param {AttackActivity|null} data.subject  The activity that performed the attack.
     */
    Hooks.callAll("dnd5e.postRollAttack", rolls, { subject: this });

    return rolls;
  }

  /* -------------------------------------------- */

  /**
   * Configure a roll config for each roll performed as part of the attack process. Will be called once per roll
   * in the process each time an option is changed in the roll configuration interface.
   * @param {AttackRollProcessConfiguration} process       Configuration for the entire rolling process.
   * @param {D20RollConfiguration} config                  Configuration for a specific roll.
   * @param {FormDataExtended} [formData]                  Any data entered into the rolling prompt.
   * @param {number} index                                 Index of the roll within all rolls being prepared.
   */
  _buildAttackConfig(process, config, formData, index) {
    const ability = formData?.get("ability") ?? process.ability;
    const ammunition = formData?.get("ammunition") ?? process.ammunition;
    const attackMode = formData?.get("attackMode") ?? process.attackMode;
    const mastery = formData?.get("mastery") ?? process.mastery;

    let { parts, data } = this.getAttackData({ ability, ammunition, attackMode });
    const { maximum, minimum } = this.actor ? D20RollModificationField.combineFields(this.actor.system, [
      "rolls.attack", `rolls.attack.${this.getActionType(attackMode)}`
    ], { rules: { category: "attack", actor: this.actor, item: this.item, rollData: data } }) : {};
    const options = CONFIG.Dice.D20Roll.mergeOptions({
      elvenAccuracy: this.actor?.getFlag("dnd5e", "elvenAccuracy")
        && CONFIG.DND5E.characterFlags.elvenAccuracy.abilities.includes(ability),
      maximum,
      minimum
    }, config.options);
    if ( ability !== undefined ) options.ability = ability;
    if ( ammunition !== undefined ) options.ammunition = ammunition;
    if ( attackMode !== undefined ) options.attackMode = attackMode;
    if ( mastery !== undefined ) options.mastery = mastery;

    config.parts = [...(config.parts ?? []), ...parts];
    config.data = { ...data, ...(config.data ?? {}) };
    config.options = options;
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
    const { ability, ammunitionItem: ammunition, mode: attackMode } = lastAttack?.system ?? {};
    const isCritical = lastAttack?.rolls[0]?.isCritical;
    const dialogConfig = {};
    if ( isCritical ) dialogConfig.options = { defaultButton: "critical" };

    this.rollDamage({ event, ability, ammunition, attackMode, isCritical }, dialogConfig);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Prepare ability options for this attack.
   * @returns {FormSelectOption[]}
   * @protected
   */
  _getAbilityOptions() {
    const actorAbilities = this.actor?.system.abilities ?? {};
    const options = Array.from(this.attack.abilities)
      .filter(ability => ability in CONFIG.DND5E.abilities)
      .sort((a, b) => (actorAbilities[b]?.mod ?? 0) - (actorAbilities[a]?.mod ?? 0))
      .map(value => ({ value, label: CONFIG.DND5E.abilities[value].label }));
    if ( this.attack.ability === "none" ) options.push({ value: "none", label: _loc("DND5E.None") });
    return options;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getFavoriteData() {
    return foundry.utils.mergeObject(await super.getFavoriteData(), { modifier: this.labels.modifier });
  }
}
