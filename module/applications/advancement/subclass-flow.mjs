import CompendiumBrowser from "../compendium-browser.mjs";
import AdvancementFlow from "./advancement-flow.mjs";

/**
 * Inline application that presents the player with a choice of subclass.
 */
export default class SubclassFlow extends AdvancementFlow {

  /**
   * Cached subclass dropped onto the advancement.
   * @type {Item5e|false}
   */
  subclass;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      dragDrop: [{ dropSelector: "form" }],
      template: "systems/dnd5e/templates/advancement/subclass-flow.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async retainData(data) {
    await super.retainData(data);
    const uuid = foundry.utils.getProperty(data, "flags.dnd5e.sourceId");
    if ( uuid ) this.subclass = await fromUuid(uuid);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const context = await super.getData();
    context.subclass = this.subclass;
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(jQuery) {
    super.activateListeners(jQuery);
    const [html] = jQuery;
    html.querySelector('[data-action="browse"]')?.addEventListener("click", this._onBrowseCompendium.bind(this));
    html.querySelector('[data-action="delete"]')?.addEventListener("click", this._onItemDelete.bind(this));
    html.querySelector("[data-action='viewItem']")?.addEventListener("click", this._onClickFeature.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle opening the compendium browser and displaying the result.
   * @param {Event} event  The originating click event.
   * @protected
   */
  async _onBrowseCompendium(event) {
    event.preventDefault();
    const filters = {
      locked: {
        additional: { class: { [this.item.identifier]: 1 } },
        types: new Set(["subclass"])
      }
    };
    const result = await CompendiumBrowser.selectOne({ filters });
    if ( result ) this.subclass = await fromUuid(result);
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
    const uuid = event.target.closest("[data-uuid]")?.dataset.uuid;
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
    this.subclass = false;
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch(err) {
      return false;
    }

    if ( data.type !== "Item" ) return false;
    const item = await Item.implementation.fromDropData(data);

    // Ensure the dropped item is a subclass
    if ( item.type !== "subclass" ) {
      ui.notifications.warn("DND5E.ADVANCEMENT.Subclass.Warning.InvalidType", { localize: true });
      return;
    }

    this.subclass = item;
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    if ( this.subclass ) await this.advancement.apply(this.level, { uuid: this.subclass.uuid }, this.retainedData);
  }
}
