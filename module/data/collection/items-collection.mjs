/**
 * Custom items collection to hide items in containers automatically.
 */
export default class Items5e extends Items {
  /** @override */
  _getVisibleTreeContents(entry) {
    return this.contents.filter(c => c.visible && !this.has(c.system?.container));
  }

  /* -------------------------------------------- */

  // fromCompendium(document, options={}) {
  //   const created = super.fromCompendium(document, options);
  // }
}
