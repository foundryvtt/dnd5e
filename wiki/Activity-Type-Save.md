![Up to date as of 4.0.0](https://img.shields.io/static/v1?label=dnd5e&message=4.0.0&color=informational)

The Save activity allows for calling for saving throws and rolling damage.


## Configuring Saves

After creating the Save activity the configuration sheet will open. Navigate over to the "Effect" tab to see options specific to the Save activity.

![Save Sheet - Effect Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/activities/save-effect.jpg)

The "Save Details" section contains values used to determine what kind of save is rolled and what the target DC is:
- *Challenge Ability*: Controls what ability must be used when rolling the saving throw
- *DC Calculation*: Determines how the saving throw DC is calculated, either using the default DC for an ability, the relevant spellcasting DC, or using a custom formula
- *DC Formula*: Place for defining the custom DC formula

The "Save Damage" section contains some configuration details for damage and the actual damage parts:
- *Damage on Save*: Option that added informative text on how much damage should be applied when a creature succeeds on its saving throw
