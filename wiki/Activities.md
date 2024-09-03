![Up to date as of 4.0.0](https://img.shields.io/static/v1?label=dnd5e&message=4.0.0&color=informational)

The activities system is a new method for adding things that can be done by an item. It replaces the older method of defining a single action for an item with a much more flexible system.


## Creating Activities

![Item Sheet - Activities Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/activity-tab.jpg)

Activities are created on items through the "Activities" tab, using the plus button.

![Activity Creation Dialog](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/activity-creation.jpg)

Clicking the plus button brings up the Create Activity dialog with a list of activity types that can be created. After selecting one of these options, optionally entering a name, and clicking "Create New Activity" the sheet for the new activity will be opened.

### Activity Types

There are a variety of activity types offered by the DnD5e system, and modules can contribute their own custom types. More details on each type can be found on their own pages:
- [Attack](Activity-Type-Attack.md): Make an attack roll and roll damage
- [Check](Activity-Type-Check.md): Perform an ability check
- [Damage](Activity-Type-Damage.md): Damage a creature without a check
- [Enchant](Activity-Type-Enchant.md): Apply an enchantment to an item
- [Heal](Activity-Type-Heal.md): Heal a creature
- [Save](Activity-Type-Save.md): Impose a saving throw roll and roll damage
- [Summon](Activity-Type-Summon.md): Summon a new creature to the scene
- [Utility](Activity-Type-Utility.md): Make an arbitrary roll or just indicate something happened


## Configuring Activities

While parts of the activity sheet change based on the selected activity type, many parts are shared.

### Identity

![Activity Sheet - Identity Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/activity-identity.jpg)

The first tab that appears is the "Identity" tab which contains details on how the activity is present and how it behaves:
- *Name*: Name for the activity, will default to the name of the activity type if none is provided
- *Icon*: Icon used when the activity appears in the actor and item sheets
- *Chat Flavor*: Brief additional text used in the usage chat message
- *Measured Template Prompt*: If the activity defines an area of effect, should the player be prompted to place the template by default? If unchecked, then the player can still place the template using a button on the chat card

### Activation

The "Activation" tab contains three sub-tabs: "Time", "Consumption", and "Targeting".

#### Time

![Activity Sheet - Time Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/activity-time.jpg)

The "Activation" section contains details on how long it takes to use the activity and under what conditions it can be used. If activation data is provided by the item (such as on spells), this will default to the details from the item but can be overridden using a checkbox next to the name.

The "Duration" section contains details on how long the usage of the activity lasts. This can also be derived from the item’s data if present.

#### Consumption

![Activity Sheet - Consumption Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/activity-consumption.jpg)

The "Consumption" section contains a list of consumption targets with details on what is consumed, how much, and how the consumption scales if scaling is permitted. Multiple consumption targets can be defined and used separately in the usage dialog.

The "Consumption Scaling" section indicates whether scaling is allowed and how much scaling can occur. This section will not appear for spells, because the spell’s level determines how it scales.

The "Usage" and "Recovery" sections contain details on a limited pool of uses that can be defined for the activity and how they are recovered. Unlike uses defined on an item, which are accessible to any activity on the item as well as any other item on the same actor, these uses are only consumable from this activity. In order to use these uses, a consumption target with the type "Activity Uses" must be set up.

#### Targeting

![Activity Sheet - Targeting Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/activity-targeting.jpg)

The "Range", "Targets", and "Area" sections contain details on where and who the activity can affect. These three fields can also be derived from the item data if present.

### Effect

![Activity Sheet - Effect Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/activity-effect.jpg)

The final tab will vary the most between different activity types. Most activity types contain an "Applied Effects" list which specifies what Active Effects present on the item will be available to apply to targets through the chat card. The dropdown allows for selecting existing effects on the item, or the plus button can be used to create a new Active Effect.
