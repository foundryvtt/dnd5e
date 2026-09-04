import BaseEffectData from "./base.mjs";
import ConditionData from "./condition.mjs";
import EnchantmentData from "./enchantment.mjs";

export {
  BaseEffectData,
  ConditionData,
  EnchantmentData
};
export {default as RiderProviderMixin} from "./mixins/rider-provider.mjs";

export const config = {
  base: BaseEffectData,
  condition: ConditionData,
  enchantment: EnchantmentData
};
