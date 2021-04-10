- Add `D20Roll` and `DamageRoll` subclasses of `Roll`
- Add `ActorHitDiceConfig` app for modifying the hit dice on an actor
- Add `ActorTypeConfig` app for modifying the type on an NPC
- Deprecated `d20Dialog` and `damageDialog`

## Config Changes
- Add `DND5E.creatureTypes` containing 5e types with localized labels

## Data Changes
### Character
- Add `originalClass` which contains the ID for the first class added to the character. This value can be configured later using the "Special Traits" window on a character sheet
### NPC
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
### Class
- Add `saves` which is an object containing `value`, an array of abilities defined in `CONFIG.DND5E.abilities` indicating which saving throw proficiencies this class grants if it is the original class

## `Item5e` Changes
- Add `Item5e#getDerivedDamageLabel` to produce a simplified damage formula for UI uses
- Add `Item5e#prepareFinalAttributes` to finalize derived data after owner data has finished populating
- Add `Item5e#prepareMaxUses`

