import RestMessageData from "./rest-message-data.mjs";
import TurnMessageData from "./turn-message-data.mjs";

export {
  TurnMessageData
};
export * as fields from "./fields/_module.mjs";

export const config = {
  rest: RestMessageData,
  turn: TurnMessageData
};
