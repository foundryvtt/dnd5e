import { AdvancementSelection } from "./advancement/advancementSelection.js";
import { BaseAdvancement } from "./advancement/baseAdvancement.js";
import { BaseConfig } from "./advancement/baseConfig.js";
import { HitPointsAdvancement } from "./advancement/hitPoints.js";
import { ItemGrantAdvancement } from "./advancement/itemGrant.js";

const advancement = {
  AdvancementSelection,
  BaseAdvancement,
  BaseConfig,
  types: {
    HitPointsAdvancement,
    ItemGrantAdvancement
  }
};

export default advancement;
