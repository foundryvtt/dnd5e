![Up to date as of 2.1.0](https://img.shields.io/static/v1?label=dnd5e&message=2.1.0&color=informational)

## Configuring a Module
Modules that wish to provide portrait and/or token art for creatures in compendia may do so with special flags in their module manifest. This tells the dnd5e system where to find art to attach to the creature dynamically, that will then be present when the creature is imported into the world.

### `module.json`
```json
{
  "flags": {
    "moduleId": {
      "dnd5e-art": "modules/moduleId/map-dnd5e.json",
      "dnd5e-art-credit": "<em>Creature Artwork by Foo Bar.</em>"
    }
  }
}
```

The `dnd5e-art` key can point to any JSON file available within your module's directory. The file's name is not important, but its contents must be formatted in a specific way, see below. The optional `dnd5e-art-credit` string is dynamically appended to the biographies of each Actor that uses your module's art.

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
