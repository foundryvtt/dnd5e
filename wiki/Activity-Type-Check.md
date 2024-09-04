![Up to date as of 4.0.0](https://img.shields.io/static/v1?label=dnd5e&message=4.0.0&color=informational)

The Check activity allows for calling for ability checks including those that use skill or tool proficiency.


## Performing Checks

When the check activity is used it will place buttons in chat for each of the checks defined in the activity.

![Check Chat Card](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/check-card.jpg)

## Configuring Checks

After creating the Check activity the configuration sheet will open. Navigate over to the "Effect" tab to see options specific to the Check activity.

![Check Sheet - Effect Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/summoning/check-effect.jpg)

The "Check Details" section contains values used to determine what kind of checks are rolled and what the target DC is:
- *Associated Skills or Tools*: One or more skills or tools to create checks for. If left blank, then a single ability check will be created instead
- *Check Ability*: Specify the ability to be used with the check. If skills or tools are set then this will be used in place of the default ability associated with each skill or tool
- *DC Calculation*: Determines how the check DC is calculated, either using the default DC for an ability, the relevant spellcasting DC, or using a custom formula
- *DC Formula*: Place for defining the custom DC formula

When creating a Check activity on a tool item, then nothing more needs to be filled in. When using the activity from a tool it will automatically create the check based on the type of tool selected.
