import { Advancement } from "./advancement/advancement.js";
import { AdvancementConfig } from "./advancement/advancement-config.js";
import { AdvancementFlow } from "./advancement/advancement-flow.js";
import { AdvancementManager } from "./advancement/advancement-manager.js";
import { AdvancementSelection } from "./advancement/advancement-selection.js";
import * as steps from "./advancement/advancement-step.js";
import { HitPointsAdvancement } from "./advancement/hit-points.js";
import { ItemGrantAdvancement } from "./advancement/item-grant.js";

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
