![Up to date as of 4.2.0](https://img.shields.io/static/v1?label=dnd5e&message=4.2.0&color=informational)

The Scale Value advancement allows for setting a value that increases with character or class level and is available anywhere roll formula data is used.

## Configuration

// TODO: Configuration Image

The first step in configuring a Scale Value is determining what type of data is being represented. The advancement comes with several supported types including "Numeric" (e.g. Barbarian's Rage bonus), "Challenge Rating" (e.g. Druid's maximum Wild Shape CR), "Dice" (e.g. Rogue's Sneak Attack dice), and "Distance" (e.g. Monk's Unarmored Movement bonus). If none of these types match what is needed, then the "Anything" type can be used.

If the "Distance" type is selected then an additional field will be available allowing for setting the units used to measure the distance value. The same units are used across all levels.

The identifier is important for scale values because it determines how the scale value is accessed in formulas. It should only contain lowercase letters a-z, numbers, underscores (`_`), and dashes (`-`). Beneath the identifier is a hint that includes the full @-value for referencing the scale value with a copy button.

On the right hand you define the scale value itself. The details in this area will change depending on the type selected, but in general these are values grouped by level. Adding a value in a level will cause that value to be used for all levels higher than it until a new value is set.

## Usage

// TODO: Flow Image

The Scale Value advancement will present to the player the previous value and the new value whenever the scale value would change.

Accessing the scale value in formulas involves typing `@scale.<class identifier>.<advancement identifier>`, so referencing a Barbarian's rages is `@scale.barbarian.rages`.

For the "Dice" scale value type there are several additional options for access. For a Rogue's Sneak Attack, the whole die formula can be accessed like any other type: `@scale.rogue.sneak-attack` produces `4d6`. If only the die part is desired, appending `.die` to the value will fetch it: `@scale.rogue.sneak-attack.die` produces `d6`. Similarly adding `.number` will grab the die count: `@scale.rogue.sneak-attack.number` produces `4`. Finally `.faces` can be used to access the number of faces on the die without the leading `d`: `@scale.rogue.sneak-attack.faces` produces `6`.

## API

The [original proposal](https://github.com/foundryvtt/dnd5e/issues/1406) for the Scale Value advancement is available on GitHub, but may not reflect the current state of the advancement.

### Configuration Schema

The Scale Value advancement configuration contains the `distance.units` string value, one of `CONFIG.DND5E.movementUnits`, which is used by the "Distance" type.

The `identifier` property controls how the advancement is available in formulas.

The `scale` property is a mapping of character or class levels and an object. The contained object structure varies depending on the advancement type, but for most it contains `value` as a string or number.

For die scale value it instead contains `number` and `faces`, two number specifying the number of dice and the denomination, as well as `modifiers`, a set of roll modifiers. The `modifiers` value currently can only be set using an active effect (e.g. `system.scale.rogue.sneak-attack.modifiers | ADD | rr=1`).

The `type` property indicates what type of scale value is used.

```javascript
{
  distance: {
    "units": "ft"
  },
  identifier: "unarmored-movement",
  scale: {
    2: { value: 10 },
    6: { value: 15 },
    10: { value: 20 },
    14: { value: 25 },
    18: { value: 30 }
  },
  type: "distance"
}
```

### Value Schema

None
