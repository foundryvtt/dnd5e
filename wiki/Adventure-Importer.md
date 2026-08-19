![Up to date as of 6.0.0](https://img.shields.io/static/v1?label=dnd5e&message=6.0.0&color=informational)

The system provides a custom adventure importer dialog which supports additional import actions to customize the adventure during the import process.

![Adventure Importer for Phandelver & Below](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/adventure/adventure-importer.jpg)

## Setting up an Adventure

The first step to making use of the system's importer is to select the "D&D 5e Adventure Importer" inside the Sheet Configuration dialog for the adventure importer.

The import actions to use for the adventure can then be configured in two ways. For simple setups, the `importActions` flag inside the `dnd5e` namespace on the adventure itself can be set. For setups involving custom actions, or if modules the provide multiple adventures that all use the same actions, the actions can be configured by adding to `CONFIG.DND5E.adventure.config`. A config object can be added using either a specific adventure's UUID, or the module ID can be used to specify actions that will apply to all adventures within that module.

```javascript
{
  importActions: [
    // System provided actions with configuration data, the ID should match the action ID
    { id: "activateScene", initialScene: "pbsoPhandalinReg" },
    { id: "displayJournal", initialJournal: "pbsoWelcomeToPha" },

    // Module provided actions use unique ID and full configuration
    {
      id: "convertMonsters2024",
      label: "PBSO.IMPORT.ConvertMonsters2024",
      default: false,
      handler: convertMonsters24,
      quickstartHandler: adventures => {
        const { adventure, config } = adventures[0];
        return convertMonsters24.call(adventure, config, {}, { isQuickstart: true });
      },
      lifecycle: "pre",
      mapping: mapping24
    },
    {
      id: "convertSpells2024",
      label: "PBSO.IMPORT.ConvertSpells2024",
      default: false,
      quickstart: true,
      handler: convertSpells24,
      quickstartHandler: adventures => {
        const { adventure, config } = adventures[0];
        return convertSpells24.call(adventure, config, {}, { isQuickstart: true });
      },
      lifecycle: "pre",
      preserve: preserveSpells
    },

    // System provided actions without configuration data can just be a simple string of the action ID
    "customizeWorld"
  ]
}
```

## Default Import Actions

There are a number of import actions provided by the system that adventures can use, plus the system supports custom actions defined by the adventure for custom functionality.

Each import action may have options that customize that action further. These options included in the adventure configuration object or assigned as flags within the `dnd5e` namespace on the adventure document itself.

#### Activate Scene

This import action will automatically activate a single scene within the adventure once the importing is complete. This action will also run when using quickstart.

ID: `activateScene`

##### Options
- `initialScene`: The ID of a scene within the world to activate.

#### Display Journal

This import action can display a specific journal entry once importing the adventure is complete, perfect for showing the introduction or getting started pages. This action will also run when using quickstart.

ID: `displayJournal`

##### Options
- `initialJournal`: The ID of a journal entry in the world, or UUID of a journal entry or journal page either in the world or in a compendium.

#### Customize World

This import action will modify the world to set a custom join background and description. Since the quickstart process already performs does this, this action will not run during quickstart.

ID: `customizeWorld`

##### Options
- `joinBackground`: Path to the background image for the join page. If not specified, will fall back to the background provided in the quickstart config in the manifest if available.
- `joinDescription`: Description displayed on the join page. If not specified, will fall back to the description provided in the quickstart config in the manifest if available.

## Custom Import Actions

Custom import actions can be used in one of two ways. For actions that only affect adventures in a single module, they can be included directly in the list of actions to perform within the adventure's configuration (see the example above). To make the action available to other modules, they can be added to the `CONFIG.DND5E.adventure.importActions` object.

```javascript
CONFIG.DND5E.adventure.importActions.activateScene = {
  label: "DND5E.ADVENTURE.ImportAction.ActivateScene",
  default: true,
  handler: Adventure5e.activateScene,
  quickstartHandler: Adventure5e.activateSceneQuickstart,
  lifecycle: "post"
};
```

- `default`: Whether the action should be selected by default in the import dialog. Ignored if the `silent` option is specified.
- `handler`: Function that is called to run this action if it selected in the import dialog.
- `label`: Localization string for the action displayed in the dialog. Required for any action that doesn't have the `silent` option.
- `lifecycle`: When this action is run, `pre` being before any importing has occurred to customize the imported content and `post` after the import.
- `quickstartHandler`: Method called to use this action when quickstarting the adventure. If not provided, then the action will not be run when quickstart is used.
- `silent`: Silent actions aren't displayed in the import dialog and are always run.
