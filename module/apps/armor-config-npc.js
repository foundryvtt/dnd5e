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
      classes: ["dnd5e", "armor-config-npc"],
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

  /**
   * Get the armor item for the provided type.
   *
   * @param {string} type        One of the values defined in DND5E.armorIds.
   * @return {Item5e|undefined}  Armor item if one was found.
   */
  async getArmorItem(type) {
    if ( type === "" || type === "natural" ) return;
    const pack = game.packs.get(CONFIG.DND5E.sourcePacks.ITEMS);
    return await pack.getDocument(CONFIG.DND5E.armorIds[type]);
  }

  /* -------------------------------------------- */

  /**
   * Calculate the automatic armor value for the currently selected armor type.
   *
   * @param {object} armor  Currently selected armor form data.
   * @return {Number}       Calculated AC based on current type and shield.
   */
  async calculateAC(armor) {
    let base = 10;
    let dex = this.object.data.data.abilities.dex.mod;
    const item = await this.getArmorItem(armor.type);

    if ( item !== undefined ) {
      const itemData = item.data.data.armor;
      base = itemData.value;
      if ( itemData.dex !== null ) dex = Math.min(itemData.dex, dex);
    }

    return armor.value = base + dex + (armor.shield ? 2 : 0);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    let data = {
      armor: foundry.utils.getProperty(this.object.data._source.data, "attributes.ac"),
      types: Object.entries(CONFIG.DND5E.armorProficiencies).reduce((obj, [key, label]) => {
        if (key === "shl") return obj;
        obj[key] = {
          label: label,
          children: {}
        }
        return obj;
      }, {})
    };
    data.preview = await this.calculateAC(data.armor);

    for ( const key of Object.keys(CONFIG.DND5E.armorIds) ) {
      const item = await this.getArmorItem(key);
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
    let armor = foundry.utils.expandObject(formData).armor;
    const item = await this.getArmorItem(armor.type);
    armor.armor = item?.data.data.armor ?? null;
    return await this.object.update({"data.attributes.ac": armor});
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    super._onChangeInput(event);
    const data = foundry.utils.expandObject(this._getSubmitData()).armor;
    this.form["armor.override"].placeholder = await this.calculateAC(data);
  }
}
