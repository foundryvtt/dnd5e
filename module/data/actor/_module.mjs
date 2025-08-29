import CharacterData from "./character.mjs";
import EncounterData from "./encounter.mjs";
import {default as GroupData, GroupActor} from "./group.mjs";
import NPCData from "./npc.mjs";
import VehicleData from "./vehicle.mjs";

export {
  CharacterData,
  EncounterData,
  GroupActor, GroupData,
  NPCData,
  VehicleData
};
export {default as GroupSystemFlags} from "./group-system-flags.mjs";
export {default as DamageTraitField} from "./fields/damage-trait-field.mjs";
export {default as SimpleTraitField} from "./fields/simple-trait-field.mjs";
export {default as AttributesFields} from "./templates/attributes.mjs";
export {default as CommonTemplate} from "./templates/common.mjs";
export {default as CreatureTemplate} from "./templates/creature.mjs";
export {default as DetailsFields} from "./templates/details.mjs";
export {default as TraitsFields} from "./templates/traits.mjs";

export const config = {
  character: CharacterData,
  encounter: EncounterData,
  group: GroupData,
  npc: NPCData,
  vehicle: VehicleData
};
