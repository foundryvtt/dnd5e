![Up to date as of 6.0.0](https://img.shields.io/static/v1?label=dnd5e&message=6.0.0&color=informational)

The Modify Items advancement allows for applying an [enchantment](Enchantment.md) to one or more items on the actor sheet, changing how that item operates.

## Configuration

![Modify Items Configuration](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/modify-item-configuration.jpg)

Configuring a Modify Items advancement first involves adding an enchantment. This can be done directly using the plus button to create an enchantment directly on this item, selecting an existing enchantment on the item from the dropdown, or dropping an enchantment from a compendium onto the configuration dialog.

Once an enchantment is specific, the items it applies to can be controlled using the "Modified Items" input. This field takes either plain identifiers (e.g. `wild-shape` or `bane`) or typed identifiers (e.g. `feat:wild-shape` or `spell:bane`). The provided enchantment will be applied to all items that match the provided identifier, so it is usually better to include the type to avoid any potential over-application.

## Usage

![Modify Items Flow](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/modify-item-flow.jpg)

The Modify Items advancement will present the player with a list of the enchantments that will be applied along with the items to which they will be applied. There is no user control available.

## API

The [original proposal](https://github.com/foundryvtt/dnd5e/pull/6705) for the Modify Items advancement is available on GitHub, but may not reflect the current state of the advancement.

### Configuration Schema

The Modify Items advancement configuration contains the `changes` property, an array of objects each containing the unique `_id` property, an optional `uuid` property, and the `identifiers` property which is a set of identifiers to match.

For local enchantment, the `_id` property will match the ID of the enchantment to apply and the `uuid` property will be `null`. For remote enchantments the `_id` property will be random and the `uuid` property will point to an enchantment in a compendium.

```javascript
{
  changes: [{
    _id: "hEH7rtcFJaMUHFwJ",
    uuid: null,
    identifiers: new Set(["feat:wild-shape"])
  }]
}
```

### Value Schema

The Modify Items advancement stores a `modified` property which is an array of objects each containing a `change` ID matching one of the entries in the `changes` array in configuration, the `effect` ID for the enchantment created on a specific item, and the `item` ID for the item that was modified.

```javascript
{
  modified: [{
    change: "M7eo7scau0y8yqck",
    effect: "uZuT5u0Qgg57vYNj",
    item: "SLH3RALzZIpNULQI"
  }]
}
```
