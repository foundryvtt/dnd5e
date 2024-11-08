![Up to date as of 4.1.0](https://img.shields.io/static/v1?label=dnd5e&message=4.1.0&color=informational)

The Cast activity allows for casting a spell through an item.


## Spell Listing

When items that contain Cast activities are added to a character the spells they offer appear in a new section of the spell list called Item Spells. If an item requires attunement, then these spells will only be listed if the item is attuned.

![Cast Sheet - Identity Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/activities/cast-spellbook.jpg)


## Casting Spells

There are two ways to cast spells offered by the Cast activity, either by activating the Cast activity on the item itself or by clicking the spell in the Item Spells section of the character sheet. Both of these method will behave the same, bringing up a dialog for any configuration required and handling spending any charges on the item.


## Configuring Casts

The Cast activity can be created using the standard Create Activity dialog, or by dragging a spell onto the activities tab of another item, which will create a new Cast activity with that spell already configured.

After creating the Cast activity the configuration sheet will open on the "Identity" tab. In addition to the standard activity options (see the [Activities Overview](Activities.md) for more details), Cast also includes the *Display in Spellbook* option to control whether the spell provided by this activity is listed in the Item Spells section of the spellbook. If unchecked, then players can still cast the spell directly from the item.

![Cast Sheet - Identity Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/activities/cast-identity.jpg)

### Casting Details

The "Spell" tab contains the rest of the unique properties for the Cast activity, including what spell will be cast and how it will be cast.

![Cast Sheet - Spell Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/activities/cast-effect.jpg)

The "Casting Details" section contains options that affect how casting will occur
- *Casting Level*: Sets the base level at which the spell is cast. Increasing it ensures the spell is always cast at at least that level, and any scaling will be on top of the casting level
- *Ignored Properties*: Properties on the spell that will be ignored when casting through this item. Removing "Concentration" property here is not enough to ensure the spell doesn't require concentration, the Duration in the "Activation" tab will also need to be overridden
- *Override Values*: If checked will display additional options to replace the attack bonus and save DC for the spell. By default spells will use the character's spell attack bonus and save DC, but certain items include fixed values which should be entered in the revealed fields
