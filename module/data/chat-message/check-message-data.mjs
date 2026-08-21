import RollMessageData from "./roll-message-data.mjs";

const { StringField } = foundry.data.fields;

/**
 * @import { CheckMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in an ability check chat message.
 * @extends {RollMessageData<CheckMessageSystemData>}
 * @mixes CheckMessageSystemData
 */
export default class CheckMessageData extends RollMessageData {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ability: new StringField({ blank: false, required: true }),
      skill: new StringField({ blank: false, initial: null, nullable: true }),
      tool: new StringField({ blank: false, initial: null, nullable: true })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    summaryTemplate: "systems/dnd5e/templates/chat/check-summary.hbs",
    template: "systems/dnd5e/templates/chat/check-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.parent.getAssociatedActor();
    const token = this.parent.getAssociatedToken();
    const item = this.parent.getAssociatedItem();
    const isPrivate = !this.parent.isContentVisible;
    context.token = token ?? actor;
    if ( !isPrivate && item ) context.header = {
      item,
      activity: this.activity,
      subtitle: [this.activity.name, this.parent.flavor].filterJoin(" • ")
    };
    return context;
  }
}
