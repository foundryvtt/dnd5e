import EmbeddableDocumentMixin from "./mixins/embeddable.mjs";

/**
 * @import { JournalEntryPageRollData } from "./_types.mjs";
 */

/**
 * Extend the base JournalEntryPage class to implement system-specific logic.
 */
export default class JournalEntryPage5e extends EmbeddableDocumentMixin(foundry.documents.JournalEntryPage) {
  /**
   * Return a data object regarding this page and from the containing journal entry.
   * @returns {JournalEntryPageRollData}
   */
  getRollData() {
    const { name, flags, system } = this;
    return {
      name: this.parent.name,
      flags: this.parent.flags,
      page: { ...system, name, flags }
    };
  }
}
