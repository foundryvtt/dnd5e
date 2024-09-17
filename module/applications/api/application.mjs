import V2Mixin from "./v2-mixin.mjs";

const { ApplicationV2 } = foundry.applications.api;

/**
 * Base application from which all system applications should be based.
 */
export default class Application5e extends V2Mixin(ApplicationV2) {}
