# Class Items in dnd5e 1.6

1.6 has added the ability to easily define what items should be granted to an actor when it is levelled up in a given class or subclass. This initial release covers a majority of users' needs for streamlining the level up process, however it does not cover all use cases currently, and improvements will be made with subsequent releases. This guide will assist you in creating your own custom classes, as well as provide tips and tricks for navigating the current state of the implementation.

There is a new option in the System Settings to disable this feature for all players in a world by using the "Disable level-up automation" option in the 5e system settings. To avoid running advancements on an individual character, any advancements should be removed from the class, subclass, or background before it is dropped on the character sheet.

Note that once the Advancement process has been started, any manual changes to the actor or items added to the actor manually will be reverted once the Advancement workflow is completed.

# Class Item Updates
The following section will discuss changes made to the Class item type.
## The Details tab
- **Identifier field**: this will allow you to configure the name of the class that can be used to reference it in roll formulas (useful for classes with spaces, or localizing the class to other languages). The class identifier may only contain letters, numbers, hyphens (`-`), and underscores (`_`).
- **Level field**: has been removed, class levels will be managed from the actor sheet, see the second screenshot below.

![Class Details](uploads/bad8b941e33d4723888320099d64dc44/image.png)

![Class Level Dropdown](uploads/2aaa7e2f13e38c3d437f96532a132fb6/image.png)

## The Advancement tab
This is where you will configure the Advancement items for this class. 
- Add a new Advancement item with the + button, edit an existing item with the [pen] icon, or delete an existing advancement item with the [trash] icon. 
    - (Note: deleting one Hit Point or Scale Value advancement item will delete all of that type for the class).
- **Configuration Disabled/Enabled** - This will only display when the class is placed on an actor, it can be toggled to enable or disable making modifications to the advancement items.
- **Modify Choices** - This will only display when the class is placed on an actor, and if Configuration is disabled, this allows a user to change any choices they made for that level.
- Advancement items are sorted within each level alphabetically by type in the following order: Hit Points, Item Grant, Scale Value.

![Advancement Example](uploads/b1704b651235c8c925876fdab20f32cb/image.png)

# Advancement Item Types
There are currently 3 types of Advancement Items that can be added to a Class item: Hit Points, Item Grant, and Scale Value.
All Advancement Items have the following fields:
* **Custom Title**: Choose what you would like the title of this advancement item to display on the Advancement tab.
* **Custom Icon**: Choose an icon to represent this item on the Advancement tab.
* **Class Restriction**: 
    * All Classes - These items should be granted in any case.
    * Original Class Only - Only if this class is the initial class.
    * Multiclass Only - Only if this class is chosen as a multiclass.

![Basic Advancement Configuration](uploads/dc08907e9cab90529197561388b410d8/image.png)
    
## Hit Points
This advancement item will prompt for the user to Roll for HP or use the average, using the Hit Die noted in the Details tab of the Class item.

![Hit Points Advancement Configuration](uploads/831dcea7797820481658830d51514c5d/image.png)

## Item Grant
This advancement can grant another item on level up (e.g. Class Features, Equipment). It should not be used for Class Spellcasting as a separate Advancement type is planned for that. It can be used for Racial Spellcasting, however.

This Advancement Type also contains the following options:
* **Level**: Select the level that these features should be granted at.
* **Optional**: If you want to give the user the option to decline any items granted by this Advancement, check this box, otherwise all items will be granted automatically.
* **Items**: Drag and drop an item into this section for that item to be granted when an actor has reached the appropriate level in this class.

![Item Grant Advancement Configuration](uploads/7c0d040d5585185ba9425e46f4904391/image.png)

## Scale Value
This can be used to track when features get extra uses (e.g. Wild Shape or Channel Divinity), or the die value of a feature increases (e.g. Sneak Attack or Martial Arts)
This Advancement Type also contains the following options:
* **Scale Type**: This determines the values accepted on the Level sections on the right hand side
* Anything - Allows an arbitrary input including text and numbers

