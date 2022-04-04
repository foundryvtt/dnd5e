import { Advancement } from "./advancement/advancement.js";
import { AdvancementConfig } from "./advancement/advancement-config.js";
import { AdvancementError, AdvancementFlow } from "./advancement/advancement-flow.js";
import { AdvancementManager } from "./advancement/advancement-manager.js";
import { AdvancementSelection } from "./advancement/advancement-selection.js";
import { DeleteConfirmationDialog } from "./advancement/delete-confirmation-dialog.js";
import { HitPointsAdvancement } from "./advancement/hit-points.js";
import { ItemGrantAdvancement } from "./advancement/item-grant.js";

const advancement = {
  Advancement,
  AdvancementConfig,
  AdvancementError,
  AdvancementFlow,
  AdvancementManager,
  AdvancementSelection,
  DeleteConfirmationDialog,
  types: {
    HitPointsAdvancement,
    ItemGrantAdvancement
  }
};

export default advancement;
