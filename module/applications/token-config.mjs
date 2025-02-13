import { getHumanReadableAttributeLabel } from "../utils.mjs";

/**
 * Custom token configuration application for handling dynamic rings & resource labels.
 */
export class TokenConfig5e extends (foundry.applications?.sheets?.TokenConfig ?? TokenConfig) {
  /** @inheritDoc */
  async _render(...args) {
    await super._render(...args);
    if ( !this.rendered ) return;
    this._prepareResourceLabels(this.element[0]);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if ( !this.rendered ) return;
    this._prepareResourceLabels(this.element);
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

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.scale = Math.abs(this.token._source.texture.scaleX);
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareResourcesTab() {
    const context = await super._prepareResourcesTab();
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
    const actor = this.actor ?? this.object?.actor;
    const items = actor?.items.reduce((arr, i) => {
      if ( i.hasLimitedUses ) arr.push([i.getRelativeUUID(actor), i.name]);
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
    const actor = this.actor ?? this.object?.actor;

    for ( const select of html.querySelectorAll('select:is(.bar-attribute, [name$=".attribute"])') ) {
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

export class PrototypeTokenConfig5e extends (foundry.applications?.sheets?.PrototypeTokenConfig ?? class {}) {
  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if ( !this.rendered ) return;
    TokenConfig5e.prototype._prepareResourceLabels.call(this, this.element);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareResourcesTab() {
    const context = await super._prepareResourcesTab();
    TokenConfig5e.prototype._addItemAttributes.call(this, context.barAttributes);
    return context;
  }
}
