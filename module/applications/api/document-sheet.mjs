import ApplicationV2Mixin from "./application-v2-mixin.mjs";

const { DocumentSheetV2 } = foundry.applications.api;

/**
 * Base document sheet from which all document-based application should be based.
 */
export default class DocumentSheet5e extends ApplicationV2Mixin(DocumentSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["standard-form"]
  };
}
