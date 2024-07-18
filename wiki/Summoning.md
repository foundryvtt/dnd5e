![Up to date as of 3.3.0](https://img.shields.io/static/v1?label=dnd5e&message=3.2.0&color=informational)

The D&D system includes a system for automatically bringing summoned creatures into your world. This allows you to reference a list of creatures to be summoned from a feature or spell, modify the actors before they are brought into the world, and place them where you wish in the scene.

![Summoning Summary](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-summary.jpg)

## Permissions

While GMs can always take advantage of summoning, this feature requires certain permissions to be set in order for it to be used by players. First the system setting "Allow Summoning" must be enabled:

![Summoning Permission](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-permission.jpg)

Then a few core Foundry permissions may need to be changed depending on how users will be using the feature.

- *Create New Tokens* (**required**): Players must always have permission to create new tokens for summoning to work.
- *Create New Actors*: Permission to create new actors must be set if summoning spells are configured to pull actors from compendiums. In order to use summoning without this then the GM can import actors and adjust the spells to pull from world actors rather than compendium actors. The player doing the summoning must have ownership permission on the world actor they are summoning.
- *Use File Browser*: If the token being summoned uses wildcard artwork, then players must have access to the file browser so the system can correctly set the artwork.

## Configuring Summoning

To set up a feature or spell to perform summoning, it first must have the "Action Type" of "Summon". This is configured on the details tab of the item beneath the header "Spell Effects" or "Feature Attack", depending on item type. Once that is selected a new summoning line will appear below. The "Configure Summons" button will allow for further configuration and the "Summon Prompt" checkbox will allow players to bypass the activation prompt when using the feature.

![Item Details Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-item-details.jpg)

Clicking the "Configure Summons" button will open the summoning configuration screen. This screen contains all of the controls needed to configure what is summoned and how it is modified when summoned.

![Summoning Configuration](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-configuration.jpg)

### Summoning Profiles

The top section that reads "Summoning Profiles" is where the actors that will be summoned are set up. There are two different modes that can be configured:
- **By Direct Link**: Each profile links to a specific actor that will be summoned
- **By Challenge Rating & Type**: Each profile specifies a maximum challenge rating and optional creature types

In *Direct Link* mode it is easy to add actors here by dragging and dropping them from the world or a compendium into the app. By default the name displayed to users will match the actor name, but that can be changed by entering a custom label in the box to the right of the link. Any extra entries can be deleted using the delete button.

In the example above, the spell "Summon Beast" from *Tasha's Cauldron of Everything*, there are three profiles created to match with the three variants of Bestial Spirit that can be created: Air, Land, and Water. Custom labels have been added to make the usage window more legible to players.

![Summoning by Challenge Rating & Type](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-cr-configuration.jpg)

In *Challenge Rating & Type* mode the actor drop area is replaced with a formula for the maximum CR that can be summoned for that profile. The above example of "Conjure Animals" in the SRD specifies four profiles with descending CRs and increasing quantities (with a complex formula to handle the spell's doubling at certain levels).

In the other example of "Conjure Elemental" in the SRD, only a single profile is specified but its CR scales based on the level at which the spell is cast. Within the "Additional Settings" dropdown is a "Creature Types" input for restricting the selection to certain types, in this case "Elemental".

![Summoning Quantity & Level](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-quantity-level.jpg)

The field before the actor link in a profile is a formula that defines how many creatures will be summoned. This takes roll data from the summoning item so it can easily scale with spell level. Hidden behind the "Additional Settings" dropdown is the level limit, which defines the levels at which the summoning will be available. For summoning on spells this will be based on the level at which the spell is cast, and for other item types it will use the character level or class level, so long as the "Class Identifier" field is filled with a valid class.

### Creature Changes

The next section lists changes that will be made to the creature being summoned. The "Match Proficiency" checkbox will cause the summoned creature's proficiency to match that of the actor doing the summoning. "Bonus Armor Class", "Bonus Hit Dice", "Bonus Hit Points" are bonus formulas added on top of their respective values. Any `@` references in these formulas will be resolved at summoning time relative to the summoning item, so a value such as `@item.level` can be used to reference the level of the spell performing the summoning. They can also reference details from the summoned creature, so `@summon.attributes.hd.max` will contain the maximum number of hit dice on the summoned creature (before the bonus is applied).

The "Creature Sizes" and "Creature Types" controls allow defining one or more size or type. The summoned creature will be modified to be this size or type when summoned, and if more than one option is selected then the player will be presented with a list of choices when summoning.

In the example above the match proficiency box is checked because the summoned spirits have the same proficiency as their summoner. In the AC bonus field it has `@item.level`, which increases the summoned creature's AC by the level at which the spell is cast. In the HP bonus field it has `5 * (@item.level - 2)`, which adds `5` to the creature's HP for every level the spell is cast above its base level (in this case `2`).

### Item Changes

The final section details changes that will be made to the various items on the summoned actor. "Match Attacks" ensures that the To Hit value for any attacks made by the creature match that of the summoner, and "Match Saves" does the same thing for saving throw DCs imposed by the creature's abilities. The following fields include formulas for bonuses added to all of the creature's damage from attacks, abilities that provoke saves, and healing.

In the example above both of the match attacks and saves checkboxes are checked because those values should match the summoner. In the attack damage bonus field it has the formula `@item.level` because there is a bonus to the attack damage matching the level at which the spell was cast. The save & healing bonus fields are left blank because the summoned creature doesn't have either of those.

## Performing Summoning

Once configuration is complete, summoning is very easy. Simply activate the feature or spell as you would normally and the summoning options will appear in the usage prompt.

![Summoning Prompt](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-prompt.jpg)

The "Place Summons" checkbox controls whether a summoned creature will be placed automatically and if there is more than one summoning profile the dropdown will allow player to select what type to summon. After this screen the player's sheet will be minimized and they will be able to place the summon in the current scene.

![Summoning Prompt for CR Mode](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-cr-prompt.jpg)

When summoning in *Challenge Rating & Type* mode, the compendium browser will be brought up after the profile is selected allowing the player to choose which specific creature they wish to summon.

> [!IMPORTANT]
> Summoning based on challenge rating can only be used when running Foundry V12 or later due to its reliance on the compendium browser. This type of summoning can still be configured in Foundry V11, but no actor will actually be summoned.

![Summoning Chat Message](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/summoning-chat-message.jpg)

If the summoned creature needs to be placed again, or the initial prompt was skipped, a "Summon" button will appear in the chat card.
