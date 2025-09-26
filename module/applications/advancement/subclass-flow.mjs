import CompendiumBrowser from "../compendium-browser.mjs";
import AdvancementFlow from "./advancement-flow-v2.mjs";

/**
 * Inline application that presents the player with a choice of subclass.
 */
export default class SubclassFlow extends AdvancementFlow {

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      browse: SubclassFlow.#browseCompendium,
      deleteItem: SubclassFlow.#deleteItem
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/advancement/subclass-flow.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const uuid = foundry.utils.getProperty(this.retainedData ?? {}, "flags.dnd5e.sourceId");
    if ( uuid ) await this.advancement.apply(this.level, { retainedData: this.retainedData, uuid });
    return await super._prepareContext(options);
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContentContext(context, options) {
    context.subclass = this.advancement.value.document;
    return context;
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    new foundry.applications.ux.DragDrop.implementation({
      dragSelector: ".draggable",
      dropSelector: "form",
      callbacks: {
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle opening the compendium browser and displaying the result.
   * @this {SubclassFlow}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #browseCompendium(event, target) {
    const filters = {
      locked: {
        additional: { class: { [this.item.identifier]: 1 } },
        types: new Set(["subclass"])
      }
    };
    const result = await CompendiumBrowser.selectOne({ filters });
    if ( result ) {
      await this.advancement.apply(this.level, { uuid: result });
      this.render();
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle removing a selected item.
   * @this {SubclassFlow}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #deleteItem(event, target) {
    await this.advancement.reverse();
    this.retainedData = null;
    this.render();
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @override */
  async _handleForm(event, form, formData) {}

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /**
   * Handle dropping subclass onto the flow.
   * @param {DragEvent} event  The concluding drag event.
   * @protected
   */
  async _onDrop(event) {
    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch(err) {
      return;
    }

    if ( data.type !== "Item" ) return;
    const item = await Item.implementation.fromDropData(data);

    // Ensure the dropped item is a subclass
    if ( item.type !== "subclass" ) {
      ui.notifications.warn("DND5E.ADVANCEMENT.Subclass.Warning.InvalidType", { localize: true });
      return;
    }

    this.advancement.apply(this.level, { uuid: item.uuid });
    this.render();
  }
}
