import { Advancement } from "./advancement/advancement.js";
import { AdvancementConfig } from "./advancement/advancementConfig.js";
import { AdvancementFlow } from "./advancement/advancementFlow.js";
import { AdvancementManager } from "./advancement/advancementManager.js";
import { AdvancementSelection } from "./advancement/advancementSelection.js";
import * as steps from "./advancement/advancementStep.js";
import { HitPointsAdvancement } from "./advancement/hitPoints.js";
import { ItemGrantAdvancement } from "./advancement/itemGrant.js";

const advancement = {
  Advancement,
  AdvancementConfig,
  AdvancementFlow,
  AdvancementManager,
  AdvancementSelection,
  steps,
  types: {
    HitPointsAdvancement,
    ItemGrantAdvancement
  }
};

export default advancement;
