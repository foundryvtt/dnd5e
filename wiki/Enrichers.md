![Up to date as of 3.2.0](https://img.shields.io/static/v1?label=dnd5e&message=3.2.0&color=informational)

The dnd5e system adds a number of useful enrichers that can be used within journals or in item or actor descriptions. These enrichers will generate text based on the standard formatting used throughout 5e releases and provide rolls and related behavior that properly hooks into the system.

[Award](#award-enricher) | [Check](#check-enrichers) | [Damage/Heal](#damage-enrichers) | [Item](#item-use-enrichers) | [Lookup](#lookup-enrichers) | [Reference](#reference-enrichers) | [Save](#save-enrichers)

![Enricher Preview](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enrichers-preview.jpg)

### Using This Guide

This guide breaks down the different types of enrichers offered by the system. Each section lists several examples of using the enricher, a table of options that can be provided, and several potential issues that might cause the enricher to not enrich.

The option table describes the options that can be provided to the enricher. Options are used in the enricher in the format of `<name>=<value>`. If the **Inferred** column is checked, then that indicates that the name can be usually left off and only the value used.

If spaces are required within the value, then you must surround it with double quotation marks: `<name>="Two Words"`. The **Assembled** column indicates that that options can be used with spaces without the quotation marks.

The **Formula** column indicates what type of data is accepted for the value. A list and description of the various formats are available in the dropdown below.

> <details>
>   <summary>Option Formats</summary>
>   <ul>
>     <li><strong>Boolean</strong>: Either `true` or `false`.</li>
>     <li><strong>Choice</strong>: One of several choices that will be described in the option description below the table.</li>
>     <li><strong>Formula</strong>: A roll or calculation formula.</li>
>     <li><strong>@-Path</strong>: A path referencing a part of a document's data that begins with the `@` symbol, such as can be used in roll formulas. Cannot contain spaces or other calculation details.</li>
>     <li><strong>ID</strong>: A 16-digit ID for a document, found by right clicking on the button in the document header.</li>
>   </ul>
> </details>

## Award Enricher
See the enrichers section of the [awards guide](Awards).


## Check Enrichers
Check enrichers allow for rolling ability checks, skill checks, and tool checks using all of the proper modifiers of the character performing the roll.

It is very common for a feature description or journal entry to include a call for an ability check. Now you can simply write `[[/check dex]]` and it will be formatted into `"[Dexterity]"`, with that text being a link that will open up the roll check dialog when clicked. By default only the ability is shown, but it can be expanded by writing `[[/check dex format=long]]` which will display as `"[Dexterity check]"`.

The format also supports full-length ability names (e.g. `[[/check dexterity]]`) and prefixed terms (e.g. `[[/check ability=dex]]`) for greater clarity.

Including a DC in the roll will display it in the description and pass it through to the roll, highlighting in chat whether the result was a success or failure. A value of `[[/check dex 15]]` or `[[/check ability=dexterity dc=15]]` becomes `"[DC 15 Dexterity]"` or `"[DC 15 Dexterity check]"` if `format=long` is set.

The DC can either be a fixed value or a resolved formula based on the stats of the owner of the item included in it. So adding `[[/check dex dc=@abilities.con.dc]]` will set to DC to whatever the pre-calculated constitution DC is on the creature that owns the item with this enricher.

![Enricher Passive](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enricher-passive.jpg)

Using the `passive` option on a check enricher displays a passive description and allows the enhanced passive tooltip for characters that are part of the primary party. A standard passive perception check can be achieved by using `[[/skill perception 15 passive format=long]]` to produce the text `"passive Wisdom (Perception) score of 15 or high"`, or the format option can be left out for the shorter `"DC 15 passive Wisdom (Perception)"`.

The `[[/check]]`, `[[/skill]]`, `[[/tool]]` starting terms are all interchangeable, and the final roll will be presented based on the inputs given. So `[[/check dexterity athletics]]` will perform a dexterity check using a character's athletics proficiency if present.

For skill or tool checks, the ability is optional. If one is provided then the person rolling have that ability selected by default even if it isn't the default on their sheet. Otherwise they will use whatever ability is set for that skill on their character sheet.

#### Examples

```
// Example: Make a dexterity check
[[/check ability=dexterity]]
[[/check dexterity]]
[[/check dex]]

// Example: Add a DC to a dexterity check
[[/check ability=dexterity dc=20]]
[[/check dexterity 20]]
[[/check DC 20 Dexterity]]

// Example: Make an acrobatics check using default ability, using either check or skill keyword
[[/check skill=acrobatics]]
[[/check acrobatics]]
[[/skill skill=acrobatics]]
[[/skill acrobatics]]

// Example: Specify an alternate ability on a skill check
[[/skill ability=strength skill=intimidation dc=20]]
[[/skill DC 20 Strength (Intimidation)]]
[[/skill strength intimidation 20]]

// Example: Passive check
[[/skill skill=perception dc=15 passive=true]]
[[/skill DC 15 passive Perception]]

// Example: Use a formula for the DC
[[/check int dc=@abilities.charisma.dc]]
[[/check cha dc="8 + @prof"]]

// Example: Tool & Vehicle checks
[[/tool ability=dexterity tool=thief]]
[[/tool ability=strength vehicle=water]]
```

#### Options

| Name       | Format  | Inferred  | Assembled |
| ---------- | ------- | --------- | --------- |
| `ability`  | Choice  |     ✔︎     |           |
| `dc`       | Formula |		 ✔︎     |           |
| `skill`    | Choice  |		 ✔︎     |           |
| `tool`     | Choice  |		 ✔︎     |           |

- `ability`: Ability to use with the check
- `dc`: Specific number or formula used for the DC. Formula must not contain dice values. Can only be used inferred with a number, formulas must contains the `dc=` prefix and spaces in formula must be surrounded by quotation marks
- `skill` or `tool`: Skill or tool to roll. If ability isn't specified, then the default ability for that skill will be used

> <details>
> <summary>Tool Ids</summary>
>
> | Tool                   | Id             |
> |------------------------|----------------|
> | Alchemist's Supplies   | `alchemist`    |
> | Bagpipes               | `bagpipes`     |
> | Brewer's Supplies      | `brewer`       |
> | Calligrapher's Supplies | `calligrapher`|
> | Playing Cards Set      | `card`         |
> | Carpenter's Tools      | `carpenter`    |
> | Cartographer's Tools   | `cartographer` |
> | Chess Set              | `chess`        |
> | Cobbler's Tools        | `cobbler`      |
> | Cook's Utensils        | `cook`         |
> | Dice Set               | `dice`         |
> | Disguise Kit           | `disg`         |
> | Drum                   | `drum`         |
> | Dulcimer               | `dulcimer`     |
> | Flute                  | `flute`        |
> | Forgery Kit            | `forg`         |
> | Glassblower's Tools    | `glassblower`  |
> | Herbalism Kit          | `herb`         |
> | Horn                   | `horn`         |
> | Jeweler's Tools        | `jeweler`      |
> | Leatherworker's Tools  | `leatherworker`|
> | Lute                   | `lute`         |
> | Lyre                   | `lyre`         |
> | Mason's Tools          | `mason`        |
> | Navigator's Tools      | `navg`         |
> | Painter's Supplies     | `painter`      |
> | Pan Flute              | `panflute`     |
> | Poisoner's Kit         | `pois`         |
> | Potter's Tools         | `potter`       |
> | Shawm                  | `shawm`        |
> | Smith's Tools          | `smith`        |
> | Thieves' Tools         | `thief`        |
> | Tinker's Tools         | `tinker`       |
> | Viol                   | `viol`         |
> | Weaver's Tools         | `weaver`       |
> | Woodcarver's Tools     | `woodcarver`   |
>
> Source: `CONFIG.DND5E.toolIds` </details>

#### Potential Issues
- No ability specified or able to be inferred from proficiency type
- Skill or tool proficiency specified wasn't found
- Invalid DC formula


## Damage Enrichers
Unlike simple inline roll links (the old `[[/r 2d6]]`), damage enrichers allow for properly associating damage types with rolls, automatically calculating the average, and will present the damage roll dialog when clicked allowing them to rolled as criticals or modified with temporary bonuses.

The basic format of a damage enricher is `[[/damage {formula} {type}]]`, so one could write `[[/damage 2d6 fire]]` and it will be parsed as `"[2d6] fire"` in the final text, with the dice formula rollable. This could also be written with a more explicit syntax such as `[[/damage formula=2d6 type=fire]]` if that format is more to your liking.

For a format like shown in many places through 5e releases, you can use the `average` flag to auto-calculate the average. Typing `[[/damage 2d6 fire average]]` or `[[/damage 2d6 fire average=true]]` will result in `"7 ([2d6]) fire"`. If for some reason the system cannot automatically calulate the average or you wish to display something different, you can enter a custom value that will be displayed. So `[[/damage 2d6kh fire average=5]]` will display `"5 (2d6kh) fire"`.

The formula can also include formula values that will be evaluated before the damage is displayed in the condition. If you wanted to add a feature to a monster that includes its modifier in a damage roll, you might write `[[/damage 1d6 + @abilities.dex.mod slashing]]` and it will be parsed using whatever dexterity modifier is on the actor that owns the item.

> [!Note]
> Any values entered in the formula will be resolved based on the stats of the owner of the item, not who ultimately performs the roll.

### Healing Enricher
While healing can be provided using the standard damage enricher using one of the healing types (`healing` or `temp`), there is also a dedicated enricher to make it a bit clearer. This can be used in the format of `[[/healing {formula}]]` for normal healing and `[[/healing {formula} temp]]` for temporary HP. This also accepts the `average` parameter just like the damage enricher.

#### Examples

```
// Example: Simple damage formula
[[/damage formula="1d6 + 2" type=fire]]
[[/damage formula=1d6+2 type=fire]]
[[/damage 1d6 + 2 fire]]

// Example: Displaying average damage
[[/damage formula=2d6 type=radiant average=true]]
[[/damage 2d6 radiant average]]

// Example: Standard healing
[[/healing formula="2d4 + 2" type=healing]]
[[/healing formula="2d4 + 2"]]
[[/healing 2d4 + 2 healing]]
[[/healing 2d4 + 2]]
[[/damage formula="2d4 + 2" type=healing]]
[[/damage 2d4 + 2 healing]]

// Example: Temp HP
[[/healing formula=10 type=temphp]]
[[/healing 10 temp]]
[[/damage formula=10 type=temphp]]
[[/damage 10 temp]]
```

#### Options

| Name        | Format  | Inferred  | Assembled |
| ----------- | ------- | --------- | --------- |
| `average`   | Boolean |           |           |
| `formula`   | Formula |     ✔︎     |     ✔︎     |
| `type`      | Choice  |     ✔︎     |           |

- `average`: Display the calculated average damage along side the roll in the enriched text (e.g. `7 (2d6) bludgeoning`)
- `formula`: Formula used for the damage roll
- `type`: Damage type

#### Potential Issues
- If no formula is specified
- Invalid damage formula


## Item Use Enrichers
Item enrichers allow you to use an item from an enriched link. There are several different methods to create an Item enricher, which will determine how the item is used:

**By Item Name**: `[[/item Bite]]`

This functions similarly to a system macro, as if you had dragged that item to the macro hotbar. When clicked, it will check for a selected token, or your assigned actor. If the token or actor has an item of a matching name, it will be used, otherwise a warning will be displayed.

**By Item & Activity Name**: `[[/item Bite activity=Poison]]`

Using the item name without an activity will cause the activity selection dialog to open if more than one activity is present. To trigger a specific activity on the item the activity name can be included. The activity name must be proceeded by `activity=`, and it must be wrapped in quotes if there is a space in the name (e.g. `[[/item Tentacles activity="Escape Tentacles"]]`).

**By UUID**: `[[/item Actor.p26xCjCCTQm5fRN3.Item.amUUCouL69OK1GZU]]`

A UUID contains references to an Actor and an Item it owns. When clicked, the enricher will find the specified Actor and use the specified Item.

**By Relative ID:** `[[/item amUUCouL69OK1GZU]]` or `[[/item .amUUCouL69OK1GZU]]`

A Relative ID can contain a reference to an owned Item either by an ID, or a relative UUID (note the preceding `.`). When clicked, the enricher will use its location (either in an Actor Sheet, Item Sheet, or Chat Card) to determine the Token or Actor that owns that card or sheet in order to use the specified item from that owner.

The activity name can also be used when referring to an item using its ID in the same manner as above with item name.

![Item Enricher](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enricher-item.png)


## Lookup Enrichers

The lookup enricher allows for referencing data within an actor's roll data and displaying it in a description. This is most useful for automatically including a creature's name (`[[lookup @name]]`) or their type (`[[lookup @details.type.config.label]]`), but can be used to reference any values normally available in [roll data](Roll-Formulas.md).

![Lookup Enricher](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enricher-lookup.jpg)

A few additional parameters are available to transform the resulting text:
- `[[lookup @name lowercase]]`: Converts the text to all lowercase (e.g. "adult white dragon")
- `[[lookup @name uppercase]]`: Converts the text to all uppercase (e.g. "ADULT WHITE DRAGON")
- `[[lookup @name capitalize]]`: Capitalizes the first word in the text (e.g. "Adult white dragon")

#### Examples

```
// Example: Display an actor's name in lowercase
[[lookup @name lowercase]]

// Example: Display an actor's name with a fallback
[[lookup @name]]{the creature}
```

#### Options

| Name       | Format  | Inferred  | Assembled |
| ---------- | ------- | --------- | --------- |
| `path`     | @-Path  |     ✔︎     |     ✔︎     |
| `style`    | Choice  |     ✔︎     |           |

- `path`: Path to the formula to display, see [Roll Formulas](Roll-Formulas) for a limited list of these paths. If there is no value found at the path (such as looking up the actor name on an item not in an actor), then the enricher will display the original path unless a fallback is provided using the enricher's label
- `style`: Formatting that will be applied to the final value. Can be `capitalize`, `lowercase`, or `uppercase`


## Reference Enrichers
The `&Reference` enricher allows for easy reference to rule pages and displays rich tooltips with the contents of a specific rule. It comes built-in with support for abilities, skills, conditions, damage types, and more.

![Enricher Reference](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enricher-reference.jpg)

Using the enricher is very simple, simply type `&Reference` with the name of the referenced rule included inside the square brackets. For example `&Reference[prone]` will include be converted to `[Prone]` which links to the prone page in the SRD rules and display a tooltip with the description of the prone condition.

#### Examples

```
// Example: Reference a condition
&Reference[condition=prone]
&Reference[Prone]
&Reference[prone]

// Example: Reference a condition without the apply button
&Reference[blinded apply=false]

// Example: Reference another rule
&Reference[rule="Difficult Terrain"]
&Reference[Difficult Terrain]
```

#### Options

| Name       | Format  | Inferred  | Assembled |
| ---------- | ------- | --------- | --------- |
| `apply`    | Boolean |           |           |
| Varies     | Choices |     ✔︎     |     ✔︎     |

- `apply`: Usable only when referencing a condition to prevent the apply condition button from appearing
- The rule can be referenced explicitly by rule category if necessary, but it is usually sufficient to just put in the name of the rule being referenced

> <details>
> <summary>Ability References</summary>
>
> | Ability      | Short ID | Full ID        |
> | ------------ | -------- | -------------- |
> | Strength     | `str`    | `strength`     |
> | Dexterity    | `dex`    | `dexterity`    |
> | Constitution | `con`    | `constitution` |
> | Intelligence | `int`    | `intelligence` |
> | Wisdom       | `wis`    | `wisdom`       |
> | Charisma     | `cha`    | `charisma`     |
> | Honor        | N/A      | N/A            |
> | Sanity       | N/A      | N/A            |
>
> Source: `CONFIG.DND5E.abilities` </details>


> <details>
> <summary>Skill References</summary>
>
> | Skill           | Short ID | Full ID          |
> | --------------- | -------- | ---------------- |
> | Acrobatics      | `acr`    | `acrobatics`     |
> | Animal Handling | `ani`    | `animalHandling` |
> | Arcana          | `arc`    | `arcana`         |
> | Athletics       | `ath`    | `athletics`      |
> | Deception       | `dec`    | `deception`      |
> | History         | `his`    | `history`        |
> | Insight         | `ins`    | `insight`        |
> | Intimidation    | `itm`    | `intimidation`   |
> | Investigation   | `inv`    | `investigation`  |
> | Medicine        | `med`    | `medicine`       |
> | Nature          | `nat`    | `nature`         |
> | Perception      | `prc`    | `perception`     |
> | Performance     | `prf`    | `performance`    |
> | Persuasion      | `per`    | `persuasion`     |
> | Religion        | `rel`    | `religion`       |
> | Sleight of Hand | `slt`    | `sleightOfHand`  |
> | Stealth         | `ste`    | `stealth`        |
> | Survival        | `sur`    | `survival`       |
>
> Source: `CONFIG.DND5E.skills` </details>


> <details>
> <summary>Condition References</summary>
>
> | Condition     | ID              |
> | ------------- | --------------- |
> | Blinded       | `blinded`       |
> | Charmed       | `charmed`       |
> | Deafened      | `deafened`      |
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
> Source: `CONFIG.DND5E.conditionTypes` </details>


> <details>
> <summary>Creature Type References</summary>
>
> | Creature Type | ID            |
> | ------------- | ------------- |
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
> Source: `CONFIG.DND5E.creatureTypes` </details>


> <details>
> <summary>Damage Type References</summary>
>
> | Damage Type | ID            |
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
> Source: `CONFIG.DND5E.damageTypes` </details>


> <details>
> <summary>Area of Effect References</summary>
>
> | Area of EFfect | ID       |
> | -------------- | -------- |
> | Cone           | `cone`   |
> | Cube           | `cube`   |
> | Sphere         | `sphere` |
> | Square         | `square` |
> | Line           | `line`   |
>
> Source: `CONFIG.DND5E.areaTargetTypes` </details>


> <details>
> <summary>Spell Component & Tag References</summary>
>
> | Component/Tag   | ID                  |
> | --------------- | ------------------- |
> | Concentration   | `concentration`     |
> | Material        | `material`          |
> | Ritual          | `ritual`            |
> | Somatic         | `somatic`           |
> | Verbal          | `verbal` or `vocal` |
>
> Source: `CONFIG.DND5E.spellComponents` & `CONFIG.DND5E.spellTags` </details>


> <details>
> <summary>Spell School References</summary>
>
> | Spell School  | Short ID | Full ID         |
> | ------------- | -------- | --------------- |
> | Abjuration    | `abj`    | `abjuration`    |
> | Conjuration   | `con`    | `conjuration`   |
> | Divination    | `div`    | `divination`    |
> | Enchantment   | `enc`    | `enchantment`   |
> | Evocation     | `evo`    | `evocation`     |
> | Illusion      | `ill`    | `illusion`      |
> | Necromancy    | `nec`    | `necromancy`    |
> | Transmutation | `trs`    | `transmutation` |
>
> Source: `CONFIG.DND5E.spellSchools` </details>


> <details>
> <summary>Other Rules (selected)</summary>
>
> <p>Inspiration, Carrying Capacity, Encumbrance, Hiding, Passive Perception, Falling, Suffocating, Lightly Obscured, Heavily Obscured, Bright Light, Dim Light, Darkness, Blindsight, Darkvision, Truesight, Surprise, Difficult Terrain, Size, Grappling, Shoving, Half Cover, Three-Quarters Cover, Total Cover, Instant Death, Death Saving Throws, Underwater Combat, Attunement, Telepathy</p>
>
> Source: `CONFIG.DND5E.rules`

#### Potential Issues
- Rule isn't found


## Save Enrichers
Save enrichers allow for rolling saving throws using all of the proper modifiers of the character performing the roll.

Much like check enrichers, save enrichers include two different formats. By default they are presented in the short format. Writing `[[/save dex]]` will result in just the ability name `"[Dexterity]"`. It can be expanded by writing `[[/save dex format=long]]`, which will display as `"[Dexterity saving throw]"`.

The format also supports full-length ability names (e.g. `[[/save dexterity]]`) and prefixed terms (e.g. `[[/save ability=dex]]`) for greater clarity.

Including a DC in the roll will display it in the description and pass it through to the roll, highlighting in chat whether the result was a success or failure. A value of `[[/save dex 15]]` or `[[/save ability=dexterity dc=15]]` becomes `"[DC 15 Dexterity]"` or `"[DC 15 Dexterity saving throw]"` if `format=long` is set.

The DC can either be a fixed value or a resolved formula based on the stats of the owner of the item included in it. So adding `[[/save dex dc=@abilities.con.dc]]` will set to DC to whatever the pre-calculated constitution DC is on the creature that owns the item with this enricher.

#### Examples

```
// Example: Create a dexterity saving throw
[[/save ability=dexterity]]
[[/save dexterity]]
[[/save dex]]

// Example: Add a DC to the save
[[/save ability=dexterity dc=20]]
[[/save dexterity 20]]
[[/save DC 20 Dexterity]]
```

#### Options

| Name       | Format  | Inferred  | Assembled |
| ---------- | ------- | --------- | --------- |
| `ability`  | Choice  |     ✔︎     |           |
| `dc`       | Formula |     ✔︎     |           |

- `ability`: Ability to use when making the save=
- `dc`: Specific number or formula used for the DC. Formula must not contain dice values. Can only be used inferred with a number, formulas must contains the `dc=` prefix

#### Potential Issues
- If no ability is specified
- Invalid DC formula
