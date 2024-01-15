import { getHumanReadableAttributeLabel, staticID } from "../utils.mjs";

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
      const effect = cls.fromStatusEffect(effectData);
      if ( overlay ) effect.updateSource({ "flags.core.overlay": true });
      await cls.create(effect, { parent: this.actor, keepId: true });
    }

    return state;
  }

  /* -------------------------------------------- */

  /**
   * Handle rendering human-readable labels and adding item uses.
   * @param {TokenConfig} app  The TokenConfig application instance.
   * @param {jQuery} html      The rendered markup.
   */
  static onRenderTokenConfig(app, [html]) {
    const actor = app.object?.actor;
    const makeOptgroup = (label, parent) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = game.i18n.localize(label);
      parent.appendChild(optgroup);
      return optgroup;
    };

    const items = actor?.items.reduce((obj, i) => {
      const { per, max } = i.system.uses ?? {};
      if ( per && max ) obj[i.getRelativeUUID(actor)] = i.name;
      return obj;
    }, {}) ?? {};

    // Add human-readable labels, categorize, and sort entries, and add item uses.
    for ( const select of html.querySelectorAll('[name="bar1.attribute"], [name="bar2.attribute"]') ) {
      const groups = {
        abilities: makeOptgroup("DND5E.AbilityScorePl", select),
        movement: makeOptgroup("DND5E.MovementSpeeds", select),
        senses: makeOptgroup("DND5E.Senses", select),
        skills: makeOptgroup("DND5E.SkillPassives", select),
        slots: makeOptgroup("JOURNALENTRYPAGE.DND5E.Class.SpellSlots", select)
      };

      select.querySelectorAll("option").forEach(option => {
        const label = getHumanReadableAttributeLabel(option.value, { actor });
        if ( label ) option.innerText = label;
        if ( option.value.startsWith("abilities.") ) groups.abilities.appendChild(option);
        else if ( option.value.startsWith("attributes.movement.") ) groups.movement.appendChild(option);
        else if ( option.value.startsWith("attributes.senses.") ) groups.senses.appendChild(option);
        else if ( option.value.startsWith("skills.") ) groups.skills.appendChild(option);
        else if ( option.value.startsWith("spells.") ) groups.slots.appendChild(option);
      });

      select.querySelectorAll("optgroup").forEach(group => {
        const options = Array.from(group.querySelectorAll("option"));
        options.sort((a, b) => a.innerText.localeCompare(b.innerText, game.i18n.lang));
        group.append(...options);
      });

      if ( !foundry.utils.isEmpty(items) ) {
        const group = makeOptgroup("DND5E.ConsumeCharges", select);
        for ( const [k, v] of Object.entries(items).sort(([, a], [, b]) => a.localeCompare(b, game.i18n.lang)) ) {
          const option = document.createElement("option");
          if ( k === foundry.utils.getProperty(app.object, select.name) ) option.selected = true;
          option.value = k;
          option.innerText = v;
          group.appendChild(option);
        }
      }
    }
  }
}
