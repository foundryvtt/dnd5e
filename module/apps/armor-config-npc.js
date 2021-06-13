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
    // let armorTypes = Object.entries(CONFIG.DND5E.armorProficiencies).reduce((obj, [key, label]) => {
    //   if (key === "shl") return obj;
    //   obj[key] = {
    //     label: label,
    //     types: []
    //   }
    //   return obj;
    // }, {});

    let data = {
      armor: foundry.utils.getProperty(this.object.data.data, "details.armor"),
      types: {}
    };

    const pack = game.packs.get(CONFIG.DND5E.sourcePacks.ITEMS);
    for ( const [key, id] of Object.entries(CONFIG.DND5E.armorIds) ) {
      const item = await pack.getDocument(id);
      const type = foundry.utils.getProperty(item.data.data, "armor.type");
      const entry = {
        label: item.name,
        chosen: key === data.armor.type
      };
      if ( data.types[type] === undefined ) {
        data.types[type] = {
          label: CONFIG.DND5E.armorProficiencies[CONFIG.DND5E.armorProficienciesMap[type]],
          children: {}
        }
      }
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
