import V2Mixin from "./v2-mixin.mjs";

const { DocumentSheetV2 } = foundry.applications.api;

/**
 * Base document sheet from which all document-based application should be based.
 */
export default class DocumentSheet5e extends V2Mixin(DocumentSheetV2) {}
