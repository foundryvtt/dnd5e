import { staticID } from "../utils.mjs";

/**
 * Extend the base TokenDocument class to implement system-specific HP bar logic.
 */
export default class TokenDocument5e extends TokenDocument {

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeSource(data, options={}) {
    // Migrate backpack -> container.
    for ( const item of data.delta?.items ?? [] ) {
      // This will be correctly flagged as needing a source migration when the synthetic actor is created, but we need
      // to also change the type in the raw ActorDelta to avoid spurious console warnings.
      if ( item.type === "backpack" ) item.type = "container";
    }
    return super._initializeSource(data, options);
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @inheritdoc */
  getBarAttribute(barName, options={}) {
    const attribute = options.alternative || this[barName]?.attribute;
    if ( attribute?.startsWith(".") ) {
      const item = fromUuidSync(attribute, { relative: this.actor });
      const { value, max } = item?.system.uses ?? { value: 0, max: 0 };
      if ( max ) return { attribute, value, max, type: "bar", editable: true };
    }

    const data = super.getBarAttribute(barName, options);
    if ( data?.attribute === "attributes.hp" ) {
      const hp = this.actor.system.attributes.hp || {};
      data.value += (hp.temp || 0);
      data.max = Math.max(0, data.max + (hp.tempmax || 0));
    }
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Returns the subject texture src according to the current texture.src
   * @returns {string} The subject src according to texture.src
   * @protected
   */
  getSubjectName() {
    const parts = (this.texture.src ?? "").split(".");
    const extension = parts.pop();
    return `${parts.join(".")}-subject.${extension}`;
  }

  /* -------------------------------------------- */

  /**
   * Get an Array of attribute choices which are suitable for being consumed by an item usage.
   * @param {object} data  The actor data.
   * @returns {string[]}
   */
  static getConsumedAttributes(data) {
    return CONFIG.DND5E.consumableResources;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async toggleActiveEffect(effectData, {overlay=false, active}={}) {
    if ( !this.actor || !effectData.id ) return false;
    const id = staticID(`dnd5e${effectData.id}`);

    // Remove existing effects that contain this effect data's primary ID as their primary ID.
    const existing = this.actor.effects.get(id);
    const state = active ?? !existing;
    if ( !state && existing ) await this.actor.deleteEmbeddedDocuments("ActiveEffect", [id]);

    // Add a new effect
    else if ( state ) {
      const cls = getDocumentClass("ActiveEffect");
      const effect = await cls.fromStatusEffect(effectData);
      if ( overlay ) effect.updateSource({ "flags.core.overlay": true });
      await cls.create(effect, { parent: this.actor, keepId: true });
    }

    return state;
  }
}
