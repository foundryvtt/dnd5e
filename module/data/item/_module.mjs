import BackgroundData from "./background.mjs";
import ClassData from "./class.mjs";
import ConsumableData from "./consumable.mjs";
import ContainerData from "./container.mjs";
import EquipmentData from "./equipment.mjs";
import FeatData from "./feat.mjs";
import LootData from "./loot.mjs";
import RaceData from "./race.mjs";
import SpellData from "./spell.mjs";
import SubclassData from "./subclass.mjs";
import ToolData from "./tool.mjs";
import WeaponData from "./weapon.mjs";

export {
  BackgroundData,
  ClassData,
  ConsumableData,
  ContainerData,
  EquipmentData,
  FeatData,
  LootData,
  RaceData,
  SpellData,
  SubclassData,
  ToolData,
  WeaponData
};
export {default as ItemTypeField} from "./fields/item-type-field.mjs";
export {default as ActionTemplate} from "./templates/action.mjs";
export {default as ActivatedEffectTemplate} from "./templates/activated-effect.mjs";
export {default as EquippableItemTemplate} from "./templates/equippable-item.mjs";
export {default as ItemDescriptionTemplate} from "./templates/item-description.mjs";
export {default as ItemTypeTemplate} from "./templates/item-type.mjs";
export {default as MountableTemplate} from "./templates/mountable.mjs";
export {default as PhysicalItemTemplate} from "./templates/physical-item.mjs";

export const config = {
  background: BackgroundData,
  backpack: ContainerData,
  class: ClassData,
  consumable: ConsumableData,
  equipment: EquipmentData,
  feat: FeatData,
  loot: LootData,
  race: RaceData,
  spell: SpellData,
  subclass: SubclassData,
  tool: ToolData,
  weapon: WeaponData
};
