import ClassJournalPageData from "./class.mjs";
import MapLocationJournalPageData from "./map.mjs";
import RuleJournalPageData from "./rule.mjs";
import SpellListJournalPageData from "./spell-list.mjs";
import SubclassJournalPageData from "./subclass.mjs";

export {
  ClassJournalPageData,
  MapLocationJournalPageData,
  RuleJournalPageData,
  SpellListJournalPageData,
  SubclassJournalPageData
};

export const config = {
  class: ClassJournalPageData,
  map: MapLocationJournalPageData,
  rule: RuleJournalPageData,
  spellList: SpellListJournalPageData,
  subclass: SubclassJournalPageData
};
