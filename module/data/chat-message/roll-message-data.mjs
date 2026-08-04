import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";
import SourceReferenceField from "./fields/source-reference-field.mjs";
import TargetsField from "./fields/targets-field.mjs";

const { DocumentUUIDField, ForeignDocumentField, StringField } = foundry.data.fields;

/**
 * @import { RollMessageSystemData } from "./_types.mjs";
 */

/**
 * Base data model for chat messages that display the results of rolls.
 * @extends {ChatMessageDataModel<RollMessageSystemData>}
 * @mixes RollMessageSystemData
 * @abstract
 */
export default class RollMessageData extends ChatMessageDataModel {

  /**
   * Template used to render each individual roll within the message.
   * @type {string}
   */
  static ROLL_TEMPLATE = "systems/dnd5e/templates/chat/parts/roll.hbs";

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      activity: new SourceReferenceField({
        uuid: new StringField({ blank: false, nullable: true, required: true })
      }, { initial: null, nullable: true }),
      item: new SourceReferenceField({
        compendiumSource: new DocumentUUIDField()
      }, { initial: null, nullable: true }),
      origin: new ForeignDocumentField(foundry.documents.BaseChatMessage),
      targets: new TargetsField()
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Can the rolls in this message score a critical success or a critical failure?
   * @type {boolean}
   */
  get canCrit() {
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Should the success or failure of these rolls be revealed to the current user?
   * @type {boolean}
   */
  get displayResult() {
    return this.parent.getOriginatingMessage().shouldDisplayChallenge;
  }

  /* -------------------------------------------- */

  /**
   * Are these rolls treated as successful regardless of the result rolled?
   * @type {boolean}
   */
  get forceSuccess() {
    return false;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const { canCrit, displayResult, forceSuccess } = this;
    const isPrivate = !this.parent.isContentVisible;
    return {
      rolls: await Promise.all(this.parent.rolls.map(roll => roll.render({
        canCrit, displayResult, forceSuccess, isPrivate,
        message: this.parent,
        template: this.constructor.ROLL_TEMPLATE
      })))
    };
  }
}
