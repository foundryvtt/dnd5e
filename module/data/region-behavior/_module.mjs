import {default as AntimagicRegionBehaviorType} from "./antimagic.mjs";
import {default as DifficultTerrainRegionBehaviorType} from "./difficult-terrain.mjs";
import {default as RotateAreaRegionBehaviorType} from "./rotate-area.mjs";

export {
  AntimagicRegionBehaviorType,
  DifficultTerrainRegionBehaviorType,
  RotateAreaRegionBehaviorType
};

export const config = {
  "dnd5e.antimagic": AntimagicRegionBehaviorType,
  "dnd5e.difficultTerrain": DifficultTerrainRegionBehaviorType,
  "dnd5e.rotateArea": RotateAreaRegionBehaviorType
};

export const icons = {
  "dnd5e.antimagic": "fa-solid-fa-plug-circle-xmark",
  "dnd5e.difficultTerrain": "fa-solid fa-hill-rockslide",
  "dnd5e.rotateArea": "fa-solid fa-arrows-spin"
};
