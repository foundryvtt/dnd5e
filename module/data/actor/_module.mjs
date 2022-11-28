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

export const config = {
  character: CharacterData,
  group: GroupData,
  npc: NPCData,
  vehicle: VehicleData
};
