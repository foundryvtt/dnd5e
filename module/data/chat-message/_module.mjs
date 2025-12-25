import BastionAttackMessageData from "./bastion-attack-message-data.mjs";
import BastionTurnMessageData from "./bastion-turn-message-data.mjs";
import RequestMessageData from "./request-message-data.mjs";
import RestMessageData from "./rest-message-data.mjs";
import TurnMessageData from "./turn-message-data.mjs";

export {
  BastionAttackMessageData,
  BastionTurnMessageData,
  RequestMessageData,
  RestMessageData,
  TurnMessageData
};
export * as fields from "./fields/_module.mjs";

export const config = {
  bastionAttack: BastionAttackMessageData,
  bastionTurn: BastionTurnMessageData,
  request: RequestMessageData,
  rest: RestMessageData,
  turn: TurnMessageData
};
