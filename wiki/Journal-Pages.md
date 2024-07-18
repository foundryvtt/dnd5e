![Up to date as of 3.3.0](https://img.shields.io/static/v1?label=dnd5e&message=3.3.0&color=informational)

The D&D system provides several new journal page types with specialized functionality.

## Class & Subclass Summary

The *Class Summary* and *Subclass Summary* journal page types provide automatically generated pages with tables and summaries for classes and subclasses.

![Class & Subclass Summary Pages](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/journal/pages-class-subclass.jpg)

The automatic generation on these pages is based on data provided through advancement, so a class or subclass must have the appropriate advancement setup. Hit points will be calculated based on the selected hit die size, proficiencies will be derived from Trait advancements at first level, and equipment from the Starting Equipment configuration. The table will show all features granted at various levels as well as scale values and spellcasting details.

A description can be provided in the editor that will appear at the start of the entry. *Class Summary* pages can also take additional descriptive text that will appear beneath the three sections at the beginning. Optionally subclasses can be added to the *Class Summary* page and they will be displayed below the class.

## Map Location

The *Map Location* journal page type allows for specifying a location code that will be displayed on a special map marker when the page is linked to from a scene and in the table of contents of a journal entry instead of the usual numbering.

![Map Location Page](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/journal/pages-map-location.jpg)

### Module Customization

Modules can provide their own custom styles for map markers. First a module must provide a new entry into `CONFIG.DND5E.mapLocationMarker` specifying and style changes to apply. This can be as simple as changing the background color to completely replacing the control icon used for rendering. Any properties not specified will be infered from the default styling.

```javascript
/**
 * @typedef {object} MapLocationMarkerStyle
 * @property {typeof PIXI.Container} [icon]  Map marker class used to render the icon.
 * @property {number} [backgroundColor]      Color of the background inside the circle.
 * @property {number} [borderColor]          Color of the border in normal state.
 * @property {number} [borderHoverColor]     Color of the border when hovering over the marker.
 * @property {string} [fontFamily]           Font used for rendering the code on the marker.
 * @property {number} [shadowColor]          Color of the shadow under the marker.
 * @property {number} [textColor]            Color of the text on the marker.
 */

CONFIG.DND5E.mapLocationMarker.myCustomMarker = {
  backgroundColor: 0x000000,
  textColor: 0xFFFFFF
}
```

Then for any markers that use the custom style, the `dnd5e.mapMarkerStyle` flag on the *Map Location* journal page should be set to match the name of the new custom style, in this case it would be `myCustomMarker`. This flag will need to be set on each journal page that wishes to use the new style.

## Spell List

The *Spell List* journal page type provides an easy way to display a list of spells and provides the viewer options for how to display those spells.

![Spell List Page](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/journal/pages-spell-list.jpg)

When creating a spell list any spells offered by the SRD or the current module can be dragged to the spell list. For modules referencing spells that might not be available, the plus control on the sidebar can be used to add an unlinked spell profile. This needs to contain the name, level, and school of the spell for proper organization. It can also contain information on the book where the spell can be found. The "Original Source" field takes a UUID of the spell, which will result in a link to that spell being displayed if the module that provides it is found. Otherwise its placeholder name will be displayed.

Spell lists have a type and identifier, which will enable features in the future for viewing merged spell lists from several sources through the compendium browser.

The default grouping mode can also be specified, though the viewer can always change how they view the list. Grouping can be performed by spell level, by spell school, or by the first letter of the spell's name.

## Rule

The *Rule* journal page type is a standard text page that also allows specifying a rule type and custom tooltip for when a journal page is used with a `&Reference` (see [Enrichers](Enrichers.md) for more information on references).

![Rule Page](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/journal/pages-rule.jpg)

If the tooltip is provided, that will be used in place of the normal text for the reference tooltip.
