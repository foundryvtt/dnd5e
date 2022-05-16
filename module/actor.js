import Actor5e from "./actor/entity.js";
import Proficiency from "./actor/proficiency.js";
import ActorSheet5e from "./actor/sheets/base.js";
import ActorSheet5eCharacter from "./actor/sheets/character.js";
import ActorSheet5eNPC from "./actor/sheets/npc.js";
import ActorSheet5eVehicle from "./actor/sheets/vehicle.js";

export default {
  document: Actor5e,
  sheets: {
    character: ActorSheet5eCharacter,
    npc: ActorSheet5eNPC,
    vehicle: ActorSheet5eVehicle
  },
  Proficiency
};

export { Actor5e };
export { Proficiency };
export { ActorSheet5e };
export { ActorSheet5eCharacter };
export { ActorSheet5eNPC };
export { ActorSheet5eVehicle };
