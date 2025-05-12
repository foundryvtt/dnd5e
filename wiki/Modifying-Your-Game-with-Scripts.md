![Up to date as of 4.2.0](https://img.shields.io/static/v1?label=dnd5e&message=4.2.0&color=informational)

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
To include your Javascript file in your world, first, shut down Foundry completely, then:

1. Navigate to your world's directory in your user data folder.
2. Open world.json in a text editor (Visual Studio Code is a good choice, but almost any editor will do).
3. Your world.json file might look something like this:
```json
{
  "title": "Cool DnD World!!",
  "id": "cool-dnd-world",
  "system": "dnd5e",
  "coreVersion": "12.331",
  "compatibility": {
    "minimum": "12",
    "verified": "12"
  },
  "systemVersion": "4.2.0"
}
```
Add an `esmodules` key: `esmodules: [],` after any existing key (within a single pair of curly brackets `{}`). Omit the trailing comma if no key follows. If your file already has an `esmodules` key, leave it unmodified.
4. Add the path to your Javascript file to the esmodules array. If your Javascript file is stored in the root of the world directory as suggested above, just write the filename in quotation marks inside the square brackets `[]`. If you are unsure if your world.json file is formatted correctly, you can check it with an online JSON validator such as [JSONLint](https://jsonlint.com/).
Your world.json file should now look something like this:
```json
{
  "title": "Cool DnD World!!",
  "id": "cool-dnd-world",
  "esmodules": [ "my-script.js" ],
  "system": "dnd5e",
  "coreVersion": "12.331",
  "compatibility": {
    "minimum": "12",
    "verified": "12"
  },
  "systemVersion": "4.2.0"
}
```
5. Save and close world.json.
6. Create a file called my-script.js in the same directory of world.json
7. Copy an example from the next chapter into it
8. Open Foundry and launch your world. Whenever you change the world.json, you must re-launch the world for the changes to take effect.


# Examples
Scripts rely on Hooks to automatically execute, see [Hooks](Hooks.md) for system specific Hooks that you can use, or the [Foundry API](https://foundryvtt.com/api/modules/hookEvents.html) for Hooks provided by the Core Foundry Software.
When you do a change to your my-script.js it is sufficient to press F5, which will reload foundry client and your script.
The examples below modify different aspects of the dnd5e system's configuration, to explore the configuration to see what you can modify, press F12, this will open the inspector on the right side of the screen. Click on "Console" at the top, then scroll all the way to the bottom of the page, until you see a prompt ">". There type in `CONFIG.DND5E` then hit Enter.
You will see a "ASCII:" tag you can expand by clicking on the arrow. The information presented are all the variables currently available in the DND5E module. For example you can inspect all the skills available by clicking on "skills".
If there is an error in your my-script.js you can find it in the F12 Console. To do so you need to scroll all the way to the top. Here you can find the error with the indication of the line number.
Need Help? Feel free to jump in the Foundry VTT discord's [#dnd5e](https://discord.com/channels/170995199584108546/670336046164213761) or [#macro-polo](https://discord.com/channels/170995199584108546/699750150674972743) channels for assistance from the community.

## Add a new Ability
```js
// Add a new Ability
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
// Add a new Skill
Hooks.once("init", () => {
  CONFIG.DND5E.skills.backflip = {
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
// Adds a new "plasma" damage type that will be selectable as a new type of damage for weapons and a new type of resistance for actors.
Hooks.once("init", () => {
  CONFIG.DND5E.damageTypes.plasma = {
    label: "Plasma",      // The displayed name of the damage type
    isPhysical: true,     // Whether this is negated by adamantine/magical/silvered
    icon: "",             // An svg icon.
    color: new Color(0),  // The color of the damage type (currently unused).
    reference: ""         // A uuid of a journal entry rules page.
  };
});
```

## Add a new Weapon Property
```js
// Adds a new "Laser" Weapon Property and Physical Property for resistance bypass
Hooks.once("init", () => {
  CONFIG.DND5E.itemProperties.laser = {
    label: "Laser",
    isPhysical: true
  };
  CONFIG.DND5E.validProperties.weapon.add("laser");
});
```

## Remove a Weapon Property
```js
// Removes the Firearm Weapon Property
Hooks.once("init", () => {
  CONFIG.DND5E.validProperties.weapon.delete("fir");
});
```

## Add a new Spell School
```js
// Add a new Spell School that can be selected in Spell Items
Hooks.once("init", () => {
  CONFIG.DND5E.spellSchools.psionics = {
    label: "Psionics",
    icon: "…",
    fullKey: "psionics", // Full key used in enrichers
    reference: "" // UUID of journal entry page for rich tooltips
  };
});
```

## Add a new Class Feature Type
```js
// Adds a new "Blood Curse" class feature type
Hooks.once("init", () => {
  CONFIG.DND5E.featureTypes.class.subtypes.bloodCurse = "Blood Curse";
});
```

## Add new Feature Item Type and Subtypes
```js
// Adds in a new feature type, similar to "Class Feature" called "Martial Exploit", with 3 different subtypes for it.
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
// Add a new AC Calculation
Hooks.once("init", () => {
  CONFIG.DND5E.armorClasses.fortitude = {
    label: "Fortitude",
    formula: "13 + @abilities.con.mod"
  };
});
```

## Change the Max Level Cap
```js
// Increases the Maximum Level for a Player Actor to 30
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
Hooks.once("init", () => {
  CONFIG.DND5E.languages.standard.children.gibberish = {
    label: "Gibberish",
    children: {
      gibberish: "Gibberish",
      highgibberish: "High Gibberish"
    }
  };
  CONFIG.DND5E.languages.exotic.children.nonsense = {
    label: "Nonsense",
    children: {
      oldnonsense: "Old Nonsense",
      newnonsense: "New Nonsense"
    }
  };
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

## Add new Activation Cost Types
```js
// Adds in options to display in the Activation Cost dropdown
Hooks.once("init", () => {
  CONFIG.DND5E.activityActivationTypes.crithit = {
    label: "Critical Hit",
    group: "DND5E.ACTIVATION.Category.Combat"
  };
  CONFIG.DND5E.activityActivationTypes.moon = {
    label: "Moons",
    group: "DND5E.ACTIVATION.Category.Time",
    scalar: true // Takes an associated number
  };
});
```

## Add new Weapon Types
You will need a compendium (a [shared compendium module](https://foundryvtt.com/article/module-maker/) works well for this) in which you store a base item, just like the system already has the 'Items SRD' compendium with all the different weapons.
Then, for each item you want to add as a new 'base weapon', copy the uuid from the item's header using the book button (right-click in Foundry V11 or lower, left-click in Foundry V12 or higher).

```js
// Adds new Weapon types of Hand Cannon and Magnum
Hooks.once("init", () => {
  CONFIG.DND5E.weaponIds.handCannon = "uuid";
  CONFIG.DND5E.weaponIds.magnum = "uuid";
  // etc etc
});

```

## Add new Tool Proficiencies
Similar to the Weapon Types above, an item in a compendium will need to be referenced to create a new Tool Proficiency
```js
// Adds new Tool Proficiency for Hacking Tools
Hooks.once("init", () => {
  CONFIG.DND5E.tools.hacking = {
    ability: "int",
    id: "uuid"
  };
});
```

## Modifying Encumbrance Values
### Encumbrance Thresholds
The encumbrance calculations are determined by strength multipliers that can be defined for both imperial and metric settings.
```javascript
// Modify encumbrance thresholds
Hooks.once("init", () => {
  CONFIG.DND5E.encumbrance.threshold.encumbered = {
    imperial: 8,
    metric: 4
  };
  CONFIG.DND5E.encumbrance.threshold.heavilyEncumbered = {
    imperial: 14,
    metric: 9
  };
  CONFIG.DND5E.encumbrance.threshold.maximum = {
    imperial: 20,
    metric: 10
  };
});
```
