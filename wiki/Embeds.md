![Up to date as of 5.1.0](https://img.shields.io/static/v1?label=dnd5e&message=5.1.0&color=informational)

Foundry provides an [enricher](Enrichers) that allows embedding a document within a journal page or description on an item or actor. The DnD5e system extends this functionality in several useful ways.

### Standard Embed Usage

The core embed system is invoked using the `@Embed` enricher format. A document can be easily embedded by dragging the document into the editor window to create a document link (e.g. `@UUID[...]{Name}`) and replacing the `@UUID` portion with `@Embed` (the name is also not required, but it doesn't do any harm).

```
@Embed[Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.0b8N4FymGGfbZGpJ]
```

By default the embed will include a caption and a citation linking to the document. In most cases both of these will display the document name, so if this repetition isn't desired then the caption can be disabled using `caption=false`. If the citation link isn't desired on the other hand, then `cite=false` can be used to disable it. Both can be used at the same time to disable both items.

Embeds can also use the `inline` option, which disables both the citation and caption at the same time and removes some of the extra markup around the embed, potentially allowing it to be inserted in the middle of a paragraph (though that depends on the content being embedded).

```
// Disable caption or citation
@Embed[Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.0b8N4FymGGfbZGpJ caption=false]
@Embed[Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.0b8N4FymGGfbZGpJ cite=false]
@Embed[Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.0b8N4FymGGfbZGpJ caption=false cite=false]

// Display inline
@Embed[Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.0b8N4FymGGfbZGpJ inline]
```

## Actors & Items

Using the standard embed format for actors will embed their public biography and embedding items will display their standard description, unless the item is unidentified and the player is not a GM user, in which case the unidentified description will be embedded instead.

```
// Actor embed
@Embed[Compendium.dnd5e.heroes.Actor.kfzBL0q1Y7LgGs2x]

// Item embed
@Embed[Compendium.dnd5e.classfeatures.Item.s0Cc2zcX0JzIgam5]
```

### NPC Stat Blocks

The system offers a custom `statblock` option for actor embeds that displays them as a stat block.

![Stat Block Simple](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/embeds/stat-block-simple.jpg)

For complex actors, the `double-column` class can be added to format the contents into two columns.

![Stat Block Two Column](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/embeds/stat-block-two-column.jpg)

The stat blocks also support legacy style presentation to match older books. This style is used automatically for any actor with the 2014 rules set in its source configuration, or it can be forced by setting the `rules` enricher option to be `2014` (using `2024` will force the modern style on older creatures).

![Stat Block Legacy](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/embeds/stat-block-legacy.jpg)

```
// NPC stat block
@Embed[Compendium.dnd5e.monsters.Actor.K5cKmPoFkpuOotis statblock]

// Double-column stat block
@Embed[Compendium.dnd5e.monsters.Actor.SNT0JNVSngUTsj4m statblock classes="double-column"]

// Legacy stat block (using legacy monster)
@Embed[Compendium.dnd5e.monsters.Actor.D5WjGwKskeUT8HXa statblock]

// Legacy stat block (using modern monster)
@Embed[Compendium.dnd5e.actors24.Actor.mmBlackBear00000 statblock rules=2014]
```

The stat block contains special handling for the legendary actions description, looking for an item on the actor with the `legendary-actions` identifier and displaying it with special formatting at the start of the "Legendary Actions" section. The identifier can be set by opening the source config dialog on the item.

## Roll Tables

Core Foundry provides support for embedding roll tables, which will be displayed as a standard HTML table with the roll on the left and the result on the right. The `rollable` option can be used to add a button to the header that allows for rolling directly from the table.

By default the table's description will be displayed beneath the table. If you wish to display the caption above the table instead, you can use the `caption-top` class.

```
// Standard table
@Embed[Compendium.dnd5e.tables.RollTable.LHEts1oDaDwcehuj]

// Rollable table
@Embed[Compendium.dnd5e.tables.RollTable.LHEts1oDaDwcehuj rollable]

// Caption at Top
@Embed[Compendium.dnd5e.tables.RollTable.LHEts1oDaDwcehuj classes="caption-top"]
```

## Spell Lists

The spells journal entry page includes some extra embed options allowing for setting the grouping mode and display it as a table.

By default spell lists will display with whatever default grouping mode is set on the page, but the `grouping` option can be used to display it using a different mode. It accepts `none` for no grouping, `alphabetical` for grouping by first letter, `level` for grouping by spell level, and `school` for grouping by spell school.

Spell lists can also be displayed in a table format using the `table` option. This will display the grouping category on the left and the list of spells within that category on the right.

![Spells Table](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/embeds/spells-table.jpg)

```
// Set grouping modes
@Embed[Compendium.dnd-players-handbook.content.JournalEntry.phbSpells0000000.JournalEntryPage.5HnIk6HsrSxkvkz5 grouping=none]
@Embed[Compendium.dnd-players-handbook.content.JournalEntry.phbSpells0000000.JournalEntryPage.5HnIk6HsrSxkvkz5 grouping=alphabetical]
@Embed[Compendium.dnd-players-handbook.content.JournalEntry.phbSpells0000000.JournalEntryPage.5HnIk6HsrSxkvkz5 grouping=level]
@Embed[Compendium.dnd-players-handbook.content.JournalEntry.phbSpells0000000.JournalEntryPage.5HnIk6HsrSxkvkz5 grouping=school]

// Display as table
@Embed[Compendium.dnd-players-handbook.content.JournalEntry.phbSpells0000000.JournalEntryPage.5HnIk6HsrSxkvkz5 table]
```
