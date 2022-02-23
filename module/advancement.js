import { StupidClassForDoingAdvancement } from "./advancement/stupidClassForDoingAdvancement.js";
import { Advancement } from "./advancement/advancement.js";
import { AdvancementConfig } from "./advancement/advancementConfig.js";
import { AdvancementFlow } from "./advancement/advancementFlow.js";
import { AdvancementSelection } from "./advancement/advancementSelection.js";
import { HitPointsAdvancement } from "./advancement/hitPoints.js";
import { ItemGrantAdvancement } from "./advancement/itemGrant.js";

const advancement = {
  Advancement,
  AdvancementConfig,
  AdvancementFlow,
  AdvancementSelection,
  StupidClassForDoingAdvancement,
  types: {
    HitPointsAdvancement,
    ItemGrantAdvancement
  }
};

export default advancement;
