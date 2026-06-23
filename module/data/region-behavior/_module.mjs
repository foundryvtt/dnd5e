import {default as ApplyActiveEffect5eRegionBehaviorType} from "./apply-active-effect.mjs";
import {default as DifficultTerrainRegionBehaviorType, DifficultTerrainActivityBehavior} from "./difficult-terrain.mjs";
import {default as RotateAreaRegionBehaviorType} from "./rotate-area.mjs";

export {
  ApplyActiveEffect5eRegionBehaviorType,
  DifficultTerrainActivityBehavior,
  DifficultTerrainRegionBehaviorType,
  RotateAreaRegionBehaviorType
};
export {default as BaseActivityBehavior} from "./base-activity-behavior.mjs";

export const config = {
  "dnd5e.applyActiveEffect": ApplyActiveEffect5eRegionBehaviorType,
  "dnd5e.difficultTerrain": DifficultTerrainRegionBehaviorType,
  "dnd5e.rotateArea": RotateAreaRegionBehaviorType
};

export const icons = {
  "dnd5e.applyActiveEffect": "fa-solid fa-person-rays",
  "dnd5e.difficultTerrain": "fa-solid fa-hill-rockslide",
  "dnd5e.rotateArea": "fa-solid fa-arrows-spin"
};
