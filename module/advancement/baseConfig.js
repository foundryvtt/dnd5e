/**
 * Base configuration application for advancements that can be extended by other types to implement custom
 * editing interfaces.
 */
export class BaseConfig extends FormApplication {

  constructor(object, advancement, parent, options={}) {
    super(object, options);

    /**
     * The class of the advancement being created or edited.
     * @type {Class}
     */
    this.advancement = advancement;

    /**
     * Parent item to which this advancement belongs.
     * @type {Item5e}
     */
    this.parent = parent;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement"],
      template: "systems/dnd5e/templates/advancement/base-config.html",
      title: "DND5E.AdvancementTitle",
      width: 320,
      height: "auto"
    });
  }

  /* -------------------------------------------- */
  
  /** @inheritdoc */
  getData() {
    return {
      data: this.object.data,
      default: {
        title: game.i18n.localize(this.advancement.defaultTitle),
        icon: this.advancement.defaultIcon
      }
    }
  }

}
