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
    return this.actor?.sourcedItems.get(this.spell.uuid)
      ?.find(i => i.getFlag("dnd5e", "cachedFor") === this.relativeUUID);
  }

  /* -------------------------------------------- */

  /**
   * Should this spell be listed in the actor's spellbook?
   * @type {boolean}
   */
  get displayInSpellbook() {
    return this.canUse && (this.item.system.magicAvailable !== false) && this.spell.spellbook;
  }

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /** @override */
  async use(usage={}, dialog={}, message={}) {
    if ( !this.item.isEmbedded || this.item.pack ) return;
    if ( !this.item.isOwner ) {
      ui.notifications.error("DND5E.DocumentUseWarn", { localize: true });
      return;
    }

    /**
     * A hook event that fires before a linked spell is used by a Cast activity.
     * @function dnd5e.preUseLinkedSpell
     * @memberof hookEvents
     * @param {CastActivity} activity                                Cast activity being used.
     * @param {Partial<ActivityUseConfiguration>} usageConfig        Configuration info for the activation.
     * @param {Partial<ActivityDialogConfiguration>} dialogConfig    Configuration info for the usage dialog.
     * @param {Partial<ActivityMessageConfiguration>} messageConfig  Configuration info for the created chat message.
     * @returns {boolean}  Explicitly return `false` to prevent activity from being used.
     */
    if ( Hooks.call("dnd5e.preUseLinkedSpell", this, usage, dialog, message) === false ) return;

    let spell = this.cachedSpell;
    if ( !spell ) {
      [spell] = await this.actor.createEmbeddedDocuments("Item", [await this.getCachedSpellData()]);
    }

    const results = await spell.use({ ...usage, legacy: false }, dialog, message);

    /**
     * A hook event that fires after a linked spell is used by a Cast activity.
     * @function dnd5e.postUseLinkedSpell
     * @memberof hookEvents
     * @param {CastActivity} activity                          Activity being activated.
     * @param {Partial<ActivityUseConfiguration>} usageConfig  Configuration data for the activation.
     * @param {ActivityUsageResults} results                   Final details on the activation.
     */
    if ( results ) Hooks.callAll("dnd5e.postUseLinkedSpell", this, usage, results);

    return results;
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
   * @returns {object[]}
   */
  getSpellChanges() {
    const changes = [];
    const source = this.toObject();

    // Override spell details
    for ( const type of ["activation", "duration", "range", "target"] ) {
      if ( !this[type].override ) continue;
      const data = source[type];
      delete data.override;
      changes.push({ key: `system.${type}`, mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: JSON.stringify(data) });
    }

    // Set the casting ability
    if ( this.spell.ability ) changes.push({
      key: "system.ability", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: this.spell.ability
    });

    // Remove ignored properties
    for ( const property of this.spell.properties ) {
      changes.push({ key: "system.properties", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: `-${property}` });
    }

    // Set challenge overrides
    const challenge = this.spell.challenge;
    if ( challenge.override && challenge.attack ) changes.push(
      { key: "activities[attack].attack.bonus", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: challenge.attack },
      { key: "activities[attack].attack.flat", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: true },
      { key: "activities[summon].flat.attack", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: challenge.attack }
    );
    if ( challenge.override && challenge.save ) changes.push(
      { key: "activities[save].save.dc.calculation", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: "" },
      { key: "activities[save].save.dc.formula", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: challenge.save },
      { key: "activities[summon].flat.save", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: challenge.save }
    );

    return changes;
  }
}
