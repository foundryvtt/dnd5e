![Up to date as of 4.2.0](https://img.shields.io/static/v1?label=dnd5e&message=4.2.0&color=informational)

The Size advancement allows a species to set the creature size of a character and will present an option of sizes upon adding a species if more than one size is possible. This advancement can only be added to species and each species can only have a single advancement of this type.

## Configuration

![Size Configuration](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/size-configuration.jpg)

The Size advancement presents a list of creature sizes that can be chosen. The player will be presented these options as long as more than one size is selected.

## Usage

![Size Flow](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/size-flow.jpg)

When a player adds a species they will be shown the hint provided, or an auto-generated hint if one wasn't set, and a dropdown of size options if more than one is possible.

## API

The [original proposal](https://github.com/foundryvtt/dnd5e/issues/2220) for the Size advancement is available on GitHub, but may not reflect the current state of the advancement.

### Configuration Schema

The Size advancement contains a simple data structure with `sizes` being a set of available size options as defined in `CONFIG.DND5E.creatureSizes`.

```javascript
{
	sizes: new Set(["med"])
}
```

### Value Schema

The Size advancement keeps track of the size selected by the user as a string. This value is set even if there was only a single size configured.

```javascript
{
	size: "med"
}
```
