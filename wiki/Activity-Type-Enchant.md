![Up to date as of 4.0.0](https://img.shields.io/static/v1?label=dnd5e&message=4.0.0&color=informational)

The Enchant activity allows for applying [enchantments](Enchantment.md) to items. These enchantments can modify the stats of an item (such as *Magic Weapon* giving a mundane weapon a +1 magical bonus), carry effects that apply to an actor (such as the *Fire Rune* granting a player double proficiency on tool checks), and carry items that are added to the actor (such as the *Arcane Propulsive Armor* give the player a set of gauntlets that can be used to attack).

![Enchantment Summary](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enchantment/enchantment-summary.jpg)


## Performing Enchanting

When the Enchant activity is used it will display the usage prompt allowing for selecting a specific enchanting profile if more than one is available. The Enchant chat card will then appear in the log with an area to drop the item that should be enchanted.

![Enchantment Chat Message](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enchantment/enchantment-chat-message.jpg)

Any player may drop an item in this area to enchant that item and the enchanted items will be listed. GMs or the player who owns the item will have access to the "Remove Enchantment" button in the chat card which will quickly remove the enchantment. Enchantments can also be removed by breaking concentration if they are from a concentration effect, or by enter the "Effects" tab on the item and manually deleting the enchantment.

The chat card tracks how many items have been enchanted out of the maximum allowed (though the maximum is not enforced). This maximum item count can be defined on the Enchant activity by specifying the targets in the "Targeting" tab.


## Configuring Enchanting

After creating the Enchant activity the configuration sheet will open. In addition to the standard activity options (see the [Activities Overview](Activities.md) for more details), Enchant also includes the "Enchanting" tab with details on enchantments and restrictions.

### Enchantments

The "Enchantments" tab contains a list of potential enchantments that can be applied by the activity. The plus button can be used to create new enchantments, or the dropdown can be used to select enchantments that are already on the item, but not yet on the Enchant activity. Clicking on the name of an enchantment will open up the configuration sheet for it. More details on configuring the enchantments themselves can be found in the [enchantment guide](Enchantment.md).

#### Enchantment Level

When enchantment occurs the process always has an associated level. For spells, this is based on the level at which the spell is cast. For other items this varies depending on whether the *Class Identifier* is populated. If provided, then the summoning level will be based on the character’s level in that specific class, otherwise it will use the character’s overall level.

![Enchant Sheet - Enchantments Tab, Multiple with Level Limits](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enchantment/enchant-enchantments-multiple.jpg)

This enchantment level can be used to restrict certain profiles to pnly certain levels using the *Level Limits* fields in the "Additional Settings" dropdown. In the above example, the "Magic Weapon" spell from the *Player’s Handbook*, the level limit is set so the "Magic Weapon, +1" enchantment is applied if the spell is cast at 3rd level or lower, and the other two enchantments are available at higher casting levels.

#### Additional Effects & Items

When enchanting profiles can be given additional effects and items that are added alongside the enchantment. Because enchantments can only affect the item to which they are applied, these *Additional Effects* can be used to give the item and Active Effect that changes the actor. The *Additional Items* can be used to specify additional items that are given to the actor when this enchantment is applied. Both the effects and items will be removed from the actor when the enchantment is removed.

![Enchant Sheet - Enchantments Tab, Additional Effects & Items](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enchantment/enchant-enchantments-riders.jpg)

In the above example, the "Arcane Propulsive Armor" infusion from *Tasha’s Cauldron of Everything*, the profile includes a "Arcane Propulsive Armor" active effect to grant the player a boost to their walking speed and an "Arcane Propulsion Gauntlets" item that gives the player a way to attack using the armor.

### Restrictions

The "Restrictions" tab contains settings for what kind of items the enchanting can be performed upon:
- *Allow Magical*: Normally enchantments cannot be applied to items that are already magical, but this allows applying them to any item
- *Item Type*: Restrict application to certain types of items (e.g. "Weapon", "Equipment")
- *Valid Categories*: Further restrict the type of item to only those in this list (e.g. "Simple Melee Weapon")
- *Valid Properties*: Items must contain all of the provided properties to be enchanted (e.g. "Light", "Thrown")

![Enchant Sheet - Restrictions Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/enchantment/enchant-restrictions.jpg)

In the above example, still "Arcane Propulsive Armor", the restrictions indicate that this can only be applied to non-magical equipment that is light, medium, or heavy armor.
