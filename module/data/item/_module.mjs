import FeatData from "./feat.mjs";
import LootData from "./loot.mjs";

export {
  FeatData,
  LootData
};
export {default as ActionTemplate} from "./templates/action.mjs";
export {default as ActivatedEffectTemplate} from "./templates/activated-effect.mjs";
export {default as ItemDescriptionTemplate} from "./templates/item-description.mjs";
export {default as PhysicalItemTemplate} from "./templates/physical-item.mjs";

export const config = {
  feat: FeatData,
  loot: LootData
};
