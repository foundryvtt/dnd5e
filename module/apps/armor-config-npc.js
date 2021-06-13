/**
 * Interface for managing and NPC's armor calculation.
 *
 * @extends {DocumentSheet}
 */
export default class ArmorConfigNPC extends DocumentSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "armor-config-npc",
      classes: ["dnd5e"],
      template: "systems/dnd5e/templates/apps/armor-config-npc.html",
      width: 320,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `${game.i18n.localize("DND5E.ArmorConfig")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    let data = {
      armor: foundry.utils.getProperty(this.object.data.data, "details.armor"),
      types: Object.entries(CONFIG.DND5E.armorProficiencies).reduce((obj, [key, label]) => {
        if (key === "shl") return obj;
        obj[key] = {
          label: label,
          children: {}
        }
        return obj;
      }, {})
    };

    const pack = game.packs.get(CONFIG.DND5E.sourcePacks.ITEMS);
    for ( const [key, id] of Object.entries(CONFIG.DND5E.armorIds) ) {
      const item = await pack.getDocument(id);
      const type = CONFIG.DND5E.armorProficienciesMap[foundry.utils.getProperty(item.data.data, "armor.type")];
      const entry = {
        label: item.name,
        chosen: key === data.armor.type
      };
      data.types[type].children[key] = entry;
    }

    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const armorObject = foundry.utils.expandObject(formData);
    const updates = {
      "data.details.armor": armorObject.armor
    };
    return this.object.update(updates);
  }
}
