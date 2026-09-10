![Up to date as of 6.0.0](https://img.shields.io/static/v1?label=dnd5e&message=6.0.0&color=informational)

The Save activity allows for calling for saving throws and rolling damage.


## Configuring Saves

After creating the Save activity the configuration sheet will open on the "Identity" tab. In addition to the standard activity options (see the [Activities Overview](Activities.md) for more details), Save also includes an additional behavior option *Visible to All*. This determines whether the save button in the chat card is visible to all players, or only to the player who used the activity and the GM.

![Save Sheet - Identity Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/activities/save-identity.jpg)

### Save Details & Damage

The "Effect" tab contains the rest of the unique properties for the Save activity, split into sections defining save and damage details.

![Save Sheet - Effect Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/activities/save-effect.jpg)

The "Save Details" section contains values used to determine what kind of save is rolled and what the target DC is:
- *Challenge Abilities*: Controls what abilities may be used when rolling the saving throw
- *Save Bonus*: The formula for an additional bonus that is added to all saves made through this activity
- *DC Calculation*: Determines how the saving throw DC is calculated, either using the default DC for an ability, the relevant spellcasting DC, or using a custom formula
- *DC Formula*: Place for defining the custom DC formula

The "Save Damage" section contains some configuration details for damage and the actual damage parts:
- *Damage on Save*: Option that added informative text on how much damage should be applied when a creature succeeds on its saving throw
