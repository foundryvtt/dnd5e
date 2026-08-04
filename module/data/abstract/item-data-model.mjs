import * as Trait from "../../documents/actor/trait.mjs";
import PropertyField from "../shared/property-field.mjs";
import SystemDataModel from "./system-data-model.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * @import { ItemRollData, RollDataOptions } from "../../documents/_types.mjs";
 * @import { FavoriteData5e, ItemDataModelMetadata } from "./_types.mjs";
 */

/**
 * Variant of the SystemDataModel with support for rich item tooltips.
 */
export default class ItemDataModel extends SystemDataModel {

  /** @type {ItemDataModelMetadata} */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    compendiumGearSource: false,
    enchantable: false,
    hasEffects: false,
    singleton: false
  }, { inplace: false }));

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

  /** @override */
  get embeddedDescriptionKeyPath() {
    return game.user.isGM || (this.identified !== false) ? "description.value" : "unidentified.description";
  }

  /* -------------------------------------------- */

  /**
   * Whether a creature can be considered proficient in this type of item.
   * @type {boolean}
   */
  get hasProficiency() {
    return false;
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
      const sourceId = this.parent._stats.compendiumSource ?? this.parent.flags.dnd5e?.sourceId;
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
   * @param {Activity} [enrichmentOptions.activity]     Specific activity on item to use for customizing the data.
   * @param {string} [enrichmentOptions.extras]         Extra HTML displayed with the tooltip.
   * @returns {{content: string, classes: string[]}}
   */
  async richTooltip(enrichmentOptions={}) {
    return {
      content: await foundry.applications.handlebars.renderTemplate(
        this.constructor.ITEM_TOOLTIP_TEMPLATE, await this.getTooltipData(enrichmentOptions)
      ),
      classes: ["dnd5e2", "dnd5e-tooltip", "item-tooltip"]
    };
  }

  /* -------------------------------------------- */

  /**
   * Capture the item data displayed on a chat card.
   * @param {EnrichmentOptions} [options={}]        Options for text enrichment.
   * @param {Activity} [options.activity]           Specific activity on item to use for customizing the data.
   * @param {boolean|null} [options.identified]     Treat the item as having this identified state, rather than its
   *                                                own, when deciding what to include.
   * @returns {Promise<object>}
   */
  async getCardData({ activity, identified, ...enrichmentOptions }={}) {
    const { description: desc, unidentified } = this;
    const { _stats, id, img, name, type, uuid } = this.parent;
    identified ??= this.identified ?? null;

    enrichmentOptions.rollData ??= (activity ?? this.parent).getRollData();
    enrichmentOptions.relativeTo ??= this.parent;

    const source = (await activity?.getCardData()) ?? {};
    const usage = this.getUsageData({ activity });

    let description = source.description ?? "";
    description ||= (identified === false) ? unidentified?.description : (desc.chat || desc.value);

    return {
      identified, ...usage,
      activity: source.activity ?? {},
      concealed: game.user.isGM && dnd5e.settings.concealItemDescriptions && !desc.chat,
      description: await TextEditor.enrichHTML(description || "", enrichmentOptions),
      item: {
        id, img, name, type, uuid, compendiumSource: _stats.compendiumSource, properties: this.properties ?? new Set()
      },
      level: enrichmentOptions.rollData.item?.level ?? null,
      properties: (identified === false) ? [] : [
        ...this.cardProperties ?? [],
        ...PropertyField.getUsageProperties(usage),
        ...this.equippableItemCardProperties ?? []
      ]
        // Entries without a type are pre-6.0 label strings, which would cause a validation failure.
        .filter(p => p?.type),
      subtitle: [this.type?.label ?? _loc(CONFIG.Item.typeLabels[type])]
    };
  }

  /* -------------------------------------------- */

  /**
   * Resolve the data describing how this item is used, taken from the activity being used, otherwise the first
   * activity that has an activation. Item types with intrinsic usage data supply their own.
   * @param {object} [options]
   * @param {Activity} [options.activity]  Specific activity being used.
   * @returns {UsageData}
   */
  getUsageData({ activity }={}) {
    const source = activity ?? this.activities?.find(a => ("activation" in a) && !a.isHidden);
    return { activation: null, duration: null, range: null, target: null, ...source?.getUsageData() };
  }

  /* -------------------------------------------- */

  /**
   * Prepare item tooltip template data.
   * @param {EnrichmentOptions} [options={}]  Options for text enrichment.
   * @param {Activity} [options.activity]     Specific activity on item to use for customizing the data.
   * @param {string} [options.extras]         Extra HTML displayed with the tooltip.
   * @returns {Promise<object>}
   */
  async getTooltipData({ activity, extras, ...enrichmentOptions }={}) {
    enrichmentOptions.rollData ??= (activity ?? this.parent).getRollData();
    enrichmentOptions.relativeTo ??= this.parent;
    const options = { activity, ...enrichmentOptions };
    if ( game.user.isGM ) options.identified = true;
    const context = await this.getCardData(options);

    const { name, type, img } = this.parent;
    const { description: desc, unidentified } = this;
    const description = (context.identified === false) ? unidentified?.description : desc.value;
    let { identified, price, uses } = this;
    uses = this.hasLimitedUses && (game.user.isGM || identified) ? uses : null;
    price = game.user.isGM || identified ? price : null;

    Object.assign(context, {
      name, type, img, price, uses, extras,
      config: CONFIG.DND5E,
      controlHints: game.settings.get("dnd5e", "controlHints"),
      description: await TextEditor.enrichHTML(description || "", enrichmentOptions),
      labels: foundry.utils.deepClone((activity ?? this.parent).labels),
      properties: PropertyField.getLabels(context.properties, { ...context, properties: context.item.properties }),
      subtitle: context.subtitle.filterJoin(" • "),
      weight: this.weight
    });
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
   * Prepare item favorite data.
   * @returns {Promise<FavoriteData5e>}
   */
  async getFavoriteData() {
    return {
      img: this.parent.img,
      title: this.parent.name,
      subtitle: _loc(CONFIG.Item.typeLabels[this.parent.type])
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
   * @param {RollDataOptions} [options]
   * @returns {ItemRollData}
   */
  getRollData(options={}) {
    const actorRollData = this.parent.actor?.getRollData(options) ?? {};
    const data = { ...actorRollData, item: { ...this } };
    return data;
  }
}
