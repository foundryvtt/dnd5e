import { AbilityScoreImprovementAdvancement } from "./advancement/abilityScoreImprovement.js";
import { AdvancementSelection } from "./advancement/advancementSelection.js";
import { BaseAdvancement } from "./advancement/baseAdvancement.js";
import { BaseConfig } from "./advancement/baseConfig.js";
import { HitPointsAdvancement } from "./advancement/hitPoints.js";
import { ItemChoiceAdvancement } from "./advancement/itemChoice.js";
import { ItemGrantAdvancement } from "./advancement/itemGrant.js";
import { ScaleValueAdvancement } from "./advancement/scaleValue.js";
import { TraitAdvancement } from "./advancement/trait.js";

const advancement = {
  AdvancementSelection,
  BaseAdvancement,
  BaseConfig,
  types: {
    AbilityScoreImprovementAdvancement,
    HitPointsAdvancement,
    ItemChoiceAdvancement,
    ItemGrantAdvancement,
    ScaleValueAdvancement,
    TraitAdvancement
  }
};

export default advancement;
