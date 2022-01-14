/**
 * Base configuration application for advancements that can be extended by other types to implement custom
 * editing interfaces.
 */
export class BaseConfig extends FormApplication {

  constructor(advancement, index=null, options={}) {
    super(advancement, options);

    /**
     * The advancement being created or edited.
     * @type {BaseAdvancement}
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
      template: "systems/dnd5e/templates/advancement/base-config.html",
      title: "DND5E.AdvancementTitle",
      width: 400,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    const levels = {};
    for ( let level = 1; level <= CONFIG.DND5E.maxLevel; level++ ) {
      levels[level] = level;
    }
    return {
      data: this.advancement.data,
      default: {
        title: game.i18n.localize(this.advancement.constructor.defaultTitle),
        icon: this.advancement.constructor.defaultIcon
      },
      levels,
      showClassRestrictions: this.parent.type === "class",
      showLevelSelector: !this.advancement.constructor.multiLevel
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _updateObject(event, formData) {
    let updates = foundry.utils.expandObject(formData).data;
    updates = Object.fromEntries(Object.entries(updates).reduce((arr, [key, value]) => {
      if ( value ) arr.push([key, value]);
      else arr.push([`-=${key}`, null]);
      return arr;
    }, []));

    const advancement = foundry.utils.deepClone(this.parent.data.data.advancement);
    advancement[this.index] = foundry.utils.mergeObject(this.advancement.data, updates, { inplace: false });

    return this.parent.update({"data.advancement": advancement});
  }

}
