import ItemSheet5e from "../item-sheet.mjs";

export default class ItemSheet5e2 extends ItemSheet5e {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "The `ItemSheet5e2` application has been deprecated and replaced with `ItemSheet5e`.",
      { since: "DnD5e 5.0", until: "DnD5e 5.2" }
    );
    super(...args);
  }
}
