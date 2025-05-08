import RestMessageData from "./rest-message-data.mjs";
import RestRequestMessageData from "./rest-request-message-data.mjs";
import TurnMessageData from "./turn-message-data.mjs";

export {
  RestMessageData,
  RestRequestMessageData,
  TurnMessageData
};
export * as fields from "./fields/_module.mjs";

export const config = {
  rest: RestMessageData,
  restRequest: RestRequestMessageData,
  turn: TurnMessageData
};
