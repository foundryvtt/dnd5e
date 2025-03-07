/**
 * Adds V2 sheet functionality shared between primary document sheets (Actors & Items).
 * @param {typeof DocumentSheet5e} Base  The base class being mixed.
 * @returns {typeof PrimarySheet5e}
 */
export default function ItemSheetV2Mixin(Base) {
  foundry.utils.logCompatibilityWarning(
    "The `ItemSheetV2Mixin` application has been deprecated and is now part of `ItemSheet5e`.",
    { since: "DnD5e 5.0", until: "DnD5e 5.2" }
  );
  return Base;
}
