import { Advancement } from "./advancement/advancement.js";
import { AdvancementConfig } from "./advancement/advancement-config.js";
import { AdvancementConfirmationDialog } from "./advancement/advancement-confirmation-dialog.js";
import { AdvancementError, AdvancementFlow } from "./advancement/advancement-flow.js";
import { AdvancementManager } from "./advancement/advancement-manager.js";
import { AdvancementSelection } from "./advancement/advancement-selection.js";
import { HitPointsAdvancement, HitPointsConfig, HitPointsFlow } from "./advancement/hit-points.js";
import { ItemGrantAdvancement, ItemGrantConfig, ItemGrantFlow } from "./advancement/item-grant.js";
import { ScaleValueAdvancement, ScaleValueConfig, ScaleValueFlow } from "./advancement/scale-value.js";

export default {
  Advancement,
  AdvancementConfig,
  AdvancementConfirmationDialog,
  AdvancementError,
  AdvancementFlow,
  AdvancementManager,
  AdvancementSelection,
  types: {
    HitPointsAdvancement,
    ItemGrantAdvancement,
    ScaleValueAdvancement
  }
};

export { Advancement };
export { AdvancementConfig };
export { AdvancementConfirmationDialog };
export { AdvancementError, AdvancementFlow };
export { AdvancementManager };
export { AdvancementSelection };
export { HitPointsAdvancement, HitPointsConfig, HitPointsFlow };
export { ItemGrantAdvancement, ItemGrantConfig, ItemGrantFlow };
export { ScaleValueAdvancement, ScaleValueConfig, ScaleValueFlow };
