![Up to date as of 4.1.0](https://img.shields.io/static/v1?label=dnd5e&message=4.1.0&color=informational)

The compendium browser is a new application for finding content from across multiple compendiums using searching and filtering. The browser can be accessed using the "Open Compendium Browser" button at the top of the Compendium Packs sidebar tab.

![Compendium Browser - Standard Mode](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/compendium-browser/standard-mode.jpg)

## Modes

The compendium browser has two modes: standard and advanced. These modes can be changed using a toggle at the top of the window. In standard mode (visible above), the tabs represent specific useful categories for searching, such as classes, subclasses, spells, feats, and monsters.

In advanced mode (seen below), the tabs are split into actor and item lists and by default the browser will display all actors or items. On each tab additional filtering can be used to narrow in on a specific set of types.

![Compendium Browser - Advanced Mode](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/compendium-browser/advanced-mode.jpg)

The browser can also be activated from elsewhere in the system in locked mode. In this case the browser will be locked to a specific item type and potentially additional filters could be automatically applied. This mode is used for places where a specific choice must be made, such as choosing a class for your character or selecting a creature to summon.

![Compendium Browser - Class Selection](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/compendium-browser/class-selection.jpg)

## Source Configuration

GMs have the option for modify what sources appear in the compendium browser, customizing which specific compendiums are offered by different modules. These options using the "Configure Sources" button in the system settings or the gear on the top right of the compendium browser itself.

![Compendium Browser - Configure Sources](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/compendium-browser/configure-sources.jpg)

## Module Support

The compendium browser will automatically pick up content from any enabled modules, displaying results to players so long as they are able to view a given compendium pack. There is no need for modules to do anything for their users to gain access to content through the compendium browser, but additional hints may be provided to aid in its functionality.

When searching for content the compendium browser will use type hints on compendium pack definitions in the module manifest if provided to determine what kind of content is included in the compendium. If no hints are provided, the compendium will always be scanned, but if specific types are specified then it might be skipped if the user isn't searching for those types, potentially improving performance.

```json
{
  "name": "spells",
  "label": "Spells (SRD)",
  "system": "dnd5e",
  "path": "packs/spells",
  "type": "Item",
  "flags": {
    "dnd5e": {
      "types": ["spell"]
    }
  }
}
```

The flag `flags.dnd5e.types` on a compendium pack in `module.json` should contain an array with the specific item or actor types in that compendium. Providing an empty array here will prevent the browser from searching that pack.
