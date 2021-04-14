# Changelog

## 1.3.0
- Add `D20Roll` and `DamageRoll` subclasses of `Roll`
- Add `ActorHitDiceConfig` app for modifying the hit dice on an actor
- Add `ActorTypeConfig` app for modifying the type on an NPC
- Add `Token5e` extension of `Token` which implements a fancy HP bar
- Add `TokenDocument5e` extention of `TokenDocument` and move `getBarAttribute` code into the new class
- Deprecated `d20Dialog` and `damageDialog`
- Removed Handlebars helper `getProperty` in favor built-in `lookup` helper


### Config Changes
- Add `DND5E.creatureTypes` containing 5e types with localized labels
- Add `DND5E.tokenHPColors` containing colors used on the new HP bar


### Data Changes
#### Character
- Add `originalClass` which contains the ID for the first class added to the character. This value can be configured later using the "Special Traits" window on a character sheet
#### NPC
- Replace original string value of `type` with object that contains more rich data:
  - `value`: One of the types defined in `CONFIG.DND5E.creatureTypes` or "custom", to use the contents of the `custom` field
  - `subtype`: A freeform string that will appear in the tag following the type (e.g. "Humanoid (**Orc**)")
  - `swarm`: Indicates whether the creature is a swarm. If it is empty, the NPC is treated as a single creature, otherwise if should be populated with a value from `CONFIG.DND5E.actorSizes` indicating what size the individual members of the swarm are (e.g. "Swarm of **Tiny** Beasts")
  - `custom`: A freeform string to use if the creature type isn't one of the standard 5e types (e.g. "**Alien** (Gray)"). *Note*: This field will only be used if `value` is set to "custom"
```json
"type": {
  "value": "humanoid",
  "subtype": "Orc",
  "swarm": "",
  "custom": ""
}
```
#### Class
- Add `saves` which is an object containing `value`, an array of abilities defined in `CONFIG.DND5E.abilities` indicating which saving throw proficiencies this class grants if it is the original class


### `Actor5e` Changes
- Add `formatCreatureType` static method to convert a NPC's creature type object into a localized string
- Add `_assignPrimaryClass` to automatically select the class with the most levels as the original class
- Move computation of owned item attributes into separate step at end of `Actor5e#prepareData`
- Rename `getClassFeatures` to `loadClassFeatures`
- Rename `_createClassFeatures` to `getClassFeatures`
- Remove shim method `_preCreateOwnedItem` as functionality has been moved to core
- Fix bug causing all death saving throw result messages to be public


### `ActorSheet5e` Changes
- Add automatic stacking of identical consumables when dragged onto the sheet
#### Character Sheet
- Apply `isOriginalClass` property to all classes
#### NPC Sheet
- Add `type` to `labels` containing the NPC's formatted type string


### `ActorSheetFlags` Changes
- Add dropdown to select original class


### `Item5e` Changes
- Add `getDerivedDamageLabel` to produce a simplified damage formula for UI uses
- Add `prepareFinalAttributes` to finalize derived data after owner data has finished populating
- Add `prepareMaxUses` to shift max use calculation out of `prepareDerivedData`
- Add `_preCreate`, `_onCreate`, `_preUpdate`, `_onDelete`, `_onCreateOwnedEquipment`, `_onCreateOwnedSpell`, and `_onCreateOwnedWeapon` methods to handle logic moved from `Actor5e#_preCreateOwnedItem`
- Remove restriction limiting finesse property to only martial weapons
- Remove restriction limiting use of elven accuracy to only weapons and spells


### `ItemSheet5e` Changes
- Add `"saves"` option to trait selectors displayed
- Rename `_onConfigureClassSkills` to `_onConfigureTraits` to reflect its expanded roll showing all trait selectors

