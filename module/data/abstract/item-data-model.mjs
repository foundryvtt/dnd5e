import * as Trait from "../../documents/actor/trait.mjs";
import SystemDataModel from "./system-data-model.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * Variant of the SystemDataModel with support for rich item tooltips.
 */
export default class ItemDataModel extends SystemDataModel {

  /**
   * @typedef {SystemDataModelMetadata} ItemDataModelMetadata
   * @property {boolean} enchantable    Can this item be modified by enchantment effects?
   * @property {boolean} hasEffects     Display the effects tab on this item's sheet.
   * @property {boolean} singleton      Should only a single item of this type be allowed on an actor?
   * @property {InventorySectionDescriptor} [inventory]  Configuration for displaying this item type in its own section
   *                                                     in creature inventories.
   */

  /** @type {ItemDataModelMetadata} */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    enchantable: false,
    hasEffects: false,
    singleton: false
  }, {inplace: false}));

  /**
   * The handlebars template for rendering item tooltips.
   * @type {string}
   */
  static ITEM_TOOLTIP_TEMPLATE = "systems/dnd5e/templates/items/parts/item-tooltip.hbs";

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Can this item's advancement level be taken from an associated class?
   * @type {boolean}
   */
  get advancementClassLinked() {
    return true;
  }

  /* -------------------------------------------- */

  /**
   * The level at which this item's advancement is applied.
   * @type {number}
   */
  get advancementLevel() {
    let item = this.parent;
    if ( ["class", "subclass"].includes(this.advancementRootItem?.type)
      && this.advancementClassLinked ) item = this.advancementRootItem;
    return item.system.levels ?? item.class?.system.levels ?? item.actor?.system.details.level ?? 0;
  }

  /* -------------------------------------------- */

  /**
   * The item that is ultimately responsible for adding this item through the advancement system.
   * @type {Item5e|void}
   */
  get advancementRootItem() {
    return this.parent?.actor?.items.get(this.parent.getFlag("dnd5e", "advancementRoot")?.split(".")?.[0]);
  }

  /* -------------------------------------------- */

  /**
   * Whether this item's activities can have scaling configured for their consumption.
   * @type {boolean}
   */
  get canConfigureScaling() {
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Whether this item's activities should prompt for scaling when used.
   * @type {boolean}
   */
  get canScale() {
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Whether this item's activities can have scaling configured for their damage.
   * @type {boolean}
   */
  get canScaleDamage() {
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Modes that can be used when making an attack with this item.
   * @type {FormSelectOption[]}
   */
  get attackModes() {
    return [];
  }

  /* -------------------------------------------- */

  /**
   * Set of abilities that can automatically be associated with this item.
   * @type {Set<string>|null}
   */
  get availableAbilities() {
    return null;
  }

  /* -------------------------------------------- */

  /** @override */
  get embeddedDescriptionKeyPath() {
    return game.user.isGM || (this.identified !== false) ? "description.value" : "unidentified.description";
  }

  /* -------------------------------------------- */

  /**
   * Scaling increase for this item type.
   * @type {number|null}
   */
  get scalingIncrease() {
    return null;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareBaseData() {
    if ( this.parent.isEmbedded && this.parent.actor?.items.has(this.parent.id) ) {
      this.parent.actor.identifiedItems?.set(this.parent.identifier, this.parent);
      const sourceId = this.parent.flags.dnd5e?.sourceId ?? this.parent._stats.compendiumSource
        ?? this.parent.flags.core?.sourceId;
      if ( sourceId ) this.parent.actor.sourcedItems?.set(sourceId, this.parent);
    }
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /**
   * Handle any specific item changes when an item is dropped onto an actor.
   * @param {DragEvent} event  The concluding DragEvent which provided the drop data.
   * @param {Actor5e} actor    Actor onto which the item was dropped.
   * @param {object} itemData  The item data requested for creation. **Will be mutated.**
   */
  static onDropCreate(event, actor, itemData) {}

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Render a rich tooltip for this item.
   * @param {EnrichmentOptions} [enrichmentOptions={}]  Options for text enrichment.
   * @returns {{content: string, classes: string[]}}
   */
  async richTooltip(enrichmentOptions={}) {
    return {
      content: await foundry.applications.handlebars.renderTemplate(
        this.constructor.ITEM_TOOLTIP_TEMPLATE, await this.getCardData(enrichmentOptions)
      ),
      classes: ["dnd5e2", "dnd5e-tooltip", "item-tooltip", "themed", "theme-light"]
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare item card template data.
   * @param {EnrichmentOptions} [enrichmentOptions={}]  Options for text enrichment.
   * @param {Activity} [enrichmentOptions.activity]     Specific activity on item to use for customizing the data.
   * @returns {Promise<object>}
   */
  async getCardData({ activity, ...enrichmentOptions }={}) {
    const { name, type, img } = this.parent;
    let {
      price, weight, uses, identified, unidentified, description, school, materials
    } = this;
    const rollData = (activity ?? this.parent).getRollData();
    const isIdentified = identified !== false;
    const chat = isIdentified ? description.chat || description.value : unidentified?.description;
    description = game.user.isGM || isIdentified ? description.value : unidentified?.description;
    uses = this.hasLimitedUses && (game.user.isGM || identified) ? uses : null;
    price = game.user.isGM || identified ? price : null;

    const subtitle = [this.type?.label ?? game.i18n.localize(CONFIG.Item.typeLabels[this.parent.type])];
    const context = {
      name, type, img, price, weight, uses, school, materials,
      config: CONFIG.DND5E,
      controlHints: game.settings.get("dnd5e", "controlHints"),
      labels: foundry.utils.deepClone((activity ?? this.parent).labels),
      tags: this.parent.labels?.components?.tags,
      subtitle: subtitle.filterJoin(" &bull; "),
      description: {
        value: await TextEditor.enrichHTML(description ?? "", {
          rollData, relativeTo: this.parent, ...enrichmentOptions
        }),
        chat: await TextEditor.enrichHTML(chat ?? "", {
          rollData, relativeTo: this.parent, ...enrichmentOptions
        }),
        concealed: game.user.isGM && game.settings.get("dnd5e", "concealItemDescriptions") && !description.chat
      }
    };

    context.properties = [];

    if ( game.user.isGM || isIdentified ) {
      context.properties.push(
        ...this.cardProperties ?? [],
        ...Object.values((activity ? activity?.activationLabels : this.parent.labels.activations?.[0]) ?? {}),
        ...this.equippableItemCardProperties ?? []
      );
    }

    context.properties = context.properties.filter(_ => _);
    context.hasProperties = context.tags?.length || context.properties.length;
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Determine the cost to craft this Item.
   * @param {object} [options]
   * @param {"buy"|"craft"|"none"} [options.baseItem="craft"]  Ignore base item if "none". Include full base item gold
   *                                                           price if "buy". Include base item craft costs if "craft".
   * @returns {Promise<{ days: number, gold: number }>}
   */
  async getCraftCost({ baseItem="craft" }={}) {
    let days = 0;
    let gold = 0;
    if ( !("price" in this) ) return { days, gold };
    const { price, type, rarity } = this;

    // Mundane Items
    if ( !this.properties.has("mgc") || !rarity ) {
      const { mundane } = CONFIG.DND5E.crafting;
      const valueInGP = price.valueInGP ?? 0;
      return { days: Math.ceil(valueInGP * mundane.days), gold: Math.floor(valueInGP * mundane.gold) };
    }

    const base = await Trait.getBaseItem(type?.identifier ?? "", { fullItem: true });
    if ( base && (baseItem !== "none") ) {
      if ( baseItem === "buy" ) gold += base.system.price.valueInGP ?? 0;
      else {
        const costs = await base.system.getCraftCost();
        days += costs.days;
        gold += costs.gold;
      }
    }

    const { magic } = CONFIG.DND5E.crafting;
    if ( !(rarity in magic) ) return { days, gold };
    const costs = magic[rarity];
    return { days: days + costs.days, gold: gold + costs.gold };
  }

  /* -------------------------------------------- */

  /**
   * @typedef {object} FavoriteData5e
   * @property {string} img                  The icon path.
   * @property {string} title                The title.
   * @property {string|string[]} [subtitle]  An optional subtitle or several subtitle parts.
   * @property {number} [value]              A single value to display.
   * @property {number} [quantity]           The item's quantity.
   * @property {string|number} [modifier]    A modifier associated with the item.
   * @property {number} [passive]            A passive score associated with the item.
   * @property {object} [range]              The item's range.
   * @property {number} [range.value]        The first range increment.
   * @property {number|null} [range.long]    The second range increment.
   * @property {string} [range.units]        The range units.
   * @property {object} [save]               The item's saving throw.
   * @property {string} [save.ability]       The saving throw ability.
   * @property {number} [save.dc]            The saving throw DC.
   * @property {object} [uses]               Data on an item's uses.
   * @property {number} [uses.value]         The current available uses.
   * @property {number} [uses.max]           The maximum available uses.
   * @property {string} [uses.name]          The property to update on the item. If none is provided, the property will
   *                                         not be updatable.
   * @property {boolean} [toggle]            The effect's toggle state.
   * @property {boolean} [suppressed]        Whether the favorite is suppressed.
   */

  /**
   * Prepare item favorite data.
   * @returns {Promise<FavoriteData5e>}
   */
  async getFavoriteData() {
    return {
      img: this.parent.img,
      title: this.parent.name,
      subtitle: game.i18n.localize(CONFIG.Item.typeLabels[this.parent.type])
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare type-specific data for the Item sheet.
   * @param {ApplicationRenderContext} context  Sheet context data.
   * @returns {Promise<void>}
   */
  async getSheetData(context) {}

  /* -------------------------------------------- */

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item.
   * @param {object} [options]
   * @param {boolean} [options.deterministic] Whether to force deterministic values for data properties that could be
   *                                          either a die term or a flat term.
   * @returns {object}
   */
  getRollData({ deterministic=false }={}) {
    const actorRollData = this.parent.actor?.getRollData({ deterministic }) ?? {};
    const data = { ...actorRollData, item: { ...this } };
    return data;
  }
}
