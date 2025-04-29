![Up to date as of 5.0.0](https://img.shields.io/static/v1?label=dnd5e&message=5.0.0&color=informational)

The transformation system allows for modifying an actor using the stats of another. This is useful for features like Wild Shape and spells like Polymorph and Disguise Self. The changes performed can be simple cosmetic changes that alter the token and portrait artwork, or large changes that replaces the altered actors stats and features.

## Permissions

While GMs can always take advantage of transformation, this feature requires certain permissions to be set in order for it to be used by players. First the system setting "Allow Transformation" must be enabled:

![Transformation Permission](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/transformation/transformation-permissions.jpg)

Then a few core Foundry permissions may need to be changed depending on how users will be using the feature.

- *Create New Actors* (**required**): Because transformation creates a duplicate character with the changes applied, players will need permission to create new actors.
- *Create New Tokens*: Only necessary for players if they are attempting to transform unlinked actors.
- *Delete Tokens*: Only necessary for players if they are attempting to revert the transformation of unlinked actors.


## Transforming

There are two ways to transform an actor, using the [Transform Activity](Activity-Type-Transform.md) or by dragging an actor from the sidebar onto the sheet for the actor to be transformed. The activity uses pre-configured transformation settings, while the dragging will open up the transformation dialog.

![Transformation Dialog](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/transformation/transformation-dialog.jpg)

On the left side of the transformation dialog are several presets that define a specific set of transformation options. These can be useful if the transformation matches one of these standard features or spells, but if not then the checkboxes on the right can be used for configuring more precisely.

The *Keep* section of features control what parts of the original actor are maintained. The "Self" option maintains the original actor's entire stat block but only changes their portrait and token.

The *Merge* section allows for merging save and skill proficiencies. If this is used, then whichever creature has the higher overall bonus for each save or skill will be preferred.

The *Active Effects* section gives fine-grained controls over what effects are still applied to the actor after transformation.

Within the *Other Options* section, the "Temp Formula" allows for granting temporary HP to the newly transformed actor. Since this is a formula, it can use [Roll Data](Roll-Formulas.md) like usual, but it gains access to the roll data of both the original actor and the one being transformed into. Use the base values to access the original actor's stats (e.g. `@classes.druid.levels` to access the original actor's levels) and prefix it be `@source` for the actor being transformed into (e.g. `@source.details.cr` to grab the source actor's challenge rating).

The "Transform Tokens" setting controls whether all associated linked tokens will be changed alongside the base actor. This should usually be checked.


## Reverting

Once the transformation is no longer required the actor can be changed back using the "Revert Transformation" button in the header of the transformed actor's sheet. This will close the transformed sheet, re-open the original sheet, and change any tokens in the scene back to the original actor.

**Note**: Because the core software doesn't have the ability to grant players permissions to delete actors, the transformed version of the actor will only be cleaned up if the "Revert Transformation" button is clicked by a GM. Otherwise it will remain in the actors sidebar.
