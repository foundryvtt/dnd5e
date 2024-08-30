import AdvancementManager from "../applications/advancement/advancement-manager.mjs";
import AdvancementConfirmationDialog from "../applications/advancement/advancement-confirmation-dialog.mjs";
import CreateScrollDialog from "../applications/item/create-scroll-dialog.mjs";
import ClassData from "../data/item/class.mjs";
import ContainerData from "../data/item/container.mjs";
import EquipmentData from "../data/item/equipment.mjs";
import SpellData from "../data/item/spell.mjs";
import ActivitiesTemplate from "../data/item/templates/activities.mjs";
import PhysicalItemTemplate from "../data/item/templates/physical-item.mjs";
import simplifyRollFormula from "../dice/simplify-roll-formula.mjs";
import { getSceneTargets, simplifyBonus } from "../utils.mjs";
import Scaling from "./scaling.mjs";
import Proficiency from "./actor/proficiency.mjs";
import SelectChoices from "./actor/select-choices.mjs";
import Advancement from "./advancement/advancement.mjs";
import SystemDocumentMixin from "./mixins/document.mjs";
import ActivityChoiceDialog from "../applications/activity/activity-choice-dialog.mjs";

/**
 * Override and extend the basic Item implementation.
 */
export default class Item5e extends SystemDocumentMixin(Item) {

  /**
   * Caches an item linked to this one, such as a subclass associated with a class.
   * @type {Item5e}
   * @private
   */
  _classLink;

  /* -------------------------------------------- */

  /**
   * An object that tracks which tracks the changes to the data model which were applied by active effects
   * @type {object}
   */
  overrides = this.overrides ?? {};

  /* -------------------------------------------- */

