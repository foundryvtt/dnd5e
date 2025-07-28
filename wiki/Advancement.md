![Up to date as of 5.1.0](https://img.shields.io/static/v1?label=dnd5e&message=5.1.0&color=informational)

## Advancement System

The advancement system is a new system in 5e that allows classes, subclasses, and backgrounds to make modifications to the character when they are added and when a character levels up.

This page provides an overview of the system and its API. For more specific guides, please visit one of the following pages:

- [Advancement User Guide](Advancement-User-Guide)
- [Custom Class Example](Custom-Class-Advancement)

#### Disabling Advancements

The advancement system can be disabled for all players in a world by using the `"Disable level-up automation"` option in the 5e system settings. To avoid running advancements on an individual character, any advancements should be removed from the class, subclass, or background before it is dropped on the character sheet.


## Advancement Types
### Ability Score Improvement *(class, background, race, or feature only)*
[Ability score improvement](Advancement-Type-Ability-Score-Improvement) allows for improving a character's ability scores by either a fixed amount or based on user choice. When added to a class, it also optionally allows for selecting a feat instead of improving abilities.

### Choose Items
The [choose items advancement](Advancement-Type-Item-Choice) defines a list of features, spells, or other items that the player can choose to add to the actor at a certain level.

### Grant Items
The [grant items advancement](Advancement-Type-Item-Grant) defines a list of features, spells, or other items that are added to the actor at a certain level.

### Hit Points *(class only)*
The [hit points advancement](Advancement-Type-Hit-Points) keeps track of hit point values for each level of a class. The player will have an option for rolling their hit points or taking the average value.

### Scale Value
[Scale values](Advancement-Type-Scale-Value) are formula values that change arbitrarily depending on the level of the class or subclass to which they belong. These values are then made available to be used in roll formulas or elsewhere in the system. A few examples of this include a Bard's inspiration die size, a Rogue's sneak attack value, or a Cleric's channel divinity uses.

### Size *(species only)*
The [size](Advancement-Type-Size) advancement stores a list of sizes that can be selected when selecting a species.

### Subclass *(class only)*
The [subclass](Advancement-Type-Subclass) advancement gives players the chance to select a subclass.

### Trait
The [trait](Advancement-Type-Trait) advancement grants the character certain traits such as weapon proficiencies, skill expertise, or damage resistances. It presents the player with a list of options if a choice needs to be made.


## Advancement Hooks

Details of the hooks that the advancement system provides can be found on [the hooks page](Hooks#advancement).


## Custom Advancement Types

For module authors who want to expand beyond the advancement types offered in the system, it is a simple task to create and register custom advancement types.

### Authoring

#### `Advancement` Class

All custom types should subclass the abstract `Advancement` type. This class contains all of the base configuration of the advancement, details on its data structure, and methods for displaying it within the advancement list on items and performing changes to the actor when the advancement is applied.

##### Ordering

The `order` value in the `Advancement#metadata` object determines in which order this advancement type appears. Here are the values for built-in types:

* `10` - Hit Points
* `20` - Ability Score Improvement
* `25` - Size
* `30` - Trait
* `40` - Grant Items
* `50` - Choose Items
* `60` - Scale Value
* `70` - Subclass
* `100` - (base advancement class)

You can set your ordering value between any of these numbers to position your advancement in the list.

#### `AdvancementConfigV2` Class

A subclass of `AdvancementConfigV2` is needed when a custom advancement type needs to present custom configuration options to the user. If no custom config application is provided, the default config window will be shown to allow for customization of the advancement's base settings.

When subclassing the config app, the default `config` part should always be included to provide the standard advancement configuration options such as name and icon:

```javascript
  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    myPart: {
      template: "modules/path/to/my/template.hbs"
    }
  };
```

#### `AdvancementFlow` Class

The controls presented within the advancement process are defined within a subclass of `AdvancementFlow`. This will always be rendered as a sub-application of the surrounding `AdvancementManager`.

#### Namespacing

Custom advancements introduced by modules should be uniquely namespaced for that module to ensure that future advancement types introduced by the system or other modules do not conflict.

### Registering

The only step required to register a custom advancement type with 5e is to add the new `Advancement` class to the `game.dnd5e.advancement.types` object.

```javascript
Hooks.once("init", () => {
  CONFIG.DND5E.advancementTypes.MyModuleCustom = {
    documentClass: MyModuleCustomAdvancement,
    validItemTypes: new Set(["class", "subclass"])
  };
});
```

Advancements are looked up by their type. For example, an advancement of type 'MyModuleCustom' will be loaded by the `MyModuleCustomAdvancement` class, if it can be found.

Advancement registration should be done during a module's `"init"` or `"setup"` hooks to ensure that the custom type is available during item preparation.

For certain special or one-off advancement types the `hidden` option can be used in the config. This hides the advancement type when using the advancement creation dialog, but still allows the advancement to be configured and used if it is already on an item.

If at any point a module that introduces a custom advancement is disabled, the system will simply skip preparing that advancement while retaining the underlying data in case the advancement is ever re-added.
