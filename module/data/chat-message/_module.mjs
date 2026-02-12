import RequestMessageData from "./request-message-data.mjs";
import RestMessageData from "./rest-message-data.mjs";
import TimePassedMessageData from "./time-passed-message-data.mjs";
import TurnMessageData from "./turn-message-data.mjs";

export {
  RequestMessageData,
  RestMessageData,
  TimePassedMessageData,
  TurnMessageData
};
export * as fields from "./fields/_module.mjs";

export const config = {
  request: RequestMessageData,
  rest: RestMessageData,
  timePassed: TimePassedMessageData,
  turn: TurnMessageData
};
