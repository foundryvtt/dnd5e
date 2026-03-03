import {default as DifficultTerrainRegionBehaviorType, DifficultTerrainActivityBehavior} from "./difficult-terrain.mjs";
import {default as RotateAreaRegionBehaviorType} from "./rotate-area.mjs";

export {
  DifficultTerrainActivityBehavior,
  DifficultTerrainRegionBehaviorType,
  RotateAreaRegionBehaviorType
};
export * from "./apply-active-effect.mjs";
export {default as BaseActivityBehavior} from "./base-activity-behavior.mjs";

export const config = {
  "dnd5e.difficultTerrain": DifficultTerrainRegionBehaviorType,
  "dnd5e.rotateArea": RotateAreaRegionBehaviorType
};

export const icons = {
  "dnd5e.difficultTerrain": "fa-solid fa-hill-rockslide",
  "dnd5e.rotateArea": "fa-solid fa-arrows-spin"
};
