import BaseConfigSheet from "../api/base-config-sheet.mjs";

/**
 * Configuration application for an NPC's gear.
 */
export default class GearConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      deleteItem: GearConfig.#onDeleteItem,
      viewItem: GearConfig.#onViewItem
    },
    classes: ["gear-config"],
    position: {
      width: 400
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/actors/config/gear-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.Gear.Configuration.Title");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.gear = context.source.system.details.treasure.gear.map((data, index) => {
      const item = fromUuidSync(data.uuid, { relative: this.document, strict: false }) ?? {};
      return {
        data, index,
        name: item.name ?? "", img: item.img, uuid: item.uuid,
        subtitle: game.i18n.localize(CONFIG.Item.typeLabels[item.type] ?? ""),
        prefix: `system.details.treasure.gear.${index}.`
      };
    }).sort((lhs, rhs) => lhs.name.localeCompare(rhs.name, game.i18n.lang));
    return context;
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    new CONFIG.ux.DragDrop({
      callbacks: { drop: this._onDrop.bind(this) }
    }).bind(this.element);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle removing an entry from the gear list.
   * @this {GearConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #onDeleteItem(event, target) {
    const gear = this.document.system.toObject().details.treasure.gear;
    gear.splice(target.closest("[data-index]").dataset.index, 1);
    this.document.update({ "system.details.treasure.gear": gear });
  }

  /* -------------------------------------------- */

  /**
   * Handle opening an item sheet.
   * @this {GearConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #onViewItem(event, target) {
    const item = await fromUuid(target.closest("[data-uuid]")?.dataset.uuid);
    item?.sheet.render({ force: true });
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /**
   * Handle dropped gear.
   * @param {DragEvent} event  The drag-drop event.
   * @protected
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const item = await fromUuid(data.uuid);
    this.document.system.addGear(item);
  }
}
