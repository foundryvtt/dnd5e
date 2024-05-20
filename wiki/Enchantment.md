![Up to date as of 3.2.0](https://img.shields.io/static/v1?label=dnd5e&message=3.2.0&color=informational)

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
