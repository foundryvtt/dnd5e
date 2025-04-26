![Up to date as of 4.3.0](https://img.shields.io/static/v1?label=dnd5e&message=4.3.0&color=informational)

The system includes a number of features allowing modules and worlds to register information for the system directly in their manifests, rather than requiring separate scripts.

## Compendium Flags

These flags should be applied to the `flags` object within an individual compendium definition inside the `packs` array.

### Display Mode

The `dnd5e.display` flag can be used to specify that a specific compendium should use the [Table of Contents][Table-of-Contents.md] display rather than the default compendium interface. It should only be used for compendiums with the `JournalEntry` document type.

```json
{
  "name": "rules",
  "label": "Rules (SRD)",
  "system": "dnd5e",
  "path": "packs/rules",
  "type": "JournalEntry",
  "private": false,
  "flags": {
    "dnd5e": {
      "display": "table-of-contents"
    }
  }
}
```

### Document Types

The `dnd5e.types` flag indicates what types of items or actors a compendium contains. This is used to aid the Compendium Browser in quickly searching for content. More information about how this is set up can be found on the [Compendium Browser guide](Compendium-Browser.md#module-support).

### Sorting

The `dnd5e.sorting` flag gives a method to indicate the default top-level sorting for a compendium, taking either `"m"` for manual sorting or `"a"` for alphabetical (though since core's default sorting is alphabetical, there is no reason to set that value). This will not replace the sorting mode if a user has already modified it for a compendium, but will be applied for a freshly installed module or for a new user.

```json
{
  "name": "spells",
  "label": "Spells (SRD)",
  "system": "dnd5e",
  "path": "packs/spells",
  "type": "Item",
  "flags": {
    "dnd5e": {
      "sorting": "m",
      "types": ["spell"]
    }
  }
}
```

## Source Books

Source books can be registered in a manifest and the system will automatically merge that data into `CONFIG.DND5E.sourceBooks` to be used in the source system:

```json
{
  "flags": {
    "dnd5e": {
      "sourceBooks": {
        "TCoE": "TCOE.Title"
      }
    }
  }
}
```

Registering source books in the manifest versus in code has an advantage. If only a single source book is registered in a manifest, then the system can infer that source book for any content in that module's compendium, removing the need to specify the source book on each individual document.

## Spell Lists

Spell list journal entry pages can be registered in the manifest flags allowing the system to load these automatically and populate the shared spell lists available in the Compendium Browser and powering other features:

```json
{
  "flags": {
    "dnd5e": {
      "spellLists": [
        "Compendium.dnd5e.rules.JournalEntry.QvPDSUsAiEn3hD8s.JournalEntryPage.ziBzRlrpBm1KVV0j",
        "Compendium.dnd5e.rules.JournalEntry.QvPDSUsAiEn3hD8s.JournalEntryPage.cuG9d7J9fQH9InYT",
        "Compendium.dnd5e.rules.JournalEntry.QvPDSUsAiEn3hD8s.JournalEntryPage.MWiN7ILEO0Vd3zAZ",
        "Compendium.dnd5e.rules.JournalEntry.QvPDSUsAiEn3hD8s.JournalEntryPage.FhucONA0yRZQjMmb",
        "Compendium.dnd5e.rules.JournalEntry.QvPDSUsAiEn3hD8s.JournalEntryPage.sANq9JMycfSq3A5d",
        "Compendium.dnd5e.rules.JournalEntry.QvPDSUsAiEn3hD8s.JournalEntryPage.PVgly1xB2S2I8GLQ",
        "Compendium.dnd5e.rules.JournalEntry.QvPDSUsAiEn3hD8s.JournalEntryPage.mx4TsSbBIAaAkhQ7",
        "Compendium.dnd5e.rules.JournalEntry.QvPDSUsAiEn3hD8s.JournalEntryPage.k7Rs5EyXeA0SFTXD"
      ]
    }
  }
}
```

A full guide for implementing this can be found on the [Linking Class Spells](Linking-Class-Spells.md) page