For a general overview of World Scripts, see the [Foundry Community Wiki](https://foundryvtt.wiki/en/basics/world-scripts), much of this guide has been lifted from that page, but the example scripts below will be limited to DnD5e specific scripts.

# Usage
Scripts can be added to your World manifest, or the manifest of a Module, such as a Shared Compendium Module you may have created. You should determine which option is best for you. Adding a script to a World manifest means that it will always run when that World is launched, and only in that World. Adding a Script to a Module means it will be run whenever that module is activated, in any world.

In order to use a script you must:  
- have a Javascript file you want to add to your world or module, and   
- edit the world or module's manifest to point to your Javascript code.

Your Javascript file will usually live within the directory for the world or module in which it is used, but in reality, it could live anywhere in your Foundry userdata folder (see [Where Is My Data Stored?](https://foundryvtt.com/article/configuration/#where-user-data) on the Foundry KB for more information).  

This guide assumes that your Javascript is in the root of the world's directory (i.e. `Data/worlds/my-world/my-script.js`), and will be adding the script to your World.  
If you would instead like to add the script to a module, you can follow the guide below, replacing any use of "world" with "module", assuming your Javascript is in the root folder of the module's directory (i.e. `Data/modules/my-module/my-script.js`).

# Adding a script to your manifest
To include your Javascript file in your world:

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
6. If the world was already active, return to setup and launch it again. Whenever you change the world.json, you must re-launch the world for the changes to take effect.


# Examples
Scripts rely on Hooks to automatically execute, see [Hooks](Hooks.md) for system specific Hooks that you can use, or the [Foundry API](https://foundryvtt.com/api/modules/hookEvents.html) for Hooks provided by the Core Foundry Software.
Need Help? Feel free to jump in the Foundry VTT discord's [#dnd5e](https://discord.com/channels/170995199584108546/670336046164213761) or [#macro-polo](https://discord.com/channels/170995199584108546/699750150674972743) channels for assistance from the community. 

## Adding a new Ability
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

## Adding a new Skill
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
// Adds a new "plasma" damage type that will be selectable as a new type of damage for weapons
// and a new type of resistance for actors.
// Note that this *might* not play well with modules which auto apply damage and resistances.
Hooks.once("init", () => {
  CONFIG.DND5E.damageTypes.plasma = "Plasma";
  CONFIG.DND5E.damageResistanceTypes.plasma = "Plasma";
});
```

## Add a new Weapon Property
```js
/// Adds a new "Laser" Weapon Property and Physical Property for resistance bypass
Hooks.once("init", () => {
  CONFIG.DND5E.weaponProperties.lazer = "Laser";
  CONFIG.DND5E.physicalWeaponProperties.lazer = "Laser";
});
```

## Adding a new Spell School  
```js
/// Add a new Spell School that can be selected in Spell Items
Hooks.once("init", () => {
  CONFIG.DND5E.spellSchools.psi = "Psionics"
});
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

## Changing the Max Level Cap
```js
/// Increases the Maximum Level for a Player Actor to 30
Hooks.once("init", () => {
  CONFIG.DND5E.maxLevel = 30;
});
```
