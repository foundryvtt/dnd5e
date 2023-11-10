![Up to date as of 2.4.0](https://img.shields.io/static/v1?label=dnd5e&message=2.4.0&color=informational)

The Size advancement allows a race to set the creature size of a character and will present an option of sizes upon adding a race if more than one size is possible. This advancement can only be added to races and each race can only have a single advancement of this type.

## Configuration

![Size Configuration](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/size-configuration.jpg)

The Size advancement presents a list of creature sizes that can be chosen. The player will be presented these options as long as more than one size is selected.

It also allows a hint to be set which will be displayed to the user when they add the race. This is usually populated with the same text in the size section of the race's description, to give the player context for their choice.

## Usage

![Size Flow](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/size-configuration.jpg)

When a player adds a race they will be shown the hint provided, or an auto-generated hint if one wasn't set, and a dropdown of size options if more than one is possible.

## API

The original proposal for the Hit Points advancement can be [found here](https://github.com/foundryvtt/dnd5e/issues/2220).

### Configuration Schema

The Size advancement contains a simple data structure with `hint` being a string, and `sizes` being a set of available size options as defined in `CONFIG.DND5E.creatureSizes`.

```javascript
{
	hint: "Elves range from under 5 to over  feet tall and have slender builds. Your size is Medium.",
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
