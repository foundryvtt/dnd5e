# Class Items

1.6 has added the ability to easily define what items should be granted to an actor when it is levelled up in a given class or subclass. This initial release covers a majority of users' needs for streamlining the level up process, however it does not cover all use cases currently, and improvements will be made with subsequent releases. This guide will assist you in creating your own custom classes, as well as provide tips and tricks for navigating the current state of the implementation.

There is a new option in the System Settings to disable this feature for all players in a world by using the "Disable level-up automation" option in the 5e system settings. To avoid running advancements on an individual character, any advancements should be removed from the class, subclass, or background before it is dropped on the character sheet.

Note that once the Advancement process has been started, any manual changes to the actor or items added to the actor manually will be reverted once the Advancement workflow is completed.

# Class Item Updates
The following section will discuss changes made to the Class item type.
## The Details tab
- **Identifier field**: this will allow you to configure the name of the class that can be used to reference it in roll formulas (useful for classes with spaces, or localizing the class to other languages). The class identifier may only contain letters, numbers, hyphens (`-`), and underscores (`_`).
- **Level field**: has been removed, class levels will be managed from the actor sheet, see the second screenshot below.

![Class Details](https://github.com/foundryvtt/dnd5e/assets/86370342/1dfac30f-cdcb-4d3e-a71a-694f119b0dc7)

![Class Level Dropdown](https://github.com/foundryvtt/dnd5e/assets/86370342/57d98381-8eaf-40e1-914c-402926bd54f6)

## The Advancement tab
This is where you will configure the Advancement items for this class. 
- Add a new Advancement item with the + button, edit an existing item with the [pen] icon, or delete an existing advancement item with the [trash] icon. 
    - (Note: deleting one Hit Point or Scale Value advancement item will delete all of that type for the class).
- **Configuration Disabled/Enabled** - This will only display when the class is placed on an actor, it can be toggled to enable or disable making modifications to the advancement items.
- **Modify Choices** - This will only display when the class is placed on an actor, and if Configuration is disabled, this allows a user to change any choices they made for that level.
- Advancement items are sorted within each level alphabetically by type in the following order: Hit Points, Item Grant, Scale Value.

![Advancement Example](https://github.com/foundryvtt/dnd5e/assets/86370342/4b2dbd4d-01fa-4015-9253-54fc3a682776)

# Advancement Item Types
There are currently 3 types of Advancement Items that can be added to a Class item: Hit Points, Item Grant, and Scale Value.
All Advancement Items have the following fields:
* **Custom Title**: Choose what you would like the title of this advancement item to display on the Advancement tab.
* **Custom Icon**: Choose an icon to represent this item on the Advancement tab.
* **Class Restriction**: 
    * All Classes - These items should be granted in any case.
    * Original Class Only - Only if this class is the initial class.
    * Multiclass Only - Only if this class is chosen as a multiclass.

![Basic Advancement Configuration](https://github.com/foundryvtt/dnd5e/assets/86370342/e89f215e-8048-4aa1-a051-1632fbcd970f)
    
## Hit Points
This advancement item will prompt for the user to Roll for HP or use the average, using the Hit Die noted in the Details tab of the Class item.

![Hit Points Advancement Configuration](https://github.com/foundryvtt/dnd5e/assets/86370342/36435978-2bb9-4098-b992-c2dcecc1535e)

## Item Grant
This advancement can grant another item on level up (e.g. Class Features, Equipment). It should not be used for Class Spellcasting as a separate Advancement type is planned for that. It can be used for Racial Spellcasting, however.

This Advancement Type also contains the following options:
* **Level**: Select the level that these features should be granted at.
* **Optional**: If you want to give the user the option to decline any items granted by this Advancement, check this box, otherwise all items will be granted automatically.
* **Items**: Drag and drop an item into this section for that item to be granted when an actor has reached the appropriate level in this class.

![Item Grant Advancement Configuration](https://github.com/foundryvtt/dnd5e/assets/86370342/0121c15c-6a3d-4f16-957f-3c9b81b9674d)

## Scale Value
This can be used to track when features get extra uses (e.g. Wild Shape or Channel Divinity), or the die value of a feature increases (e.g. Sneak Attack or Martial Arts)
This Advancement Type also contains the following options:
* **Scale Type**: This determines the values accepted on the Level sections on the right hand side
* Anything - Allows an arbitrary input including text and numbers

![Scale Value: Anything](https://github.com/foundryvtt/dnd5e/assets/86370342/3d20ec17-a88d-4398-b60a-bc7dda5a9fc0)

* Dice - Allows a configuration of number of die and die size (options include d2, d3, d4, d6, d8, d10, d12, and d20). It is recommended for features that can use a variable number of these dice to leave the count blank, and define the number used in the feature, (e.g. `1@scale.monk.martial-arts`, `2@scale.monk.martial-arts`) this will ensure accurate values if used in the damage field and critical damage is rolled. Values that are a consistent number of die can have the value column populated (e.g. Sneak Attack)

![Scale Value: Dice](https://github.com/foundryvtt/dnd5e/assets/86370342/80e49db5-8128-4edc-b2a9-3277ad7d8144)

* Numeric - Allows a configuration of a number value in the level options

![Scale Value: Numeric](https://github.com/foundryvtt/dnd5e/assets/86370342/f687de1a-c92e-4834-ac00-3170451b7129)

* Distance - Allows for numerical values in the level options, you can choose the units of Feet, Miles, Meters, and Kilometers

![Scale Value: Distance](https://github.com/foundryvtt/dnd5e/assets/86370342/496109c8-caa7-4185-97f4-bb84ab3a12eb)

* **Identifier**: Defines the identifier to be used in a formula.
* **1-20**: Used to define the scale value at a given level

# Managing Class Levels on an Actor
## Adding a Class to an Actor

https://github.com/foundryvtt/dnd5e/assets/86370342/7c6004a3-d13d-4c5b-8385-160538115345


1. Drag a Class item onto your Actor's Features tab. 
    - Note: You can cancel the advancement process at any time by clicking the dialog's `X Close` button.
2. You will be prompted to first accept the Hit Points advancement (HP for your original class at level one is always the maximum hit die value plus your Constitution modifier). Click the Next button to advance to the next advancement item.
3. You will then be prompted for any additional advancement items, clicking on the name of the feature will allow you to preview the item that will be added to the actor, if an advancement item is set to optional, the user will be able to select the check box to determine if that item should be added or not. Once the user is ready to advance, click Continue.
4. On any subsequent step you will have a Restart button, this will return you to the beginning of the Advancement process.
5. On the final advancement item you will have a Complete button, click it to apply the changes to your actor. The HP values will adjust, and the items will be added to your character at this time.

## Leveling Up

https://github.com/foundryvtt/dnd5e/assets/86370342/ca2669ac-acbb-4b60-a33f-b425a2ca099f

1. On your Actor's Features tab, find the Level option for your class, click it to open the drop down and select the level you would like to advance to.
2. The appropriate advancement items will be presented to you, use the steps as described above to move through the process.

## Modifying a previous advancement choice

https://github.com/foundryvtt/dnd5e/assets/86370342/5e2cae50-1012-4f8e-b2b4-1b25e02798ff

1. If you made a mistake on a previous level up, such as selecting the wrong item or accidentally deselecting an item, navigate to the Features tab of your actor, and click the Edit icon for their Class item.
2. In the Advancements tab, make sure the Configuration is disabled, then find the level to modify and click the Modify Choices button
3. The system will walk you through all of the advancement items for that level to adjust any choices made for that level.

## Leveling Down or Removing a Class

https://github.com/foundryvtt/dnd5e/assets/86370342/ef5a3522-ffcf-4628-ae23-6b3ce0ea4de0

1. On your Actor's Features tab, find the Level option for your class, click it and select the level you would like to revert to from the drop down, or click the Trash can icon to completely remove the class or subclass.
2. The system will display a dialog to confirm the change and provide a toggle to remove any advancement items that have been earned up to this level, leaving the box checked will ensure items granted from previous level ups will be removed from the actor. 

# Managing Subclasses 
Presently the Subclass advancement type is not available in this release, and will be introduced in a later release. This advancement type will allow the triggering of the advancement workflow if an added item has advancement items attached to it.

The current recommended process is to manually drag and drop the subclass onto the actor after completing the Advancement process for the given level, which will prompt for the appropriate advancements for the character's level in the parent class. 

https://github.com/foundryvtt/dnd5e/assets/86370342/dc961225-38f6-4272-9595-17a79425d1ca

# Updating Advancements for an owned Class item
If you are building your own custom class, or modifying an existing class record, once a class is added to an actor it is owned by that actor and is separate from the parent class item in the items sidebar or compendium. For example, if you built a class item with advancements to level 5 and added it to an actor, then later updated the class in the compendium to add advancements to level 10, dragging and dropping that class item onto the actor will not provide the new advancement items to the owned class item.

You will need to manually update the owned class item with the new advancement items, separate from the compendium class item.

In an upcoming release, a process to update advancement items from the 'master copy' class item to an owned class item will be added to the system.
