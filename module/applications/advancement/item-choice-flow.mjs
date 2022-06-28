import AdvancementFlow from "./advancement-flow.mjs";

/**
 * Inline application that presents the player with a choice of items.
 */
export default class ItemChoiceFlow extends AdvancementFlow {
  constructor(...args) {
    super(...args);

    /**
     * Set of selected UUIDs.
     * @type {Set<string>}
     */
    this.selected = new Set(
      this.retainedData?.items.map(i => foundry.utils.getProperty(i, "flags.dnd5e.sourceId"))
      ?? Object.values(this.advancement.data.value[this.level] ?? {})
    );

    /**
     * Cached items from the advancement's pool.
     * @type {Array<Item5e>}
     */
    this.pool = undefined;

    /**
     * List of dropped items.
     * @type {Array<Item5e>}
     */
    this.dropped = [];
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      dragDrop: [{ dropSelector: ".drop-target" }],
      template: "systems/dnd5e/templates/advancement/item-choice-flow.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    this.pool ??= await Promise.all(this.advancement.data.configuration.pool.map(fromUuid));

    const max = this.advancement.data.configuration.choices[this.level];
    const choices = { max, current: this.selected.size, full: this.selected.size >= max };

    // TODO: Make any choices made at previous levels unavailable
    // TODO: Make any items already on actor unavailable?
    // TODO: Make sure selected works properly with retained data
    // TODO: Ensure everything is populated properly when going forward and backward through steps

    const previousLevels = {};
    const previouslySelected = new Set();
    for ( const [level, data] of Object.entries(this.advancement.data.value) ) {
      if ( level > this.level ) continue;
      previousLevels[level] = await Promise.all(Object.values(data).map(fromUuid));
      Object.values(data).forEach(uuid => previouslySelected.add(uuid));
    }

    const items = [...this.pool, ...this.dropped];
    items.forEach(i => {
      i.checked = this.selected.has(i.uuid);
      i.disabled = (!i.checked && choices.full) || previouslySelected.has(i.uuid);
    });

    return foundry.utils.mergeObject(super.getData(), { choices, items, previousLevels });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("a[data-uuid]").click(this._onClickFeature.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onChangeInput(event) {
    if ( event.target.checked ) this.selected.add(event.target.name);
    else this.selected.delete(event.target.name);
    this.render();
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

  /**
   * Handle deleting a dropped item.
   * @param {Event} event  The originating click event.
   * @protected
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const uuidToDelete = event.currentTarget.closest(".item-name")?.querySelector("input")?.name;
    if ( !uuidToDelete ) return;
    this.dropped.findSplice(i => i.uuid === uuidToDelete);
    this.selected.delete(uuidToDelete);
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    if ( this.selected.size >= this.advancement.data.configuration.choices[this.level] ) return false;

    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch(err) {
      return false;
    }

    if ( data.type !== "Item" ) return false;
    const item = await Item.implementation.fromDropData(data);

    // If the item is already been marked as selected, no need to go further
    if ( this.selected.has(item.uuid) ) return false;

    // TODO: Check to ensure the dropped item doesn't already exist on the actor

    // Mark the item as selected
    this.selected.add(item.uuid);

    // If the item doesn't already exist in the pool, add it
    if ( !this.pool.find(i => i.uuid === item.uuid) ) {
      this.dropped.push(item);
      item.dropped = true;
    }

    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const retainedData = this.retainedData?.items.reduce((obj, i) => {
      obj[foundry.utils.getProperty(i, "flags.dnd5e.sourceId")] = i;
      return obj;
    }, {});
    await this.advancement.apply(this.level, formData, retainedData);
  }
}
