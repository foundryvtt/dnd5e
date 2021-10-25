import ActorCharacterData from "./character.mjs";
import GroupActor from "./group.mjs";
import ActorNPCData from "./npc.mjs";
import ActorVehicleData from "./vehicle.mjs";

export {
  ActorCharacterData,
  GroupActor,
  ActorNPCData,
  ActorVehicleData
};

export const config = {
  character: ActorCharacterData,
  group: GroupActor,
  npc: ActorNPCData,
  vehicle: ActorVehicleData
};
