import ActorDataModel from "../../abstract/actor-data-model.mjs";
import TokenPlacement from "../../../canvas/token-placement.mjs";
import CurrencyTemplate from "../../shared/currency.mjs";

const { HTMLField, SchemaField } = foundry.data.fields;

/**
 * A template for all actors that contain collections of other actors.
 * @mixes CurrencyTemplate
 *
 * @property {object} description
 * @property {string} description.full           Description of this group.
 * @property {string} description.summary        Summary description (currently unused).
 */
export default class GroupTemplate extends ActorDataModel.mixin(CurrencyTemplate) {
  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      description: new SchemaField({
        full: new HTMLField({ label: "DND5E.Description" }),
        summary: new HTMLField({ label: "DND5E.DescriptionSummary" })
      })
    });
  }

  /* -------------------------------------------- */

  /**
   * Whether this Actor type represents a collection of multiple creatures.
   * @returns {boolean}
   */
  get isGroup() {
    return true;
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Resolve the actors in this group and return them alongside any associated data.
   * @returns {Promise<{ actor: Actor5e, [p: string]: any }[]>}
   * @abstract
   */
  async getMembers() {}

  /* -------------------------------------------- */

  /**
   * Resolve actors in this group so that they may be placed on the canvas.
   * @returns {Promise<{ actor: Actor5e, [p: string]: any }[]>}
   * @abstract
   */
  async getPlaceableMembers() {}

  /* -------------------------------------------- */

  /**
   * Place all members in the group on the current scene.
   */
  async placeMembers() {
    if ( !game.user.isGM || !canvas.scene ) return;
    const minimized = !this.parent.sheet._minimized;
    await this.parent.sheet.minimize();
    const tokensData = [];
    const members = await this.getPlaceableMembers();

    try {
      const placements = await TokenPlacement.place({
        tokens: members.flatMap(({ actor, quantity }) =>
          Array(Number.isFinite(quantity?.value) ? quantity.value : 1).fill(actor.prototypeToken)
        )
      });
      for ( const placement of placements ) {
        const actor = placement.prototypeToken.actor;
        const appendNumber = !placement.prototypeToken.actorLink && placement.prototypeToken.appendNumber;
        delete placement.prototypeToken;
        const tokenDocument = await actor.getTokenDocument(placement);
        if ( appendNumber ) TokenPlacement.adjustAppendedNumber(tokenDocument, placement);
        tokensData.push(tokenDocument.toObject());
      }
    } finally {
      if ( minimized ) this.parent.sheet.maximize();
    }

    await canvas.scene.createEmbeddedDocuments("Token", tokensData);
  }
}
