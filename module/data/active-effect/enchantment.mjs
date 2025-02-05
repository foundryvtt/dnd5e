import { DamageData } from "../shared/damage-field.mjs";

/**
 * System data model for enchantment active effects.
 */
export default class EnchantmentData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {};
  }

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
          changes[`system.activities.${activity.id}.attack.ability`] = ActiveEffect.applyField(
            activity, { ...change, key: "attack.ability" }
          );
        }
        return false;
      case "system.attack.bonus":
      case "system.attack.flat":
        for ( const activity of item.system.activities?.getByTypes("attack") ?? [] ) {
          changes[`system.activities.${activity.id}.${key}`] = ActiveEffect.applyField(activity, { ...change, key });
        }
        return false;
      case "system.damage.bonus":
        change.key = "system.damageBonus";
        break;
      case "system.damage.parts":
        try {
          let damage;
          const parsed = JSON.parse(change.value);
          if ( foundry.utils.getType(parsed) === "Object" ) damage = new DamageData(parsed);
          else damage = new DamageData({ custom: { enabled: true, formula: parsed[0][0] }, types: [parsed[0][1]] });
          for ( const activity of item.system.activities?.getByTypes("attack", "damage", "save") ?? [] ) {
            const value = damage.clone();
            value.enchantment = true;
            value.locked = true;
            changes[`system.activities.${activity.id}.damage.parts`] = ActiveEffect.applyField(
              activity, { ...change, key, value }
            );
          }
          for ( const activity of item.system.activities?.getByTypes("heal") ?? [] ) {
            const value = damage.formula;
            const keyPath = `healing.${activity.healing.custom.enabled ? "custom.formula" : "bonus"}`;
            changes[`system.activities.${activity.id}.${keyPath}`] = ActiveEffect.applyField(
              activity, { ...change, key: keyPath, value }
            );
          }
          return false;
        } catch(err) {}
      case "system.damage.types":
        const adjust = (damage, keyPath) =>
          ActiveEffect.applyField(damage, { ...change, key: "types", value: change.value });
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
          changes[`system.activities.${activity.id}.${key}`] = ActiveEffect.applyField(
            activity, { ...change, key, value }
          );
        }
        return false;
    }
  }
}
