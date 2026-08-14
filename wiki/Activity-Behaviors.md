![Up to date as of 6.0.0](https://img.shields.io/static/v1?label=dnd5e&message=6.0.0&color=informational)

Area of effect behaviors are a way to attach a subset of [scene region behaviors](https://foundryvtt.com/article/scene-regions/#behaviors) to the area of effect templates created by activities.

### Apply Active Effect

The **Apply Active Effect** behavior causes the region to apply the provided active effect to tokens that enter the region, and remove it when those tokens leave the region. If the activity targets "Enemies" or "Allies", then the effects will only be applied to tokens with certain dispositions.

- *Effects*: Active effects stored in an effect compendium to be applied
- *Sizes*: Effects will only be applied to creatures matching the provided sizes. If none are provided, all sizes will be affected
- *Types*: Only creatures with matching creature types will be affected. If none are provided, all creature types will be affected

### Difficult Terrain

The **Difficult Terrain** behavior turns the created region into difficult terrain. When created, the difficult terrain will be considered magical if the activity creating it is on a magical item. If the activity targets "Enemies" or "Allies", then the difficult terrain will only affect tokens with certain dispositions.

- *Types*: Specify the type of difficult terrain created, allowing certain creatures to ignore specific types of difficult terrain
