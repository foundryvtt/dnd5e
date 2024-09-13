![Up to date as of 4.0.0](https://img.shields.io/static/v1?label=dnd5e&message=4.0.0&color=informational)

The Attack activity allows for making attacks and rolling damage.


## Performing Attacks

Using the attack activity will place an attack card into the chat log, with "Attack" and "Damage" buttons (assuming damage has been defined for the attack, otherwise only the "Attack" button will appear). Clicking on these buttons will open the standard rolling prompts.

![Attack Card & Dialogs](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/activities/attack-chat-dialog.jpg)

When making an attack with a weapon, a few additional options may appear in the attack roll dialog:
- *Ammunition*: For weapons with the Ammunition property, the ammunition used with the attack will be selectable. This ammo will add a bonus to the attack roll if it has a magical bonus and bonuses to the subsequent damage rolled using the same attack card
- *Attack Mode*: Allows for choosing between one-handed and two-handed attacks on weapons with the "Versatile" property, between melee and thrown attacks on weapons with the "Thrown" property, or making an offhand attack for weapons with the "Light" property. Subsequent damage rolls from the same attack card will be adjusted based on the attack mode chosen
- *Weapon Mastery*: If the weapon has a defined "Mastery" and the character has alternate mastery options, when the player will able to choose which of the available masteries to use


## Configuring Attacks

After creating the Attack activity the configuration sheet will open on the "Identity" tab. In addition to the standard activity options (see the [Activities Overview](Activities.md) for more details), Attack also includes a pair of properties for defining the attack type. *Attack Type* indicates whether this is a melee or ranged attack, and *Attack Classification* indicates whether it is a weapon, spell, or unarmed attack. These values affect what bonuses are applied to attack and damage rolls from the actor. If possible, these values will be populated by default values from the containing item.

![Attack Sheet - Identity Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/activities/attack-identity.jpg)

### Attack Details & Damage

The "Effect" tab contains the rest of the unique properties for the Attack activity, split into sections defining attack and damage details.

![Attack Sheet - Effect Tab](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/activities/attack-effect.jpg)

The "Attack Details" section contains values used to calculate the attack roll itself:
- *Attack Ability*: Ability used to make the attack and available as `@mod` in damage formulas
- *To Hit Bonus*: Additional bonus added to the To Hit roll
- *Flat To Hit*: Use only the *To Hit Bonus* when performing the attack roll, not the attacker’s proficiency or ability modifier
- *Critical Threshold*: Minimum value needed on the attack die to determine if an attack is a critical hit

The "Attack Damage" section contains some configuration details for damage and the actual damage parts:
- *Include Base Damage*: Available on weapons and ammunition, this controls whether the item’s intrinsic damage is included in this attack
- *Extra Critical Damage*: Extra damage formula that will be added to the first damage part if critical damage is rolled. This extra damage is not multiplied like the rest of the damage
