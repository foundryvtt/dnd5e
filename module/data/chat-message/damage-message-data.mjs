import aggregateDamageRolls from "../../dice/aggregate-damage-rolls.mjs";
import RollMessageData from "./roll-message-data.mjs";

const { StringField } = foundry.data.fields;

/**
 * @import { DamageMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a damage chat message.
 * @extends {RollMessageData<DamageMessageSystemData>}
 * @mixes DamageMessageSystemData
 */
export default class DamageMessageData extends RollMessageData {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      onSave: new StringField({ blank: false, initial: null, nullable: true, required: false })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/damage-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get canApplyDamage() {
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Whether the results of this message should be applied as healing rather than damage.
   * @type {boolean}
   */
  get isHealing() {
    return false;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const aggregate = CONFIG.DND5E.aggregateDamageDisplay;
    const rolls = aggregate ? aggregateDamageRolls(this.parent.rolls) : this.parent.rolls;
    const isPrivate = !this.parent.isContentVisible;
    const context = {
      isPrivate,
      formula: rolls.map(r => aggregate ? r.formula : ` + ${r.formula}`).join("").replace(/^ \+ /, ""),
      parts: rolls.map(roll => {
        const part = roll.aggregateTerms();
        part.config = CONFIG.DND5E.damageTypes[part.type] ?? CONFIG.DND5E.healingTypes[part.type] ?? null;
        part.label = part.config?.labelShort ?? part.config?.label ?? "";
        return part;
      }),
      showTray: game.user.isGM && !isPrivate,
      total: rolls.reduce((total, roll) => total + Math.max(0, roll.total), 0)
    };

    const item = this.parent.getAssociatedItem();
    if ( !isPrivate && item ) {
      const isCritical = this.parent.rolls[0]?.isCritical === true;
      context.header = {
        isCritical, item,
        subtitle: isCritical
          ? _loc("DND5E.CriticalHit")
          : this.parent.getAssociatedActivity()?.damageFlavor ?? _loc("DND5E.DamageRoll")
      };
    }

    if ( !isPrivate && this.onSave ) {
      context.onSave = _loc(`DND5E.SAVE.FIELDS.damage.onSave.${this.onSave.capitalize()}`);
    }

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(element) {
    super._onRender(element);

    // The item header carries the name and the roll flavor, so the message header's copy is redundant.
    if ( element.querySelector(".chat-card .card-header") ) {
      element.querySelector(".message-header .flavor-text")?.remove();
    }
  }
}
