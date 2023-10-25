![Up to date as of 2.3.x](https://img.shields.io/badge/dnd5e-v2.3.x-informational)

This document only covers Active Effects available to the Core dnd5e System.

# Legend

`[number]` - These square brackets mean "replace this with your value of the type within the brackets".
So this example: `+[number]` would mean you input `+3`.

`[formula]` - When `formula` is mentioned in this document it means this value can be populated with any dice formula. For example, Bless adds several effects with the Effect Value of `1d4`.

As part of this, an [Actor's Rolldata](https://github.com/foundryvtt/dnd5e/wiki/Roll-Formulas) is available as "@attributes." Useful examples:

| @attribute                 | Description                   |
| -------------------------- | ----------------------------- |
| `@abilities.dex.mod`       | Actor's Dexterity Modifier    |
| `@prof`                    | Actor's Proficiency Bonus     |
| `@details.level`           | Actor's overall Level         |
| `@classes.barbarian.levels` | Actor's Barbarian Class Level |

> [!Note]
> When using formulas in an Active Effect Value, the actor sheet display that corresponds to the changed value will not display the evaluated formula, but it will be applied when rolled.
> E.g. When adding `+@abilities.cha.mod` to `system.bonuses.abilities.save` to simulate a Paladin's Aura of Protection, the actor sheet will not display that bonus applied to saving throws. The bonus will be present when the saving throw is rolled.

| Change Mode | Description |
|------------ | ------------|
| Add         | Adds the provided value to the specified attribute. For numerical attributes, this can be used to both add and subtract from a particular value by specifying `+1` or `-1` as the value to add. |
| Multiply    | Multiplies the defined attribute by the numeric value in the Effect Value field.|
| Override    | Replaces the defined attribute with the value provided in the Effect Value field.|
| Downgrade   | Reduces the defined attribute only in cases where the current value of that attribute would be greater than value specified in the Effect Value field.|
| Upgrade     | Increases the defined attribute only in cases where the current value of that attribute would be less than value specified in the Effect Value field. |
| Custom      | The Custom change mode applies logic defined by a game system or add-on module. The dnd5e system does not utilize the Custom Change Mode|

> [!important]
> When using the `ADD` change mode, it is always recommended to include the `+` in the Effect Value, this will ensure that if you have multiple effects targeting the same Attribute, they will not be concatenated (e.g. two effects that `ADD | +1` will result in a bonus of `+1+1`, whereas two effects that `ADD | 1` will result in a bonus of `+11`.

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

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.abilities.[abbreviation].value`     | Override     | `[number]`     |

### Upgrading an Ability Score
E.g. an Item or potion that sets an ability score to a set value, if the value does not already exceed that value, such as the Gauntlets of Ogre Power

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.abilities.[abbreviation].value`     | Upgrade     | `[number]`     |

### Bonus to a Specific Saving Throw

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.abilities.[abbreviation].bonuses.save`     | Add     | `+[number/formula]`     |


### Bonus to a Specific Ability Check

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.abilities.[abbreviation].bonuses.check`     | Add     | `+[number/formula]`     |


### Bonus to All Ability Checks

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.abilities.skill`     | Add     | `+[number/formula]`     |


### Bonus to All Saving Throws

E.g. Paladin Aura of Protection

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.abilities.save`     | Add     | `+[number/formula]`     |

### Bonus to Initiative

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.attributes.init.bonus`     | Add     | `+[number/formula]`     |

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

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.skills.[abbreviation].bonuses.check`     | Add     | `+[number/formula]`     |

### Bonus to a Specific Skill Passive

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.skills.[abbreviation].bonuses.passive`     | Add     | `+[number/formula]`     |

### Bonus to All Skill Checks

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.abilities.skill`     | Add     | `+[number/formula]`     |

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

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.attributes.movement.[movementType]`     | Multiply     | `[number]`     |


### Add a different Speed
E.g. An Item or Spell which grants an Actor a flying or swimming speed.

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.attributes.movement.[movementType]`     | Override     | `[number]`     |

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

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.attributes.ac.bonus`     | Add     | `+[number/formula]`     |



### Override the AC Calculation to a custom formula

E.g. An Item or Spell which sets the Actor's AC to `12 + Int` for the duration.

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.attributes.ac.calc`     | Override     | `custom`     |
| `system.attributes.ac.formula`     | Custom     | `12 + @abilities.int.mod`     |

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

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.mwak.attack`     | Add     | `+[number/formula]`     |
| `system.bonuses.msak.attack`     | Add     | `+[number/formula]`     |


### Bonus to All Ranged Attack Rolls (both spell and weapon)

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.rwak.attack`     | Add     | `+[number/formula]`     |
| `system.bonuses.rsak.attack`     | Add     | `+[number/formula]`     |

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

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.mwak.damage`     | Add     | `+[number/formula]`     |
| `system.bonuses.msak.damage`     | Add     | `+[number/formula]`     |


### Bonus to All Ranged Attack Damage Rolls (both spell and weapon)

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.rwak.damage`     | Add     | `+[number/formula]`     |
| `system.bonuses.rsak.damage`     | Add     | `+[number/formula]`     |

---

## Immunities/Resistances/Vulnerabilities

```
system.traits.ci.value
              di
              dr
              dv
```

> [!WARNING]
> These only serve as a marker on the actor sheet, the core system has no automations around immunities, resistances, or vulnerabilities.

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


| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.traits.ci.value`     | Add     | `[conditionType]`     |

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

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.traits.di.value`     | Add     | `[damageType]`     |

### Add a Damage Type Resistance

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.traits.dr.value`     | Add     | `[damageType]`     |

### Add a Damage Type Vulnerability

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.traits.dv.value`     | Add     | `[damageType]`     |

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
> | Key | Value    |
> | ------------- | -------- |
> |`system.scale.[classIdentifier].[scaleIdentifier]`| 3d8|
> | `system.scale.[classIdentifier].[scaleIdentifier].number` | 3 |
> | `system.scale.[classIdentifier].[scaleIdentifier].die` | d8  |
> | `system.scale.[classIdentifier].[scaleIdentifier].faces` | 8    |
> </details>

### Increase the value of a Scale Value
E.g. An Item or Spell which allows additional use(s) of a Class Feature (e.g. adds an additional use of a Barbarian's Rage).

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.scale.barbarian.rages.value`     | Add     | `+[number]`     |

### Increase the number of die of a Dice Scale Value
E.g. An Item or Spell which increases the number of die in a Dice Scale Value (e.g. adds a die to a Rogue's Sneak Attack).

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.scale.rogue.sneak-attack.number`     | Add     | `+[number]`     |

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

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.attributes.hp.tempmax`     | Add     | `+[number]`     |

### Bonus to the Maximum HP
E.g. An Item or Feature which increases a character's Max HP.

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.attributes.hp.bonuses.overall`     | Add     | `+[number/formula]`     |

### Bonus HP for each Character Level
E.g. An effect that provides a bonus to the HP a character gains for each Level they acquire (e.g. Tough).

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.attributes.hp.bonuses.level`     | Add     | `+[number/formula]`     |
