![Up to date as of 3.0.0](https://img.shields.io/static/v1?label=dnd5e&message=3.0.0&color=informational)

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
  "version": "1.0.0"
}
```
4. Add the path to your Javascript file to the esmodules array. If your Javascript file is stored in the root of the world directory as suggested above, just write the filename in quotation marks. It will look like this when you're done: `"esmodules": [ "my-script.js" ],` Note the comma is required at the end of the line, unless you've added this as the very last key in the JSON file. If you are unsure if your world.json file is formatted correctly, you can check it with an online JSON validator such as [JSONLint](https://jsonlint.com/).
5. Save and close world.json.
6. Open Foundry and launch your world. Whenever you change the world.json, you must re-launch the world for the changes to take effect.


# Examples
Scripts rely on Hooks to automatically execute, see [Hooks](Hooks.md) for system specific Hooks that you can use, or the [Foundry API](https://foundryvtt.com/api/modules/hookEvents.html) for Hooks provided by the Core Foundry Software.  
The examples below modify different aspects of the dnd5e system's configuration, to explore the configuration to see what you can modify, open the Console with F12 and type in `CONFIG.DND5E` then hit Enter.  
Need Help? Feel free to jump in the Foundry VTT discord's [#dnd5e](https://discord.com/channels/170995199584108546/670336046164213761) or [#macro-polo](https://discord.com/channels/170995199584108546/699750150674972743) channels for assistance from the community. 

## Add a new Ability
```js
/// Add a new Ability
Hooks.once("init", () => {
  CONFIG.DND5E.abilities.grt = {
    label: "Grit",
    abbreviation: "grt",
    fullKey: "grit", // Full key used in enrichers
    reference: "Compendium.my-module…", // UUID of journal entry page for rich tooltips
    type: "mental", // mental or physical
    defaults: {vehicle: 0}, // Optional
    improvement: false // Explicitly set this to 'false' to prevent it showing up for ASIs.
  };
});
```

## Add a new Skill
```js
/// Add a new Skill
Hooks.once("init", () => {
  CONFIG.DND5E.skills.bfp = {
    label: "Backflip",
    ability: "dex",
    fullKey: "backflip", // Full key used in enrichers
    reference: "Compendium.my-module…", // UUID of journal entry page for rich tooltips
    icon: "…" // Icon used in favorites on new character sheet
  };
});
```

## Add a new Damage Type
```js
/// Adds a new "plasma" damage type that will be selectable as a new type of damage for weapons and a new type of resistance for actors.
Hooks.once("init", () => {
  CONFIG.DND5E.damageTypes.plasma = {
    label: "Plasma",
    isPhysical: true
  };
});
```

## Add a new Weapon Property
```js
/// Adds a new "Laser" Weapon Property and Physical Property for resistance bypass
Hooks.once("init", () => {
  CONFIG.DND5E.itemProperties.laser = {
    label: "Laser",
    isPhysical: "true"
  };
  CONFIG.DND5E.validProperties.weapon.add("laser");
});
```

## Remove a Weapon Property
```js
/// Removes the Firearm Weapon Property
Hooks.once("init", () => {
  CONFIG.DND5E.validProperties.weapon.delete("fir");
});
```

## Add a new Spell School  
```js
/// Add a new Spell School that can be selected in Spell Items
Hooks.once("init", () => {
  CONFIG.DND5E.spellSchools.psi = {
    label: "Psionics",
    icon: "…",
    fullKey: "psionics", // Full key used in enrichers
    reference: "" // UUID of journal entry page for rich tooltips
  };
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
Hooks.once("init", () => {
  CONFIG.DND5E.featureTypes.marexploit = {
    label: "Martial Exploit",
    subtypes: {
      first: "1st-Degree",
      second: "2nd-Degree",
      third: "3rd-Degree"
    }
  };
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

## Change the Max Level Cap
```js
/// Increases the Maximum Level for a Player Actor to 30
Hooks.once("init", () => {
  CONFIG.DND5E.maxLevel = 30;
});
```

## Modify Languages 
### Add a language  
The "Cool Speech" language will be available at the top level (with Druidic and Thieves' Cant), "Super Common" will appear under the Standard category, and "Uncommon" will appear under the Exotic category.
```js
Hooks.once("init", () => {
    CONFIG.DND5E.languages.coolspeech = "Cool Speech";
    CONFIG.DND5E.languages.standard.children.supercommon = "Super Common";
    CONFIG.DND5E.languages.exotic.children.uncommon = "Uncommon";
});
```

### Add languages with children to the Standard or Exotic language families  
"Gibberish" will be a subfamily of the Standard language family with child languages "High Gibberish" and "Gibberish", and "Nonsense" will be a subfamily of the Exotic language family with child languages "Old Nonsense" and "New Nonsense".  
```js
Hooks.once("setup", () => {
    CONFIG.DND5E.languages.standard.children.gibberish = {
        label: "Gibberish",
        children: {
            gibberish: "Gibberish",
            highgibberish: "High Gibberish"
        }
    },
    CONFIG.DND5E.languages.exotic.children.nonsense = {
        label: "Nonsense",
        children: {
            oldnonsense: "Old Nonsense",
            newnonsense: "New Nonsense"
        }
    }
});
```

### Delete languages
```js
Hooks.once("init", () => {
    delete CONFIG.DND5E.languages.druidic;
    delete CONFIG.DND5E.languages.standard.children.dwarvish;
    delete CONFIG.DND5E.languages.exotic.children.aarakocra;
    delete CONFIG.DND5E.languages.exotic.children.primordial.children.aquan;
});
```

## Add new Item Activation Cost Types
```js
/// Adds in options to display in the Activation Cost dropdown
Hooks.once("init", () => {
  CONFIG.DND5E.abilityActivationTypes.crithit = "Critical Hit";
  CONFIG.DND5E.abilityActivationTypes.attack = "On Attack";
  CONFIG.DND5E.abilityActivationTypes.replaceattack = "Replaces Attack";
  CONFIG.DND5E.abilityActivationTypes.meleehit = "On Melee Hit";
  CONFIG.DND5E.abilityActivationTypes.rangedhit = "On Ranged Hit";
  CONFIG.DND5E.abilityActivationTypes.weaponhit = "On Weapon Hit";
});
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
