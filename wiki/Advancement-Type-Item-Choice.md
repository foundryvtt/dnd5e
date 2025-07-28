![Up to date as of 5.1.0](https://img.shields.io/static/v1?label=dnd5e&message=5.1.0&color=informational)

The Choose Items advancement is designed for any feature that gives the player a choice of options to add to their character at a certain level. This covers features with a limited set of options such as Fighting Style and more open ended features such as Magical Secrets.

## Configuration

![Choose Items Configuration](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/item-choice-configuration.jpg)

The Choose Items configuration is split into three columns. The first column contains the standard advancement configuration plus additional options that control what items can be chosen by the player.

The "Allow Drops" option controls whether players can choose their own items through the compendium browser or drag & drop, or if they can only choose from the items pre-configured on the advancement. Beneath that is the "Item Type" dropdown that allows for limiting the items that can be selected. Selecting certain item types will cause additional options to appear for further refining the types allowed.

If the "Item Type" is set to "Spell" then an additional set of controls appear. The "Spell Level" allows for restricting what levels of spells can be chosen when added manually by the player. It can be restricted to a specific spell level or allow for selecting any spell that the character can cast. The "Spell Lists" allows restricting the spell selection to only spells included on certain spell lists. The remaining controls affect the spells that are added to the sheet. More information on using these controls is available on the [Grant Items advancement guide](Advancement-Type-Grant-Items).

The second column is the pool of items available for selection. Dropping items here will add them to the list, and they can be removed by clicking the delete entry trashcan next to each item. Some advancements, like Eldritch Invocations, might have a large list of items filled here, while others, such as Magical Secrets won't include any items at all.

The third column is a list of the number of items that can be chosen at any given level. These numbers should indicate only the number of new items allowed for each level, not the total the character should have. So for a Warlock's Eldritch Invocations it should include a `1` at 1st level, a `2` at 2nd level, and a `2` at 5th level, but nothing at 3rd or 4th level.

Each level also includes a checkbox that controls whether previous choices can be replaced at that level. Eldritch Invocation should have every checkbox after level 1 checked, indicating that they can replace their invocations every time they level up, but a Cleric's Divine Order shouldn't have any checked because it is fixed once they take it.

## Usage

![Choose Items Flow](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/item-choice-flow.jpg)

The Choose Items advancement will present a list of items that can be chosen for a given level, allowing for as many items to be checked as the player is allowed to select. If additional items are allowed, then a link to the compendium browser will be included and items added this way will be added to the bottom of the list. Any additional items can be removed using the delete button next to them. Details on all items can be viewed by clicking on their names.

![Choose Items Compendium Browser](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/item-choice-compendium-browser.jpg)

After the first level for which a choice was made, previous choices will be listed at the top of the window grouped by level. If replacements are allowed for a level, then a radio button will appear to these previous choices that can be used to indicate which should be replaced. Selecting the replacement will only be available once an item to replace is selected.

If multiple abilities are specified in the spell configuration, then the interface will also present the player with an option to choose from among them.

## API

The [original proposal](https://github.com/foundryvtt/dnd5e/issues/1401) for the Choose Items advancement is available on GitHub, but may not reflect the current state of the advancement.

### Configuration Schema

The Choose Items advancement contains the `allowDrops` boolean which controls whether player-provided items are supported.

The `choices` object contains objects grouped by level that include the `count` property indicating how many items the player can choose at that level, and the `replacement` boolean indicating whether a replacement item can be chosen.

The `pool` property is an array of objects that include a `uuid` property indicating the item that can be chosen.

The `restriction` object contains `type`, indicating the item category (in this case "Class Features"), `subtype` indicating the subtype within that (in this case only "Hunter's Prey" features), `level` indicating the allowed spell level if spells are selected, and `list` includes the IDs of spell lists to restrict the choices to.

The `spell` property is an object with spell configuration which is detailed in the [Grant Items advancement guide](Advancement-Type-Grant-Items).

The `type` property contains the general item type allowed, such as classes, weapons, or spells.

```javascript
{
  allowDrops: false,
  choices: {
    3: { count: 1, replacement: false }
  },
  pool: [
    { uuid: "Compendium.dnd5e.classfeatures.5gx1O0sxK08awEO9" },
    { uuid: "Compendium.dnd5e.classfeatures.StfmqK1twVfukpa0" },
    { uuid: "Compendium.dnd5e.classfeatures.C6sHdDGmCMo0cYHd" }
  ],
  restriction: {
    type: "class",
    subtype: "huntersPrey",
    level: "",
    list: []
  },
  spell: null,
  type: "feat"
}
```

### Value Schema

The Choose Items advancement value contains the `ability` property which is only used with spells when an ability is specified in the spell configuration.

The `added` object is a list of levels each of which has an object containing the locally created ID of items added and their original compendium UUIDs.

The `replaced` object is a list of levels in which a replacement occurred and contains the `level` of the replaced item, the ID of the `original` item that was replaced, and the ID of the `replacement` item.

```javascript
{
  ability: "",
  added: {
    3: { "DPN2Gfk8yi1Z5wp7": "Compendium.dnd5e.classfeatures.3sYPftQKnbbVnHrh" }
  },
  replaced: {
    5: {
      level: 3,
      original: "DPN2Gfk8yi1Z5wp7",
      replacement: "C6sHdDGmCMo0cYHd"
    }
  }
}
```

