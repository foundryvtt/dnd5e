![Up to date as of 3.0.0](https://img.shields.io/static/v1?label=dnd5e&message=3.0.0&color=informational)

This document only covers Active Effects available to the Core dnd5e System.

# Legend

`[number]` - These square brackets mean "replace this with your value of the type within the brackets". So this example: `[number]` would mean you input `3`. If roll data is allowed, you can input any roll data that would *evaluate* to a number.

`[formula]` - When `formula` is mentioned in this document it means this value can be populated with any dice formula. For example, Bless adds several effects with the Effect Value of `1d4`. These fields always allow for the use of roll data.

See the [Actor's Rolldata](https://github.com/foundryvtt/dnd5e/wiki/Roll-Formulas) article for what is available for use as roll data.

Useful examples:

| @attribute                  | Description                   |
| --------------------------- | ----------------------------- |
| `@abilities.dex.mod`        | Actor's Dexterity Modifier    |
| `@prof`                     | Actor's Proficiency Bonus     |
| `@details.level`            | Actor's overall Level         |
| `@details.cr`               | Actor's Challenge Rating      |
| `@classes.barbarian.levels` | Actor's Barbarian Class Level |

> [!Note]
> When using formulas in an Active Effect Value, the actor sheet display that corresponds to the changed value will not always display the evaluated formula, but it will be applied when rolled.
> E.g. When adding `@abilities.cha.mod` to `system.bonuses.abilities.save` to simulate a Paladin's Aura of Protection, the actor sheet will not display that bonus applied to saving throws. The bonus will be present when the saving throw is rolled.

| Change Mode | Description |
|------------ | ------------|
| Add         | Adds the provided value to the specified attribute. For numerical attributes, this can be used to both add and subtract from a particular value by specifying `1` or `-1` as the value to add. |
| Multiply    | Multiplies the defined attribute by the numeric value in the Effect Value field.|
| Override    | Replaces the defined attribute with the value provided in the Effect Value field.|
| Downgrade   | Reduces the defined attribute only in cases where the current value of that attribute would be greater than value specified in the Effect Value field.|
| Upgrade     | Increases the defined attribute only in cases where the current value of that attribute would be less than value specified in the Effect Value field. |
| Custom      | The Custom change mode applies logic defined by a game system or add-on module. The dnd5e system does not utilize the Custom Change Mode|

# Commonly Desired Effect Examples

## Abilities

```
system.abilities.[abbreviation].value
                                bonuses.check
                                        save
```


> <details>
> <summary>Ability Abbreviations</summary>
>
> | Ability      | Abbreviation |
> | ------------ | ------------ |
> | Strength     | `str`        |
> | Dexterity    | `dex`        |
> | Constitution | `con`        |
> | Wisdom       | `wis`        |
> | Intelligence | `int`        |
> | Charisma     | `cha`        |
>
> Source: `CONFIG.DND5E.abilities`
>
> </details>


### Overriding an Ability Score
E.g. an Item or potion that sets an ability score to a set value while in use

| Attribute Key                           | Change Mode | Effect Value | Roll Data? |
| --------------------------------------- | ----------- | ------------ | ---------- |
| `system.abilities.[abbreviation].value` | Override    | `[number]`   | No

### Upgrading an Ability Score
E.g. an Item or potion that sets an ability score to a set value, if the value does not already exceed that value, such as the Gauntlets of Ogre Power

| Attribute Key                           | Change Mode | Effect Value | Roll Data? |
| --------------------------------------- | ----------- | ------------ | ---------- |
| `system.abilities.[abbreviation].value` | Upgrade     | `[number]`   | No         |

### Bonus to a Specific Saving Throw

| Attribute Key                                  | Change Mode | Effect Value | Roll Data? |
| ---------------------------------------------- | ----------- | ------------ | ---------- |
| `system.abilities.[abbreviation].bonuses.save` | Add         | `[formula]`  | Yes        |


### Bonus to a Specific Ability Check

| Attribute Key                                   | Change Mode | Effect Value | Roll Data? |
| ----------------------------------------------- | ----------- | ------------ | ---------- |
| `system.abilities.[abbreviation].bonuses.check` | Add         | `[formula]`  | Yes        |


### Bonus to All Ability Checks

| Attribute Key                    | Change Mode | Effect Value | Roll Data? |
| -------------------------------- | ----------- | ------------ | ---------- |
| `system.bonuses.abilities.skill` | Add         | `[formula]`  | Yes        |

### Bonus to All Saving Throws

E.g. Paladin Aura of Protection

| Attribute Key                   | Change Mode | Effect Value | Roll Data? |
| ------------------------------- | ----------- | ------------ | ---------- |
| `system.bonuses.abilities.save` | Add         | `[formula]`  | Yes        |

### Bonus to Initiative

| Attribute Key                  | Change Mode | Effect Value | Roll Data? |
| ------------------------------ | ----------- | ------------ | ---------- |
| `system.attributes.init.bonus` | Add         | `[formula]`  | Yes        |

---

## Skills
```
system.skills.[abbreviation].bonuses.check
                                     passive
```

> <details>
> <summary>Skill Abbreviations</summary>
>
> | Skill           | Abbreviation |
> | --------------- | ------------ |
> | Acrobatics      | `acr`        |
> | Animal Handling | `ani`        |
> | Arcana          | `arc`        |
> | Athletics       | `ath`        |
> | Deception       | `dec`        |
> | History         | `his`        |
> | Insight         | `ins`        |
> | Investigation   | `inv`        |
> | Intimidation    | `itm`        |
> | Medicine        | `med`        |
> | Nature          | `nat`        |
> | Persuasion      | `per`        |
> | Perception      | `prc`        |
> | Performance     | `prf`        |
> | Religion        | `rel`        |
> | Sleight of Hand | `slt`        |
> | Stealth         | `ste`        |
> | Survival        | `sur`        |
>
> Source: `CONFIG.DND5E.skills`
> </details>


### Bonus to a Specific Skill Check

| Attribute Key                                | Change Mode | Effect Value | Roll Data? |
| -------------------------------------------- | ----------- | ------------ | ---------- |
| `system.skills.[abbreviation].bonuses.check` | Add         | `[formula]`  | Yes        |

### Bonus to a Specific Skill Passive

| Attribute Key                                  | Change Mode | Effect Value | Roll Data? |
| ---------------------------------------------- | ----------- | ------------ | ---------- |
| `system.skills.[abbreviation].bonuses.passive` | Add         | `[number]`   | No         |

### Bonus to All Skill Checks

| Attribute Key                    | Change Mode | Effect Value | Roll Data? |
| -------------------------------- | ----------- | ------------ | ---------- |
| `system.bonuses.abilities.skill` | Add         | `[formula]`  | Yes        |

---

## Movement

```
system.attributes.movement.[movementType]
```

> <details>
> <summary>Movement Types</summary>
>
> | Movement Type | Value    |
> | ------------- | -------- |
> | Burrow        | `burrow` |
> | Climb         | `climb`  |
> | Fly           | `fly`    |
> | Swim          | `swim`   |
> | Walk          | `walk`   |
>
> Source: `CONFIG.DND5E.movementTypes`
> </details>


### Multiply Speed by modifier
E.g. An Item or Spell which doubles/halves/etc. an Actor's speed.

| Attribute Key                               | Change Mode | Effect Value | Roll Data? |
| ------------------------------------------- | ----------- | ------------ | ---------- |
| `system.attributes.movement.[movementType]` | Multiply    | `[number]`   | No         |


### Add a different Speed
E.g. An Item or Spell which grants an Actor a flying or swimming speed.

| Attribute Key                               | Change Mode | Effect Value | Roll Data? |
| ------------------------------------------- | ----------- | ------------ | ---------- |
| `system.attributes.movement.[movementType]` | Override    | `[number]`   | No         |

---

## Armor Class

```
system.attributes.ac.bonus
                     formula
                     calc
                     cover
                     flat
```

### Add a Bonus to AC

E.g. An Item or Spell which adds something to the Actor's current AC for the duration.

| Attribute Key                | Change Mode | Effect Value | Roll Data? |
| ---------------------------- | ----------- | ------------ | ---------- |
| `system.attributes.ac.bonus` | Add         | `[number]`   | Yes        |



### Override the AC Calculation to a custom formula

E.g. An Item or Spell which sets the Actor's AC to `12 + Int` for the duration.

| Attribute Key                  | Change Mode | Effect Value              |
| ------------------------------ | ----------- | ------------------------- |
| `system.attributes.ac.calc`    | Override    | `custom`                  |
| `system.attributes.ac.formula` | Override    | `12 + @abilities.int.mod` |

---

#### Bonus to Spell DCs

| Attribute Key             | Change Mode | Effect Value | Roll Data? |
| ------------------------- | ----------- | ------------ | ---------- |
| `system.bonuses.spell.dc` | Add         | `[number]`   | Yes        |

---

## Attack Roll Bonuses

```
system.bonuses.msak.attack
               mwak
               rsak
               rwak
```

> <details>
> <summary>Attack Roll Types</summary>
>
> | Movement Type        | Value  |
> | -------------------- | ------ |
> | Melee Spell attack   | `msak` |
> | Melee Weapon attack  | `mwak` |
> | Ranged Spell attack  | `rsak` |
> | Ranged Weapon attack | `rwak` |
>
> Source: `CONFIG.DND5E.itemActionTypes`
> </details>

### Bonus to All Melee Attack Rolls (both spell and weapon)

| Attribute Key                | Change Mode | Effect Value | Roll Data? |
| ---------------------------- | ----------- | ------------ | ---------- |
| `system.bonuses.mwak.attack` | Add         | `[formula]`  | Yes        |
| `system.bonuses.msak.attack` | Add         | `[formula]`  | Yes        |


### Bonus to All Ranged Attack Rolls (both spell and weapon)

| Attribute Key                | Change Mode | Effect Value | Roll Data? |
| ---------------------------- | ----------- | ------------ | ---------- |
| `system.bonuses.rwak.attack` | Add         | `[formula]`  | Yes        |
| `system.bonuses.rsak.attack` | Add         | `[formula]`  | Yes        |

---

## Damage Roll Bonuses

```
system.bonuses.msak.damage
               mwak
               rsak
               rwak
```

> <details>
> <summary>Attack Roll Types</summary>
>
> | Movement Type        | Value  |
> | -------------------- | ------ |
> | Melee Spell attack   | `msak` |
> | Melee Weapon attack  | `mwak` |
> | Ranged Spell attack  | `rsak` |
> | Ranged Weapon attack | `rwak` |
>
> Source: `CONFIG.DND5E.itemActionTypes`
> </details>

### Bonus to All Melee Attack Damage Rolls (both spell and weapon)

| Attribute Key                | Change Mode | Effect Value | Roll Data? |
| ---------------------------- | ----------- | ------------ | ---------- |
| `system.bonuses.mwak.damage` | Add         | `[formula]`  | Yes        |
| `system.bonuses.msak.damage` | Add         | `[formula]`  | Yes        |


### Bonus to All Ranged Attack Damage Rolls (both spell and weapon)

| Attribute Key                | Change Mode | Effect Value | Roll Data? |
| ---------------------------- | ----------- | ------------ | ---------- |
| `system.bonuses.rwak.damage` | Add         | `[formula]`  | Yes        |
| `system.bonuses.rsak.damage` | Add         | `[formula]`  | Yes        |

---

## Immunities/Resistances/Vulnerabilities

```
system.traits.ci.value
              di
              dr
              dv
```

### Add a Condition Immunity

> <details>
> <summary>Condition Types</summary>
>
> | Condition     | Value           |
> | ------------- | --------------- |
> | Blinded       | `blinded`       |
> | Charmed       | `charmed`       |
> | Deafened      | `deafened`      |
> | Diseased      | `diseased`      |
> | Exhaustion    | `exhaustion`    |
> | Frightened    | `frightened`    |
> | Grappled      | `grappled`      |
> | Incapacitated | `incapacitated` |
> | Invisible     | `invisible`     |
> | Paralyzed     | `paralyzed`     |
> | Petrified     | `petrified`     |
> | Poisoned      | `poisoned`      |
> | Prone         | `prone`         |
> | Restrained    | `restrained`    |
> | Stunned       | `stunned`       |
> | Unconscious   | `unconscious`   |
>
> Source: `CONFIG.DND5E.conditionTypes`
> </details>


| Attribute Key            | Change Mode | Effect Value      |
| ------------------------ | ----------- | ----------------- |
| `system.traits.ci.value` | Add         | `[conditionType]` |

### Add a Damage Type Immunity

> <details>
> <summary>Damage Types</summary>
>
> | Damage Type | Value         |
> | ----------- | ------------- |
> | Acid        | `acid`        |
> | Bludgeoning | `bludgeoning` |
> | Cold        | `cold`        |
> | Fire        | `fire`        |
> | Force       | `force`       |
> | Lightning   | `lightning`   |
> | Necrotic    | `necrotic`    |
> | Piercing    | `piercing`    |
> | Poison      | `poison`      |
> | Psychic     | `psychic`     |
> | Radiant     | `radiant`     |
> | Slashing    | `slashing`    |
> | Thunder     | `thunder`     |
>
> Source: `CONFIG.DND5E.damageTypes`
> </details>

| Attribute Key            | Change Mode | Effect Value   |
| ------------------------ | ----------- | -------------- |
| `system.traits.di.value` | Add         | `[damageType]` |

### Add a Damage Type Resistance

| Attribute Key            | Change Mode | Effect Value   |
| ------------------------ | ----------- | -------------- |
| `system.traits.dr.value` | Add         | `[damageType]` |

### Add a Damage Type Vulnerability

| Attribute Key            | Change Mode | Effect Value   |
| ------------------------ | ----------- | -------------- |
| `system.traits.dv.value` | Add         | `[damageType]` |

### Add a Damage Type Modification
These are properties that cause the actor to take increased or decreased damage from certain damage types.

| Attribute Key                          | Change Mode | Effect Value | Roll Data? |
| -------------------------------------- | ----------- | ------------ | ---------- |
| `system.traits.dm.amount.[damageType]` | Add         | `[number]`   | Yes        |

---

## Creature Type
Temporarily override the displayed creature type of an actor. For example using 'humanoid' as the `value` and 'elf' as the `subtype` to display an actor's creature type as 'Humanoid (elf)'.

> <details>
> <summary>Creature Types</summary>
> The available creature types for the `system.details.type.value` property. The `subtype` property is free-form text.
>
> | Creature Type | Key           |
> | ------------  | ------------- |
> | Aberration    | `aberration`  |
> | Beast         | `beast`       |
> | Celestial     | `celestial`   |
> | Construct     | `construct`   |
> | Dragon        | `dragon`      |
> | Elemental     | `elemental`   |
> | Fey           | `fey`         |
> | Fiend         | `fiend`       |
> | Giant         | `giant`       |
> | Humanoid      | `humanoid`    |
> | Monstrosity   | `monstrosity` |
> | Ooze          | `ooze`        |
> | Plant         | `plant`       |
> | Undead        | `undead`      |
>
> Source: `CONFIG.DND5E.creatureTypes`
> </details>

| Attribute Key                 | Change Mode | Effect Value     |
| ----------------------------- | ----------- | ---------------- |
| `system.details.type.value`   | Override    | `[creatureType]` |
| `system.details.type.subtype` | Override    | `[text]`         |

---

## Scale Value

```
system.scale.[classIdentifier].[scaleIdentifier]
                                                .value
                                                .number
                                                .die
                                                .faces
```

> <details>
> <summary>Dice Scale Values</summary>
>
> The Dice Scale Values have a few unique keys, here is an example of the result for these keys based on a scale value that is 3d8
>
> | Key                                                 | Value |
> | --------------------------------------------------- | ----- |
> | `@scale.[classIdentifier].[scaleIdentifier]`        | 3d8   |
> | `@scale.[classIdentifier].[scaleIdentifier].number` | 3     |
> | `@scale.[classIdentifier].[scaleIdentifier].die`    | d8    |
> | `@scale.[classIdentifier].[scaleIdentifier].faces`  | 8     |
> </details>

### Increase the value of a Scale Value
E.g. An Item or Spell which allows additional use(s) of a Class Feature (e.g. adds an additional use of a Barbarian's Rage).

| Attribute Key                        | Change Mode | Effect Value | Roll Data? |
| ------------------------------------ | ----------- | ------------ | ---------- |
| `system.scale.barbarian.rages.value` | Add         | `[number]`   | No         |

### Increase the number of die of a Dice Scale Value
E.g. An Item or Spell which increases the number of die in a Dice Scale Value (e.g. adds a die to a Rogue's Sneak Attack), and increases the size of the dice.

| Attribute Key                            | Change Mode | Effect Value | Roll Data? |
| ---------------------------------------- | ----------- | ------------ | ---------- |
| `system.scale.rogue.sneak-attack.number` | Add         | `[number]`   | No         |
| `system.scale.rogue.sneak-attack.faces`  | Add         | `[number]`   | No         |

---

## Hit Points

```
system.attributes.hp.value
                     max
                     temp
                     tempmax
                     bonuses.level
                             overall
```

> [!warning]
> **Never** alter the `value`, `max`, or `temp` attributes with an active effect, as this **will** cause issues.

### Temporary Bonus to the Maximum HP
E.g. An Item or Spell which temporarily increases a character's Max HP (e.g. Aid).

| Attribute Key                  | Change Mode | Effect Value | Roll Data? |
| ------------------------------ | ----------- | ------------ | ---------- |
| `system.attributes.hp.tempmax` | Add         | `[number]`   | No         |

### Bonus to the Maximum HP
E.g. An Item or Feature which increases a character's Max HP by a flat amount.

| Attribute Key                          | Change Mode | Effect Value | Roll Data? |
| -------------------------------------- | ----------- | ------------ | ---------- |
| `system.attributes.hp.bonuses.overall` | Add         | `[formula]`  | Yes        |

### Bonus HP for each Character Level
E.g. An effect that provides a bonus to the hit points a character gains for each level they acquire (e.g., the Tough feat).

| Attribute Key                        | Change Mode | Effect Value | Roll Data? |
| ------------------------------------ | ----------- | ------------ | ---------- |
| `system.attributes.hp.bonuses.level` | Add         | `[formula]`  | Yes        |


# Honorable Mentions
You can override the name of an actor (on the actor sheet, not the token), as well as its displayed image.

| Attribute Key | Change Mode | Effect Value        | Roll Data? |
| ------------- | ----------- | ------------------- | ---------- |
| `name`        | Override    | `Steve`             | No         |
| `img`         | Override    | `assets/steve.webp` | No         |

Overriding or adding to the proficiency modifier of the actor.

| Attribute Key            | Change Mode | Effect Value | Roll Data? |
| ------------------------ | ----------- | ------------ | ---------- |
| `system.attributes.prof` | Override    | `[number]`   | No         |
