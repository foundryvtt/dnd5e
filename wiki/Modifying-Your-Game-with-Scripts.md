![](https://img.shields.io/static/v1?label=dnd5e&message=2.3.1&color=informational)

For a general overview of World Scripts, see the [Foundry Community Wiki](https://foundryvtt.wiki/en/basics/world-scripts), much of this guide has been lifted from that page, but the example scripts below will be limited to DnD5e specific scripts.

# Usage
Scripts can be added to your World manifest, or the manifest of a Module, such as a [Shared Compendium Module](https://foundryvtt.com/article/module-maker/) you may have created. You should determine which option is best for you. Adding a script to a World manifest means that it will always run when that World is launched, and only in that World. Adding a Script to a Module means it will be run whenever that module is activated, in any world.
>[!NOTE]
>These world scripts are written to modify the base dnd5e system only, and may need other considerations to integrate with any modules you may be using.

In order to use a script you must:  
- have a Javascript file you want to add to your world or module, and   
- edit the world or module's manifest to point to your Javascript code.

Your Javascript file will usually live within the directory for the world or module in which it is used, but in reality, it could live anywhere in your Foundry userdata folder (see [Where Is My Data Stored?](https://foundryvtt.com/article/configuration/#where-user-data) on the Foundry KB for more information).  

This guide assumes that your Javascript is in the root of the world's directory (i.e. `Data/worlds/my-world/my-script.js`), and will be adding the script to your World.  
If you would instead like to add the script to a module, you can follow the guide below, replacing any use of "world" with "module", assuming your Javascript is in the root folder of the module's directory (i.e. `Data/modules/my-module/my-script.js`).

# Adding a script to your manifest
To include your Javascript file in your world, first, shut down the World in Foundry, then:

1. Navigate to your world's directory in your user data folder.
2. Open world.json in a text editor (Visual Studio Code is a good choice, but almost any editor will do).
3. In the world.json file, look for a line with the esmodules key. If there isn't one, add it after any of the existing keys, like this:
```json
{
  "title": "My Cool DnD Game",
  "esmodules": [],
  "version": "1.0.0",
...
}
```
4. Add the path to your Javascript file to the esmodules array. If your Javascript file is stored in the root of the world directory as suggested above, just write the filename in quotation marks. It will look like this when you're done: `"esmodules": [ "my-script.js" ],` Note the comma is required at the end of the line, unless you've added this as the very last key in the JSON file. If you are unsure if your world.json file is formatted correctly, you can check it with an online JSON validator such as [JSONLint](https://jsonlint.com/).
5. Save and close world.json.
6. Open Foundry and launch your world. Whenever you change the world.json, you must re-launch the world for the changes to take effect.


# Examples
Scripts rely on Hooks to automatically execute, see [Hooks](Hooks.md) for system specific Hooks that you can use, or the [Foundry API](https://foundryvtt.com/api/modules/hookEvents.html) for Hooks provided by the Core Foundry Software.  
Need Help? Feel free to jump in the Foundry VTT discord's [#dnd5e](https://discord.com/channels/170995199584108546/670336046164213761) or [#macro-polo](https://discord.com/channels/170995199584108546/699750150674972743) channels for assistance from the community. 

## Add a new Ability
```js
/// Add a new Ability
Hooks.once("init", () => {
  CONFIG.DND5E.abilities.grt = {
    label: "Grit",
    abbreviation: "grt",
    type: "mental", ///mental or physical
    defaults: {vehicle: 0} ///Optional
  };
});
```

## Add a new Skill
```js
/// Add a new Skill
Hooks.once("init", () => {
  CONFIG.DND5E.skills.bfp = {
    ability: "dex",
    label: "Backflip"
  };
});
```

## Adding a new Damage Type
```js
/// Adds a new "plasma" damage type that will be selectable as a new type of damage for weapons and a new type of resistance for actors.
Hooks.once("init", () => {
  CONFIG.DND5E.damageTypes.plasma = "Plasma";
  CONFIG.DND5E.damageResistanceTypes.plasma = "Plasma";
});
```

## Add a new Weapon Property
```js
/// Adds a new "Laser" Weapon Property and Physical Property for resistance bypass
Hooks.once("init", () => {
  CONFIG.DND5E.weaponProperties.laser = "Laser";
  CONFIG.DND5E.physicalWeaponProperties.laser = "Laser";
});
```

## Remove a Weapon Property
```js
/// Removes the Firearm Weapon Property
Hooks.once("init", () => {
  delete CONFIG.DND5E.weaponProperties.fir;
});
```

## Add a new Spell School  
```js
/// Add a new Spell School that can be selected in Spell Items
Hooks.once("init", () => {
  CONFIG.DND5E.spellSchools.psi = "Psionics"
});
```

## Add a new Class Feature Type
```js
/// Adds a new "Blood Curse" class feature type
Hooks.once("init", () => {
  CONFIG.DND5E.featureTypes.class.subtypes.bloodCurse = "Blood Curse";
});
```

## Add new Feature Item Type and Subtypes
```js
/// Adds in a new feature type, similar to "Class Feature" called "Martial Exploit", with 3 different subtypes for it.
Hooks.once("setup", function(){
  CONFIG.DND5E.featureTypes.marexploit = {
  label: "Martial Exploit",
  subtypes: {
    first: "1st-Degree",
    second: "2nd-Degree",
    third: "3rd-Degree"
    }
};
```

## Add a new Armor Calculation
```js
/// Add a new AC Calculation
Hooks.once("init", () => {
  CONFIG.DND5E.armorClasses.fortitude = {
    label: "Fortitude",
    formula: "13 + @abilities.con.mod"
  };
});
```

## Change the Max Level Cap
```js
/// Increases the Maximum Level for a Player Actor to 30
Hooks.once("init", () => {
  CONFIG.DND5E.maxLevel = 30;
});
```

## Remove, Rename, and Add new Languages 
```js
/// Removes Common, Renames Deepspeech to Voidspeech, and adds a languages called Ochnun
Hooks.once("setup", function addLanguages(){
  delete CONFIG.DND5E.languages.common;
  CONFIG.DND5E.languages.deep = "Voidspeech";
  CONFIG.DND5E.languages.ochnun= "Ochnun";
});
```

## Add new Item Activation Cost Types
```js
/// Adds in options to display in the Activation Cost dropdown
Hooks.once("setup", function(){
  CONFIG.DND5E.abilityActivationTypes.crithit = 'Critical Hit';
  CONFIG.DND5E.abilityActivationTypes.attack = 'On Attack';
  CONFIG.DND5E.abilityActivationTypes.attack = 'Replaces Attack';
  CONFIG.DND5E.abilityActivationTypes.meleehit = 'On Melee Hit';
  CONFIG.DND5E.abilityActivationTypes.rangedhit = 'On Ranged Hit';
  CONFIG.DND5E.abilityActivationTypes.weaponhit = 'On Weapon Hit';
}),
```

## Add new Weapon Types
You will need a compendium (a [shared compendium module](https://foundryvtt.com/article/module-maker/) works well for this) in which you store a base item, just like the system already has the 'Items SRD' compendium with all the different weapons.
Then, for each item you want to add as a new 'base weapon', copy the uuid from the item's header - right-click the book icon. Do not left-click. 
Note that the uuid should be tweaked slightly, it should not be the full uuid but instead of this form: `module-scope.compendium-id.item-id`  
e.g the full UUID of the Shortsword is `Compendium.dnd5e.items.Item.osLzOwQdPtrK3rQH` but in the world script only `dnd5e.items.osLzOwQdPtrK3rQH` would be used.

```js
/// Adds new Weapon types of Hand Cannon and Magnum
Hooks.once("init", () => {
  CONFIG.DND5E.weaponIds.handCannon = "module-scope.compendium-id.item-id";
  CONFIG.DND5E.weaponIds.magnum = "module-scope.compendium-id.item-id";
  // etc etc
});

```

## Add new Tool Proficiencies
Similar to the Weapon Types above, an item in a compendium will need to be referenced to create a new Tool Proficiency
```js
/// Adds new Tool Proficiency for Hacking Tools
Hooks.once("init", () => {
  CONFIG.DND5E.toolIds.hacking = "module-scope.compendium-id.item-id";
});
```
