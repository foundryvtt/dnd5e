import RollMessageData from "./roll-message-data.mjs";
import { ActorDeltasField } from "./fields/deltas-field.mjs";

const { DocumentIdField, StringField } = foundry.data.fields;

/**
 * @import { AttackMessageSystemData } from "./_types.mjs";
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
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const isPrivate = !this.parent.isContentVisible;
    const item = this.parent.getAssociatedItem();
    if ( !isPrivate && item ) context.header = {
      item,
      subtitle: this.parent.getAssociatedActivity()?.getActionLabel(this.mode) ?? ""
    };
    const mastery = CONFIG.DND5E.weaponMasteries[this.mastery];
    if ( mastery ) context.mastery = { label: mastery.label, reference: mastery.reference };
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
    const roll = this.parent.rolls[0];
    if ( !this.parent.isContentVisible || !(roll instanceof CONFIG.Dice.D20Roll) ) return [];

    const visibility = dnd5e.settings.attackRollVisibility;
    if ( !game.user.isGM && (visibility === "none") ) return [];
    const showAC = game.user.isGM || (visibility === "all");

    return this.targets
      .map(({ ac, actor, name, token }) => ({
        ac, actor, name, showAC, token,
        hasAC: ac !== null,
        isMiss: (ac === null) || (!roll.isCritical && ((roll.total < ac) || roll.isFumble))
      }))
      .sort((lhs, rhs) => (lhs.isMiss === rhs.isMiss) ? 0 : (lhs.isMiss ? 1 : -1));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(element) {
    super._onRender(element);

    // The item header carries the name and the roll flavor, so the message header's copy is redundant.
    if ( element.querySelector(".chat-card .card-header") ) {
      element.querySelector(".message-header .flavor-text")?.remove();
    }

    for ( const target of element.querySelectorAll("li.target") ) {
      target.addEventListener("click", this.parent._onTargetMouseDown.bind(this.parent));
      target.addEventListener("pointerover", this.parent._onTargetHoverIn.bind(this.parent));
      target.addEventListener("pointerout", this.parent._onTargetHoverOut.bind(this.parent));
    }
  }
}
