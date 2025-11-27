![Up to date as of 5.2.0](https://img.shields.io/static/v1?label=dnd5e&message=5.2.0&color=informational)

The Transform activity is designed to change one or more actors using the stats of another. It is based on the same transformation system that has been long supported by dragging one actor onto another, but with the activity the transformation settings can be pre-configured and a compendium browser can be shown to make it easy to select which creature to transform into.


## Permissions

While GMs can always take advantage of transformation, this feature requires certain permissions to be set in order for it to be used by players. Details on the required permission can be found in the [Transformation guide](Transformation.md#permissions).


## Performing Transformation

To transform, simply use the feature or spell as you would normally and the transformation options will appear in the usage prompt if available.

![Transform Prompt](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/transformation/transform-prompt.jpg)

In cases where there is more than one profile available, the *Transform Profile* option will allow selecting which one should be used.

![Transform Prompt - Compendium Browser](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/transformation/transform-cr-prompt.jpg)

After this screen, if the transformation requires it, the compendium browser will open allowing for the player to select which creature the target should be transformed into.

![Transform Chat Message](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/transformation/transform-chat-message.jpg)

Once the actor has been selected a chat message will be created with the "Transform" button. Select any tokens that should be transformed in the scene and click this button to transform them. Once the transformation ends the actors can be reverted using the header button, see the [Transformation guide](Transformation.md#reverting) for more information on that process.


## Configuring Transform

The important options for the Transform activity can be found on the *Transformation* tab. Inside this tab are two additional tabs for configuring the transform profiles and the settings.

### Transform Profiles

The Profiles sub-tab contains the configuration for the creatures that the target can be transformed into. It begins with *Mode*, which determines whether the player can choose the creatures using the **"By Challenge Rating and Type"** option, or whether they only have a pre-defined list to choose from using the **"By Direct Link"** option.

![Transform Sheet - Profiles Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/transformation/transform-profiles.jpg)

Each profile has a *Display Name* which affects how that profile will be displayed in the transform dialog. Changing this name will not modify the transformed creature’s name, only how it displays in the usage prompt.

#### By Challenge Rating and Type

In **Challenge Rating and Type** mode the profile contains a *CR* field for setting the maximum CR of creature that can be selected to transform into. This field accepts numbers and formulas. Beneath the "Additional Settings" dropdown are several more fields to further restrict what creatures can be selected. The *Creature Sizes* and *Creature Types* fields allow selection only from a specific set of sizes and types if populated. The *Restricted Movement Types* field prevents creatures with certain movement types from being chosen.

![Transform Sheet - Profiles Tab, Challenge Rating & Type](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/transformation/transform-profiles-challenge-rating.jpg)

In the example above, the "Wild Shape" feature, there are three profiles created to match with the changes that feature undergoes at various Druid levels. The CRs for each profile are configured to 0.25, 0.5, and 1 with matching display names (the display name will be auto-generated using the specified CR if not included). The center profile shows a creature type limitation to "Beast" and a movement restriction on creatures with a "Fly" speed. It is also limited to be only available for Druid levels 6 & 7.

#### By Direct Link

In **Direct Link** mode it is easy to add creatures by dragging and dropping them from the world or a compendium onto the sheet. Dropping it directly onto an existing profile will associate that creature with that profile and dropping elsewhere will create a new profile for that creature.

![Transform Sheet - Profiles Tab, Direct Link](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/transformation/transform-profiles-direct-link.jpg)

In the example above, a "Shape-Shift" feature on a Weretiger, includes two profiles for each of the different types of transformation the creature can perform, either into its "Hybrid Form" or its "Tiger Form".

#### Transform Level

When transformation occurs the process always has an associated level. For spells, this is based on the level at which the spell is cast, but for Transform activities on other items it varies depending on whether the *Class Identifier* on the "Identity" tab is populated. If provided, then the transform level will be based on the character’s level in that specific class, otherwise it will use the character’s overall level.

This transform level can be used to restrict certain profiles to only certain levels using the *Level Limits* fields in the "Additional Settings" dropdown.

### Settings

The next tab defines settings for the transformation process. At the top a *Preset* can be selected which defines the default selected transformation settings. If further changes are required, the *Customize* option can be checked unlocking more extensive controls below. What these additional controls do is laid out in the [Transformation guide](Transformation.md#transforming).

![Transform Sheet - Settings Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/transformation/transform-settings.jpg)