![Scale Value: Anything](https://user-images.githubusercontent.com/19979839/198366584-883daa2e-acf1-447d-9128-67db65f79061.png)

* Dice - Allows a configuration of number of die and die size (options include d2, d3, d4, d6, d8, d10, d12, and d20). It is recommended for features that can use a variable number of these dice to leave the count blank, and define the number used in the feature, (e.g. `1@scale.monk.martial-arts`, `2@scale.monk.martial-arts`) this will ensure accurate values if used in the damage field and critical damage is rolled. Values that are a consistent number of die can have the value column populated (e.g. Sneak Attack)

![Scale Value: Dice](https://user-images.githubusercontent.com/19979839/198366623-69fbf202-fa1c-41d6-a454-cd50c4a065da.png)

* Numeric - Allows a configuration of a number value in the level options

![Scale Value: Numeric](https://user-images.githubusercontent.com/19979839/198366669-86c8bab8-0185-4c87-9367-e12657cfca07.png)

* Distance - Allows for numerical values in the level options, you can choose the units of Feet, Miles, Meters, and Kilometers

![Scale Value: Distance](https://user-images.githubusercontent.com/19979839/198366704-6370cc83-000f-4e9c-a6bd-8592cdd0e00a.png)

* **Identifier**: Defines the identifier to be used in a formula.
* **1-20**: Used to define the scale value at a given level

# Managing Class Levels on an Actor
## Adding a Class to an Actor

![Adding a Class](https://user-images.githubusercontent.com/19979839/198367090-76ad9272-b3ba-458e-940b-58337cfad3b5.mp4)

1. Drag a Class item onto your Actor's Features tab. 
    - Note: You can cancel the advancement process at any time by clicking the dialog's `X Close` button.
2. You will be prompted to first accept the Hit Points advancement (HP for your original class at level one is always the maximum hit die value plus your Constitution modifier). Click the Next button to advance to the next advancement item.
3. You will then be prompted for any additional advancement items, clicking on the name of the feature will allow you to preview the item that will be added to the actor, if an advancement item is set to optional, the user will be able to select the check box to determine if that item should be added or not. Once the user is ready to advance, click Continue.
4. On any subsequent step you will have a Restart button, this will return you to the beginning of the Advancement process.
5. On the final advancement item you will have a Complete button, click it to apply the changes to your actor. The HP values will adjust, and the items will be added to your character at this time.

## Leveling Up

![Level Up](https://user-images.githubusercontent.com/19979839/198367287-6be699ed-113c-469f-b652-434c24d90f01.mp4)

1. On your Actor's Features tab, find the Level option for your class, click it to open the drop down and select the level you would like to advance to.
2. The appropriate advancement items will be presented to you, use the steps as described above to move through the process.

## Modifying a previous advancement choice

![Modifying Choices](https://user-images.githubusercontent.com/19979839/198367479-a1f6095c-5c92-461f-a3bd-d28a6b9736c7.mp4)

1. If you made a mistake on a previous level up, such as selecting the wrong item or accidentally deselecting an item, navigate to the Features tab of your actor, and click the Edit icon for their Class item.
2. In the Advancements tab, make sure the Configuration is disabled, then find the level to modify and click the Modify Choices button
3. The system will walk you through all of the advancement items for that level to adjust any choices made for that level.

## Leveling Down or Removing a Class

![Level Down](https://user-images.githubusercontent.com/19979839/198367422-95d6d159-5606-4fc8-bebd-78b47c80b6da.mp4)

1. On your Actor's Features tab, find the Level option for your class, click it and select the level you would like to revert to from the drop down, or click the Trash can icon to completely remove the class or subclass.
2. The system will display a dialog to confirm the change and provide a toggle to remove any advancement items that have been earned up to this level, leaving the box checked will ensure items granted from previous level ups will be removed from the actor. 

# Managing Subclasses 
Presently the Subclass advancement type is not available in this release, and will be introduced in a later release. This advancement type will allow the triggering of the advancement workflow if an added item has advancement items attached to it.

The current recommended process is to manually drag and drop the subclass onto the actor after completing the Advancement process for the given level, which will prompt for the appropriate advancements for the character's level in the parent class. 

![Adding a Subclass](https://user-images.githubusercontent.com/19979839/198367357-f59c5710-015a-4463-b130-1c0ad7f98ee8.mp4)

# Updating Advancements for an owned Class item
If you are building your own custom class, or modifying an existing class record, once a class is added to an actor it is owned by that actor and is separate from the parent class item in the items sidebar or compendium. For example, if you built a class item with advancements to level 5 and added it to an actor, then later updated the class in the compendium to add advancements to level 10, dragging and dropping that class item onto the actor will not provide the new advancement items to the owned class item.

You will need to manually update the owned class item with the new advancement items, separate from the compendium class item.

In an upcoming release, a process to update advancement items from the 'master copy' class item to an owned class item will be added to the system.
