import BaseEffectData from "./base.mjs";
import ConditionData from "./condition.mjs";
import EnchantmentData from "./enchantment.mjs";

export {
  BaseEffectData,
  ConditionData,
  EnchantmentData
};

export const config = {
  base: BaseEffectData,
  condition: ConditionData,
  enchantment: EnchantmentData
};

export const phases = {
  postAbilities: {
    label: "DND5E.EFFECT.PHASES.postAbilities.label",
    hint: "DND5E.EFFECT.PHASES.postAbilities.hint"
  }
};
