import {default as DifficultTerrainRegionBehaviorType} from "./difficult-terrain.mjs";
import {default as RotateAreaRegionBehaviorType} from "./rotate-area.mjs";

export {
  DifficultTerrainRegionBehaviorType,
  RotateAreaRegionBehaviorType
};

export const config = {
  "dnd5e.difficultTerrain": DifficultTerrainRegionBehaviorType,
  "dnd5e.rotateArea": RotateAreaRegionBehaviorType
};

export const icons = {
  "dnd5e.difficultTerrain": "fa-solid fa-hill-rockslide",
  "dnd5e.rotateArea": "fa-solid fa-arrows-spin"
};
