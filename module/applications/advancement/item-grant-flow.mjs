import AdvancementFlow from "./advancement-flow.mjs";

/**
 * Inline application that presents the player with a list of items to be added.
 */
export default class ItemGrantFlow extends AdvancementFlow {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/item-grant-flow.hbs"
    });
  }

  /* -------------------------------------------- */

  /**
   * Produce the rendering context for this flow.
   * @returns {object}
   */
  async getContext() {
    const config = this.advancement.configuration;
    const added = this.retainedData?.items.map(i => foundry.utils.getProperty(i, "flags.dnd5e.sourceId"))
      ?? this.advancement.value.added;
    const checked = new Set(Object.values(added ?? {}));
    return {
      optional: this.advancement.configuration.optional,
      items: config.items.map(i => {
        const item = foundry.utils.deepClone(fromUuidSync(i.uuid));
        if ( !item ) return null;
        item.checked = added ? checked.has(item.uuid) : (config.optional && !i.optional);
        item.optional = config.optional || i.optional;
        return item;
      }, []).filter(i => i),
      abilities: this.getSelectAbilities()
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    return foundry.utils.mergeObject(super.getData(options), await this.getContext());
  }

  /* -------------------------------------------- */

  /**
   * Get the context information for selected spell abilities.
   * @returns {object}
   */
  getSelectAbilities() {
    const config = this.advancement.configuration;
    return {
      options: config.spell?.ability.size > 1 ? config.spell.ability.reduce((obj, k) => {
        obj[k] = CONFIG.DND5E.abilities[k]?.label;
        return obj;
      }, {}) : null,
      selected: this.ability ?? this.retainedData?.ability ?? this.advancement.value.ability
        ?? config.spell?.ability.first()
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("a[data-uuid]").click(this._onClickFeature.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking on a feature during item grant to preview the feature.
   * @param {MouseEvent} event  The triggering event.
   * @protected
   */
  async _onClickFeature(event) {
    event.preventDefault();
    const uuid = event.currentTarget.dataset.uuid;
    const item = await fromUuid(uuid);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {
    const retainedData = this.retainedData?.items.reduce((obj, i) => {
      obj[foundry.utils.getProperty(i, "flags.dnd5e.sourceId")] = i;
      return obj;
    }, {});
    await this.advancement.apply(this.level, formData, retainedData);
  }
}
