import AwardMessageData from "./award-message-data.mjs";
import RequestMessageData from "./request-message-data.mjs";
import RestMessageData from "./rest-message-data.mjs";
import TurnMessageData from "./turn-message-data.mjs";

export {
  AwardMessageData,
  RequestMessageData,
  RestMessageData,
  TurnMessageData
};
export * as fields from "./fields/_module.mjs";

export const config = {
  award: AwardMessageData,
  request: RequestMessageData,
  rest: RestMessageData,
  turn: TurnMessageData
};
