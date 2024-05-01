import { EnchantmentData } from "../../data/item/fields/enchantment-field.mjs";

/**
 * Application for configuring enchantment information for an item.
 */
export default class EnchantmentConfig extends DocumentSheet {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "enchantment-config"],
      dragDrop: [{ dropSelector: "form" }],
      template: "systems/dnd5e/templates/apps/enchantment-config.hbs",
      width: 500,
      height: "auto",
      sheetConfig: false,
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true
    });
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    return `${game.i18n.localize("DND5E.Enchantment.Configuration")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    const context = await super.getData(options);
    context.enchantableTypes = EnchantmentData.enchantableTypes.reduce((obj, k) => {
      obj[k] = game.i18n.localize(CONFIG.Item.typeLabels[k]);
      return obj;
    }, {});
    context.enchantment = this.document.system.enchantment;
    context.enchantments = this.document.effects.filter(e =>
      (e.getFlag("dnd5e", "type") === "enchantment") && !e.isAppliedEnchantment
    );
    context.source = this.document.toObject().system.enchantment;
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Handling                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(jQuery) {
    super.activateListeners(jQuery);
    const html = jQuery[0];

    for ( const element of html.querySelectorAll("[data-action]") ) {
      element.addEventListener("click", event => this.submit({ updateData: {
        action: event.target.dataset.action,
        enchantmentId: event.target.closest("[data-enchantment-id]")?.dataset.enchantmentId
      } }));
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, { action, enchantmentId, ...formData }) {
    await this.document.update({"system.enchantment": formData});

    switch ( action ) {
      case "add-enchantment":
        const effect = await ActiveEffect.implementation.create({
          name: this.document.name,
          icon: this.document.img,
          "flags.dnd5e.type": "enchantment"
        }, { parent: this.document });
        effect.sheet.render(true);
        break;
      case "delete-enchantment":
        const enchantment = this.document.effects.get(enchantmentId);
        enchantment?.deleteDialog();
        break;
    }
  }
}
