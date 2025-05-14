import RestMessageData from "./rest-message-data.mjs";
import TurnMessageData from "./turn-message-data.mjs";
import UsageMessageData from "./usage-message-data.mjs";

export {
  RestMessageData,
  TurnMessageData,
  UsageMessageData
};
export * as fields from "./fields/_module.mjs";

export const config = {
  rest: RestMessageData,
  turn: TurnMessageData,
  usage: UsageMessageData
};
