![Up to date as of 5.1.0](https://img.shields.io/static/v1?label=dnd5e&message=5.1.0&color=informational)

The Grant Items advancement allows for giving a character features, spells, or equipment (though it isn't designed for starting equipment).

## Configuration

![Grant Items Configuration](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/item-grant-configuration-normal.jpg)

Configuring the Grant Items advancement usually involves setting the level at which the items will be granted and dropping one or more items onto the configuration sheet. Any items granted will be listed at the bottom of the sheet with a delete button to remove them if needed.

There are two ways to support optional items in the advancement. The main "Optional" checkbox makes every item on the advancement optional but selected by default. For classes, if optional is checked, then the features will be displayed separately into a second "Optional Features" table on the class journal page.

The other way is using the checkboxes for each of the items in the list. Checking one of these boxes with the main optional option unchecked results in that item only being optional and defaulting to unchecked. If the main optional property is checked and one of the items is also checked, then that item will start unchecked by default, rather than checked.

![Grant Items Configuration](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/item-grant-configuration-spells.jpg)

When using the advancement to grant spells to a character, additional controls will appear that allow configuring the added spell. These controls allow for setting a specific ability modifier and preparation method on the added spell, as well is giving it limited uses.

The way in which limited uses are added varies depending on the preparation method and the "Require Slot" checkbox:
- "Preparation Method" is *Spellcasting* or *Pact Magic*, "Required Slot" is *unchecked*: A new [Forward activity](Activity-Type-Forward) will be added to the spell allowing it to be case a number of times and to be cast using spell slots as normal.
- "Preparation Method" is *Spellcasting* or *Pact Magic*, "Required Slot" is *checked*: The original spell casting activity will be modified with limited uses requiring both a limited use and a spell slot to be spent to cast the spell.
- "Preparation Method" is *At Will*, *Innate*, or *Ritual Only*: The original spell casting activity will be modified with limited uses allowing the spell to be cast that many times. The spell cannot be cast using a spell slot.

## Usage

![Grant Items Flow](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/item-grant-flow.jpg)

The Grant Items advancement will present to the player a list of items that will be granted. The name of the items can be clicked to view more details on them. If any of the items are optional, then a checkbox will appear next to those items.

If more than one ability was configured in the spell options, then a dropdown will be presented for the player to select which ability they would like to use.

## API

The [original proposal](https://github.com/foundryvtt/dnd5e/issues/1400) for the Grant Items advancement is available on GitHub, but may not reflect the current state of the advancement.

### Configuration Schema

The Grant Items advancement contains the `items` property, an array of objects each containing the `uuid` property pointing to the item to add and the `optional` boolean.

The global `optional` boolean controls whether the whole advancement is optional.

The `spell` object contains configuration data for granted spells, but can be `null` if no spell configuration is defined. It contains the `ability` property, a set of ability IDs, the `method` property indicating the preparation method to apply, `prepared` indicates whether the spell is unprepared, prepared, or always prepared, and a `uses` object containing the `max` formula and the `per` property, one of `CONFIG.DND5E.limitedUsePeriods`.

```javascript
{
  items: [
    { uuid: "Compendium.dnd5e.classfeatures.3sYPftQKnbbVnHrh", optional: false },
    { uuid: "Compendium.dnd5e.classfeatures.DPN2Gfk8yi1Z5wp7", optional: false },
    { uuid: "Compendium.dnd5e.classfeatures.ohwfuwnvuoBWlSQr", optional: false }
  ],
  optional: false,
  spell: {
    ability: [],
    method: "",
    prepared: 0,
    uses: {
      max: "",
      per: "",,
      requireSlot: false
    }
  }
}
```

### Value Schema

The Grant Items advancement stores an `added` object containing the locally created ID of items added and their original compendium UUIDs. It also stores the selected `ability` if the spell configuration has an ability specified.

```javascript
{
  "ability": null,
  "added": {
    "DPN2Gfk8yi1Z5wp7": "Compendium.dnd5e.classfeatures.3sYPftQKnbbVnHrh",
    "ohwfuwnvuoBWlSQr": "Compendium.dnd5e.classfeatures.DPN2Gfk8yi1Z5wp7",
    "3sYPftQKnbbVnHrh": "Compendium.dnd5e.classfeatures.ohwfuwnvuoBWlSQr"
  }
}
```

