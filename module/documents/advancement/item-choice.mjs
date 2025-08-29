import ItemChoiceConfig from "../../applications/advancement/item-choice-config.mjs";
import ItemChoiceFlow from "../../applications/advancement/item-choice-flow.mjs";
import { ItemChoiceConfigurationData, ItemChoiceValueData } from "../../data/advancement/item-choice.mjs";
import ItemGrantAdvancement from "./item-grant.mjs";

/**
 * Advancement that presents the player with a choice of multiple items that they can take. Keeps track of which
 * items were selected at which levels.
 */
export default class ItemChoiceAdvancement extends ItemGrantAdvancement {

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        configuration: ItemChoiceConfigurationData,
        value: ItemChoiceValueData
      },
      order: 50,
      icon: "icons/magic/symbols/cog-orange-red.webp",
      typeIcon: "systems/dnd5e/icons/svg/item-choice.svg",
      title: game.i18n.localize("DND5E.ADVANCEMENT.ItemChoice.Title"),
      hint: game.i18n.localize("DND5E.ADVANCEMENT.ItemChoice.Hint"),
      multiLevel: true,
      apps: {
        config: ItemChoiceConfig,
        flow: ItemChoiceFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get levels() {
    return Array.from(Object.keys(this.configuration.choices));
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  configuredForLevel(level) {
    return (this.value.added?.[level] !== undefined) || !this.configuration.choices[level]?.count;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  titleForLevel(level, { configMode=false }={}) {
    const data = this.configuration.choices[level] ?? {};
    let tag;
    if ( data.count ) tag = game.i18n.format("DND5E.ADVANCEMENT.ItemChoice.Choose", { count: data.count });
    else if ( data.replacement ) tag = game.i18n.localize("DND5E.ADVANCEMENT.ItemChoice.Replacement.Title");
    else return this.title;
    return `${this.title} <em>(${tag})</em>`;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  summaryForLevel(level, { configMode=false }={}) {
    const items = this.value.added?.[level];
    if ( !items || configMode ) return "";
    return Object.values(items).reduce((html, uuid) => html + game.dnd5e.utils.linkForUuid(uuid), "");
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /** @override */
  storagePath(level) {
    return `value.added.${level}`;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async apply(level, { replace: original, ...data }, retainedData={}) {
    let replacement;
    if ( retainedData.replaced ) ({ original, replacement } = retainedData.replaced);

    const updates = await super.apply(level, data, retainedData);

    replacement ??= Object.keys(updates).pop();
    if ( original && replacement ) {
      const replacedLevel = Object.entries(this.value.added).reverse().reduce((level, [l, v]) => {
        if ( (original in v) && (Number(l) > level) ) return Number(l);
        return level;
      }, 0);
      if ( Number.isFinite(replacedLevel) ) {
        this.actor.items.delete(original);
        this.updateSource({ [`value.replaced.${level}`]: { level: replacedLevel, original, replacement } });
      }
    }
  }

  /* -------------------------------------------- */

  /** @override */
  automaticApplicationValue(level) {
    return false;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  restore(level, data) {
    const original = this.actor.items.get(data.replaced?.original);
    if ( data.replaced && !original ) data.items = data.items.filter(i => i._id !== data.replaced.replacement);

    super.restore(level, data);

    if ( data.replaced ) {
      if ( !original ) {
        throw new ItemChoiceAdvancement.ERROR(game.i18n.localize("DND5E.ADVANCEMENT.ItemChoice.Warning.NoOriginal"));
      }
      this.actor.items.delete(data.replaced.original);
      this.updateSource({ [`value.replaced.${level}`]: data.replaced });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async reverse(level) {
    const retainedData = await super.reverse(level);

    const replaced = retainedData.replaced = this.value.replaced[level];
    if ( replaced ) {
      const uuid = this.value.added[replaced.level][replaced.original];
      const itemData = await this.createItemData(uuid, replaced.original);
      if ( itemData ) {
        if ( itemData.type === "spell" ) {
          foundry.utils.mergeObject(itemData, this.configuration.spell?.spellChanges ?? {});
        }
        this.actor.updateSource({ items: [itemData] });
        this.updateSource({ [`value.replaced.-=${level}`]: null });
      }
    }

    return retainedData;
  }

  /* -------------------------------------------- */

  /**
   * Verify that the provided item can be used with this advancement based on the configuration.
   * @param {Item5e} item                   Item that needs to be tested.
   * @param {object} [config={}]
   * @param {string|false} [config.type]    Type restriction on this advancement, or `false` to not validate type.
   * @param {object} [config.restriction]   Additional restrictions to be applied.
   * @param {boolean} [config.strict=true]  Should an error be thrown when an invalid type is encountered?
   * @returns {boolean}                     Is this type valid?
   * @throws {Error}                        An error if the item is invalid and strict is `true`.
   */
  _validateItemType(item, { type, restriction, strict=true }={}) {
    if ( !item ) return false;
    super._validateItemType(item, { strict });
    type ??= this.configuration.type;
    restriction ??= this.configuration.restriction;

    const handleError = (localizationKey, data) => {
      if ( strict ) throw new Error(game.i18n.format(localizationKey, data));
      return false;
    };

    // Type restriction is set and the item type does not match the selected type
    if ( type && (type !== item.type) ) {
      type = game.i18n.localize(CONFIG.Item.typeLabels[restriction]);
      return handleError("DND5E.ADVANCEMENT.ItemChoice.Warning.InvalidType", { type: typeLabel });
    }

    // If additional type restrictions applied, make sure they are valid
    if ( (type === "feat") && restriction.type ) {
      const typeConfig = CONFIG.DND5E.featureTypes[restriction.type];
      const subtype = typeConfig.subtypes?.[restriction.subtype];
      let errorLabel;
      if ( restriction.type !== item.system.type.value ) errorLabel = typeConfig.label;
      else if ( subtype && (restriction.subtype !== item.system.type.subtype) ) errorLabel = subtype;
      if ( errorLabel ) return handleError("DND5E.ADVANCEMENT.ItemChoice.Warning.InvalidType", { type: errorLabel });
    }

    // If spell level is restricted, ensure the spell is of the appropriate level
    const l = parseInt(restriction.level);
    if ( (type === "spell") && !Number.isNaN(l) && (item.system.level !== l) ) {
      const level = CONFIG.DND5E.spellLevels[l];
      return handleError("DND5E.ADVANCEMENT.ItemChoice.Warning.SpellLevelSpecific", { level });
    }

    // If spell list is specified, ensure the spell is on that list
    if ( (type === "spell") && restriction.list.size ) {
      const lists = Array.from(restriction.list)
        .map(l => dnd5e.registry.spellLists.forType(...l.split(":")))
        .filter(_ => _);
      if ( !lists.some(l => l.has(item)) ) return handleError("DND5E.ADVANCEMENT.ItemChoice.Warning.SpellList", {
        lists: game.i18n.getListFormatter({ type: "disjunction" }).format(lists.map(l => l.name))
      });
    }

    return true;
  }
}
