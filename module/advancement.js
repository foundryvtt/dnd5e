import { Advancement } from "./advancement/advancement.js";
import { AdvancementConfig } from "./advancement/advancementConfig.js";
import { AdvancementSelection } from "./advancement/advancementSelection.js";
import { HitPointsAdvancement } from "./advancement/hitPoints.js";
import { ItemGrantAdvancement } from "./advancement/itemGrant.js";

const advancement = {
  Advancement,
  AdvancementConfig,
  AdvancementSelection,
  types: {
    HitPointsAdvancement,
    ItemGrantAdvancement
  }
};

export default advancement;
