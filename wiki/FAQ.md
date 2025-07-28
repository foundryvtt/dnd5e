![Up to date as of 5.1.0](https://img.shields.io/static/v1?label=dnd5e&message=5.1.0&color=informational)

# Frequently Asked Questions

## How to Wildshape
To use the built-in Wild Shape feature see the [Transformation guide](Transformation.md).

## How to create Spell Scrolls
There are two ways to create a Spell Scroll from a spell, either by using the Right Click context menu and using the "Create Scroll" option or by dragging a Spell onto an Actor's Inventory tab. A dialog will be displayed with options as to what description should be shown and what levels the spell should be created at (defaults to the spell's base level). A reference to the spell scroll rules or their entire text from the SRD rules will be added to the spell's description.

## What are the plans for the 2024 rulebook releases?
Foundry publishes official premium modules for the updated [Player's Handbook](http://foundryvtt.com/packages/dnd-players-handbook), [Dungeon Master's Guide](https://foundryvtt.com/packages/dnd-dungeon-masters-guide), and [Monster Manual](https://foundryvtt.com/packages/dnd-monster-manual). The system also includes copies of both the SRD 5.1 (legacy 2014 content) and the SRD 5.2 (new 2024 content).

> [!IMPORTANT]
> The current Dungeons & Dragons 5th Edition system will remain compatible with all content based on both the 2014 and the 2024 rulebook update.

For the places where the 2024 rules and 2014 rules are mutually exclusive, there is a system setting that allows for toggling between them:

![Rules Version Setting](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/settings/rules-version.jpg)

This rule affects a number of things in the system including:
 - Rules references used by `&Reference[]` enricher
 - Default spell lists
 - DC 30 cap on saving throws to maintain concentration
 - Exhaustion effects
 - Recovered hit dice on a Long Rest
 - Alert adding to initiative rolls
 - Jack of All Trades applying to initiative
 - Remarkable Athlete effect
 - Former Half Progression for spell slots that rounds down
 - Initial DC & attack to hit for player-crafted spell scrolls
 - Language organization & presence of "Common Sign Language"
 - Wild Shape & Polymorph transformation presets
 - Initiative advantage applied by invisible effect & initiative disadvantage applied by incapacitated & surprised effects
 - Initiative score display on NPC sheets
 - Presentation & wording of Ability Score Improvement (feat first in modern, ASI first in legacy)
 - Several wording changes
   - Armor Proficiency -> Armor Training
   - Exotic Languages -> Rare Languages
   - Race -> Species
   - Radius -> Emmanation
 - Default rules version for newly created actors & items (see below)

![NPC Rules Version](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/settings/npc-rules-version.jpg)

Actors & items also have their own rules version that affects a few things:
 - Automatically generated descriptive text for legendary actions
 - Lair rules ("In Lair" control increasing CR, legendary actions, & resistances in modern, lair initiative in legacy)
 - Formatting of [attack and damage enrichers](Enrichers.md) when using the `extended` option
 - Default presentation of class summary pages
