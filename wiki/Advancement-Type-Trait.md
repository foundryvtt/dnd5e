![Up to date as of 2.4.0](https://img.shields.io/static/v1?label=dnd5e&message=2.4.0&color=informational)

The Trait advancement allows assigning a set of trait to an actor. Traits include things like proficiencies, languages, and resistances.

## Configuration

![Trait Configuration - Grants](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/trait-configuration-grants.jpg)

Configuring a basic Trait advancement they just grants some traits is simple. First select the type of trait you would like to grant in the top right, and then check which traits should be granted from the list. In many cases that is all that is required, the title and icon will be updated to reflect the selected trait type and a hint will be auto-generated.

![Trait Configuration - Choices](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/trait-configuration-choices.jpg)

Another option is having a player select from one or more traits. This can be set up by creating the Trait advancement, and then clicking the "+ Add Choice" button near the bottom left which will add a choice set. Then set the number of selections the player can make from the top right and choose a specific trait type. In the list below, you'll have the option of manually selecting one or more options, or checking a "Any …" option which will allow selecting any trait within a category.

For more complex combinations of choices, you can combine grants and choices, or create one or more sets of choices. If more than one set of choices are created, the player will be able to select from all of them (so if you set "Any one skill" and "Any on Artisan Tool", the player will be able to select two total traits, one skill and one tools).

![Trait Advancement List](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/trait-advancement-list.jpg)

A few options should be considered depending on where the Trait advancement is being added:

If it is on a Background and granting skills, then the "Allow Replacements" options should be checked, which will allow players to choose alternate skills if they already have the default skills from their race or class.

If the advancement is on a class, they the "Class Restriction" options should be considered. Something like Saving Throw proficiencies should be set to "Original Class", because only the first class added grants saves. Similarly the number of skills and other proficiencies might change depending on whether this is the original class or a multiclass. For handling those possibilities, it is easiest to create the standard advancement that will be given if it is the original class with whatever skills are granted checked, and then duplicate it using the context menu in the advancement list and update the list or count based on the multiclass rules.

### Trait Types
These trait types can be applied using the Trait advancement:
- Saving Throws
- Skills
- Languages
- Armor Proficiency
- Weapon Proficiency
- Tool Proficiency
- Damage Immunity, Resistance, and Vulnerability
- Condition Immunity

### Application Modes
There are several different modes that can be used in Trait advancement:
- **Default**: Standard mode that grants a trait or standard proficiency. If the player already has proficiency in a trait, they will not be prompted to take it again.
- **Expertise**: Expertise as handled by Rogues and the like. Will present the player with a list of traits in which they are already proficient, and upgrade any selected traits to double proficiency. Can only be applied to skills and tools.
- **Forced Expertise**: Just like normal expertise, but doesn't require the character to have existing proficiency in a skill or tool before they gain expertise.
- **Upgrade**: For any selected traits, if a player is not proficient they will gain proficiency, and if they are already proficient they will gain expertise.

## Usage

![Trait Flow](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/trait-flow.jpg)

The Trait advancement presented to the player will display the auto-generated or manual hint at the top, followed by slots corresponding to the traits granted. If any choices are required of the player, they will be shown a dropdown will all the available choices at any given time. The contents of this dropdown change as selections are made so it doesn't show options the player can no longer select.

## API

The original proposal for the Hit Points advancement can be [found here](https://github.com/foundryvtt/dnd5e/issues/1405).

### Configuration Schema

// TODO

### Value Schema

// TODO
