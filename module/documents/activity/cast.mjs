import CastSheet from "../../applications/activity/cast-sheet.mjs";
import CastActivityData from "../../data/activity/cast-data.mjs";
import { staticID } from "../../utils.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for casting a spell from another item.
 */
export default class CastActivity extends ActivityMixin(CastActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /**
   * Static ID used for the enchantment that modifies spell data.
   */
  static ENCHANTMENT_ID = staticID("dnd5espellchanges");

  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.CAST"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "cast",
      img: "systems/dnd5e/icons/svg/activity/cast.svg",
      title: "DND5E.CAST.Title",
      sheetClass: CastSheet
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Cached copy of the associated spell stored on the actor.
   * @type {Item5e|void}
   */
  get cachedSpell() {
    return this.actor?.sourcedItems.get(this.spell.uuid, { legacy: false })
      ?.find(i => i.getFlag("dnd5e", "cachedFor") === this.relativeUUID);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Prepare the data for the cached spell to store on the actor.
   * @returns {Promise<object|void>}
   */
  async getCachedSpellData() {
    const originalSpell = await fromUuid(this.spell.uuid);
    if ( !originalSpell ) return;
    return originalSpell.clone({
      effects: [
        ...originalSpell.effects.map(e => e.toObject()),
        {
          _id: this.constructor.ENCHANTMENT_ID,
          type: "enchantment",
          name: game.i18n.localize("DND5E.CAST.Enchantment.Name"),
          img: "systems/dnd5e/icons/svg/activity/cast.svg",
          origin: this.uuid,
          changes: this.getSpellChanges()
        }
      ],
      flags: {
        dnd5e: {
          cachedFor: this.relativeUUID
        }
      },
      _stats: { compendiumSource: this.spell.uuid }
    }).toObject();
  }

  /* -------------------------------------------- */

  /**
   * Create spell changes based on the activity's configuration.
   * @returns {object}
   */
  getSpellChanges() {
    const changes = [];
    for ( const type of ["activation", "duration", "range", "target"] ) {
      if ( !this[type].override ) continue;
      const data = this.toObject()[type];
      delete data.override;
      changes.push({ key: `system.${type}`, mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: JSON.stringify(data) });
    }
    return changes;
  }
}
