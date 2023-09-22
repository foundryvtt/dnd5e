# FoundryVTT dnd5e Active Effects Examples

![Up to date as of 2.1.x](https://img.shields.io/badge/dnd5e-v2.1.x-informational)

See [Kandashi's Active Effects Guide](https://docs.google.com/document/d/1DuZaIFVq0YulDOvpahrfhZ6dK7LuclIRlGOtT0BIYEo) for a trove of useful information

This document only covers Active Effects available to the Core dnd5e System.

## Legend

`[number]` - These square brakets mean "replace this with your value of the type within the brackets".
So this example: `+[number]` would mean you input `+3`.

`[formula]` - When `formula` is mentioned in this document it means this value can be populated with any dice formula. For example, Bless adds several effects with the Effect Value of `1d4`.


As part of this, an Actor's Rolldata is available as ["@attributes."](https://github.com/foundryvtt/dnd5e/wiki/Roll-Formulas) Useful examples:

| @attribute                 | Description                   |
| -------------------------- | ----------------------------- |
| `@abilities.dex.mod`       | Actor's Dexterity Modifier    |
| `@prof`                    | Actor's Proficiency Bonus     |
| `@details.level`           | Actor's overall Level         |
| `@classes.barbarian.levels` | Actor's Barbarian Class Level |

  
> Note that when using formulas in an Active Effect Value, the actor sheet display that corresponds to the changed value will not display the evaluated formula, but it will be applied when rolled.
> E.g. When adding `+@abilities.cha.mod` to `system.bonuses.abilities.save` to simulate a Paladin's Aura of Protection, the actor sheet will not display that bonus applied to saving throws. The bonus will be present when the saving throw is rolled.

To find out more about these, this post from Unsoluble in the [FoundryVTT Discord server](https://discord.gg/foundryvtt)'s #core-how-to channel can help:

> To explore the data model in order to refer to inline properties like character levels, attributes, and other values, here are a few approaches:
>
> • Select a token, then open up the dev tools (F12 on Win; ⌥⌘I on Mac), and paste this into the Console:
`console.log(canvas.tokens.controlled[0].actor.getRollData());`
>
> • Or: Install the "Autocomplete Inline Properties" module, to be able to just start typing in a supported field and have the available properties pop up (not all systems supported yet).
>
> • Or: Install this module (by pasting this manifest URL into the bottom of the Install Module window), enable it in your world, find and import its macro from the bundled Compendium, and run it on the selected token. `https://raw.githubusercontent.com/relick/FoundryVTT-Actor-Attribute-Lists/master/module.json`
>
> • Or: Right-click an actor in the sidebar and choose Export Data, which will get you a JSON file you can browse through. 


## Commonly Desired Effect Examples

### Abilities

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


#### Overriding an Ability Value
E.g. an Item or potion that sets an ability score to a set value while in use

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.abilities.[abbreviation].value`     | Override     | `[number]`     |

#### Bonus to a Specific Ability Save

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.abilities.[abbreviation].bonuses.save`     | Add     | `+[number/formula]`     |


#### Bonus to a Specific Ability Check

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.abilities.[abbreviation].bonuses.check`     | Add     | `+[number/formula]`     |


#### Bonus to All Ability Checks

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.abilities.skill`     | Add     | `+[number/formula]`     |


#### Bonus to All Ability Saves

E.g. Paladin Aura of Protection

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.abilities.save`     | Add     | `+[number/formula]`     |

---

### Skills
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


#### Bonus to a Specific Skill Check

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.skills.[abbreviation].bonuses.check`     | Add     | `+[number/formula]`     |

#### Bonus to a Specific Skill Passive

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.skills.[abbreviation].bonuses.passive`     | Add     | `+[number/formula]`     |

#### Bonus to All Skill Checks

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.abilities.skill`     | Add     | `+[number/formula]`     |

#### Bonus to Initiative

Initiative is not quite a skill but behaves similarly.

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.attributes.init.bonus`     | Add     | `+[number/formula]`     |

---

### Movement

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


#### Multiply Speed by modifier
E.g. An Item or Spell which doubles/halves/etc. an Actor's speed.

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.attributes.movement.[movementType]`     | Multiply     | `[number]`     |


#### Add a different Speed
E.g. An Item or Spell which grants an Actor a flying or swimming speed.

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.attributes.movement.[movementType]`     | Override     | `[number]`     |

---

### Armor Class

```
system.attributes.ac.bonus
                     formula
                     calc
                     cover
                     flat
```

#### Add a Bonus to AC

E.g. An Item or Spell which adds to the Actor's current AC to something for the duration.

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.attributes.ac.bonus`     | Add     | `+[number]`     |



#### Override the AC Calculation to a custom formula

E.g. An Item or Spell which sets the Actor's AC to something like `12 + Int` for the duration.

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.attributes.ac.calc`     | Override     | `custom`     |
| `system.attributes.ac.formula`     | Custom     | `10 + @abilities.str.mod`     |

---

### Attack Roll Bonuses

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

#### Bonus to All Melee Attack Rolls (both spell and weapon)

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.mwak.attack`     | Add     | `+[number/formula]`     |
| `system.bonuses.msak.attack`     | Add     | `+[number/formula]`     |


#### Bonus to All Ranged Attack Rolls (both spell and weapon)

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.rwak.attack`     | Add     | `+[number/formula]`     |
| `system.bonuses.rsak.attack`     | Add     | `+[number/formula]`     |

---

### Damage Roll Bonuses

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

#### Bonus to All Melee Attack Damage Rolls (both spell and weapon)

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.mwak.damage`     | Add     | `+[number/formula]`     |
| `system.bonuses.msak.damage`     | Add     | `+[number/formula]`     |


#### Bonus to All Ranged Attack Damage Rolls (both spell and weapon)

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.bonuses.rwak.damage`     | Add     | `+[number/formula]`     |
| `system.bonuses.rsak.damage`     | Add     | `+[number/formula]`     |

---

### Immunities/Resistances/Vulnerabilities

```
system.traits.ci.value
              di
              dr
              dv
```

> [!WARNING]
> These only serve as a marker on the actor sheet, the core system has no automations around immunities, resistances, or vulnerabilities.

#### Add a Condition Immunity

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

#### Add a Damage Type Immunity

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

#### Add a Damage Type Resistance

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.traits.dr.value`     | Add     | `[damageType]`     |

#### Add a Damage Type Vulnerability

| Attribute Key | Change Mode | Effect Value |
| -------- | -------- | -------- |
| `system.traits.dv.value`     | Add     | `[damageType]`     |
