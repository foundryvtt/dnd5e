![Up to date as of 3.3.0](https://img.shields.io/static/v1?label=dnd5e&message=3.3.0&color=informational)

The D&D system includes an item activation method that allows for adding enchantments to items. These enchantments can modify the stats of an item (such as *Magic Weapon* giving a mundane weapon a +1 magical bonus), carry effects that apply to an actor (such as the *Fire Rune* granting a player double proficiency on tool checks), and carry items that are added to the actor (such as the *Arcane Propulsive Armor* give the player a set of gauntlets that can be used to attack).

![Enchantment Summary](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enchantment/enchantment-summary.jpg)

## Configuring Enchantment

To set up a feature or spell to perform enchantment, it first must have the "Action Type" of "Enchant". This is configured on the details tab of the item beneath the header "Spell Effects" or "Feature Attack", depending on item type. Once that is selected a new enchantment line will appear below. The "Configure Enchantment" button will allow for further configuration and the area below will display any other items that have been enchanted by this one.

![Item Details Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enchantment/enchantment-item-details.jpg)

Clicking the "Configure Enchantment" button will open the enchantment configuration screen. This screen contains all of the controls needed to configure what enchantments can be applied and what items can be enchanted.

![Enchantment Configuration](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enchantment/enchantment-configuration.jpg)

### Enchantments

The top section contains a list of Enchantments that can be applied by this item. The "Create Enchantment" button can be used to create one which will open up the setup window for that specific enchantment. These enchantments are special active effects that target the item to which they are added rather than the actor, and thus they are configured in much the same way as normal active effects.

![Enchantment Effect Changes](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enchantment/enchantment-changes.jpg)

In the example above, the spell "Magic Weapon" is configured to modify the name of the item to add `+1` to the end, add the magical property, and set the magical bonus. The name is set using a change format that allows for referencing the original name using a pair of curly brackets (`{}`) and the `override` change mode. This allows for more complex changes to the item's name than would normally be possible with active effects.

Within the "Additional Settings" dropdown for each enchantment there are more controls for each individual enchantment. The Level Limit defines what levels an enchantment can be used. Since "Magic Weapon" shown above is a spell, these levels correspond to the level at which the spell is cast. If this were on a feature, then these numbers would reference either the character level or a class level if the "Class Identifier" field is filled in (not visible in the above screenshots).

The other two options define what effects and items are added whenever the enchantment is added. The effects must be normal active effects defined on the same item as the enchantment. The items can be any item, but it is generally good practice to create links only to items in compendiums.

**Note:** The "Additional Items" can only be configured when running Foundry V12 or later, on V11 the items will be read-only.

### Restrictions

The next section defines what types of items can be enchanted. Checking "Allow Magical" will allow the enchantment to be applied to items that are already magical, and the "Item Type" will restrict the enchantment to certain broad item categories (e.g. Equipment, Weapon).

## Performing Enchantment

Once configuration is complete, enchantment is very easy. Simply activate the feature or spell as you would normally and the enchantment options will appear in the usage prompt if these is more than one enchantment profile available, otherwise the enchantment will go straight to chat.

![Enchantment Chat Message](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enchantment/enchantment-chat-message.jpg)

In the activation chat message a drop area will appear. Any player may drop an item in this area to enchant that item and the enchanted items will be listed. GMs or the player who owns the item will have access to the "Remove Enchantment" button in the chat card which will quickly remove the enchantment. Enchantments can also be removed by breaking concentration if they are from a concentration effect, or by enter the "Effects" tab on the item and manually deleting the enchantment.

## Enchantment Active Effects

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

You can reference the original name using a pair of curly brackets (`{}`) and the `override` change mode (e.g. `{}, +1` for a +1 weapon).

| Attribute Key | Change Mode | Effect Value | Roll Data? |
| ------------- | ----------- | ------------ | ---------- |
| `name`        | Override    | `[string]`   | No         |

#### Changing the Icon

| Attribute Key | Change Mode | Effect Value | Roll Data? |
| ------------- | ----------- | ------------ | ---------- |
| `img`         | Override    | `[file]`     | No         |

#### Changing the Description

You can reference the original description using a pair of curly brackets (`{}`) and the `override` change mode (e.g. `{} <p>Some more description</p>`).

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
> | Concentration        | `concentration`       |
> | Magical              | `mgc`                 |
> | Stealth Disadvantage | `stealthDisadvantage` |
>
> Source: `CONFIG.DND5E.validProperties.equipment`
> </details>

> <details>
> <summary>Tool Properties</summary>
>
> | Tool Property   | Abbreviation          |
> | -------------------- | --------------------- |
> | Concentration        | `concentration`       |
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
> | Concentration   | `concentration` |
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
