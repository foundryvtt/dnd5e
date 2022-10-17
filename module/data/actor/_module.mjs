import { CharacterData } from "./character.mjs";
import GroupActor from "./group.mjs";
import { NPCData } from "./npc.mjs";
import { VehicleData } from "./vehicle.mjs";

export {default as AbilityData} from "./ability.mjs";
export * from "./character.mjs";
export * from "./common.mjs";
export * from "./creature.mjs";
export { GroupActor };
export * from "./npc.mjs";
export {default as SkillData} from "./skill.mjs";
export * from "./vehicle.mjs";

export const config = {
  character: CharacterData,
  group: GroupActor,
  npc: NPCData,
  vehicle: VehicleData
};
