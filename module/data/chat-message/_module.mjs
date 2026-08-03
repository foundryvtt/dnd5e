import AttackMessageData from "./attack-message-data.mjs";
import BastionAttackMessageData from "./bastion-attack-message-data.mjs";
import BastionOrderMessageData from "./bastion-order-message-data.mjs";
import BastionTurnMessageData from "./bastion-turn-message-data.mjs";
import CheckMessageData from "./check-message-data.mjs";
import DamageMessageData from "./damage-message-data.mjs";
import GenericMessageData from "./generic-message-data.mjs";
import HealingMessageData from "./healing-message-data.mjs";
import HitDieMessageData from "./hit-die-message-data.mjs";
import HitPointsMessageData from "./hit-points-message-data.mjs";
import ItemMessageData from "./item-message-data.mjs";
import PromptMessageData from "./prompt-message-data.mjs";
import RequestMessageData from "./request-message-data.mjs";
import RestMessageData from "./rest-message-data.mjs";
import RollMessageData from "./roll-message-data.mjs";
import SaveMessageData from "./save-message-data.mjs";
import TimePassedMessageData from "./time-passed-message-data.mjs";
import TurnMessageData from "./turn-message-data.mjs";
import UsageMessageData from "./usage-message-data.mjs";

export {
  AttackMessageData,
  BastionAttackMessageData,
  BastionOrderMessageData,
  BastionTurnMessageData,
  CheckMessageData,
  DamageMessageData,
  GenericMessageData,
  HealingMessageData,
  HitDieMessageData,
  HitPointsMessageData,
  ItemMessageData,
  PromptMessageData,
  RequestMessageData,
  RestMessageData,
  RollMessageData,
  SaveMessageData,
  TimePassedMessageData,
  TurnMessageData,
  UsageMessageData
};
export * as fields from "./fields/_module.mjs";

export const config = {
  attack: AttackMessageData,
  bastionAttack: BastionAttackMessageData,
  bastionOrder: BastionOrderMessageData,
  bastionTurn: BastionTurnMessageData,
  check: CheckMessageData,
  damage: DamageMessageData,
  generic: GenericMessageData,
  healing: HealingMessageData,
  hitDie: HitDieMessageData,
  hitPoints: HitPointsMessageData,
  item: ItemMessageData,
  prompt: PromptMessageData,
  request: RequestMessageData,
  rest: RestMessageData,
  save: SaveMessageData,
  timePassed: TimePassedMessageData,
  turn: TurnMessageData,
  usage: UsageMessageData
};
