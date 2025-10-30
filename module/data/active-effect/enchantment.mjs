import ActiveEffectDataModel from "../abstract/active-effect-data-model.mjs";
import { DamageData } from "../shared/damage-field.mjs";

const { BooleanField } = foundry.data.fields;

/**
 * @import { EnchantmentActiveEffectSystemData } from "./types.mjs";
 */

/**
 * System data model for enchantment active effects.
 * @extends {ActiveEffectDataModel<EnchantmentActiveEffectSystemData>}
 * @mixes EnchantmentActiveEffectSystemData
 */
export default class EnchantmentData extends ActiveEffectDataModel {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ENCHANTMENT"];

  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...(foundry.data.ActiveEffectTypeDataModel ? super.defineSchema() : {}),
      magical: new BooleanField({ initial: true })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get applicableType() {
    return this.isApplied ? "Item" : "";
  }

  /* -------------------------------------------- */

  /**
   * Has this enchantment been applied by another item, or was it directly created.
   * @type {boolean}
   */
  get isApplied() {
    return !!this.parent.origin && (this.parent.origin !== this.item?.uuid);
  }

  /* -------------------------------------------- */

  /**
   * Item containing this enchantment.
   * @type {Item5e|void}
   */
  get item() {
    return this.parent.parent;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    if ( this.isApplied && this.parent.uuid ) dnd5e.registry.enchantments.track(this.parent.origin, this.parent.uuid);
  }

  /* -------------------------------------------- */
  /*  Effect Application                          */
  /* -------------------------------------------- */

  /**
   * Handle enchantment-specific changes to the item.
   * @param {Item5e} item                The Item to whom this effect should be applied.
   * @param {EffectChangeData} change    The change data being applied.
   * @param {Record<string, *>} changes  The aggregate update paths and their updated values.
   * @returns {boolean|void}             Return false to prevent normal application from occurring.
   */
  _applyLegacy(item, change, changes) {
    let key = change.key.replace("system.", "");
    switch ( change.key ) {
      case "system.ability":
        for ( const activity of item.system.activities?.getByTypes("attack") ?? [] ) {
          changes[`system.activities.${activity.id}.attack.ability`] = ActiveEffect.implementation.applyField(
            activity, { ...change, key: "attack.ability" }
          );
        }
        return false;
      case "system.attack.bonus":
      case "system.attack.flat":
        for ( const activity of item.system.activities?.getByTypes("attack") ?? [] ) {
          changes[`system.activities.${activity.id}.${key}`] = ActiveEffect.implementation.applyField(
            activity, { ...change, key }
          );
        }
        return false;
      case "system.damage.bonus":
        change.key = "system.damageBonus";
        break;
      case "system.damage.parts":
        try {
          let damage;
          const parsed = typeof change.value === "string" ? JSON.parse(change.value) : change.value;
          if ( foundry.utils.getType(parsed) === "Object" ) damage = new DamageData(parsed);
          else damage = new DamageData({ custom: { enabled: true, formula: parsed[0][0] }, types: [parsed[0][1]] });
          for ( const activity of item.system.activities?.getByTypes("attack", "damage", "save") ?? [] ) {
            const value = damage.clone();
            value.enchantment = true;
            value.locked = true;
            changes[`system.activities.${activity.id}.damage.parts`] = ActiveEffect.implementation.applyField(
              activity, { ...change, key, value }
            );
          }
          for ( const activity of item.system.activities?.getByTypes("heal") ?? [] ) {
            const value = damage.formula;
            const keyPath = `healing.${activity.healing.custom.enabled ? "custom.formula" : "bonus"}`;
            changes[`system.activities.${activity.id}.${keyPath}`] = ActiveEffect.implementation.applyField(
              activity, { ...change, key: keyPath, value }
            );
          }
        } catch(err) {}
        return false;
      case "system.damage.types":
        const adjust = (damage, keyPath) =>
          ActiveEffect.implementation.applyField(damage, { ...change, key: "types", value: change.value });
        if ( item.system.damage?.base ) {
          changes["system.damage.base.types"] = adjust(item.system.damage.base, "system.damage.base");
        }
        for ( const activity of item.system.activities?.getByTypes("attack", "damage", "save") ?? [] ) {
          for ( const part of activity.damage.parts ) adjust(part);
          changes[`system.activities.${activity.id}.damage.parts`] = activity.damage.parts;
        }
        return false;
      case "system.save.dc":
      case "system.save.scaling":
        let value = change.value;
        if ( key === "save.dc" ) key = "save.dc.formula";
        else {
          key = "save.dc.calculation";
          if ( value === "flat" ) value = "";
          else if ( (value === "") && (item.type === "spell") ) value = "spellcasting";
        }
        for ( const activity of item.system.activities?.getByTypes("save") ?? [] ) {
          changes[`system.activities.${activity.id}.${key}`] = ActiveEffect.implementation.applyField(
            activity, { ...change, key, value }
          );
        }
        return false;

      /** @deprecated since 5.1 */
      case "system.preparation.mode":
        foundry.utils.logCompatibilityWarning("system.preparation.mode is deprecated. Please instead use "
          + "system.method to set the spellcasting method, or system.prepared to set the preparation state.",
        { since: "DnD5e 5.1", until: "DnD5e 5.4", once: true });
        change.key = "system.method";
        if ( change.value === "always" ) {
          change.key = "system.prepared";
          change.value = "2";
        }
        break;

      /** @deprecated since 5.1 */
      case "system.preparation.prepared":
        foundry.utils.logCompatibilityWarning("system.preparation.prepared is deprecated. "
          + "Please use system.prepared instead.", { since: "DnD5e 5.1", until: "DnD5e 5.4", once: true });
        change.key = "system.prepared";
        break;
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /** @override */
  onRenderActiveEffectConfig(app, html, context) {
    const toRemove = html.querySelectorAll('.form-group:has([name="transfer"], [name="statuses"])');
    toRemove.forEach(f => f.remove());
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;

    // Enchantments cannot be added directly to actors
    if ( this.parent.parent instanceof Actor ) {
      ui.notifications.error("DND5E.ENCHANTMENT.Warning.NotOnActor", { localize: true });
      return false;
    }

    if ( this.isApplied ) {
      const origin = await fromUuid(this.parent.origin);
      const errors = origin?.canEnchant?.(this.item);
      if ( errors?.length ) {
        errors.forEach(err => console.error(err));
        return false;
      }
      this.parent.updateSource({ disabled: false });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if ( options.chatMessageOrigin ) {
      document.body.querySelectorAll(`[data-message-id="${options.chatMessageOrigin}"] enchantment-application`)
        .forEach(element => element.buildItemList());
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if ( this.isApplied ) dnd5e.registry.enchantments.untrack(this.origin, this.uuid);
    document.body.querySelectorAll(`enchantment-application:has([data-enchantment-uuid="${this.parent.uuid}"]`)
      .forEach(element => element.buildItemList());
  }
}
