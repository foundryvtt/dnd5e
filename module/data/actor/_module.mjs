import CharacterData from "./character.mjs";
import GroupData from "./group.mjs";
import NPCData from "./npc.mjs";
import VehicleData from "./vehicle.mjs";

export {
  CharacterData,
  GroupData,
  NPCData,
  VehicleData
};
export {default as AbilityData} from "./ability.mjs";
export {default as SkillData} from "./skill.mjs";
export {default as AttributesField} from "./templates/attributes.mjs";
export {default as CommonTemplate} from "./templates/common.mjs";
export {default as CreatureTemplate} from "./templates/creature.mjs";
export {default as DetailsField} from "./templates/details.mjs";
export {default as HPField} from "./templates/hp.mjs";
export {default as TraitsField} from "./templates/traits.mjs";

export const config = {
  character: CharacterData,
  group: GroupData,
  npc: NPCData,
  vehicle: VehicleData
};
