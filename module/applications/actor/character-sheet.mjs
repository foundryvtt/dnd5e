import { formatNumber } from "../../utils.mjs";
import AdvancementManager from "../advancement/advancement-manager.mjs";
import CreatureTypeConfig from "../shared/creature-type-config.mjs";
import ActorSheet5e from "./base-sheet.mjs";

/**
 * An Actor sheet for player character type actors.
 */
export default class ActorSheet5eCharacter extends ActorSheet5e {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "character"]
    });
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    const context = await super.getData(options);

    // Resources
    context.resources = ["primary", "secondary", "tertiary"].reduce((arr, r) => {
      const res = foundry.utils.mergeObject(context.actor.system.resources[r] || {}, {
        name: r,
        placeholder: game.i18n.localize(`DND5E.Resource${r.titleCase()}`)
      }, {inplace: false});
      if ( res.value === 0 ) delete res.value;
      if ( res.max === 0 ) delete res.max;
      return arr.concat([res]);
    }, []);

    const classes = this.actor.itemTypes.class;
    return foundry.utils.mergeObject(context, {
      disableExperience: game.settings.get("dnd5e", "levelingMode") === "noxp",
      classLabels: classes.map(c => c.name).join(", "),
      labels: {
        type: context.system.details.type.label
      },
      multiclassLabels: classes.map(c => [c.subclass?.name ?? "", c.name, c.system.levels].filterJoin(" ")).join(", "),
      weightUnit: game.i18n.localize(`DND5E.Abbreviation${
        game.settings.get("dnd5e", "metricWeightUnits") ? "Kg" : "Lbs"}`),
      encumbrance: context.system.attributes.encumbrance
    });
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareItems(context) {

    // Categorize items as inventory, spellbook, features, and classes
    const inventory = {};
    const inventoryTypes = Object.entries(CONFIG.Item.dataModels)
      .filter(([, model]) => model.metadata?.inventoryItem)
      .sort(([, lhs], [, rhs]) => (lhs.metadata.inventoryOrder - rhs.metadata.inventoryOrder));
    for ( const [type] of inventoryTypes ) {
      inventory[type] = {label: `${CONFIG.Item.typeLabels[type]}Pl`, items: [], dataset: {type}};
    }

    // Partition items by category
    let {items, spells, feats, races, backgrounds, classes, subclasses} = context.items.reduce((obj, item) => {
      const { quantity } = item.system;

      // Item details
      const ctx = context.itemContext[item.id] ??= {};
      ctx.isStack = Number.isNumeric(quantity) && (quantity !== 1);
      if ( item.system.attunement ) ctx.attunement = item.system.attuned ? {
        icon: "fa-sun",
        cls: "attuned",
        title: "DND5E.AttunementAttuned"
      } : {
        icon: "fa-sun",
        cls: "not-attuned",
        title: CONFIG.DND5E.attunementTypes[item.system.attunement]
      };

      // Prepare data needed to display expanded sections
      ctx.isExpanded = this._expanded.has(item.id);

      // Item usage
      ctx.hasRecharge = item.hasRecharge;
      ctx.hasUses = item.hasLimitedUses;

      // Unidentified items
      ctx.concealDetails = !game.user.isGM && (item.system.identified === false);

      // Item grouping
      ctx.ungroup = "passive";
      const [originId] = item.getFlag("dnd5e", "advancementOrigin")?.split(".") ?? [];
      const group = this.actor.items.get(originId);
      switch ( group?.type ) {
        case "race": ctx.group = "race"; break;
        case "background": ctx.group = "background"; break;
        case "class": ctx.group = group.identifier; break;
        case "subclass": ctx.group = group.class?.identifier ?? "other"; break;
        default: ctx.group = "other";
      }

      // Individual item preparation
      this._prepareItem(item, ctx);

      // Classify items into types
      if ( item.type === "spell" ) obj.spells.push(item);
      else if ( item.type === "feat" ) obj.feats.push(item);
      else if ( item.type === "race" ) obj.races.push(item);
      else if ( item.type === "background" ) obj.backgrounds.push(item);
      else if ( item.type === "class" ) obj.classes.push(item);
      else if ( item.type === "subclass" ) obj.subclasses.push(item);
      else if ( Object.keys(inventory).includes(item.type) ) obj.items.push(item);
      return obj;
    }, { items: [], spells: [], feats: [], races: [], backgrounds: [], classes: [], subclasses: [] });

    // Organize items
    for ( let i of items ) {
      const ctx = context.itemContext[i.id] ??= {};
      ctx.totalWeight = i.system.totalWeight?.toNearest(0.1);
      inventory[i.type].items.push(i);
    }

    // Organize Spellbook and count the number of prepared spells (excluding always, at will, etc...)
    const spellbook = this._prepareSpellbook(context, spells);
    const nPrepared = spells.filter(spell => {
      const prep = spell.system.preparation;
      return (spell.system.level > 0) && (prep.mode === "prepared") && prep.prepared;
    }).length;

    // Sort classes and interleave matching subclasses, put unmatched subclasses into features so they don't disappear
    classes.sort((a, b) => b.system.levels - a.system.levels);
    const maxLevelDelta = CONFIG.DND5E.maxLevel - this.actor.system.details.level;
    classes = classes.reduce((arr, cls) => {
      const ctx = context.itemContext[cls.id] ??= {};
      ctx.availableLevels = Array.fromRange(CONFIG.DND5E.maxLevel + 1).slice(1).map(level => {
        const delta = level - cls.system.levels;
        let label = formatNumber(level);
        if ( delta ) label = `${label} (${formatNumber(delta, { signDisplay: "always" })})`;
        return { value: delta, label, disabled: delta > maxLevelDelta };
      });
      ctx.prefixedImage = cls.img ? foundry.utils.getRoute(cls.img) : null;
      arr.push(cls);
      const identifier = cls.system.identifier || cls.name.slugify({strict: true});
      const subclass = subclasses.findSplice(s => s.system.classIdentifier === identifier);
      if ( subclass ) arr.push(subclass);
      else {
        const subclassAdvancement = cls.advancement.byType.Subclass?.[0];
        if ( subclassAdvancement && (subclassAdvancement.level <= cls.system.levels) ) ctx.needsSubclass = true;
      }
      return arr;
    }, []);
    for ( const subclass of subclasses ) {
      feats.push(subclass);
      const message = game.i18n.format("DND5E.SubclassMismatchWarn", {
        name: subclass.name, class: subclass.system.classIdentifier
      });
      context.warnings.push({ message, type: "warning" });
    }

    // Organize Features
    const features = {
      race: {
        label: CONFIG.Item.typeLabels.race, items: races,
        hasActions: false, dataset: {type: "race"} },
      background: {
        label: CONFIG.Item.typeLabels.background, items: backgrounds,
        hasActions: false, dataset: {type: "background"} },
      classes: {
        label: `${CONFIG.Item.typeLabels.class}Pl`, items: classes,
        hasActions: false, dataset: {type: "class"}, isClass: true },
      active: {
        label: "DND5E.FeatureActive", items: [],
        hasActions: true, dataset: {type: "feat", "activation.type": "action"} },
      passive: {
        label: "DND5E.FeaturePassive", items: [],
        hasActions: false, dataset: {type: "feat"} }
    };
    for ( const feat of feats ) {
      if ( feat.system.activities?.size && !feat.system.properties?.has("trait") ) {
        features.active.items.push(feat);
        context.itemContext[feat.id].ungroup = "active";
      }
      else features.passive.items.push(feat);
    }

    // Assign and return
    context.inventoryFilters = true;
    context.inventory = Object.values(inventory);
    context.spellbook = spellbook;
    context.preparedSpells = nPrepared;
    context.features = Object.values(features);
  }

  /* -------------------------------------------- */

  /**
   * A helper method to establish the displayed preparation state for an item.
   * @param {Item5e} item     Item being prepared for display.
   * @param {object} context  Context data for display.
   * @protected
   */
  _prepareItem(item, context) {
    if ( item.type === "spell" ) {
      const prep = item.system.preparation || {};
      const isAlways = prep.mode === "always";
      const isPrepared = !!prep.prepared;
      context.toggleClass = isPrepared ? "active" : "";
      if ( isAlways ) context.toggleClass = "fixed";
      if ( isAlways ) context.toggleTitle = CONFIG.DND5E.spellPreparationModes.always.label;
      else if ( isPrepared ) context.toggleTitle = CONFIG.DND5E.spellPreparationModes.prepared.label;
      else context.toggleTitle = game.i18n.localize("DND5E.SpellUnprepared");
    }
    else {
      const isActive = !!item.system.equipped;
      context.toggleClass = isActive ? "active" : "";
      context.toggleTitle = game.i18n.localize(isActive ? "DND5E.Equipped" : "DND5E.Unequipped");
      context.canToggle = "equipped" in item.system;
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    if ( !this.isEditable ) return;
    html.find(".short-rest").click(this._onShortRest.bind(this));
    html.find(".long-rest").click(this._onLongRest.bind(this));
    html.find(".rollable[data-action]").click(this._onSheetAction.bind(this));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onConfigMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    if ( (event.currentTarget.dataset.action === "type") && (this.actor.system.details.race?.id) ) {
      new CreatureTypeConfig({ document: this.actor.system.details.race, keyPath: "type" }).render({ force: true });
    } else if ( event.currentTarget.dataset.action !== "type" ) {
      return super._onConfigMenu(event);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle mouse click events for character sheet actions.
   * @param {MouseEvent} event  The originating click event.
   * @returns {Promise}         Dialog or roll result.
   * @protected
   */
  _onSheetAction(event) {
    event.preventDefault();
    const button = event.currentTarget;
    switch ( button.dataset.action ) {
      case "convertCurrency":
        return Dialog.confirm({
          title: `${game.i18n.localize("DND5E.CurrencyConvert")}`,
          content: `<p>${game.i18n.localize("DND5E.CurrencyConvertHint")}</p>`,
          yes: () => this.actor.convertCurrency()
        });
      case "rollDeathSave":
        return this.actor.rollDeathSave({ event, legacy: false });
      case "rollInitiative":
        return this.actor.rollInitiativeDialog({ event });
    }
  }

  /* -------------------------------------------- */

  /**
   * Take a short rest, calling the relevant function on the Actor instance.
   * @param {Event} event             The triggering click event.
   * @returns {Promise<RestResult>}  Result of the rest action.
   * @private
   */
  async _onShortRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.shortRest();
  }

  /* -------------------------------------------- */

  /**
   * Take a long rest, calling the relevant function on the Actor instance.
   * @param {Event} event             The triggering click event.
   * @returns {Promise<RestResult>}  Result of the rest action.
   * @private
   */
  async _onLongRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.longRest();
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropSingleItem(itemData, event) {

    // Increment the number of class levels a character instead of creating a new item
    if ( itemData.type === "class" ) {
      const charLevel = this.actor.system.details.level;
      itemData.system.levels = Math.min(itemData.system.levels, CONFIG.DND5E.maxLevel - charLevel);
      if ( itemData.system.levels <= 0 ) {
        const err = game.i18n.format("DND5E.MaxCharacterLevelExceededWarn", { max: CONFIG.DND5E.maxLevel });
        ui.notifications.error(err);
        return false;
      }

      const cls = this.actor.itemTypes.class.find(c => c.identifier === itemData.system.identifier);
      if ( cls ) {
        const priorLevel = cls.system.levels;
        if ( !game.settings.get("dnd5e", "disableAdvancements") ) {
          const manager = AdvancementManager.forLevelChange(this.actor, cls.id, itemData.system.levels);
          if ( manager.steps.length ) {
            manager.render(true);
            return false;
          }
        }
        cls.update({"system.levels": priorLevel + itemData.system.levels});
        return false;
      }
    }

    // If a subclass is dropped, ensure it doesn't match another subclass with the same identifier
    else if ( itemData.type === "subclass" ) {
      const other = this.actor.itemTypes.subclass.find(i => i.identifier === itemData.system.identifier);
      if ( other ) {
        const err = game.i18n.format("DND5E.SubclassDuplicateError", {identifier: other.identifier});
        ui.notifications.error(err);
        return false;
      }
      const cls = this.actor.itemTypes.class.find(i => i.identifier === itemData.system.classIdentifier);
      if ( cls && cls.subclass ) {
        const err = game.i18n.format("DND5E.SubclassAssignmentError", {class: cls.name, subclass: cls.subclass.name});
        ui.notifications.error(err);
        return false;
      }
    }
    return super._onDropSingleItem(itemData, event);
  }
}