  /**
   * Types that can be selected within the compendium browser.
   * @param {object} [options={}]
   * @param {Set<string>} [options.chosen]  Types that have been selected.
   * @returns {SelectChoices}
   */
  static compendiumBrowserTypes({ chosen=new Set() }={}) {
    const [generalTypes, physicalTypes] = Item.TYPES.reduce(([g, p], t) => {
      if ( ![CONST.BASE_DOCUMENT_TYPE, "backpack"].includes(t) ) {
        if ( CONFIG.Item.dataModels[t]?.metadata?.inventoryItem ) p.push(t);
        else g.push(t);
      }
      return [g, p];
    }, [[], []]);

    const makeChoices = (types, categoryChosen) => types.reduce((obj, type) => {
      obj[type] = {
        label: CONFIG.Item.typeLabels[type],
        chosen: chosen.has(type) || categoryChosen
      };
      return obj;
    }, {});
    const choices = makeChoices(generalTypes);
    choices.physical = {
      label: game.i18n.localize("DND5E.Item.Category.Physical"),
      children: makeChoices(physicalTypes, chosen.has("physical"))
    };
    return new SelectChoices(choices);
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeSource(data, options={}) {
    // Migrate backpack -> container.
    if ( data.type === "backpack" ) {
      data.type = "container";
      foundry.utils.setProperty(data, "flags.dnd5e.persistSourceMigration", true);
    }

    /**
     * A hook event that fires before source data is initialized for an Item in a compendium.
     * @function dnd5e.initializeItemSource
     * @memberof hookEvents
     * @param {Item5e} item     Item for which the data is being initialized.
     * @param {object} data     Source data being initialized.
     * @param {object} options  Additional data initialization options.
     */
    if ( options.pack || options.parent?.pack ) Hooks.callAll("dnd5e.initializeItemSource", this, data, options);

    return super._initializeSource(data, options);
  }

  /* -------------------------------------------- */
  /*  Item Properties                             */
  /* -------------------------------------------- */

  /**
   * Which ability score modifier is used by this item?
   * @type {string|null}
   * @see {@link ActionTemplate#abilityMod}
   */
  get abilityMod() {
    return this.system.abilityMod ?? null;
  }

  /* --------------------------------------------- */

  /**
   * The item that contains this item, if it is in a container. Returns a promise if the item is located
   * in a compendium pack.
   * @type {Item5e|Promise<Item5e>|void}
   */
  get container() {
    if ( !this.system.container ) return;
    if ( this.isEmbedded ) return this.actor.items.get(this.system.container);
    if ( this.pack ) return game.packs.get(this.pack).getDocument(this.system.container);
    return game.items.get(this.system.container);
  }

  /* -------------------------------------------- */

  /**
   * What is the critical hit threshold for this item, if applicable?
   * @type {number|null}
   * @see {@link ActionTemplate#criticalThreshold}
   */
  get criticalThreshold() {
    return this.system.criticalThreshold ?? null;
  }

  /* --------------------------------------------- */

  /**
   * Does the Item implement an ability check as part of its usage?
   * @type {boolean}
   * @see {@link ActionTemplate#hasAbilityCheck}
   * @deprecated since DnD5e 4.0, targeted for removal in DnD5e 4.4
   */
  get hasAbilityCheck() {
    return this.system.hasAbilityCheck ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does this item support advancement and have advancements defined?
   * @type {boolean}
   */
  get hasAdvancement() {
    return !!this.system.advancement?.length;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item have an area of effect target?
   * @type {boolean}
   * @see {@link ActivatedEffectTemplate#hasAreaTarget}
   * @deprecated since DnD5e 4.0, targeted for removal in DnD5e 4.4
   */
  get hasAreaTarget() {
    return this.system.hasAreaTarget ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement an attack roll as part of its usage?
   * @type {boolean}
   * @see {@link ActionTemplate#hasAttack}
   */
  get hasAttack() {
    return this.system.hasAttack ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a damage roll as part of its usage?
   * @type {boolean}
   * @see {@link ActionTemplate#hasDamage}
   * @deprecated since DnD5e 4.0, targeted for removal in DnD5e 4.4
   */
  get hasDamage() {
    return this.system.hasDamage ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item target one or more distinct targets?
   * @type {boolean}
   * @see {@link ActivatedEffectTemplate#hasIndividualTarget}
   * @deprecated since DnD5e 4.0, targeted for removal in DnD5e 4.4
   */
  get hasIndividualTarget() {
    return this.system.hasIndividualTarget ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Is this Item limited in its ability to be used by charges or by recharge?
   * @type {boolean}
   * @see {@link ActivatedEffectTemplate#hasLimitedUses}
   * @see {@link FeatData#hasLimitedUses}
   */
  get hasLimitedUses() {
    return this.system.hasLimitedUses ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does this Item draw from a resource?
   * @type {boolean}
   * @see {@link ActivatedEffectTemplate#hasResource}
   * @deprecated since DnD5e 4.0, targeted for removal in DnD5e 4.4
   */
  get hasResource() {
    return this.system.hasResource ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does this Item draw from ammunition?
   * @type {boolean}
   * @see {@link ActivatedEffectTemplate#hasAmmo}
   * @deprecated since DnD5e 4.0, targeted for removal in DnD5e 4.4
   */
  get hasAmmo() {
    return this.system.hasAmmo ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a saving throw as part of its usage?
   * @type {boolean}
   * @see {@link ActionTemplate#hasSave}
   */
  get hasSave() {
    return this.system.hasSave ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item have a target?
   * @type {boolean}
   * @see {@link ActivatedEffectTemplate#hasTarget}
   * @deprecated since DnD5e 4.0, targeted for removal in DnD5e 4.4
   */
  get hasTarget() {
    return this.system.hasTarget ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Return an item's identifier.
   * @type {string}
   */
  get identifier() {
    return this.system.identifier || this.name.slugify({strict: true});
  }

  /* --------------------------------------------- */

  /**
   * Is this Item an activatable item?
   * @type {boolean}
   */
  get isActive() {
    return this.system.isActive ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Is this item any of the armor subtypes?
   * @type {boolean}
   * @see {@link EquipmentTemplate#isArmor}
   */
  get isArmor() {
    return this.system.isArmor ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Does the item provide an amount of healing instead of conventional damage?
   * @type {boolean}
   * @see {@link ActionTemplate#isHealing}
   */
  get isHealing() {
    return this.system.isHealing ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Is this item a separate large object like a siege engine or vehicle component that is
   * usually mounted on fixtures rather than equipped, and has its own AC and HP?
   * @type {boolean}
   * @see {@link EquipmentData#isMountable}
   * @see {@link WeaponData#isMountable}
   */
  get isMountable() {
    return this.system.isMountable ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Is this class item the original class for the containing actor? If the item is not a class or it is not
   * embedded in an actor then this will return `null`.
   * @type {boolean|null}
   */
  get isOriginalClass() {
    if ( this.type !== "class" || !this.isEmbedded || !this.parent.system.details?.originalClass ) return null;
    return this.id === this.parent.system.details.originalClass;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a versatile damage roll as part of its usage?
   * @type {boolean}
   * @see {@link ActionTemplate#isVersatile}
   */
  get isVersatile() {
    return this.system.isVersatile ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Is the item rechargeable?
   * @type {boolean}
   */
  get hasRecharge() {
    return this.hasLimitedUses && (this.system.uses?.recovery[0]?.period === "recharge");
  }

  /* --------------------------------------------- */

  /**
   * Is the item on recharge cooldown?
   * @type {boolean}
   */
  get isOnCooldown() {
    return this.hasRecharge && (this.system.uses.value < 1);
  }

  /* --------------------------------------------- */

  /**
   * Does this item require concentration?
   * @type {boolean}
   */
  get requiresConcentration() {
    if ( this.system.validProperties.has("concentration") && this.system.properties.has("concentration") ) return true;
    return this.system.activities?.contents[0]?.duration.concentration ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Class associated with this subclass. Always returns null on non-subclass or non-embedded items.
   * @type {Item5e|null}
   */
  get class() {
    if ( !this.isEmbedded || (this.type !== "subclass") ) return null;
    const cid = this.system.classIdentifier;
    return this._classLink ??= this.parent.items.find(i => (i.type === "class") && (i.identifier === cid));
  }

  /* -------------------------------------------- */

  /**
   * Subclass associated with this class. Always returns null on non-class or non-embedded items.
   * @type {Item5e|null}
   */
  get subclass() {
    if ( !this.isEmbedded || (this.type !== "class") ) return null;
    const items = this.parent.items;
    const cid = this.identifier;
    return this._classLink ??= items.find(i => (i.type === "subclass") && (i.system.classIdentifier === cid));
  }

  /* -------------------------------------------- */

  /**
   * Retrieve scale values for current level from advancement data.
   * @type {object}
   */
  get scaleValues() {
    if ( !this.advancement.byType.ScaleValue ) return {};
    const level = this.type === "class" ? this.system.levels : this.type === "subclass" ? this.class?.system.levels
      : this.parent?.system.details.level ?? 0;
    return this.advancement.byType.ScaleValue.reduce((obj, advancement) => {
      obj[advancement.identifier] = advancement.valueForLevel(level);
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * Scaling increase for this item based on flag or item-type specific details.
   * @type {number}
   */
  get scalingIncrease() {
    return this.system?.scalingIncrease ?? this.getFlag("dnd5e", "scaling") ?? 0;
  }

  /* -------------------------------------------- */

  /**
   * Does this item scale with any kind of consumption?
   * @type {string|null}
   */
  get usageScaling() {
    // TODO: Re-implement on activity
    const { level, preparation, consume } = this.system;
    const isLeveled = (this.type === "spell") && (level > 0);
    if ( isLeveled && CONFIG.DND5E.spellPreparationModes[preparation.mode]?.upcast ) return "slot";
    else if ( isLeveled && this.hasResource && consume.scale ) return "resource";
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Spellcasting details for a class or subclass.
   *
   * @typedef {object} SpellcastingDescription
   * @property {string} type              Spellcasting type as defined in ``CONFIG.DND5E.spellcastingTypes`.
   * @property {string|null} progression  Progression within the specified spellcasting type if supported.
   * @property {string} ability           Ability used when casting spells from this class or subclass.
   * @property {number|null} levels       Number of levels of this class or subclass's class if embedded.
   */

  /**
   * Retrieve the spellcasting for a class or subclass. For classes, this will return the spellcasting
   * of the subclass if it overrides the class. For subclasses, this will return the class's spellcasting
   * if no spellcasting is defined on the subclass.
   * @type {SpellcastingDescription|null}  Spellcasting object containing progression & ability.
   */
  get spellcasting() {
    const spellcasting = this.system.spellcasting;
    if ( !spellcasting ) return null;
    const isSubclass = this.type === "subclass";
    const classSC = isSubclass ? this.class?.system.spellcasting : spellcasting;
    const subclassSC = isSubclass ? spellcasting : this.subclass?.system.spellcasting;
    const finalSC = foundry.utils.deepClone(
      ( subclassSC && (subclassSC.progression !== "none") ) ? subclassSC : classSC
    );
    return finalSC ?? null;
  }

  /* -------------------------------------------- */
  /*  Active Effects                              */
  /* -------------------------------------------- */

  /**
   * Get all ActiveEffects that may apply to this Item.
   * @yields {ActiveEffect5e}
   * @returns {Generator<ActiveEffect5e, void, void>}
   */
  *allApplicableEffects() {
    for ( const effect of this.effects ) {
      if ( effect.isAppliedEnchantment ) yield effect;
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply any transformation to the Item data which are caused by enchantment Effects.
   */
  applyActiveEffects() {
    const overrides = {};

    // Organize non-disabled effects by their application priority
    const changes = [];
    for ( const effect of this.allApplicableEffects() ) {
      if ( !effect.active ) continue;
      changes.push(...effect.changes.map(change => {
        const c = foundry.utils.deepClone(change);
        c.effect = effect;
        c.priority ??= c.mode * 10;
        return c;
      }));
    }
    changes.sort((a, b) => a.priority - b.priority);

    // Apply all changes
    for ( const change of changes ) {
      if ( !change.key ) continue;
      const changes = change.effect.apply(this, change);
      Object.assign(overrides, changes);
    }

    // Expand the set of final overrides
    this.overrides = foundry.utils.expandObject(overrides);
  }

  /* -------------------------------------------- */

  /**
   * Should this item's active effects be suppressed.
   * @type {boolean}
   */
  get areEffectsSuppressed() {
    const requireEquipped = (this.type !== "consumable")
      || ["rod", "trinket", "wand"].includes(this.system.type.value);
    if ( requireEquipped && (this.system.equipped === false) ) return true;
    return !this.system.attuned && (this.system.attunement === "required");
  }

  /* -------------------------------------------- */
  /*  Data Initialization                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  clone(data={}, options={}) {
    if ( options.save ) return super.clone(data, options);
    if ( this.parent ) this.parent._embeddedPreparation = true;
    const item = super.clone(data, options);
    if ( item.parent ) {
      delete item.parent._embeddedPreparation;
      item.prepareFinalAttributes();
    }
    return item;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareEmbeddedDocuments() {
    super.prepareEmbeddedDocuments();
    for ( const activity of this.system.activities ?? [] ) activity.prepareData();
    if ( !this.actor || this.actor._embeddedPreparation ) this.applyActiveEffects();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    this.labels ??= {};
    super.prepareDerivedData();

    // Clear out linked item cache
    this._classLink = undefined;

    // Advancement
    this._prepareAdvancement();

    // Item Properties
    if ( this.system.properties ) {
      this.labels.properties = this.system.properties.reduce((acc, prop) => {
        if ( (prop === "concentration") && !this.requiresConcentration ) return acc;
        acc.push({
          abbr: prop,
          label: CONFIG.DND5E.itemProperties[prop]?.label,
          icon: CONFIG.DND5E.itemProperties[prop]?.icon
        });
        return acc;
      }, []);
    }

    // Un-owned items can have their final preparation done here, otherwise this needs to happen in the owning Actor
    if ( !this.isOwned ) this.prepareFinalAttributes();
  }

  /* -------------------------------------------- */

  /**
   * Prepare advancement objects from stored advancement data.
   * @protected
   */
  _prepareAdvancement() {
    const minAdvancementLevel = ["class", "subclass"].includes(this.type) ? 1 : 0;
    this.advancement = {
      byId: {},
      byLevel: Object.fromEntries(
        Array.fromRange(CONFIG.DND5E.maxLevel, minAdvancementLevel).map(l => [l, []])
      ),
      byType: {},
      needingConfiguration: []
    };
    for ( const advancement of this.system.advancement ?? [] ) {
      if ( !(advancement instanceof Advancement) ) continue;
      this.advancement.byId[advancement.id] = advancement;
      this.advancement.byType[advancement.type] ??= [];
      this.advancement.byType[advancement.type].push(advancement);
      advancement.levels.forEach(l => this.advancement.byLevel[l]?.push(advancement));
      if ( !advancement.levels.length
        || ((advancement.levels.length === 1) && (advancement.levels[0] < minAdvancementLevel)) ) {
        this.advancement.needingConfiguration.push(advancement);
      }
    }
    Object.entries(this.advancement.byLevel).forEach(([lvl, data]) => data.sort((a, b) => {
      return a.sortingValueForLevel(lvl).localeCompare(b.sortingValueForLevel(lvl), game.i18n.lang);
    }));
  }

  /* -------------------------------------------- */

  /**
   * Determine an item's proficiency level based on its parent actor's proficiencies.
   * @protected
   */
  _prepareProficiency() {
    if ( !["spell", "weapon", "equipment", "tool", "feat", "consumable"].includes(this.type) ) return;
    if ( !this.actor?.system.attributes?.prof ) {
      this.system.prof = new Proficiency(0, 0);
      return;
    }

    this.system.prof = new Proficiency(this.actor.system.attributes.prof, this.system.proficiencyMultiplier ?? 0);
  }

  /* -------------------------------------------- */

  /**
   * Compute item attributes which might depend on prepared actor data. If this item is embedded this method will
   * be called after the actor's data is prepared.
   * Otherwise, it will be called at the end of `Item5e#prepareDerivedData`.
   */
  prepareFinalAttributes() {
    this._prepareProficiency();
    this.system.prepareFinalData?.();
    this._prepareLabels();
  }

  /* -------------------------------------------- */

  /**
   * Prepare top-level summary labels based on configured activities.
   * @protected
   */
  _prepareLabels() {
    const activations = this.labels.activations = [];
    const attacks = this.labels.attacks = [];
    const damages = this.labels.damages = [];
    if ( !this.system.activities?.size ) return;
    for ( const activity of this.system.activities ) {
      if ( activity.activation.type && (this.type !== "spell") ) {
        const { activation, concentrationDuration, duration, range, target } = activity.labels;
        activations.push({ activation, concentrationDuration, duration, range, target });
      }
      if ( activity.type === "attack" ) {
        const { toHit, modifier } = activity.labels;
        attacks.push({ toHit, modifier });
      }
      if ( activity.labels?.damage?.length ) damages.push(...activity.labels.damage);
    }
    if ( activations.length ) {
      Object.assign(this.labels, activations[0]);
      delete activations[0].concentrationDuration;
    }
    if ( attacks.length ) Object.assign(this.labels, attacks[0]);
  }

  /* -------------------------------------------- */

  /**
   * Update a label to the Item detailing its total to hit bonus from the following sources:
   * - item's actor's proficiency bonus if applicable
   * - item's actor's global bonuses to the given item type
   * - item document's innate & magical attack bonuses
   * - item's ammunition if applicable
   * @returns {{rollData: object, parts: string[]}|null}  Data used in the item's Attack roll.
   */
  getAttackToHit() {
    foundry.utils.logCompatibilityWarning(
      "The `getAttackToHit` method on `Item5e` has moved to `getAttackData` on `AttackActivity`.",
      { since: "DnD5e 4.0", until: "DnD5e 4.4", once: true }
    );
    // TODO: Replace this implementation with a call to the method on the activity once `rollAttack` has been moved

    if ( !this.hasAttack ) return null;
    const flat = this.system.attack.flat;
    const rollData = this.getRollData();
    const parts = [];
    let ammo;

    if ( this.isOwned && !flat ) {
      // Ability score modifier
      if ( this.system.ability !== "none" ) parts.push("@mod");

      // Add proficiency bonus.
      if ( this.system.prof?.hasProficiency ) {
        parts.push("@prof");
        rollData.prof = this.system.prof.term;
      }

      // Actor-level global bonus to attack rolls
      const actorBonus = this.actor.system.bonuses?.[this.system.actionType] || {};
      if ( actorBonus.attack ) parts.push(actorBonus.attack);

      ammo = this.hasAmmo ? this.actor.items.get(this.system.consume.target) : null;
    }

    // Include the item's innate & magical attack bonuses
    if ( this.system.attack.bonus ) parts.push(this.system.attack.bonus);
    if ( this.system.magicalBonus && this.system.magicAvailable && !flat ) parts.push(this.system.magicalBonus);

    // One-time bonus provided by consumed ammunition
    if ( ammo && !flat ) {
      const ammoItemQuantity = ammo.system.quantity;
      const ammoCanBeConsumed = ammoItemQuantity && (ammoItemQuantity - (this.system.consume.amount ?? 0) >= 0);
      const ammoParts = [
        Roll.replaceFormulaData(ammo.system.attack.bonus, rollData),
        ammo.system.magicAvailable ? ammo.system.magicalBonus : null
      ].filter(b => b);
      const ammoIsTypeConsumable = (ammo.type === "consumable") && (ammo.system.type.value === "ammo");
      if ( ammoCanBeConsumed && ammoParts.length && ammoIsTypeConsumable ) {
        parts.push("@ammo");
        rollData.ammo = ammoParts.join(" + ");
      }
    }

    // Condense the resulting attack bonus formula into a simplified label
    const roll = new Roll(parts.join("+"), rollData);
    const formula = simplifyRollFormula(roll.formula) || "0";
    this.labels.modifier = simplifyRollFormula(roll.formula, { deterministic: true }) || "0";
    this.labels.toHit = !/^[+-]/.test(formula) ? `+ ${formula}` : formula;
    return { rollData, parts };
  }

  /* -------------------------------------------- */

  /**
   * Render a rich tooltip for this item.
   * @param {EnrichmentOptions} [enrichmentOptions={}]  Options for text enrichment.
   * @returns {Promise<{content: string, classes: string[]}>|null}
   */
  richTooltip(enrichmentOptions={}) {
    return this.system.richTooltip?.() ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Configuration data for an item usage being prepared.
   *
   * @typedef {object} ItemUseConfiguration
   * @property {boolean} createMeasuredTemplate     Should this item create a template?
   * @property {boolean} createSummons              Should this item create a summoned creature?
   * @property {boolean} consumeResource            Should this item consume a (non-ammo) resource?
   * @property {boolean} consumeSpellSlot           Should this item (a spell) consume a spell slot?
   * @property {boolean} consumeUsage               Should this item consume its limited uses or recharge?
   * @property {string} enchantmentProfile          ID of the enchantment to apply.
   * @property {boolean} promptEnchantment          Does an enchantment profile need to be selected?
   * @property {string|number|null} slotLevel       The spell slot type or level to consume by default.
   * @property {string|null} summonsProfile         ID of the summoning profile to use.
   * @property {number|null} resourceAmount         The amount to consume by default when scaling with consumption.
   * @property {boolean} beginConcentrating         Should this item initiate concentration?
   * @property {string|null} endConcentration       The id of the active effect to end concentration on, if any.
   */

  /**
   * Additional options used for configuring item usage.
   *
   * @typedef {object} ItemUseOptions
   * @property {boolean} configureDialog  Display a configuration dialog for the item usage, if applicable?
   * @property {string} rollMode          The roll display mode with which to display (or not) the card.
   * @property {boolean} createMessage    Whether to automatically create a chat message (if true) or simply return
   *                                      the prepared chat message data (if false).
   * @property {object} flags             Additional flags added to the chat message.
   * @property {Event} event              The browser event which triggered the item usage, if any.
   */

  /**
   * Trigger an Item usage, optionally creating a chat message with followup actions.
   * @param {ActivityUseConfiguration} config       Configuration info for the activation.
   * @param {boolean} [config.legacy=true]          Whether this is a legacy invocation, using the old signature.
   * @param {ActivityDialogConfiguration} dialog    Configuration info for the usage dialog.
   * @param {ActivityMessageConfiguration} message  Configuration info for the created chat message.
   * @returns {Promise<ActivityUsageResults|ChatMessage|object|void>}  Returns the usage results for the triggered
   *                                                                   activity, or the chat message if the Item had no
   *                                                                   activities and was posted directly to chat.
   */
  async use(config={}, dialog={}, message={}) {
    let event = config.event;
    if ( config.legacy !== false ) {
      foundry.utils.logCompatibilityWarning(
        "The `Item5e#use` method has a different signature. Pass the `legacy: false` option to suppress this warning "
        + " once the appropriate updates have been made.",
        { since: "DnD5e 4.0", until: "DnD5e 4.4" }
      );
      event = dialog?.event;
    }
    if ( this.system.activities.size ) {
      let usageConfig = config;
      let dialogConfig = dialog;
      let messageConfig = message;
      const activities = this.system.activities.contents.sort((a, b) => a.sort - b.sort);
      let activity = activities[0];
      if ( (activities.length > 1) && !event?.shiftKey ) activity = await ActivityChoiceDialog.create(this);
      if ( !activity ) return;
      if ( config.legacy !== false ) {
        usageConfig = {};
        dialogConfig = {};
        messageConfig = {};
        activity._applyDeprecatedConfigs(usageConfig, dialogConfig, messageConfig, config, dialog);
      }
      return activity.use(usageConfig, dialogConfig, messageConfig);
    }
    if ( this.actor ) return this.displayCard();
  }

  /* -------------------------------------------- */

  /**
   * Handle item's consumption.
   * @param {Item5e} item  Item or clone to use when calculating updates.
   * @param {ItemUseConfiguration} config  Configuration data for the item usage being prepared.
   * @param {ItemUseOptions} options       Additional options used for configuring item usage.
   * @returns {false|void}                 Returns `false` if any further usage should be canceled.
   * @deprecated since DnD5e 4.0, targeted for removal in DnD5e 4.4
   */
  async consume(item, config, options) {
    foundry.utils.logCompatibilityWarning(
      "The `Item5e#consume` method has been deprecated and should now be called directly on the activity.",
      { since: "DnD5e 4.0", until: "DnD5e 4.4" }
    );
    if ( this.system.activities ) {
      const activity = this.system.activities.contents[0];
      if ( activity ) {
        const usageConfig = {};
        const dialogConfig = {};
        const messageConfig = {};
        activity._applyDeprecatedConfigs(usageConfig, dialogConfig, messageConfig, config, options);
        return activity.consume(usageConfig, messageConfig);
      }
    }
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Display the chat card for an Item as a Chat Message
   * @param {ItemUseOptions} [options]  Options which configure the display of the item chat card.
   * @returns {ChatMessage|object}      Chat message if `createMessage` is true, otherwise an object containing
   *                                    message data.
   */
  async displayCard(options={}) {

    // Render the chat card template
    const token = this.actor.token;
    const consumeUsage = this.hasLimitedUses && !options.flags?.dnd5e?.use?.consumedUsage;
    const consumeResource = this.hasResource && !options.flags?.dnd5e?.use?.consumedResource;
    const hasButtons = this.hasAttack || this.hasDamage || this.isVersatile || this.hasSave || this.system.formula
      || this.hasAreaTarget || (this.type === "tool") || this.hasAbilityCheck || this.system.hasSummoning
      || consumeUsage || consumeResource;
    const templateData = {
      hasButtons,
      actor: this.actor,
      config: CONFIG.DND5E,
      tokenId: token?.uuid || null,
      item: this,
      effects: this.effects.filter(e => (e.type !== "enchantment") && !e.getFlag("dnd5e", "rider")),
      data: await this.system.getCardData(),
      labels: this.labels,
      hasAttack: this.hasAttack,
      isHealing: this.isHealing,
      hasDamage: this.hasDamage,
      isVersatile: this.isVersatile,
      isSpell: this.type === "spell",
      hasSave: this.hasSave,
      hasAreaTarget: this.hasAreaTarget,
      isTool: this.type === "tool",
      hasAbilityCheck: this.hasAbilityCheck,
      consumeUsage,
      consumeResource
    };
    const html = await renderTemplate("systems/dnd5e/templates/chat/item-card.hbs", templateData);

    // Create the ChatMessage data object
    const chatData = {
      user: game.user.id,
      content: html,
      speaker: ChatMessage.getSpeaker({actor: this.actor, token}),
      flags: {
        "core.canPopout": true,
        "dnd5e.item": { id: this.id, uuid: this.uuid, type: this.type }
      }
    };

    // If the Item was destroyed in the process of displaying its card - embed the item data in the chat message
    if ( (this.type === "consumable") && !this.actor.items.has(this.id) ) {
      chatData.flags["dnd5e.itemData"] = templateData.item.toObject();
    }

    // Merge in the flags from options
    chatData.flags = foundry.utils.mergeObject(chatData.flags, options.flags);

    /**
     * A hook event that fires before an item chat card is created.
     * @function dnd5e.preDisplayCard
     * @memberof hookEvents
     * @param {Item5e} item             Item for which the chat card is being displayed.
     * @param {object} chatData         Data used to create the chat message.
     * @param {ItemUseOptions} options  Options which configure the display of the item chat card.
     */
    Hooks.callAll("dnd5e.preDisplayCard", this, chatData, options);

    // Apply the roll mode to adjust message visibility
    ChatMessage.applyRollMode(chatData, options.rollMode ?? game.settings.get("core", "rollMode"));

    // Create the Chat Message or return its data
    const card = (options.createMessage !== false) ? await ChatMessage.create(chatData) : chatData;

    /**
     * A hook event that fires after an item chat card is created.
     * @function dnd5e.displayCard
     * @memberof hookEvents
     * @param {Item5e} item              Item for which the chat card is being displayed.
     * @param {ChatMessage|object} card  The created ChatMessage instance or ChatMessageData depending on whether
     *                                   options.createMessage was set to `true`.
     */
    Hooks.callAll("dnd5e.displayCard", this, card);

    return card;
  }

  /* -------------------------------------------- */
  /*  Chat Cards                                  */
  /* -------------------------------------------- */

  /**
   * Prepare an object of chat data used to display a card for the Item in the chat log.
   * @param {object} htmlOptions    Options used by the TextEditor.enrichHTML function.
   * @returns {object}              An object of chat data to render.
   */
  async getChatData(htmlOptions={}) {
    const data = this.toObject().system;

    // Rich text description
    data.description.value = await TextEditor.enrichHTML(data.description.value, {
      relativeTo: this,
      rollData: this.getRollData(),
      ...htmlOptions
    });

    // Type specific properties
    data.properties = [
      ...this.system.chatProperties ?? [],
      ...this.system.equippableItemCardProperties ?? [],
      ...Object.values(this.labels.activations[0] ?? {})
    ].filter(p => p);

    return data;
  }

  /* -------------------------------------------- */
  /*  Item Rolls - Attack, Damage, Saves, Checks  */
  /* -------------------------------------------- */

  /**
   * Place an attack roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the d20Roll logic for the core implementation
   *
   * @param {D20RollConfiguration} options  Roll options which are configured and provided to the d20Roll function
   * @returns {Promise<D20Roll|null>}       A Promise which resolves to the created Roll instance
   * @deprecated since DnD5e 4.0, targeted for removal in DnD5e 4.4
   */
  async rollAttack({ spellLevel, ...options }={}) {
    foundry.utils.logCompatibilityWarning(
      "The Item5e#rollAttack method has been deprecated and should now be called directly on the attack activity.",
      { since: "DnD5e 4.0", until: "DnD5e 4.4" }
    );

    let item = this;
    if ( spellLevel && (this.type === "spell") ) {
      item = item.clone({ "flags.dnd5e.scaling": Math.max(0, spellLevel - item.system.level) }, { keepId: true });
    }

    const activity = item.system.activities?.getByType("attack")[0];
    if ( !activity ) throw new Error("This Item does not have an Attack activity to roll!");

    const rolls = await activity.rollAttack(options);
    return rolls?.[0] ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Extract salient information about targeted Actors.
   * @returns {TargetDescriptor5e[]}
   * @protected
   */
  static _formatAttackTargets() {
    // TODO: Remove this when `rollDamage` has been moved to activities
    const targets = new Map();
    for ( const token of game.user.targets ) {
      const { name } = token;
      const { img, system, uuid } = token.actor ?? {};
      const ac = system?.attributes?.ac ?? {};
      if ( uuid && Number.isNumeric(ac.value) ) targets.set(uuid, { name, img, uuid, ac: ac.value });
    }
    return Array.from(targets.values());
  }

  /* -------------------------------------------- */

  /**
   * Place a damage roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the damageRoll logic for the core implementation.
   * @param {object} [config]
   * @param {MouseEvent} [config.event]    An event which triggered this roll, if any
   * @param {boolean} [config.critical]    Should damage be rolled as a critical hit?
   * @param {number} [config.spellLevel]   If the item is a spell, override the level for damage scaling
   * @param {boolean} [config.versatile]   If the item is a weapon, roll damage using the versatile formula
   * @param {DamageRollConfiguration} [config.options]  Additional options passed to the damageRoll function
   * @returns {Promise<DamageRoll[]>}      A Promise which resolves to the created Roll instances, or null if the action
   *                                       cannot be performed.
   * @deprecated since DnD5e 4.0, targeted for removal in DnD5e 4.4
   */
  async rollDamage({ spellLevel, ...options }={}) {
    foundry.utils.logCompatibilityWarning(
      "The Item5e#rollDamage method has been deprecated and should now be called directly on an activity.",
      { since: "DnD5e 4.0", until: "DnD5e 4.4" }
    );

    let item = this;
    if ( spellLevel && (this.type === "spell") ) {
      item = item.clone({ "flags.dnd5e.scaling": Math.max(0, spellLevel - item.system.level) }, { keepId: true });
    }

    const activity = item.system.activities?.getByType("attack")[0] || item.system.activities?.getByType("damage")[0]
      || item.system.activities?.getByType("save")[0] || item.system.activities?.getByType("heal")[0];
    if ( !activity ) throw new Error("This Item does not have a damaging activity to roll!");

    const returnMultiple = options.returnMultiple;
    const rolls = await activity.rollDamage(options);
    return returnMultiple ? rolls : rolls?.[0];
  }

  /* -------------------------------------------- */

  /**
   * Prepare data needed to roll an attack using an item (weapon, feat, spell, or equipment)
   * and then pass it off to `d20Roll`.
   * @param {object} [options]
   * @param {boolean} [options.spellLevel]  Level at which a spell is cast.
   * @returns {Promise<Roll>}   A Promise which resolves to the created Roll instance.
   * @deprecated since DnD5e 4.0, targeted for removal in DnD5e 4.4
   */
  async rollFormula({spellLevel}={}) {
    foundry.utils.logCompatibilityWarning(
      "The Item5e#rollFormula method has been deprecated and should now be called directly on the utility activity.",
      { since: "DnD5e 4.0", until: "DnD5e 4.4" }
    );

    let item = this;
    if ( spellLevel && (this.type === "spell") ) {
      item = item.clone({ "flags.dnd5e.scaling": Math.max(0, spellLevel - item.system.level) }, { keepId: true });
    }

    const activity = item.system.activities?.getByType("utility")[0];
    if ( !activity ) throw new Error("This Item does not have a Utility activity to roll!");

    const rolls = await activity.rollFormula({}, { configure: false });
    return rolls?.[0];
  }

  /* -------------------------------------------- */

  /**
   * Perform an ability recharge test for an item which uses the d6 recharge mechanic.
   * @returns {Promise<Roll|void>}   A Promise which resolves to the created Roll instance
   */
  async rollRecharge() {
    const recharge = this.system.uses?.recovery.find(({ period }) => period === "recharge");
    if ( !recharge ) return;

    const rollConfig = {
      formula: "1d6",
      data: this.getRollData(),
      target: parseInt(recharge.formula),
      chatMessage: true
    };

    /**
     * A hook event that fires before the Item is rolled to recharge.
     * @function dnd5e.preRollRecharge
     * @memberof hookEvents
     * @param {Item5e} item                 Item for which the roll is being performed.
     * @param {object} config               Configuration data for the pending roll.
     * @param {string} config.formula       Formula that will be used to roll the recharge.
     * @param {object} config.data          Data used when evaluating the roll.
     * @param {number} config.target        Total required to be considered recharged.
     * @param {boolean} config.chatMessage  Should a chat message be created for this roll?
     * @returns {boolean}                   Explicitly return false to prevent the roll from being performed.
     */
    if ( Hooks.call("dnd5e.preRollRecharge", this, rollConfig) === false ) return;

    const roll = await new Roll(rollConfig.formula, rollConfig.data).evaluate();
    const success = roll.total >= rollConfig.target;

    if ( rollConfig.chatMessage ) {
      const resultMessage = game.i18n.localize(`DND5E.ItemRecharge${success ? "Success" : "Failure"}`);
      roll.toMessage({
        flavor: `${game.i18n.format("DND5E.ItemRechargeCheck", {name: this.name})} - ${resultMessage}`,
        speaker: ChatMessage.getSpeaker({actor: this.actor, token: this.actor.token})
      });
    }

    /**
     * A hook event that fires after the Item has rolled to recharge, but before any changes have been performed.
     * @function dnd5e.rollRecharge
     * @memberof hookEvents
     * @param {Item5e} item  Item for which the roll was performed.
     * @param {Roll} roll    The resulting roll.
     * @returns {boolean}    Explicitly return false to prevent the item from being recharged.
     */
    if ( Hooks.call("dnd5e.rollRecharge", this, roll) === false ) return roll;

    // Update the Item data
    if ( success ) this.update({ "system.uses.spent": 0 });

    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Prepare data needed to roll a tool check and then pass it off to `d20Roll`.
   * @param {D20RollConfiguration} [options]  Roll configuration options provided to the d20Roll function.
   * @returns {Promise<Roll>}                 A Promise which resolves to the created Roll instance.
   */
  async rollToolCheck(options={}) {
    if ( this.type !== "tool" ) throw new Error("Wrong item type!");
    return this.actor?.rollToolCheck(this.system.type.baseItem, {
      ability: this.system.ability,
      bonus: this.system.bonus,
      prof: this.system.prof,
      item: this,
      ...options
    });
  }

  /* -------------------------------------------- */

  /**
   * @inheritdoc
   * @param {object} [options]
   * @param {boolean} [options.deterministic] Whether to force deterministic values for data properties that could be
   *                                          either a die term or a flat term.
   */
  getRollData({ deterministic=false }={}) {
    let data;
    if ( this.system.getRollData ) data = this.system.getRollData({ deterministic });
    else data = { ...(this.actor?.getRollData({ deterministic }) ?? {}), item: { ...this.system } };
    if ( data?.item ) {
      data.item.flags = { ...this.flags };
      data.item.name = this.name;
    }
    data.scaling = new Scaling(this.scalingIncrease);
    return data;
  }

  /* -------------------------------------------- */
  /*  Chat Message Helpers                        */
  /* -------------------------------------------- */

  /**
   * Apply listeners to chat messages.
   * @param {HTML} html  Rendered chat message.
   */
  static chatListeners(html) {
    html.on("click", ".item-name, .collapsible", this._onChatCardToggleContent.bind(this));
    html[0].addEventListener("click", event => {
      if ( event.target.closest("[data-context-menu]") ) {
        event.preventDefault();
        event.stopPropagation();
        event.target.closest("[data-message-id]").dispatchEvent(new PointerEvent("contextmenu", {
          view: window, bubbles: true, cancelable: true
        }));
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the visibility of chat card content when the name is clicked
   * @param {Event} event   The originating click event
   * @private
   */
  static _onChatCardToggleContent(event) {
    const header = event.currentTarget;
    if ( header.classList.contains("collapsible") && !event.target.closest(".collapsible-content.card-content") ) {
      event.preventDefault();
      header.classList.toggle("collapsed");

      // Clear the height from the chat popout container so that it appropriately resizes.
      const popout = header.closest(".chat-popout");
      if ( popout ) popout.style.height = "";
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the Actor which is the author of a chat card
   * @param {HTMLElement} card    The chat card being used
   * @returns {Actor|null}        The Actor document or null
   * @private
   */
  static async _getChatCardActor(card) {

    // Case 1 - a synthetic actor from a Token
    if ( card.dataset.tokenId ) {
      const token = await fromUuid(card.dataset.tokenId);
      if ( !token ) return null;
      return token.actor;
    }

    // Case 2 - use Actor ID directory
    const actorId = card.dataset.actorId;
    return game.actors.get(actorId) || null;
  }

  /* -------------------------------------------- */

  /**
   * Get token targets for the current chat card action and display warning of none are selected.
   * @param {HTMLElement} card  The chat card being used.
   * @returns {Token5e[]}       An Array of Token objects, if any.
   * @private
   */
  static _getChatCardTargets(card) {
    const targets = getSceneTargets();
    if ( !targets.length ) ui.notifications.warn("DND5E.ActionWarningNoToken", {localize: true});
    return targets;
  }

  /* -------------------------------------------- */
  /*  Activities & Advancements                   */
  /* -------------------------------------------- */

  /**
   * Create a new activity of the specified type.
   * @param {string} type                          Type of activity to create.
   * @param {object} [data]                        Data to use when creating the activity.
   * @param {object} [options={}]
   * @param {boolean} [options.renderSheet=true]  Should the sheet be rendered after creation?
   * @returns {Promise<ActivitySheet|null>}
   */
  async createActivity(type, data={}, { renderSheet=true }={}) {
    if ( !this.system.activities ) return;

    const config = CONFIG.DND5E.activityTypes[type];
    if ( !config ) throw new Error(`${type} not found in CONFIG.DND5E.activityTypes`);
    const cls = config.documentClass;

    const createData = foundry.utils.deepClone(data);
    const activity = new cls({ type, ...data }, { parent: this });
    if ( activity._preCreate(createData) === false ) return;

    await this.update({ [`system.activities.${activity.id}`]: activity.toObject() });
    const created = this.system.activities.get(activity.id);
    if ( renderSheet ) return created.sheet?.render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Update an activity belonging to this item.
   * @param {string} id          ID of the activity to update.
   * @param {object} updates     Updates to apply to this activity.
   * @returns {Promise<Item5e>}  This item with the changes applied.
   */
  updateActivity(id, updates) {
    if ( !this.system.activities ) return this;
    if ( !this.system.activities.has(id) ) throw new Error(`Activity of ID ${id} could not be found to update`);
    return this.update({ [`system.activities.${id}`]: updates });
  }

  /* -------------------------------------------- */

  /**
   * Remove an activity from this item.
   * @param {string} id          ID of the activity to remove.
   * @returns {Promise<Item5e>}  This item with the changes applied.
   */
  async deleteActivity(id) {
    const activity = this.system.activities?.get(id);
    if ( !activity ) return this;
    await Promise.allSettled(activity.constructor._apps.get(activity.uuid)?.map(a => a.close()) ?? []);
    return this.update({ [`system.activities.-=${id}`]: null });
  }

  /* -------------------------------------------- */

  /**
   * Create a new advancement of the specified type.
   * @param {string} type                          Type of advancement to create.
   * @param {object} [data]                        Data to use when creating the advancement.
   * @param {object} [options]
   * @param {boolean} [options.showConfig=true]    Should the new advancement's configuration application be shown?
   * @param {boolean} [options.source=false]       Should a source-only update be performed?
   * @returns {Promise<AdvancementConfig>|Item5e}  Promise for advancement config for new advancement if local
   *                                               is `false`, or item with newly added advancement.
   */
  createAdvancement(type, data={}, { showConfig=true, source=false }={}) {
    if ( !this.system.advancement ) return this;

    const config = CONFIG.DND5E.advancementTypes[type];
    if ( !config ) throw new Error(`${type} not found in CONFIG.DND5E.advancementTypes`);
    const cls = config.documentClass;

    if ( !config.validItemTypes.has(this.type) || !cls.availableForItem(this) ) {
      throw new Error(`${type} advancement cannot be added to ${this.name}`);
    }

    const createData = foundry.utils.deepClone(data);
    const advancement = new cls(data, {parent: this});
    if ( advancement._preCreate(createData) === false ) return;

    const advancementCollection = this.toObject().system.advancement;
    advancementCollection.push(advancement.toObject());
    if ( source ) return this.updateSource({"system.advancement": advancementCollection});
    return this.update({"system.advancement": advancementCollection}).then(() => {
      if ( !showConfig ) return this;
      const config = new cls.metadata.apps.config(this.advancement.byId[advancement.id]);
      return config.render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Update an advancement belonging to this item.
   * @param {string} id                       ID of the advancement to update.
   * @param {object} updates                  Updates to apply to this advancement.
   * @param {object} [options={}]
   * @param {boolean} [options.source=false]  Should a source-only update be performed?
   * @returns {Promise<Item5e>|Item5e}        This item with the changes applied, promised if source is `false`.
   */
  updateAdvancement(id, updates, { source=false }={}) {
    if ( !this.system.advancement ) return this;
    const idx = this.system.advancement.findIndex(a => a._id === id);
    if ( idx === -1 ) throw new Error(`Advancement of ID ${id} could not be found to update`);

    const advancement = this.advancement.byId[id];
    if ( source ) {
      advancement.updateSource(updates);
      advancement.render();
      return this;
    }

    const advancementCollection = this.toObject().system.advancement;
    const clone = new advancement.constructor(advancementCollection[idx], { parent: advancement.parent });
    clone.updateSource(updates);
    advancementCollection[idx] = clone.toObject();
    return this.update({"system.advancement": advancementCollection}).then(r => {
      advancement.render(false, { height: "auto" });
      return r;
    });
  }

  /* -------------------------------------------- */

  /**
   * Remove an advancement from this item.
   * @param {string} id                       ID of the advancement to remove.
   * @param {object} [options={}]
   * @param {boolean} [options.source=false]  Should a source-only update be performed?
   * @returns {Promise<Item5e>|Item5e}        This item with the changes applied.
   */
  deleteAdvancement(id, { source=false }={}) {
    if ( !this.system.advancement ) return this;

    const advancementCollection = this.toObject().system.advancement.filter(a => a._id !== id);
    if ( source ) return this.updateSource({"system.advancement": advancementCollection});
    return this.update({"system.advancement": advancementCollection});
  }

  /* -------------------------------------------- */

  /**
   * Duplicate an advancement, resetting its value to default and giving it a new ID.
   * @param {string} id                             ID of the advancement to duplicate.
   * @param {object} [options]
   * @param {boolean} [options.showConfig=true]     Should the new advancement's configuration application be shown?
   * @param {boolean} [options.source=false]        Should a source-only update be performed?
   * @returns {Promise<AdvancementConfig>|Item5e}   Promise for advancement config for duplicate advancement if source
   *                                                is `false`, or item with newly duplicated advancement.
   */
  duplicateAdvancement(id, options) {
    const original = this.advancement.byId[id];
    if ( !original ) return this;
    const duplicate = original.toObject();
    delete duplicate._id;
    if ( original.constructor.metadata.dataModels?.value ) {
      duplicate.value = (new original.constructor.metadata.dataModels.value()).toObject();
    } else {
      duplicate.value = original.constructor.metadata.defaults?.value ?? {};
    }
    return this.createAdvancement(original.constructor.typeName, duplicate, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getEmbeddedDocument(embeddedName, id, options) {
    let doc;
    switch ( embeddedName ) {
      case "Activity": doc = this.system.activities?.get(id); break;
      case "Advancement": doc = this.advancement.byId[id]; break;
      default: return super.getEmbeddedDocument(embeddedName, id, options);
    }
    if ( options?.strict && (advancement === undefined) ) {
      throw new Error(`The key ${id} does not exist in the ${embeddedName} Collection`);
    }
    return doc;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;

    // Create class identifier based on name
    if ( ["class", "subclass"].includes(this.type) && !this.system.identifier ) {
      await this.updateSource({ "system.identifier": data.name.slugify({strict: true}) });
    }

    if ( !this.isEmbedded || (this.parent.type === "vehicle") ) return;
    const isNPC = this.parent.type === "npc";
    let updates;
    switch (data.type) {
      case "equipment":
        updates = this._onCreateOwnedEquipment(data, isNPC);
        break;
      case "spell":
        updates = this._onCreateOwnedSpell(data, isNPC);
        break;
      case "weapon":
        updates = this._onCreateOwnedWeapon(data, isNPC);
        break;
      case "feat":
        updates = this._onCreateOwnedFeature(data, isNPC);
        break;
    }
    if ( updates ) return this.updateSource(updates);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preUpdate(changed, options, user) {
    if ( (await super._preUpdate(changed, options, user)) === false ) return false;

    if ( foundry.utils.hasProperty(changed, "system.container") ) {
      options.formerContainer = (await this.container)?.uuid;
    }

    if ( (this.type !== "class") || !("levels" in (changed.system || {})) ) return;

    // Check to make sure the updated class level isn't below zero
    if ( changed.system.levels <= 0 ) {
      ui.notifications.warn("DND5E.MaxClassLevelMinimumWarn", {localize: true});
      changed.system.levels = 1;
    }

    // Check to make sure the updated class level doesn't exceed level cap
    if ( changed.system.levels > CONFIG.DND5E.maxLevel ) {
      ui.notifications.warn(game.i18n.format("DND5E.MaxClassLevelExceededWarn", {max: CONFIG.DND5E.maxLevel}));
      changed.system.levels = CONFIG.DND5E.maxLevel;
    }
    if ( !this.isEmbedded || (this.parent.type !== "character") ) return;

    // Check to ensure the updated character doesn't exceed level cap
    const newCharacterLevel = this.actor.system.details.level + (changed.system.levels - this.system.levels);
    if ( newCharacterLevel > CONFIG.DND5E.maxLevel ) {
      ui.notifications.warn(game.i18n.format("DND5E.MaxCharacterLevelExceededWarn", {max: CONFIG.DND5E.maxLevel}));
      changed.system.levels -= newCharacterLevel - CONFIG.DND5E.maxLevel;
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDelete(options, userId) {
    super._onDelete(options, userId);
    if ( userId !== game.user.id ) return;

    // Delete a container's contents when it is deleted
    const contents = await this.system.allContainedItems;
    if ( contents?.size && options.deleteContents ) {
      await Item.deleteDocuments(Array.from(contents.map(i => i.id)), { pack: this.pack, parent: this.parent });
    }

    // End concentration on any effects.
    this.parent?.endConcentration?.(this);

    // Assign a new original class
    if ( this.parent && (this.type === "class") && (this.id === this.parent.system.details.originalClass) ) {
      this.parent._assignPrimaryClass();
    }
  }

  /* -------------------------------------------- */

  /**
   * Pre-creation logic for the automatic configuration of owned equipment type Items.
   *
   * @param {object} data       Data for the newly created item.
   * @param {boolean} isNPC     Is this actor an NPC?
   * @returns {object}          Updates to apply to the item data.
   * @private
   */
  _onCreateOwnedEquipment(data, isNPC) {
    const updates = {};
    if ( foundry.utils.getProperty(data, "system.equipped") === undefined ) {
      updates["system.equipped"] = isNPC;  // NPCs automatically equip equipment
    }
    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Pre-creation logic for the automatic configuration of owned spell type Items.
   *
   * @param {object} data       Data for the newly created item.
   * @param {boolean} isNPC     Is this actor an NPC?
   * @returns {object}          Updates to apply to the item data.
   * @private
   */
  _onCreateOwnedSpell(data, isNPC) {
    const updates = {};
    if ( foundry.utils.getProperty(data, "system.preparation.prepared") === undefined ) {
      updates["system.preparation.prepared"] = isNPC; // NPCs automatically prepare spells
    }
    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Pre-creation logic for the automatic configuration of owned weapon type Items.
   * @param {object} data       Data for the newly created item.
   * @param {boolean} isNPC     Is this actor an NPC?
   * @returns {object|void}     Updates to apply to the item data.
   * @private
   */
  _onCreateOwnedWeapon(data, isNPC) {
    if ( !isNPC ) return;
    // NPCs automatically equip items.
    const updates = {};
    if ( !foundry.utils.hasProperty(data, "system.equipped") ) updates["system.equipped"] = true;
    return updates;
  }

  /**
   * Pre-creation logic for the automatic configuration of owned feature type Items.
   * @param {object} data       Data for the newly created item.
   * @param {boolean} isNPC     Is this actor an NPC?
   * @returns {object}          Updates to apply to the item data.
   * @private
   */
  _onCreateOwnedFeature(data, isNPC) {
    const updates = {};
    if ( isNPC && !foundry.utils.getProperty(data, "system.type.value") ) {
      updates["system.type.value"] = "monster"; // Set features on NPCs to be 'monster features'.
    }
    return updates;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async deleteDialog(options={}) {
    // If item has advancement, handle it separately
    if ( this.actor?.system.metadata?.supportsAdvancement && !game.settings.get("dnd5e", "disableAdvancements") ) {
      const manager = AdvancementManager.forDeletedItem(this.actor, this.id);
      if ( manager.steps.length ) {
        try {
          const shouldRemoveAdvancements = await AdvancementConfirmationDialog.forDelete(this);
          if ( shouldRemoveAdvancements ) return manager.render(true);
          return this.delete({ shouldRemoveAdvancements });
        } catch(err) {
          return;
        }
      }
    }

    // Display custom delete dialog when deleting a container with contents
    const count = await this.system.contentsCount;
    if ( count ) {
      return Dialog.confirm({
        title: `${game.i18n.format("DOCUMENT.Delete", {type: game.i18n.localize("DND5E.Container")})}: ${this.name}`,
        content: `<h4>${game.i18n.localize("AreYouSure")}</h4>
          <p>${game.i18n.format("DND5E.ContainerDeleteMessage", {count})}</p>
          <label>
            <input type="checkbox" name="deleteContents">
            ${game.i18n.localize("DND5E.ContainerDeleteContents")}
          </label>`,
        yes: html => {
          const deleteContents = html.querySelector('[name="deleteContents"]').checked;
          this.delete({ deleteContents });
        },
        options: { ...options, jQuery: false }
      });
    }

    return super.deleteDialog(options);
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Add additional system-specific compendium context menu options for Item documents.
   * @param {jQuery} html            The compendium HTML.
   * @param {object{}} entryOptions  The default array of context menu options.
   */
  static addCompendiumContextOptions(html, entryOptions) {
    const makeUuid = li => {
      const pack = li[0].closest("[data-pack]")?.dataset.pack;
      return `Compendium.${pack}.Item.${li.data("documentId")}`;
    };
    entryOptions.push({
      name: "DND5E.Scroll.CreateScroll",
      icon: '<i class="fa-solid fa-scroll"></i>',
      callback: async li => {
        const spell = await fromUuid(makeUuid(li));
        const scroll = await Item5e.createScrollFromSpell(spell);
        if ( scroll ) Item5e.create(scroll);
      },
      condition: li => {
        const item = fromUuidSync(makeUuid(li));
        return (item?.type === "spell") && game.user.hasPermission("ITEM_CREATE");
      },
      group: "system"
    });
  }

  /* -------------------------------------------- */

  /**
   * Add additional system-specific sidebar directory context menu options for Item documents.
   * @param {jQuery} html            The sidebar HTML.
   * @param {object[]} entryOptions  The default array of context menu options.
   */
  static addDirectoryContextOptions(html, entryOptions) {
    entryOptions.push({
      name: "DND5E.Scroll.CreateScroll",
      icon: '<i class="fa-solid fa-scroll"></i>',
      callback: async li => {
        const spell = game.items.get(li.data("documentId"));
        const scroll = await Item5e.createScrollFromSpell(spell);
        if ( scroll ) Item5e.create(scroll);
      },
      condition: li => {
        const item = game.items.get(li.data("documentId"));
        return (item.type === "spell") && game.user.hasPermission("ITEM_CREATE");
      },
      group: "system"
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare creation data for the provided items and any items contained within them. The data created by this method
   * can be passed to `createDocuments` with `keepId` always set to true to maintain links to container contents.
   * @param {Item5e[]} items                     Items to create.
   * @param {object} [context={}]                Context for the item's creation.
   * @param {Item5e} [context.container]         Container in which to create the item.
   * @param {boolean} [context.keepId=false]     Should IDs be maintained?
   * @param {Function} [context.transformAll]    Method called on provided items and their contents.
   * @param {Function} [context.transformFirst]  Method called only on provided items.
   * @returns {Promise<object[]>}                Data for items to be created.
   */
  static async createWithContents(items, { container, keepId=false, transformAll, transformFirst }={}) {
    let depth = 0;
    if ( container ) {
      depth = 1 + (await container.system.allContainers()).length;
      if ( depth > PhysicalItemTemplate.MAX_DEPTH ) {
        ui.notifications.warn(game.i18n.format("DND5E.ContainerMaxDepth", { depth: PhysicalItemTemplate.MAX_DEPTH }));
        return;
      }
    }

    const createItemData = async (item, containerId, depth) => {
      let newItemData = transformAll ? await transformAll(item) : item;
      if ( transformFirst && (depth === 0) ) newItemData = await transformFirst(newItemData);
      if ( !newItemData ) return;
      if ( newItemData instanceof Item ) newItemData = newItemData.toObject();
      foundry.utils.mergeObject(newItemData, {"system.container": containerId} );
      if ( !keepId ) newItemData._id = foundry.utils.randomID();

      created.push(newItemData);

      const contents = await item.system.contents;
      if ( contents && (depth < PhysicalItemTemplate.MAX_DEPTH) ) {
        for ( const doc of contents ) await createItemData(doc, newItemData._id, depth + 1);
      }
    };

    const created = [];
    for ( const item of items ) await createItemData(item, container?.id, depth);
    return created;
  }

  /* -------------------------------------------- */

  /**
   * Configuration options for spell scroll creation.
   *
   * @typedef {object} SpellScrollConfiguration
   * @property {boolean} [dialog=true]                           Present scroll creation dialog?
   * @property {"full"|"reference"|"none"} [explanation="full"]  Length of spell scroll rules text to include.
   * @property {number} [level]                                  Level at which the spell should be cast.
   * @property {Partial<SpellScrollValues>} [values]             Spell scroll DC and attack bonus.
   */

  /**
   * Create a consumable spell scroll Item from a spell Item.
   * @param {Item5e|object} spell                   The spell or item data to be made into a scroll.
   * @param {object} [options]                      Additional options that modify the created scroll.
   * @param {SpellScrollConfiguration} [config={}]  Configuration options for scroll creation.
   * @returns {Promise<Item5e|void>}                The created scroll consumable item.
   */
  static async createScrollFromSpell(spell, options={}, config={}) {
    const values = {};
    if ( (spell instanceof Item5e) && spell.isOwned && (game.settings.get("dnd5e", "rulesVersion") === "modern") ) {
      const spellcastingClass = spell.actor.spellcastingClasses?.[spell.system.sourceClass];
      if ( spellcastingClass ) {
        values.bonus = spellcastingClass.spellcasting.attack;
        values.dc = spellcastingClass.spellcasting.save;
      } else {
        values.bonus = spell.actor.system.attributes?.spellmod;
        values.dc = spell.actor.system.attributes?.spelldc;
      }
    }

    config = foundry.utils.mergeObject({
      explanation: game.user.getFlag("dnd5e", "creation.scrollExplanation") ?? "reference",
      level: spell.system.level,
      values
    }, config);

    if ( config.dialog !== false ) {
      const result = await CreateScrollDialog.create(spell, config);
      if ( !result ) return;
      foundry.utils.mergeObject(config, result);
      await game.user.setFlag("dnd5e", "creation.scrollExplanation", config.explanation);
    }

    // Get spell data
    const flags = {};
    const itemData = (spell instanceof Item5e) ? spell.toObject() : spell;
    if ( Number.isNumeric(config.level) ) {
      flags.dnd5e = { spellLevel: {
        value: config.level,
        base: spell.system.level
      } };
      itemData.system.level = config.level;
    }

    /**
     * A hook event that fires before the item data for a scroll is created.
     * @function dnd5e.preCreateScrollFromSpell
     * @memberof hookEvents
     * @param {object} itemData                  The initial item data of the spell to convert to a scroll.
     * @param {object} options                   Additional options that modify the created scroll.
     * @param {SpellScrollConfiguration} config  Configuration options for scroll creation.
     * @returns {boolean}                        Explicitly return false to prevent the scroll to be created.
     */
    if ( Hooks.call("dnd5e.preCreateScrollFromSpell", itemData, options, config) === false ) return;

    let { activities, description, level, properties, source } = itemData.system;

    // Get scroll data
    let scrollUuid;
    const id = CONFIG.DND5E.spellScrollIds[level];
    if ( foundry.data.validators.isValidId(id) ) {
      scrollUuid = game.packs.get(CONFIG.DND5E.sourcePacks.ITEMS).index.get(id).uuid;
    } else {
      scrollUuid = id;
    }
    const scrollItem = await fromUuid(scrollUuid);
    const scrollData = scrollItem.toObject();
    delete scrollData._id;
    const isConc = properties.includes("concentration");

    // Create a composite description from the scroll description and the spell details
    let desc;
    switch ( config.explanation ) {
      case "full":
        // Split the scroll description into an intro paragraph and the remaining details
        const scrollDescription = scrollData.system.description.value;
        const pdel = "</p>";
        const scrollIntroEnd = scrollDescription.indexOf(pdel);
        const scrollIntro = scrollDescription.slice(0, scrollIntroEnd + pdel.length);
        const scrollDetails = scrollDescription.slice(scrollIntroEnd + pdel.length);
        desc = [
          scrollIntro,
          "<hr>",
          `<h3>${itemData.name} (${game.i18n.format("DND5E.LevelNumber", {level})})</h3>`,
          isConc ? `<p><em>${game.i18n.localize("DND5E.Scroll.RequiresConcentration")}</em></p>` : null,
          "<hr>",
          description.value,
          "<hr>",
          `<h3>${game.i18n.localize("DND5E.Scroll.Details")}</h3>`,
          "<hr>",
          scrollDetails
        ].filterJoin("");
        break;
      case "reference":
        desc = [
          "<p><em>",
          CONFIG.DND5E.spellLevels[level] ?? level,
          " &Reference[Spell Scroll]",
          isConc ? `, ${game.i18n.localize("DND5E.Scroll.RequiresConcentration")}` : null,
          "</em></p>",
          description.value
        ].filterJoin("");
        break;
      default:
        desc = description.value;
        break;
    }

    for ( const level of Array.fromRange(itemData.system.level + 1).reverse() ) {
      const values = CONFIG.DND5E.spellScrollValues[level];
      if ( values ) {
        config.values.bonus ??= values.bonus;
        config.values.dc ??= values.dc;
        break;
      }
    }

    // Apply inferred spell activation, duration, range, and target data to activities
    for ( const activity of Object.values(activities) ) {
      for ( const key of ["activation", "duration", "range", "target"] ) {
        if ( activity[key]?.override !== false ) continue;
        activity[key].override = true;
        foundry.utils.mergeObject(activity[key], itemData.system[key]);
      }
      activity.consumption.targets.push({ type: "itemUses", target: "", value: "1" });
      if ( activity.type === "attack" ) {
        activity.attack.flat = true;
        activity.attack.bonus = values.bonus;
      } else if ( activity.type === "save" ) {
        activity.save.dc.calculation = "";
        activity.save.dc.formula = values.dc;
      }
    }

    // Create the spell scroll data
    const spellScrollData = foundry.utils.mergeObject(scrollData, {
      name: `${game.i18n.localize("DND5E.SpellScroll")}: ${itemData.name}`,
      img: itemData.img,
      effects: itemData.effects ?? [],
      flags,
      system: {
        activities, description: { value: desc.trim() }, properties, source
      }
    });
    foundry.utils.mergeObject(spellScrollData, options);
    spellScrollData.system.properties = [
      "mgc",
      ...scrollData.system.properties,
      ...properties ?? [],
      ...options.system?.properties ?? []
    ];

    /**
     * A hook event that fires after the item data for a scroll is created but before the item is returned.
     * @function dnd5e.createScrollFromSpell
     * @memberof hookEvents
     * @param {Item5e|object} spell              The spell or item data to be made into a scroll.
     * @param {object} spellScrollData           The final item data used to make the scroll.
     * @param {SpellScrollConfiguration} config  Configuration options for scroll creation.
     */
    Hooks.callAll("dnd5e.createScrollFromSpell", spell, spellScrollData, config);

    return new this(spellScrollData);
  }

  /* -------------------------------------------- */

  /**
   * Spawn a dialog for creating a new Item.
   * @param {object} [data]  Data to pre-populate the Item with.
   * @param {object} [context]
   * @param {Actor5e} [context.parent]       A parent for the Item.
   * @param {string|null} [context.pack]     A compendium pack the Item should be placed in.
   * @param {string[]|null} [context.types]  A list of types to restrict the choices to, or null for no restriction.
   * @returns {Promise<Item5e|null>}
   */
  static async createDialog(data={}, { parent=null, pack=null, types=null, ...options }={}) {
    types ??= game.documentTypes[this.documentName].filter(t => (t !== CONST.BASE_DOCUMENT_TYPE) && (t !== "backpack"));
    if ( !types.length ) return null;
    const collection = parent ? null : pack ? game.packs.get(pack) : game.collections.get(this.documentName);
    const folders = collection?._formatFolderSelectOptions() ?? [];
    const label = game.i18n.localize(this.metadata.label);
    const title = game.i18n.format("DOCUMENT.Create", { type: label });
    const name = data.name || game.i18n.format("DOCUMENT.New", { type: label });
    let type = data.type || CONFIG[this.documentName]?.defaultType;
    if ( !types.includes(type) ) type = types[0];
    const content = await renderTemplate("systems/dnd5e/templates/apps/document-create.hbs", {
      folders, name, type,
      folder: data.folder,
      hasFolders: folders.length > 0,
      types: types.reduce((arr, type) => {
        const label = CONFIG[this.documentName]?.typeLabels?.[type] ?? type;
        arr.push({
          type,
          label: game.i18n.has(label) ? game.i18n.localize(label) : type,
          icon: this.getDefaultArtwork({ type })?.img ?? "icons/svg/item-bag.svg"
        });
        return arr;
      }, []).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
    });
    return Dialog.prompt({
      title, content,
      label: title,
      render: html => {
        const app = html.closest(".app");
        const folder = app.querySelector("select");
        if ( folder ) app.querySelector(".dialog-buttons").insertAdjacentElement("afterbegin", folder);
        app.querySelectorAll(".window-header .header-button").forEach(btn => {
          const label = btn.innerText;
          const icon = btn.querySelector("i");
          btn.innerHTML = icon.outerHTML;
          btn.dataset.tooltip = label;
          btn.setAttribute("aria-label", label);
        });
        app.querySelector(".document-name").select();
      },
      callback: html => {
        const form = html.querySelector("form");
        const fd = new FormDataExtended(form);
        const createData = foundry.utils.mergeObject(data, fd.object, { inplace: false });
        if ( !createData.folder ) delete createData.folder;
        if ( !createData.name?.trim() ) createData.name = this.defaultName();
        return this.create(createData, { parent, pack, renderSheet: true });
      },
      rejectClose: false,
      options: { ...options, jQuery: false, width: 350, classes: ["dnd5e2", "create-document", "dialog"] }
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static getDefaultArtwork(itemData={}) {
    const { type } = itemData;
    const { img } = super.getDefaultArtwork(itemData);
    return { img: CONFIG.DND5E.defaultArtwork.Item[type] ?? img };
  }

  /* -------------------------------------------- */
  /*  Migrations & Deprecations                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    ActivitiesTemplate.initializeActivities(source);
    source = super.migrateData(source);
    if ( source.type === "class" ) ClassData._migrateTraitAdvancement(source);
    else if ( source.type === "container" ) ContainerData._migrateWeightlessData(source);
    else if ( source.type === "equipment" ) EquipmentData._migrateStealth(source);
    else if ( source.type === "spell" ) SpellData._migrateComponentData(source);
    return source;
  }
}
