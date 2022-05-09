import { Advancement } from "./advancement/advancement.js";
import { AdvancementConfig } from "./advancement/advancement-config.js";
import { AdvancementConfirmationDialog } from "./advancement/advancement-confirmation-dialog.js";
import { AdvancementError, AdvancementFlow } from "./advancement/advancement-flow.js";
import { AdvancementManager } from "./advancement/advancement-manager.js";
import { AdvancementSelection } from "./advancement/advancement-selection.js";
import { HitPointsAdvancement } from "./advancement/hit-points.js";
import { ItemGrantAdvancement } from "./advancement/item-grant.js";
import { ScaleValueAdvancement } from "./advancement/scale-value.js";

const advancement = {
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

export default advancement;
