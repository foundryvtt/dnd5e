import Advancement from "../advancement.mjs";
import AdvancementFlow from "../advancement-flow.mjs";
import AdvancementConfig from "../advancement-config.mjs";

/**
 * Advancement that automatically grants one or more items to the player. Presents the player with the option of
 * skipping any or all of the items.
 */
export class ItemGrantAdvancement extends Advancement {

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      defaults: {
        configuration: {
          items: [],
          optional: false,
          spell: null
        }
      },
      order: 40,
      icon: "systems/dnd5e/icons/svg/item-grant.svg",
      title: game.i18n.localize("DND5E.AdvancementItemGrantTitle"),
      hint: game.i18n.localize("DND5E.AdvancementItemGrantHint"),
      apps: {
        config: ItemGrantConfig,
        flow: ItemGrantFlow
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * The item types that are supported in Item Grant.
   * @type {Set<string>}
   */
  static VALID_TYPES = new Set(["feat", "spell", "consumable", "backpack", "equipment", "loot", "tool", "weapon"]);

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  configuredForLevel(level) {
    return !foundry.utils.isEmpty(this.data.value);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  summaryForLevel(level, { configMode=false }={}) {
    // Link to compendium items
    if ( !this.data.value.added || configMode ) {
      return this.data.configuration.items.reduce((html, uuid) => html + dnd5e.utils.linkForUuid(uuid), "");
    }

    // Link to items on the actor
    else {
      return Object.keys(this.data.value.added).map(id => {
        const item = this.actor.items.get(id);
        return item?.toAnchor({classes: ["content-link"]}).outerHTML ?? "";
      }).join("");
    }
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /**
   * Locally apply this advancement to the actor.
   * @param {number} level              Level being advanced.
   * @param {object} data               Data from the advancement form.
   * @param {object} [retainedData={}]  Item data grouped by UUID. If present, this data will be used rather than
   *                                    fetching new data from the source.
   */
  async apply(level, data, retainedData={}) {
    const items = [];
    const updates = {};
    const spellChanges = this.data.configuration.spell ? this._prepareSpellChanges(this.data.configuration.spell) : {};
    for ( const [uuid, selected] of Object.entries(data) ) {
      if ( !selected ) continue;

      let itemData = retainedData[uuid];
      if ( !itemData ) {
        const source = await fromUuid(uuid);
        if ( !source ) continue;
        itemData = source.clone({
          _id: foundry.utils.randomID(),
          "flags.dnd5e.sourceId": uuid,
          "flags.dnd5e.advancementOrigin": `${this.item.id}.${this.id}`
        }, {keepId: true}).toObject();
      }
      if ( itemData.type === "spell" ) foundry.utils.mergeObject(itemData, spellChanges);

      items.push(itemData);
      // TODO: Trigger any additional advancement steps for added items
      updates[itemData._id] = uuid;
    }
    this.actor.updateSource({items});
    this.updateSource({"value.added": updates});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  restore(level, data) {
    const updates = {};
    for ( const item of data.items ) {
      this.actor.updateSource({items: [item]});
      // TODO: Restore any additional advancement data here
      updates[item._id] = item.flags.dnd5e.sourceId;
    }
    this.updateSource({"value.added": updates});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  reverse(level) {
    const items = [];
    for ( const id of Object.keys(this.data.value.added ?? {}) ) {
      const item = this.actor.items.get(id);
      if ( item ) items.push(item.toObject());
      this.actor.items.delete(id);
      // TODO: Ensure any advancement data attached to these items is properly reversed
      // and store any advancement data for these items in case they need to be restored
    }
    this.updateSource({ "value.-=added": null });
    return { items };
  }

}


/**
 * Configuration application for item grants.
 */
export class ItemGrantConfig extends AdvancementConfig {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      dragDrop: [{ dropSelector: ".drop-target" }],
      dropKeyPath: "items",
      template: "systems/dnd5e/templates/advancement/item-grant-config.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    const context = super.getData();
    context.showSpellConfig = context.data.configuration.items.map(fromUuidSync).some(i => i.type === "spell");
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _validateDroppedItem(event, item) {
    if ( this.advancement.constructor.VALID_TYPES.has(item.type) ) return true;
    const type = game.i18n.localize(`ITEM.Type${item.type.capitalize()}`);
    throw new Error(game.i18n.format("DND5E.AdvancementItemTypeInvalidWarning", { type }));
  }
}


/**
 * Inline application that presents the player with a list of items to be added.
 */
export class ItemGrantFlow extends AdvancementFlow {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/item-grant-flow.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const config = this.advancement.data.configuration.items;
    const added = this.retainedData?.items.map(i => foundry.utils.getProperty(i, "flags.dnd5e.sourceId"))
      ?? this.advancement.data.value.added;
    const checked = new Set(Object.values(added ?? {}));

    const items = await Promise.all(config.map(fromUuid));
    return foundry.utils.mergeObject(super.getData(), {
      optional: this.advancement.data.configuration.optional,
      items: items.reduce((arr, item) => {
        if ( !item ) return arr;
        item.checked = added ? checked.has(item.uuid) : true;
        arr.push(item);
        return arr;
      }, [])
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("a[data-uuid]").click(this._onClickFeature.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking on a feature during item grant to preview the feature.
   * @param {MouseEvent} event  The triggering event.
   * @protected
   */
  async _onClickFeature(event) {
    event.preventDefault();
    const uuid = event.currentTarget.dataset.uuid;
    const item = await fromUuid(uuid);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const retainedData = this.retainedData?.items.reduce((obj, i) => {
      obj[foundry.utils.getProperty(i, "flags.dnd5e.sourceId")] = i;
      return obj;
    }, {});
    await this.advancement.apply(this.level, formData, retainedData);
  }

}
