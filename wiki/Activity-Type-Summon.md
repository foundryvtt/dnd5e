![Up to date as of 4.0.0](https://img.shields.io/static/v1?label=dnd5e&message=4.0.0&color=informational)

The Summon activity is designed to automatically bring summoned creatures into your world. This allows for summoning based on a pre-determined list of creatures or allowing the player to select a creature to summon based on CR and creature type. This activity can modify the summoned creatures before they are brought into the world and includes an interface for players to place them as desired in the scene.

![Summoning Summary](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-summary.jpg)


## Permissions

While GMs can always take advantage of summoning, this feature requires certain permissions to be set in order for it to be used by players. First the system setting "Allow Summoning" must be enabled:

![Summoning Permission](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-permission.jpg)

Then a few core Foundry permissions may need to be changed depending on how users will be using the feature.

- *Create New Tokens* (**required**): Players must always have permission to create new tokens for summoning to work.
- *Create New Actors*: Permission to create new actors must be set if summoning spells are configured to pull actors from compendiums. In order to use summoning without this then the GM can import actors and adjust the spells to pull from world actors rather than compendium actors. The player doing the summoning must have ownership permission on the world actor they are summoning.
- *Use File Browser*: If the token being summoned uses wildcard artwork, then players must have access to the file browser so the system can correctly set the artwork.


## Performing Summoning

To perform summoning, simply use the feature or spell as you would normally and the summoning options will appear in the usage prompt if available.

![Summon Prompt](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-prompt.jpg)

The *Place Summons* checkbox controls whether a summoned creature will be placed automatically and if there is more than one summoning profile the *Summons Profile* dropdown will allow player to select what type to summon. After this screen the character sheet will be minimized and they will be able to place the summon in the current scene.

![Summon Prompt - Compendium Browser](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-cr-prompt.jpg)

When summoning in *Challenge Rating & Type* mode, the compendium browser will be brought up after the profile is selected allowing the player to choose which specific creature they wish to summon.

![Summon Chat Message](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-chat-message.jpg)

If the summoned creature needs to be placed again, or the initial prompt was skipped, a "Summon" button will appear in the chat card.


## Configuring Summoning

After creating the Summon activity the configuration sheet will open to the "Identity" tab. In addition to the standard activity identity options (see the [Activities Overview](Activities.md) for more details), Summon also includes a *Summon Prompt* option. If this is unchecked, then the usage dialog will not attempt to summon by default, but summoning can always be performed from the chat card after the initial usage.

![Summon Sheet - Identity Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-identity.jpg)

### Summoning Profiles

Moving over to the Summoning tab reveals the core details of the Summon activity. The Profiles sub-tab contains the configuration for the creatures that will be summoned. It begins with "Mode", which determines whether a specific set of creatures can be summoned using the **"By Direct Link"** option, or whether the player can choose the creatures using the **"By Challenge Rating and Type"** option.

![Summon Sheet - Profiles Tab, Empty](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-profiles-empty.jpg)

Each profile can have a *Count* for how many of that profile will be summoned. This count can take formulas based on the summoning item’s roll data, allowing the count to scale based on the level at which the summoning occurs.

Profiles also have a *Display Name* which affects how that profile will be displayed in the summoning dialog. Changing this name will not modify the summoned creature’s name, only how it displays in the usage prompt.

#### By Direct Link

In **Direct Link** mode it is easy to add creatures by dragging and dropping them from the world or a compendium only the sheet. Dropping it directly onto an existing profile will associated that creature with that profile and dropping elsewhere will create a new profile for that creature.

![Summon Sheet - Profiles Tab, Direct Link](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-profiles-direct-link.jpg)

In the example above, the spell "Summon Beast" from *Tasha’s Cauldron of Everything*, there are three profiles created to match with the three variants of Bestial Spirit that can be created: Air, Land, and Water. Custom labels have been added to make the usage window more legible to players.

#### By Challenge Rating and Type

In **Challenge Rating & Type** mode the profile contains a *CR* field for setting the maximum CR of creature that can be summoned for that profile. Beneath the "Additional Settings" dropdown is the *Creature Types* field which allows for setting one or more creature types to allow for selection.

![Summon Sheet - Profiles Tab, Challenge Rating & Type](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-profiles-challenge-rating.jpg)

In the first example above, the spell "Conjure Animals" from the Player’s Handbook, there are four profiles with descending CRs and increasing quantities (the complex formula in the count field allows for the count to double at certain spell levels). The *Display Name* field is left blank allowing the summoning to automatically generate the appropriate label.

The second example shows the spell "Conjure Element", also from the Player’s Handbook. This only has a single summoning profile with a CR that scales based on the spell level (starting at CR 5 because it is a 5th level spell, and increasing CR by 1 for each level cast above 5th). The dropdown shows that that spell can only summon creatures with the "Elemental" type.

#### Summoning Level

When summoning occurs the process always has an associated level. For spells, this is based on the level at which the spell is cast, but for Summon activities on other items it varies depending on whether the *Class Identifier* is populated. If provided, then the summoning level will be based on the character’s level in that specific class, otherwise it will use the character’s overall level.

![Summon Sheet - Profiles Tab, Level Limits](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-profiles-level-limits.jpg)

This summoning level can be used to restrict certain profiles to only certain levels using the *Level Limits* fields in the "Additional Settings" dropdown. In the above example, the "Create Undead" spell from the Player’s Handbook, the level limit is set for the various undead creatures allowing only Ghouls to be summoned at 6th level, but allowing Ghasts and Wights at 8th level and Mummies at 9th level.

### Changes

The next tab defines changes to the creature and its items when summoned. Any fields that accept formulas will be resolved at time of summoning using `@` references from the item performing the summoning (allowing the use of `@item.level` or `@scaling` to adjust details based on the level cast) with details of the summoned creature available using `@summon` (so `@summon.attributes.hd` will give access to the HD size of a summoned NPC).

![Summon Sheet - Changes Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-changes.jpg)

#### Creature Changes

The "Creature Changes" section defines changes to the creature itself:
- *Match Proficiency*: Changes the summoned creature’s proficiency to match that of the summoner
- *Bonus Armor Class*: Bonus to the armor class on top of what is specified in the stat block
- *Bonus Hit Dice*: Number of hit dice to add to those on the summoned creature, based on the hit dice details inferred from the HP formula or creature size
- *Bonus Hit Points*: Additional hit points on top of those specified in the stat block
- *Creature Sizes* & *Creature Types*: Change the summoned creature’s size and type when summoning. If more than one option is selected, then the player will be able to choose in the summoning dialog

The example above shows the "Summon Beast" spell from *Tasha’s Cauldron of Everything* which matches the caster’s proficiency, gives a bonus to armor class based on spell level, and an extra 5 hit points for each level cast above the base level.

#### Item Changes

the "Item Changes" section defines changes make to the items (features, attacks, and other items) on the creature:
- *Match Attacks*: The To Hit on Attack activities will match that of the summoner
- *Match Saves*: The Save DC on Save activities will match that of the summoner
- *Bonus Attack Damage*, *Bonus Save Damage*, *Bonus Healing*: Additional damage when using the Attack or Save activities or additional healing when using the Heal activity

In the example above the *Match Attacks* checkbox is checked to ensure the attacks rolls match that of the caster, and the *Bonus Attack Damage* contains `@item.level` giving a bonus of the spell’s level to attack damage rolls. The other fields are left unchanged because the summoned creature doesn’t have any of those.
