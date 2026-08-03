![Up to date as of 6.0.0](https://img.shields.io/static/v1?label=dnd5e&message=6.0.0&color=informational)

Rules are a special type of active effect changes provided by the system. Rather than being applied directly to data on an actor or item, these rules are evaluated at roll time an modify only a specific roll.

## Categories

Rules are grouped into several categories to control what types of rolls they affect. These categories are entered in the "Attribute Key" field in the change configuration window.

| Category  | Description                                                                   | Valid Rule Types |
| --------- | ----------------------------------------------------------------------------- | ---------------- |
| `attack`  | Affects the d20 roll for attacks.                                             | All              |
| `check`   | Affects the d20 roll for ability checks.                                      | All              |
| `d20`     | Affects the d20 roll for any attack, check, or save.                          | All              |
| `damage`  | Affects the first matching damage part.                                       | Bonus            |
| `save`    | Affects the d20 roll for ability saves, death saves, and concentration saves. | All              |
| `healing` | Same as with damage, but for healing.                                         | Bonus            |


## Types

There are four different rules that are currently available, bonus, advantage mode, and the range rules (minimum and maximum). All of these rules can be used for d20 rolls, but damage and healing only support bonus rules at this time.

### Advantage Mode *(d20 rolls only)*

This mode can be used to impose advantage or disadvantage on a certain d20 roll. The "Value" field takes a limited number of possible values to indicate how the advantage mode for the roll should be affects:

| Value | Description                                                   |
| ----- | ------------------------------------------------------------- |
| +1    | Add a source of advantage to the roll.                        |
| -1    | Add a source of disadvantage to the roll.                     |
| =+1   | Force the roll to have advantage (ignore disadvantages).      |
| =-1   | Force the roll to have disadvantage (ignore advantages).      |
| >=0   | Ignore any source of disadvantage, but still allow advantage. |
| <=0   | Ignore any source of advantage, but still allow disadvantage. |

### Bonus

The bonus mode simply adds new parts to a roll. This can be either a static value (e.g. `3` becomes `1d20 + 3`), a dice value (e.g. `1d4` becomes `1d20 + 1d4`), or a attribute (e.g. `@prof` becomes `1d10 + @prof` which may resolve to `1d20 + 2`).

For damage rolls this can also include a damage type annotation. Normally a damage bonus becomes whatever type it was applied to (so adding `1d4` to a rapier's damage means that it is piercing damage), but an annotation can change it to a different damage type (e.g. `1d4[fire]` means that extra damage is now fire damage).

### Roll Maximum & Roll Minimum *(d20 rolls only)*

The maximum and minimum rules affect the range of the d20 rolled. This affects strictly the value on the die before any modifiers are applied. Setting a minimum of `10` for example, results in `1d20min10` being rolled and any results on the die below that value become `10`.

This also accepts deterministic formulas, so you can enter a minimum of `@prof` and that will resolve to the proficiency modifier of the person rolling the die.


## Conditions

Rules are extremely broad by default. Adding a damage bonus rule means that that bonus is applied to all damage, whether it be from a spell or weapon, melee or ranged, and of any type. To narrow down when a rule is applied, effect & change conditions can be used.

The [active effect conditions page](Active-Effects.md#Conditions) goes over the details on how conditions are defined and what data can be generally filtered on. Of special importance to rules is the rolling description fields which provide additional information that can be used to narrow down when a rule should be applied (e.g. using the `roll.damageType` to only apply a bonus when the character does fire damage, or `roll.attack.mode` to apply a bonus only to thrown weapon attacks).

### Only Ranged Attacks

Minimum roll value for ranged attack rolls:

- **Key**: attack
- **Type**: Minimum
- **Value**: 10
- **Condition**:

```json
{
  "k": "roll.attack.type",
  "v": "ranged"
}
```

### Only Thrown Weapon Attacks

Apply a damage bonus to thrown weapon attacks:

- **Key**: damage
- **Type**: Bonus
- **Value**: 1d4
- **Condition**:

```json
{
  "k": "roll.attack.mode",
  "o": "startswith",
  "v": "thrown"
}
```

### Only Fire Damage

Add proficiency when dealing fire damage:

- **Key**: damage
- **Type**: Bonus
- **Value**: @prof
- **Condition**:

```json
{
  "k": "roll.damage.type",
  "v": "fire"
}
```

### Only Strength-Based D20 Tests

Disadvantage on all strength-based D20 rolls (attacks, saves, and checks):

- **Key**: d20
- **Type**: Advantage Mode
- **Value**: -1
- **Condition**:

```json
{
  "k": "roll.ability",
  "v": "str"
}
```
