![Up to date as of 4.3.0](https://img.shields.io/static/v1?label=dnd5e&message=4.3.0&color=informational)

The table of contents system allows modules to take advantage of automatic generation of table of contents view for their journal compendiums. There are a few flags that must be set by the module creator in order to take advantage of this system, but once set up the system will handle the rest and no additional code is required from the module.

![Complete table of contents page](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/journal/table-of-contents-complete.jpg)

### Pack Registration

The first step to setting up the ToC is to add a flag to whichever journal compendium pack needs it. In your module's manifest (`module.json` or `world.json`) add a `flags` object to the pack definition and add a `display` flag set to `table-of-contents`:

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
        "display": "table-of-contents"
      }
    }
  ]
}
```

Once you have reloaded Foundry to ensure the manifest changes take effect and launched into your world, you should now find that opening the compendium results in a blank page with "Contents" at the top. Perfect! That means everything is working so far, but you will need to set some additional flags to indicate to the system what journal entries should appear in the table of contents and in what order.

![Empty table of contents page](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/journal/table-of-contents-empty.jpg)

### Setting Journal Entry Flags

By default no journal entries are displayed in the table of contents. There are at least two flags that must be set on a journal entry to make it appear in the correct position:

#### `type` flag

The `type` flag indicates how the journal entry will be sorted and displayed on the ToC. There are four types supported by the system:
- `chapter`: Chapters are sorted first and the entry name is displayed as a large heading. They will automatically list all of their pages below.
- `appendix`: Appendices are sorted last and also displayed as a large header. By default they do not display their individual pages, but that can be overridden using the `showPages` flag (see below).
- `special`: Special is used for journal entries that should appear as if they are pages beneath a chapter or appendix. They also hide their pages by default.
- `header`: The first page of this journal entry will be displayed inline at the top of the table of contents.

```javascript
const journalEntry = await fromUuid("...");
journalEntry.setFlag("dnd5e", "type", "chapter");
```

#### `showPages` flag

The `showPages` flag on entries controls whether the individual pages are listed beneath the entry name in the list with their own links. This defaults to `true` for entries with the `chapter` type, and `false` for entries with the `appendix` or `special` types.

```javascript
const journalEntry = await fromUuid("...");
journalEntry.setFlag("dnd5e", "showPages", false);
```

#### `position` flag

The `position` flag is used to control where chapters and appendices appear in the list. It is usually as simple as setting the first chapter to have a `1`, the second chapter to have `2`, and so on. The position is independent between chapters and appendices, so you can have appendix A also have a position of `1`.

```javascript
const journalEntry = await fromUuid("...");
journalEntry.setFlag("dnd5e", "position", 1);
```

This flag only has effect for `chapter` and `appendix` entries.

#### `append` & `order` flags

The `append` and `order` flags are used by `special` entries to control where they appear in the final list. The `append` flag specifies which chapter the special entry will be added to. If no `append` is provided, then a special entry will be added after all of the other chapters and appendices as a top-level entry.

**Note**: The `append` flag corresponds to the absolute chapter position starting at `1`, so if you have 5 chapters and 2 appendices, the range of valid values will be 1–7, with 1–5 being the first through fifth chapter, and 6 & 7 being the first and second appendix.

The `order` flag is used when appending a special entry into a list of pages to determine its location relative to the other pages. This number is sorted relative to the sorting value of the other pages in the primary entry, so you may need a unexpectedly large value depending on the sort order of the page set by Foundry.

```javascript
const journalEntry = await fromUuid("...");
journalEntry.setFlag("dnd5e", "append", 3);
journalEntry.setFlag("dnd5e", "order", 500000);
```

#### `title` flag

The `title` flag allows you to display a different name in the table of contents than you have in the journal entry itself.

```javascript
const journalEntry = await fromUuid("...");
journalEntry.setFlag("dnd5e", "title", "Chapter 1: Stuff");
```

### Hiding Individual Pages

Depending on how your journal entries are structured, sometimes it might be desirable to hide an individual page from the table of contents list. For example, in the Player's Guide each chapter begins with an "Introduction" page that contains the key art for the chapter as well as a brief introductory paragraph. This page should not appear within the table of contents, while the rest of the pages in the chapter should.

Hiding a specific page can be done using the `tocHidden` flag on the specific page (there is no way to force a page to be visible if the containing entry doesn't have `showPages` set):

```javascript
const journalPage = await fromUuid("...");
journalPage.setFlag("dnd5e", "tocHidden", true);
```

### Custom Styling

The table of contents application gets a special attribute with the compendium ID added to support custom styling:

```css
.table-of-contents[data-compendium-id="dnd5e.rules"] {
  // Styles here
}
```
