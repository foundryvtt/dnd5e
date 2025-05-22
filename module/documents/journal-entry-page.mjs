/**
 * Custom implementation of journal entry pages for providing roll data.
 */
export default class JournalEntryPage5e extends JournalEntryPage {
  /**
   * Return a data object regarding this page and from the containing journal entry.
   * @returns {object}
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
