![Up to date as of 3.0.0](https://img.shields.io/static/v1?label=dnd5e&message=3.0.0&color=informational)

The dnd5e system adds a number of useful enrichers that can be used within journals or in item or actor descriptions. These enrichers will generate text based on the standard formatting used throughout 5e releases and provide rolls and related behavior that properly hooks into the system.

![Enricher Preview](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enrichers-preview.jpg)

## Award Enricher

See the enrichers section of the [awards guide](Awards).


## Check & Save Enrichers
Check and save enrichers allow for rolling ability checks, skill checks, tool checks, and saving throws using all of the proper modifiers of the character performing the roll.

It is very common for a feature description or journal entry to include a call for a saving throw. Now you can simply write `[[/save dex]]` and it will be formatted into `"[Dexterity]"`, with that text being a link that will open up the roll save dialog when clicked. By default only the ability is shown, but it can be expanded by writing `[[/save dex format=long]]` which will display as `"[Dexterity saving throw]"`.

The format also supports full-length ability names (e.g. `[[/save dexterity]]`) and prefixed terms (e.g. `[[/save ability=dex]]`) for greater clarity.

Including a DC in the roll will display it in the description and pass it through to the roll, highlighting in chat whether the result was a success or failure. A value of `[[/save dex 15]]` or `[[/save ability=dexterity dc=15]]` becomes `"[DC 15 Dexterity]"` or `"[DC 15 Dexterity saving throw]"` if `format=long` is set.

The DC can either be a fixed value or a resolved formula based on the stats of the owner of the item included in it. So adding `[[/save dex dc=@abilities.con.dc]]` will set to DC to whatever the pre-calculated constitution DC is on the creature that owns the item with this enricher.

Check, skill, and tool enrichers work in much the same way. Writing `[[/check {ability} {dc}]]` will create a basic ability check, while `[[/skill acrobatics]]` will present an acrobatics check.

![Enricher Passive](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enricher-passive.jpg)

Using the `passive` option on a check enricher displays a passive description and allows the enhanced passive tooltip for characters that are part of the primary party. A standard passive perception check can be achieved by using `[[/skill perception 15 passive format=long]]` to produce the text `"passive Wisdom (Perception) score of 15 or high"`, or the format option can be left out for the shorter `"DC 15 passive Wisdom (Perception)"`.

The `[[/check]]`, `[[/skill]]`, `[[/tool]]` starting terms are all interchangeable, and the final roll will be presented based on the inputs given. So `[[/check dexterity athletics]]` will perform a dexterity check using a character's athletics proficiency if present.

For skill checks, the ability is optional. If one is provided then the person rolling have that ability selected by default even if it isn't the default on their sheet. Otherwise they will use whatever ability is set for that skill on their character sheet.

For tool checks, the ability is required. A check like `[[/tool thief]]` will not parse because the ability must be explicitly set like `[[/tool thief dex]]`. A list of the tool ids to use for this enricher is provided below.  

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


## Damage Enrichers
Unlike simple inline roll links (the old `[[/r 2d6]]`), damage enrichers allow for properly associating damage types with rolls, automatically calculating the average, and will present the damage roll dialog when clicked allowing them to rolled as criticals or modified with temporary bonuses.

The basic format of a damage enricher is `[[/damage {formula} {type}]]`, so one could write `[[/damage 2d6 fire]]` and it will be parsed as `"[2d6] fire"` in the final text, with the dice formula rollable. This could also be written with a more explicit syntax such as `[[/damage formula=2d6 type=fire]]` if that format is more to your liking.

For a format like shown in many places through 5e releases, you can use the `average` flag to auto-calculate the average. Typing `[[/damage 2d6 fire average]]` or `[[/damage 2d6 fire average=true]]` will result in `"7 ([2d6]) fire"`. If for some reason the system cannot automatically calulate the average or you wish to display something different, you can enter a custom value that will be displayed. So `[[/damage 2d6kh fire average=5]]` will display `"5 (2d6kh) fire"`.

The formula can also include formula values that will be evaluated before the damage is displayed in the condition. If you wanted to add a feature to a monster that includes its modifier in a damage roll, you might write `[[/damage 1d6 + @abilities.dex.mod slashing]]` and it will be parsed using whatever dexterity modifier is on the actor that owns the item.

> [!Note]
> Any values entered in the formula will be resolved based on the stats of the owner of the item, not who ultimately performs the roll.
