import AppliedRules from "../applied-rules.mjs";
import DependentDocumentMixin from "./dependent.mjs";
import SystemFlagsMixin from "./flags.mjs";

/**
 * Mixin used to share some logic between Actor & Item documents.
 * @template {foundry.abstract.Document} T
 * @param {typeof T} Base  The base document class to wrap.
 * @returns {typeof SystemDocument}
 * @mixin
 */
export default function SystemDocumentMixin(Base) {
  class SystemDocument extends DependentDocumentMixin(SystemFlagsMixin(Base)) {

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Rule active effects grouped by type and then key.
     * @type {AppliedRules}
     */
    appliedRules = this.appliedRules;

    /* -------------------------------------------- */

    /** @inheritDoc */
    get _systemFlagsDataModel() {
      return this.system?.metadata?.systemFlagsModel ?? null;
    }

    /* -------------------------------------------- */
    /*  Data Preparation                            */
    /* -------------------------------------------- */

    /**
     * Clear cached data.
     * @protected
     */
    _clearCachedValues() {
      this.appliedRules = new AppliedRules();
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    prepareData() {
      this._clearCachedValues();
      super.prepareData();
    }
  }
  return SystemDocument;
}
