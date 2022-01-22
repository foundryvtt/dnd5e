/**
 * Base configuration application for advancements that can be extended by other types to implement custom
 * editing interfaces.
 *
 * @property {Advancement} advancement  The advancement item being edited.
 * @property {number} index             Location of the original advancement data in the item.
 * @property {object} options           Additional options passed to FormApplication.
 * @extends {FormApplication}
 */
export class AdvancementConfig extends FormApplication {

  constructor(advancement, index=null, options={}) {
    super(advancement, options);

    /**
     * The advancement being created or edited.
     * @type {Advancement}
     */
    this.advancement = advancement;

    /**
     * Parent item to which this advancement belongs.
     * @type {Item5e}
     */
    this.parent = advancement.parent;

    /**
     * Index in the original advancement array.
     * @type {number|null}
     */
    this.index = index;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["advancement"],
      template: "systems/dnd5e/templates/advancement/advancement-config.html",
      title: "DND5E.AdvancementTitle",
      width: 400,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return {
      appID: this.id,
      data: this.advancement.data,
      default: {
        title: game.i18n.localize(this.advancement.constructor.defaultTitle),
        icon: this.advancement.constructor.defaultIcon
      },
      levels: Object.fromEntries(this.advancement.constructor.allLevels.map(l => [l, l])),
      showClassRestrictions: this.parent.type === "class",
      showLevelSelector: !this.advancement.constructor.multiLevel
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _updateObject(event, formData) {
    let updates = foundry.utils.expandObject(formData).data;
    updates = Object.entries(updates).reduce((obj, [key, value]) => {
      if ( value ) obj[key] = value;
      else obj[`-=${key}`] = null;
      return obj;
    }, {});

    const advancement = foundry.utils.deepClone(this.parent.data.data.advancement);
    advancement[this.index] = foundry.utils.mergeObject(this.advancement.data, updates, { inplace: false });

    return this.parent.update({"data.advancement": advancement});
  }

}
