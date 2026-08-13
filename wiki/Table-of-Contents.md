![Up to date as of 6.0.0](https://img.shields.io/static/v1?label=dnd5e&message=6.0.0&color=informational)

The table of contents system allows modules to take advantage of automatic generation of table of contents view for their journal compendiums. There are a few flags that must be set by the module creator in order to take advantage of this system, but once set up the system will handle the rest and no additional code is required from the module.

![Complete table of contents page](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/journal/table-of-contents-complete.jpg)

## Pack Registration

The first step to setting up the ToC is to add a flag to whichever journal compendium pack needs it. In your module's manifest (`module.json` or `world.json`) add a `flags` object to the pack definition and add a `dnd5e.display` flag set to `table-of-contents`:

```json
{
  "id": "dnd5e",
  "packs": [
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
  ]
}
```

Once you have reloaded Foundry to ensure the manifest changes take effect and launched into your world, you should now find that opening the compendium results in a blank page with "Contents" at the top. Perfect! That means everything is working so far, but you will need to set some additional flags to indicate to the system what journal entries should appear in the table of contents and in what order.

![Empty table of contents page](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/journal/table-of-contents-empty.jpg)

## Setting up Journal Entries

By default no journal entries are displayed in the table of contents. The Table of Contents Configuration application can be opened from the header controls dropdown.

![Table of contents pack configuration](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/journal/table-of-contents-pack-config.jpg)

The pack configuration dialog displays all journal entries within the compendium grouped by their containing folder. The general position of each entry can be configured using this dialog. For an entry to appear in the table of contents, it must be given a type.

#### Type

The type indicates how the journal entry will be sorted and displayed on the ToC. There are four types supported by the system:
- Chapter: Chapters are sorted first and the entry name is displayed as a large heading. They will automatically list all of their pages below.
- Appendix: Appendices are sorted last and also displayed as a large header. By default they do not display their individual pages, but that can be overridden using the Show Pages option (see below).
- Special: Special is used for journal entries that should appear as if they are pages beneath a chapter or appendix. They also hide their pages by default.
- Header: The first page of this journal entry will be displayed inline at the top of the table of contents.

#### Position

The position is available for chapters, appendices, and special entries. For chapters and appendices this is a number to indicate the order in which each chapter and appendix should appear with each type (e.g. give "Chapter 1" a position of `1`, "Chapter 2" a position of `2`, and "Appendix A" a position of `1`).

For special entries this changes to a dropdown. The default position of special pages is at the end of the table of contents after all chapters and appendices, but it can be positioned grouped inside a specific chapter or appendix by selecting that entry in this dropdown.

> [!Note]
> Always set the position of chapters and appendices before attaching special entries to them. If the order of a chapter or appendix is changed after setting the position of special entries then those entries will shift between chapters.

### Customizing Journal Entries

Once all of the journal entries are placed in the correct location within the table of contents more configuration its appearance can be further customized using the entry configuration. This can be accessed using the option in the header controls dropdown for an individual journal entry.

![Table of contents journal entry configuration](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/journal/table-of-contents-entry-config.jpg)

The "Type" and "Position" entries are duplicates of the controls found in the other configuration application.

#### Order

The order input is available for special entries and controls where this special entry appears relative to other special entries and relative to the other pages in the chapter or appendix (if the special entry is attached to one). This value is relative to the sort value on pages, so extremely large values may be necessary to achieve the desired position.

#### Title Override

Allows you to display a different name in the table of contents than you have in the journal entry itself.

#### Hide All Pages

Chapters, appendices, and special entries at the end of the table of contents will display all of their pages by default. This control can be used to hide their pages.

#### Show Pages

Special entries appended to chapters or appendices will not display any of their pages by default. This option can be used to get their pages to display.

#### Hidden Pages

Whenever an entry is displaying its pages, this control allows to hiding specific pages.


## Setting up Using Flags

Journal entries and pages can also be configured directly using flags.

### Journal Entry Flags

```javascript
const journalEntry = await fromUuid("...");

// Type
// Valid values are `chapter`, `appendix`, `special`, & `header`.
journalEntry.setFlag("dnd5e", "type", "chapter");

// Show Pages
// Defaults to `true` for `chapter` & `appendix` types and `special` types without `append`, `false` otherwise.
journalEntry.setFlag("dnd5e", "showPages", false);

// Position
// Only used for `chapter` & `appendix` types, should be unique for each type.
journalEntry.setFlag("dnd5e", "position", 1);

// Append
// Only used for `special` types to indicate what `chapter` or `appendix` it should append to
// This is the absolute chapter position starting at `1`, so if you have 5 chapters and 2 appendices, the range of
// valid values will be 1–7, with 1–5 being the chapters and 6 & 7 being the appendices
journalEntry.setFlag("dnd5e", "append", 3);

// Order
// Only used when appending a special entry to position the entry relative to the chapter's other pages. This number
// is sorted relative to the sorting value of the other pages so you may need an unexpectedly large value.
journalEntry.setFlag("dnd5e", "order", 500000);

// Title
// An override for the title displayed in the table of contents, rather than the journal entry's name.
journalEntry.setFlag("dnd5e", "title", "Chapter 1: Stuff");
```

### Hiding Individual Pages

```javascript
const journalPage = await fromUuid("...");

// Hidden Page
// Setting this flag to `true` will prevent this page from being displayed.
journalPage.setFlag("dnd5e", "tocHidden", true);
```

## Custom Styling

The table of contents application gets a special attribute with the compendium ID added to support custom styling:

```css
.table-of-contents[data-compendium-id="dnd5e.rules"] {
  // Styles here
}
```
