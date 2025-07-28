![Up to date as of 5.1.0](https://img.shields.io/static/v1?label=dnd5e&message=5.1.0&color=informational)

> [!Note]
> The system's module art system has been deprecated and replaced with Foundry's implementation.

## Migrate to Core's system
Migrating to the core compendium art system is very simple and only requires adjusting the flags in your `module.json` by moving your flags into a `compendiumArtMappings.dnd5e` object and renaming `dnd5e-art` to `mapping` and `dnd5e-art-credit` to just `credit`:

### Existing `module.json`
```json
{
  "flags": {
    "<Module ID>": {
      "dnd5e-art": "modules/<Module ID>/map-dnd5e.json",
      "dnd5e-art-credit": "<em>Creature Artwork by Foo Bar.</em>"
    }
  }
}
```

### Updated `module.json`
```json
{
  "flags": {
    "compendiumArtMappings": {
      "dnd5e": {
        "mapping": "modules/<Module ID>/map-dnd5e.json",
        "credit": "<em>Creature Artwork by Foo Bar.</em>"
      }
    }
  }
}
```

## JSON Definition

The `mapping` key can point to any JSON file available within your module's directory. The file's name is not important, but its contents must be formatted in a specific way, see below. The optional `credit` string is dynamically appended to the biographies of each Actor that uses your module's art. The system will automatically add the credit to the end of the actor's description in the compendium.

### `map-dnd5e.json`
```json
{
  "dnd5e.monsters": {
    "M4eX4Mu5IHCr3TMf": {
      "actor": "modules/moduleId/tokens/BanditP.webp",
      "token": "modules/moduleId/tokens/BanditT.webp"
    }
  },
  "dnd5e.heroes": {
    "bzlxBO5km3zCQA8G": {
      "actor": "modules/moduleId/tokens/GnomeP.webp",
      "token": {
        "texture": {
          "src": "modules/moduleId/tokens/GnomeT.webp",
          "scaleX": 0.8,
          "scaleY": 0.8
        }
      }
    }
  }
}
```

The top-level object keys in the file must be the fully-qualified pack IDs of the compendia that your module wishes to provide art for. The keys within those pack objects are the IDs of the Actor entries inside that pack.

The `actor` key will then be used for the Actor's portrait art. The above example demonstrates two ways to provide token art: Either providing a string as the `token` value, or providing an object. If a string is provided, it is treated as the URL to the token's image. If an object is provided, its contents is merged with the Actor's `prototypeToken` object. This allows you to adjust more than just the token's image, including scale, rotation, tint, etc.
