import SystemFlagsMixin from "./flags.mjs";

/**
 * Mixin used to share some logic between Actor & Item documents.
 * @template {foundry.abstract.Document} T
 * @param {typeof T} Base  The base document class to wrap.
 * @returns {typeof SystemDocument}
 * @mixin
 */
export default function SystemDocumentMixin(Base) {
  class SystemDocument extends SystemFlagsMixin(Base) {
    /** @inheritDoc */
    get _systemFlagsDataModel() {
      return this.system?.metadata?.systemFlagsModel ?? null;
    }
  }
  return SystemDocument;
}
