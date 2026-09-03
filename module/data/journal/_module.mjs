import ClassJournalPageData from "./class.mjs";
import MapLocationJournalPageData from "./map.mjs";
import RuleJournalPageData from "./rule.mjs";
import SpellListJournalPageData from "./spells.mjs";
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
  spells: SpellListJournalPageData,
  subclass: SubclassJournalPageData
};

export const icons = {
  class: "fa-solid fa-file-shield",
  map: "fa-solid fa-map",
  rule: "fa-solid fa-book-section",
  spells: "fa-solid fa-book-sparkles",
  subclass: "fa-solid fa-diagram-subtask"
};
