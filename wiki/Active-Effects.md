![Up to date as of 6.0.0](https://img.shields.io/static/v1?label=dnd5e&message=6.0.0&color=informational)

Active effects are documents that can be used to define changes applied to a different document. There are two primary types of active effects used by the system: Base effects that apply changes to an actor, and Enchantment effects that apply changes to an item. A general overview of how active effects work can be found on the [Foundry knowledge base](https://foundryvtt.com/article/active-effects/).

Base effects can generally be split into two categories. Passive effects are ones that are always applied to an actor and apply a permanent or mostly-permanent change. Examples of passive effects would be the movement increase from a Monk's Unarmored Movement or the bonus to AC and saves provided by a Cloak of Protection.

Temporary effects are ones that are applied by [activities](Activities.md) and contain a specific duration or expiry event. Examples of temporary effects would be the increase to attacks & saves caused by the Bless spell or a stunned effect caused by a Monk's Stunning Strike ability. These effects end automatically when their duration is up or their expiry event is triggered.

## Attribute Keys & Values

A variety of valid attribute keys and their values used in normal active effects can be found on the [active effect guide](Active-Effect-Guide.md). A different set of keys and values that are usable when creating enchantments can be found on the [enchantments page](Enchantments.md).

## Conditions

Conditions are a system that allows for active effects and their conditions to be applied only if a specific set of circumstances are met. They can be defined on the effect as a whole or to a specific change, allowing for very precise control over what is applied.

Information on how to construct filters can be found on the [filters page](Filters.md).

## Durations & Expiry Events

The DnD5e system provides several special expiry events that behave a bit differently than the default options provided by core. When using these expiry events, the standard active effect duration isn't available.

- End of a Long/Short Rest: These two events are triggered when the specific player completes a rest.
- Start/End of Source's/Target's Next Turn: When applied using the effect application system during combat, these effects are automatically set up to expire on the next turn of the caster or the target.

## Rule Change Types

The system provides a set of special change types called rules. Rather than being applied directly to data on an actor or item, these rules are evaluated at roll time an modify only a specific roll.

More information on these change types can be found on the [active effect rules page](Active-Effect-Rules.md).

## Active Effect Compendium

The system comes with a compendium of stock active effects that can be used covering things like damage resistances, various conditions, speed enhancements, and advantages/disadvantages. These effects can be referenced directly using an activity if no changes are required (other than duration, which will be applied automatically from the activity), or copied onto an item to use as the basis for a modified version.
