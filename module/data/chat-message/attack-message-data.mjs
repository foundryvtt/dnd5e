import RollMessageData from "./roll-message-data.mjs";
import { ActorDeltasField } from "./fields/deltas-field.mjs";

const { DocumentIdField, StringField } = foundry.data.fields;

/**
 * @import { AttackMessageSystemData } from "./_types.mjs";
 * @import { TargetDescriptor5e } from "../../_types.mjs";
 */

/**
 * Data stored in an attack roll chat message.
 * @extends {RollMessageData<AttackMessageSystemData>}
 * @mixes AttackMessageSystemData
 */
export default class AttackMessageData extends RollMessageData {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ability: new StringField({ blank: false, initial: null, nullable: true }),
      ammunition: new DocumentIdField({ initial: null, nullable: true }),
      deltas: new ActorDeltasField({}, { initial: null, nullable: true }),
      mastery: new StringField({ blank: false, initial: null, nullable: true }),
      mode: new StringField({ blank: false, initial: null, nullable: true })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/attack-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */

  static ROLL_TEMPLATE = "systems/dnd5e/templates/chat/parts/roll-compact.hbs";

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The ammunition used for this attack, resolved from the stored snapshot if this attack destroyed it.
   * @type {Item5e|null}
   */
  get ammunitionItem() {
    const actor = this.parent.getAssociatedActor();
    if ( !actor || !this.ammunition ) return null;
    const ammunition = actor.items.get(this.ammunition);
    if ( ammunition ) return ammunition;
    const data = this.deltas?.deleted?.find(i => i._id === this.ammunition);
    if ( !data ) return null;
    let item;
    try {
      actor._embeddedPreparation = true;
      item = new Item.implementation(data, { parent: actor });
    } catch ( err ) {
      Hooks.onError("AttackMessageData#ammunitionItem", err, { log: "error" });
      return null;
    } finally {
      delete actor._embeddedPreparation;
    }
    item.prepareFinalAttributes();
    return item;
  }

  /* -------------------------------------------- */

  /** @override */
  get canCrit() {
    return true;
  }

  /* -------------------------------------------- */

  /** @override */
  get displayResult() {
    return game.user.isGM || (dnd5e.settings.attackRollVisibility !== "none");
  }

  /* -------------------------------------------- */

  /**
   * Evaluated hits & misses against the targeted tokens.
   * @type {(TargetDescriptor5e & { isMiss: boolean })[]}
   */
  get evaluatedTargets() {
    const roll = this.parent.rolls[0];
    if ( !(roll instanceof CONFIG.Dice.D20Roll) ) return [];
    return this.targets.map(target => ({
      ...target,
      isMiss: (target.ac === null) || (!roll.isCritical && ((roll.total < target.ac) || roll.isFumble))
    }));
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  _getEnrichmentOptions() {
    return { avatar: false };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const isPrivate = !this.parent.isContentVisible;
    const item = this.parent.getAssociatedItem();
    if ( !isPrivate && item ) context.header = { item, activity: this.activity };
    const mastery = CONFIG.DND5E.weaponMasteries[this.mastery];
    if ( mastery ) context.mastery = { label: mastery.label, reference: mastery.reference };
    context.rows = {
      properties: {
        entries: this.parent.getAssociatedActivity()?.getActionLabel(this.mode) ?? [],
        icon: "fa-solid fa-tag",
        label: "DND5E.CHATMESSAGE.Row.Properties"
      }
    };
    context.targets = this._prepareTargetsContext();
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the evaluation of this attack against each of the targets it was rolled against.
   * @returns {object[]}
   * @protected
   */
  _prepareTargetsContext() {
    if ( !this.parent.isContentVisible ) return [];
    const visibility = dnd5e.settings.attackRollVisibility;
    const showAC = game.user.isGM || (visibility === "all");
    const showResult = game.user.isGM || (visibility !== "none");
    return this.evaluatedTargets
      .map(target => ({ ...target, showAC, showResult, hasAC: target.ac !== null }))
      .sort((lhs, rhs) => (lhs.isMiss === rhs.isMiss) ? 0 : (lhs.isMiss ? 1 : -1));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(element) {
    super._onRender(element);
    element.classList.add("compact");
    if ( element.querySelector(".chat-card .card-header") ) {
      element.querySelector(".message-header .flavor-text")?.remove();
    }
  }
}
