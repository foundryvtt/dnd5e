![Up to date as of 4.1.0](https://img.shields.io/static/v1?label=dnd5e&message=4.1.0&color=informational)

Enchantments are a special type of Active Effect that makes changes on the item to which they are added, rather than the actor like normal Active Effects. They are configured in much the same way as normal Active Effects, but rely on different attribute keys that are documented below.

![Enchantment Effect Changes](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enchantment/enchantment-changes.jpg)

In the example above, the spell "Magic Weapon" is configured to modify the name of the item to add `+1` to the end, add the magical property, and set the magical bonus. The name is set using a change format that allows for referencing the original name using a pair of curly brackets (`{}`) and the `override` change mode. This allows for more complex changes to the item's name than would normally be possible with active effects.


## Enchantment Changes

This describes how to create Active Effects used as Enchantments. This differs from the [Active Effect Guide](Active-Effect-Guide) in that these are changes to items instead of the actors. If you're creating an Active Effect to add to the Additional Effects section when configuring an Enchantment, then use that guide.

Because of the differences in item types, there are separate sections for each type that can be enchanted. This uses the same [Legend](Active-Effect-Guide#legend) that the Active Effect Guide does in addition to:

- `[string]` - A string value
- `[file]` - A file path, e.g. `icons/svg/mystery-man.svg`

### Common Examples

These examples are common across item types, meaning they'll work equally well for a Weapon or Equipment.

```
name
img
system.description.value
                   chat
       properties
```

#### Changing the Name

You can reference the original name using a pair of curly brackets (`{}`) and the `override` change mode (e.g. `{}, +1` for a +1 weapon would result in `Shortsword, +1`).

| Attribute Key | Change Mode | Effect Value | Roll Data? |
| ------------- | ----------- | ------------ | ---------- |
| `name`        | Override    | `[string]`   | No         |

#### Changing the Icon

| Attribute Key | Change Mode | Effect Value | Roll Data? |
| ------------- | ----------- | ------------ | ---------- |
| `img`         | Override    | `[file]`     | No         |

#### Changing the Description

You can reference the original description using a pair of curly brackets (`{}`) and the `override` change mode (e.g. `{} <p>Some more description</p>`) or use the `add` change mode to add to the end of the existing description. Note that any added description should be written using HTML, which can be copied from an existing item using the "Source HTML" button in the description editor.

| Attribute Key              | Change Mode | Effect Value | Roll Data? |
| -------------------------- | ----------- | ------------ | ---------- |
| `system.description.value` | Override    | `[string]`   | No         |

#### Adding Item Properties

The valid effect values depend on the item type, and in the case of consumables the subtype, which are documented below.

| Attribute Key       | Change Mode | Effect Value | Roll Data? |
| ------------------- | ----------- | ------------ | ---------- |
| `system.properties` | Add         | `[string]`   | No         |

> <details>
> <summary>Weapon Properties</summary>
>
> | Weapon Property | Abbreviation |
> | --------------- | ------------ |
> | Adamantine      | `ada` |
> | Ammunition      | `amm` |
> | Finesse         | `fin` |
> | Firearm         | `fir` |
> | Focus           | `foc` |
> | Heavy           | `hvy` |
> | Light           | `lgt` |
> | Loading         | `lod` |
> | Magical         | `mgc` |
> | Reach           | `rch` |
> | Reload          | `rel` |
> | Returning       | `ret` |
> | Silvered        | `sil` |
> | Special         | `spc` |
> | Thrown          | `thr` |
> | Two-Handed      | `two` |
> | Versatile       | `ver` |
>
> Source: `CONFIG.DND5E.validProperties.weapon`
> </details>

> <details>
> <summary>Equipment Properties</summary>
>
> | Equipment Property   | Abbreviation          |
> | -------------------- | --------------------- |
> | Magical              | `mgc`                 |
> | Stealth Disadvantage | `stealthDisadvantage` |
>
> Source: `CONFIG.DND5E.validProperties.equipment`
> </details>

> <details>
> <summary>Tool Properties</summary>
>
> | Tool Property        | Abbreviation          |
> | -------------------- | --------------------- |
> | Magical              | `mgc`                 |
>
> Source: `CONFIG.DND5E.validProperties.tool`
> </details>

> <details>
> <summary>Ammunition Properties</summary>
>
> | Ammunition Property | Abbreviation |
> | ------------------- | ------------ |
> | Adamantine          | `ada`        |
> | Magical             | `mgc`        |
> | Silvered            | `sil`        |
>
> Source: `CONFIG.DND5E.validProperties.consumable` and `CONFIG.DND5E.itemProperties` that have `isPhysical: true`
> </details>

> <details>
> <summary>Scroll Properties</summary>
>
> | Scroll Property | Abbreviation    |
> | --------------- | --------------- |
> | Magical         | `mgc`           |
> | Ritual          | `ritual`        |
> | Somatic         | `somatic`       |
> | Verbal          | `verbal`        |
>
> Source: `CONFIG.DND5E.validProperties.consumable` and `CONFIG.DND5E.validProperties.spell` minus `material`
> </details>

> <details>
> <summary>Consumable Properties</summary>
>
> | Consumable Property | Abbreviation          |
> | ------------------- | --------------------- |
> | Magical             | `mgc`                 |
>
> Source: `CONFIG.DND5E.validProperties.consumable`
> </details>

> <details>
> <summary>Container Properties</summary>
>
> | Container Property  | Abbreviation         |
> | ------------------- | -------------------- |
> | Magical             | `mgc`                |
> | Weightless Contents | `weightlessContents` |
>
> Source: `CONFIG.DND5E.validProperties.container`
> </details>

> <details>
> <summary>Loot Properties</summary>
>
> | Loot Property | Abbreviation |
> | ------------- | ------------ |
> | Magical       | `mgc`        |
>
> Source: `CONFIG.DND5E.validProperties.loot`
> </details>

### Weapon Examples

```
system.proficient
       magicalBonus
```

#### Grant Proficiency with the Weapon

| Attribute Key       | Change Mode | Effect Value | Roll Data? |
| ------------------- | ----------- | ------------ | ---------- |
| `system.proficient` | Upgrade     | `1`          | No         |

#### Make Weapon Magical

Make the weapon magical by adding the Magical property and an optional Magical Bonus that will be added to attack and damage rolls.

| Attribute Key         | Change Mode | Effect Value | Roll Data? |
| --------------------- | ----------- | ------------ | ---------- |
| `system.properties`   | Add         | `mgc`        | No         |
| `system.magicalBonus` | Override    | `[number]`   | No         |

### Equipment Examples

```
system.proficient
       armor.value
             magicalBonus
             dex
       strength
```

#### Grant Proficiency with the Equipment

| Attribute Key       | Change Mode | Effect Value | Roll Data? |
| ------------------- | ----------- | ------------ | ---------- |
| `system.proficient` | Upgrade     | `1`          | No         |

#### Make Armor Magical

Make the armor magical by adding the Magical property and an optional Magical Bonus that will be added to AC.

| Attribute Key               | Change Mode | Effect Value | Roll Data? |
| --------------------------- | ----------- | ------------ | ---------- |
| `system.properties`         | Add         | `mgc`        | No         |
| `system.armor.magicalBonus` | Override    | `[number]`   | No         |

### Tool Examples

```
system.proficient
       ability
       bonus
       chatFlavor
```

#### Grant Proficiency with the Tool

| Attribute Key       | Change Mode | Effect Value | Roll Data? |
| ------------------- | ----------- | ------------ | ---------- |
| `system.proficient` | Upgrade     | `1`          | No         |

#### Add Bonus to Tool

| Attribute Key  | Change Mode | Effect Value | Roll Data? |
| -------------- | ----------- | ------------ | ---------- |
| `system.bonus` | Add         | `[formula]`  | Yes        |

### Consumable Examples

```
system.magicalBonus
```

#### Make Ammunition Magical

Make ammunition magical by adding the Magical property and an optional Magical Bonus that will be added to the attack/damage rolls.

| Attribute Key         | Change Mode | Effect Value | Roll Data? |
| --------------------- | ----------- | ------------ | ---------- |
| `system.properties`   | Add         | `mgc`        | No         |
| `system.magicalBonus` | Override    | `[number]`   | No         |

### Container Examples

```
system.capacity.value
                type
```

#### Make Contents Weightless

| Attribute Key       | Change Mode | Effect Value         | Roll Data? |
| ------------------- | ----------- | -------------------- | ---------- |
| `system.properties` | Add         | `weightlessContents` | No         |

### Common Usage Examples

This documents the Usage section on item sheets, common to many item types.

```
system.activation.type
                  cost
                  condition
       target.value
              width
              units
              type
              prompt
       range.value
             long
             units
       duration.value
                units
       uses.value
            max
            per
            recovery
            prompt
       consume.type
               target
               amount
               scale
```

#### Double the Normal and Long Range

| Attribute Key        | Change Mode | Effect Value | Roll Data? |
| -------------------- | ----------- | ------------ | ---------- |
| `system.range.value` | Multiply    | `2`          | No         |
| `system.range.long`  | Multiply    | `2`          | No         |

#### Add Charges to be Used By Additional Items

| Attribute Key        | Change Mode | Effect Value | Roll Data? |
| -------------------- | ----------- | ------------ | ---------- |
| `system.uses.max`    | Override    | `[formula]`  | Yes        |
| `system.uses.per`    | Override    | `charges`    | No         |
| `system.uses.prompt` | Override    | `false`      | No         |

> <details>
> <summary>Uses Per Values</summary>
>
> | Uses Per   | Abbreviation |
> | ---------- | ------------ |
> | Short Rest | `sr`         |
> | Long Rest  | `lr`         |
> | Day        | `day`        |
> | Charges    | `charges`    |
> | Dawn       | `dawn`       |
> | Dusk       | `dusk`       |
>
> Source: `CONFIG.DND5E.limitedUsePeriods`
> </details>

> [!warning]
> **Never** alter the `system.uses.value` attributes with an enchantment as this **will** cause issues.

### Common Action Examples

This documents the Action section on item sheets, common to many item types.

```
system.actionType
       ability
       attack.bonus
              flat
       critical.threshold
                damage
       damage.parts
              versatile
       formula
       save.ability
            dc
            scaling
       chatFlavor
```

#### Set Critical Hit Threshold

| Attribute Key               | Change Mode | Effect Value | Roll Data? |
| --------------------------- | ----------- | ------------ | ---------- |
| `system.critical.threshold` | Downgrade   | `[number]`   | No         |

#### Add Extra Critical Hit Damage

| Attribute Key            | Change Mode | Effect Value | Roll Data? |
| ------------------------ | ----------- | ------------ | ---------- |
| `system.critical.damage` | Add         | `[formula]`  | Yes        |

#### Add Extra Damage

Since damage is both a roll formula and damage type, you need to include both when adding extra damage.

| Attribute Key         | Change Mode | Effect Value        | Roll Data? |
| --------------------- | ----------- | ------------------- | ---------- |
| `system.damage.parts` | Add         | `[["2d6", "fire"]]` | Yes        |

> <details>
> <summary>Damage Types</summary>
>
> | Damage Type | Abbreviation  |
> | ----------  | ------------- |
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

## Activity Changes

Enchantments can also target changes to item activities based on their type. This is done using the format `activities[<type>].<change path>`.

### Attack Activity Examples

#### Changing the Attack Ability

| Attribute Key                       | Change Mode | Effect Value | Roll Data? |
| ----------------------------------- | ----------- | ------------ | ---------- |
| `activities[attack].attack.ability` | Override    | `[string]`   | No         |

#### Setting Flat To Hit

| Attribute Key                     | Change Mode | Effect Value | Roll Data? |
| --------------------------------- | ----------- | ------------ | ---------- |
| `activities[attack].attack.bonus` | Override    | `[formula]`  | Yes        |
| `activities[attack].attack.flat`  | Override    | `true        | No         |

#### Lowering the Critical Threshold

| Attribute Key                                  | Change Mode | Effect Value | Roll Data? |
| ---------------------------------------------- | ----------- | ------------ | ---------- |
| `activities[attack].attack.critical.threshold` | Downgrade   | `[number]`   | No         |

### Save Activity Examples

#### Setting a Specific Save DC

| Attribute Key                          | Change Mode | Effect Value | Roll Data? |
| -------------------------------------- | ----------- | ------------ | ---------- |
| `activities[save].save.dc.calculation` | Override    |              | No         |
| `activities[save].save.dc.formula`     | Override    | `[formula]`  | Yes        |
