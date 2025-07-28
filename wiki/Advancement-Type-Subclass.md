![Up to date as of 5.1.0](https://img.shields.io/static/v1?label=dnd5e&message=5.1.0&color=informational)

The Subclass advancement allows for indicating the level at which a class takes it subclass and providing a custom subclass name (such as "Martial Archetype") that will be used in the class journal. This advancement can only be added to classes and each class can only have a single advancement of this type.

## Configuration

The Subclass advancement contains only the default advancement configuration options.

## Usage

![Subclass Flow, Compendium Browser Button](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/subclass-flow-initial.jpg)

Players will be presented with a button to open up the compendium browser with pre-populated filters and a drop area where a subclass can be dropped if the player doesn't wish to use the compendium browser.

![Subclass Flow, Selected Subclass](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/subclass-flow-selected.jpg)

## API

The [original proposal](https://github.com/foundryvtt/dnd5e/issues/1407) for the Subclass advancement is available on GitHub, but may not reflect the current state of the advancement.

### Configuration Schema

None

### Value Schema

The Subclass advancement keeps track of the local copy of the selected subclass as well as the compendium UUID of where this subclass originated.

```javascript
{
  document: "sprHbe7cRg9osTzf", // Available as an `Item5e` instance at runtime
  uuid: "Compendium.dnd5e.subclasses.Item.MNvsEc4D2ccX7dQT"
}
```
