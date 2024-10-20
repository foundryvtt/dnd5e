import TokenDocument5e from "../documents/token.mjs";
import { getHumanReadableAttributeLabel } from "../utils.mjs";

/**
 * Custom token configuration application for handling dynamic rings & resource labels.
 */
export default class TokenConfig5e extends TokenConfig {
  /** @inheritDoc */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.tabs.push({
      navSelector: '.tabs[data-group="appearance"]', contentSelector: '.tab[data-tab="appearance"]', initial: "token"
    });
    return options;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _render(...args) {
    await super._render(...args);
    if ( !this.rendered ) return;
    this._prepareResourceLabels(this.element[0]);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    const context = await super.getData(options);
    const doc = this.preview ?? this.document;
    context.scale = Math.abs(doc._source.texture.scaleX);
    this._addItemAttributes(context.barAttributes);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Adds charge based items as attributes for the current token.
   * @param {object} attributes The attribute groups to add the item entries to.
   * @protected
   */
  _addItemAttributes(attributes) {
    const actor = this.object?.actor;
    const items = actor?.items.reduce((arr, i) => {
      const { max } = i.system.uses ?? {};
      if ( max ) arr.push([i.getRelativeUUID(actor), i.name]);
      return arr;
    }, []) ?? [];
    if ( items.length ) {
      const group = game.i18n.localize("DND5E.ConsumeCharges");
      items.sort(([, a], [, b]) => a.localeCompare(b, game.i18n.lang));
      attributes.push(...items.map(([value, label]) => ({ group, value, label })));
    }
  }

  /* -------------------------------------------- */

  /**
   * Replace the attribute paths in token resources with human readable labels and sort them alphabetically.
   * @param {HTMLElement} html  The rendered markup.
   * @protected
   */
  _prepareResourceLabels(html) {
    const actor = this.object?.actor;

    for ( const select of html.querySelectorAll("select.bar-attribute") ) {
      select.querySelectorAll("optgroup").forEach(group => {
        const options = Array.from(group.querySelectorAll("option"));

        // Localize attribute paths.
        options.forEach(option => {
          const label = getHumanReadableAttributeLabel(option.value, { actor });
          if ( label ) option.innerText = label;
        });

        // Sort options by localized label.
        options.sort((a, b) => a.innerText.localeCompare(b.innerText, game.i18n.lang));
        group.append(...options);
      });
    }
  }
}
