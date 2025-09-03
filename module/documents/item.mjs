import ActivityChoiceDialog from "../applications/activity/activity-choice-dialog.mjs";
import AdvancementManager from "../applications/advancement/advancement-manager.mjs";
import AdvancementConfirmationDialog from "../applications/advancement/advancement-confirmation-dialog.mjs";
import ContextMenu5e from "../applications/context-menu.mjs";
import CreateScrollDialog from "../applications/item/create-scroll-dialog.mjs";
import ClassData from "../data/item/class.mjs";
import ContainerData from "../data/item/container.mjs";
import EquipmentData from "../data/item/equipment.mjs";
import SpellData from "../data/item/spell.mjs";
import ActivitiesTemplate from "../data/item/templates/activities.mjs";
import PhysicalItemTemplate from "../data/item/templates/physical-item.mjs";
import { staticID } from "../utils.mjs";
import Scaling from "./scaling.mjs";
import Proficiency from "./actor/proficiency.mjs";
import SelectChoices from "./actor/select-choices.mjs";
import Advancement from "./advancement/advancement.mjs";
import SystemDocumentMixin from "./mixins/document.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;

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
        if ( "inventorySection" in (CONFIG.Item.dataModels[t] ?? {}) ) p.push(t);
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
      label: game.i18n.localize("DND5E.ITEM.Category.Physical"),
      children: makeChoices(physicalTypes, chosen.has("physical"))
    };
    return new SelectChoices(choices);
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeSource(data, options={}) {
    if ( data instanceof foundry.abstract.DataModel ) data = data.toObject();

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

    if ( data.type === "spell" ) {
      return super._initializeSource(new Proxy(data, {
        set(target, prop, value, receiver) {
          if ( prop === "preparation" ) console.trace(value);
          return Reflect.set(target, prop, value, receiver);
        },

        defineProperty(target, prop, attributes) {
          if ( prop === "preparation" ) console.trace(attributes);
          return Reflect.defineProperty(target, prop, attributes);
        }
      }), options);
    }

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

  /* -------------------------------------------- */

  /**
   * Should deletion of this item be allowed? Doesn't prevent programatic deletion, but affects UI controls.
   * @type {boolean}
   */
  get canDelete() {
    return !this.flags.dnd5e?.cachedFor;
  }

  /* -------------------------------------------- */

  /**
   * Should duplication of this item be allowed? Doesn't prevent programatic duplication, but affects UI controls.
   * @type {boolean}
   */
  get canDuplicate() {
    return !this.system.metadata?.singleton && !["class", "subclass"].includes(this.type)
      && !this.flags.dnd5e?.cachedFor;
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
   * Does the Item implement an attack roll as part of its usage?
   * @type {boolean}
   * @see {@link ActionTemplate#hasAttack}
   */
  get hasAttack() {
    return this.system.hasAttack ?? false;
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
   * Does the Item implement a saving throw as part of its usage?
   * @type {boolean}
   * @see {@link ActionTemplate#hasSave}
   */
  get hasSave() {
    return this.system.hasSave ?? false;
  }

  /* -------------------------------------------- */

  /**
   * Return an item's identifier.
   * @type {string}
   */
  get identifier() {
    if ( this.system.identifier ) return this.system.identifier;
    const identifier = this.name.replaceAll(/(\w+)([\\|/])(\w+)/g, "$1-$3");
    return identifier.slugify({ strict: true });
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
   * @type {Record<string, ScaleValueType>}
   */
  get scaleValues() {
    if ( !this.advancement.byType.ScaleValue ) return {};
    const item = ["class", "subclass"].includes(this.advancementRootItem?.type) ? this.advancementRootItem : this;
    const level = item.type === "class" ? item.system.levels : item.type === "subclass" ? item.class?.system.levels
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
   * Spellcasting details for a class or subclass.
   *
   * @typedef {object} SpellcastingDescription
   * @property {string} type              Spellcasting method as defined in `CONFIG.DND5E.spellcasting`.
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
  prepareBaseData() {
    this.labels = {};
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareEmbeddedDocuments() {
    super.prepareEmbeddedDocuments();
    for ( const activity of this.system.activities ?? [] ) activity.prepareData();
    for ( const advancement of this.system.advancement ?? [] ) {
      if ( !(advancement instanceof Advancement) ) continue;
      advancement.prepareData();
    }
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
        Array.fromRange(CONFIG.DND5E.maxLevel + 1).slice(minAdvancementLevel).map(l => [l, []])
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
      if ( !("activation" in activity) ) continue;
      const activationLabels = activity.activationLabels;
      if ( activationLabels ) activations.push({
        ...activationLabels,
        concentrationDuration: activity.labels.concentrationDuration,
        ritualActivation: activity.labels.ritualActivation
      });
      if ( activity.type === "attack" ) {
        const { toHit, modifier } = activity.labels;
        attacks.push({ toHit, modifier });
      }
      if ( activity.labels?.damage?.length ) damages.push(...activity.labels.damage);
    }
    if ( activations.length ) {
      Object.assign(this.labels, activations[0]);
      delete activations[0].concentrationDuration;
      delete activations[0].ritualActivation;
    }
    if ( attacks.length ) Object.assign(this.labels, attacks[0]);
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
   * @param {boolean} [config.chooseActivity=false] Force the activity selection prompt unless the fast-forward modifier
   *                                                is held.
   * @param {ActivityDialogConfiguration} dialog    Configuration info for the usage dialog.
   * @param {ActivityMessageConfiguration} message  Configuration info for the created chat message.
   * @returns {Promise<ActivityUsageResults|ChatMessage|object|void>}  Returns the usage results for the triggered
   *                                                                   activity, or the chat message if the Item had no
   *                                                                   activities and was posted directly to chat.
   */
  async use(config={}, dialog={}, message={}) {
    if ( this.pack ) return;

    let event = config.event;
    const activities = this.system.activities?.filter(a => a.canUse);
    if ( activities?.length ) {
      const { chooseActivity, ...activityConfig } = config;
      let usageConfig = activityConfig;
      let dialogConfig = dialog;
      let messageConfig = message;
      let activity = activities[0];
      if ( ((activities.length > 1) || chooseActivity) && !event?.shiftKey ) {
        activity = await ActivityChoiceDialog.create(this);
      }
      if ( !activity ) return;
      return activity.use(usageConfig, dialogConfig, messageConfig);
    }
    if ( this.actor ) return this.displayCard(message);
  }

  /* -------------------------------------------- */

  /**
   * Display the chat card for an Item as a Chat Message
   * @param {Partial<ActivityMessageConfiguration>} [message]  Configuration info for the created chat message.
   * @returns {Promise<ChatMessage5e|object|void>}
   */
  async displayCard(message={}) {
    const context = {
      actor: this.actor,
      config: CONFIG.DND5E,
      tokenId: this.actor.token?.uuid || null,
      item: this,
      data: await this.system.getCardData(),
      isSpell: this.type === "spell"
    };

    const messageConfig = foundry.utils.mergeObject({
      create: message?.createMessage ?? true,
      data: {
        content: await foundry.applications.handlebars.renderTemplate(
          "systems/dnd5e/templates/chat/item-card.hbs", context
        ),
        flags: {
          "dnd5e.item": { id: this.id, uuid: this.uuid, type: this.type }
        },
        speaker: ChatMessage.getSpeaker({ actor: this.actor, token: this.actor.token }),
        title: this.name
      },
      rollMode: game.settings.get("core", "rollMode")
    }, message);

    // Merge in the flags from options
    if ( foundry.utils.getType(message.flags) === "Object" ) {
      foundry.utils.mergeObject(messageConfig.data.flags, message.flags);
      delete messageConfig.flags;
    }

    /**
     * A hook event that fires before an item chat card is created without using an activity.
     * @function dnd5e.preDisplayCard
     * @memberof hookEvents
     * @param {Item5e} item                           Item for which the card will be created.
     * @param {ActivityMessageConfiguration} message  Configuration for the roll message.
     * @returns {boolean}                             Return `false` to prevent the card from being displayed.
     */
    if ( Hooks.call("dnd5e.preDisplayCard", this, messageConfig) === false ) return;
    if ( Hooks.call("dnd5e.preDisplayCardV2", this, messageConfig) === false ) return;

    ChatMessage.applyRollMode(messageConfig.data, messageConfig.rollMode);
    const card = messageConfig.create === false ? messageConfig.data : await ChatMessage.create(messageConfig.data);

    /**
     * A hook event that fires after an item chat card is created.
     * @function dnd5e.displayCard
     * @memberof hookEvents
     * @param {Item5e} item                Item for which the chat card is being displayed.
     * @param {ChatMessage5e|object} card  The created ChatMessage instance or ChatMessageData depending on whether
     *                                     options.createMessage was set to `true`.
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
    const context = {};
    let { identified, unidentified, description } = this.system;

    // Rich text description
    const isIdentified = identified !== false;
    description = game.user.isGM || isIdentified ? description.value : unidentified?.description;
    context.description = await TextEditor.enrichHTML(description ?? "", {
      relativeTo: this,
      rollData: this.getRollData(),
      ...htmlOptions
    });

    // Type specific properties
    context.properties = [
      ...this.system.chatProperties ?? [],
      ...this.system.equippableItemCardProperties ?? [],
      ...Object.values(this.labels.activations?.[0] ?? {})
    ].filter(p => p);

    return context;
  }

  /* -------------------------------------------- */
  /*  Item Rolls - Attack, Damage, Saves, Checks  */
  /* -------------------------------------------- */

  /**
   * Prepare data needed to roll a tool check and then pass it off to `d20Roll`.
   * @param {D20RollConfiguration} [options]  Roll configuration options provided to the d20Roll function.
   * @returns {Promise<Roll>}                 A Promise which resolves to the created Roll instance.
   */
  async rollToolCheck(options={}) {
    if ( this.type !== "tool" ) throw new Error("Wrong item type!");
    return this.actor?.rollToolCheck({
      ability: this.system.ability,
      bonus: this.system.bonus,
      prof: this.system.prof,
      item: this,
      tool: this.system.type.baseItem,
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
   * @param {HTMLElement} html  Rendered chat message.
   */
  static chatListeners(html) {
    html.addEventListener("click", event => {
      if ( event.target.closest("[data-context-menu]") ) ContextMenu5e.triggerEvent(event);
      else if ( event.target.closest(".collapsible") ) this._onChatCardToggleContent(event);
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the visibility of chat card content when the name is clicked
   * @param {Event} event   The originating click event
   * @private
   */
  static _onChatCardToggleContent(event) {
    const header = event.target.closest(".collapsible");
    if ( !event.target.closest(".collapsible-content.card-content") ) {
      event.preventDefault();
      header.classList.toggle("collapsed");

      // Clear the height from the chat popout container so that it appropriately resizes.
      const popout = header.closest(".chat-popout");
      if ( popout ) popout.style.height = "";
    }
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
    return this.update({ "system.advancement": advancementCollection }).then(() => {
      if ( showConfig ) return this.advancement.byId[advancement.id]?.sheet?.render(true);
      return this;
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

    const isPhysical = this.system.constructor._schemaTemplates?.includes(PhysicalItemTemplate);
    if ( this.parent?.system?.isGroup && !isPhysical ) return false;

    // Create identifier based on name
    if ( this.system.hasOwnProperty("identifier") && !data.system?.identifier ) {
      this.updateSource({ "system.identifier": this.identifier });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    await this.system.onCreateActivities?.(data, options, userId);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preUpdate(changed, options, user) {
    if ( (await super._preUpdate(changed, options, user)) === false ) return false;
    await this.system.preUpdateActivities?.(changed, options, user);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    await this.system.onUpdateActivities?.(changed, options, userId);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDelete(options, userId) {
    super._onDelete(options, userId);
    await this.system.onDeleteActivities?.(options, userId);
    if ( game.user.isActiveGM ) this.effects.forEach(e => e.getDependents().forEach(e => e.delete()));
    if ( userId !== game.user.id ) return;
    this.parent?.endConcentration?.(this);
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
   * Add additional system-specific sidebar directory context menu options for Item documents.
   * @param {ItemDirectory} app      The sidebar application.
   * @param {object[]} entryOptions  The default array of context menu options.
   */
  static addDirectoryContextOptions(app, entryOptions) {
    entryOptions.push({
      name: "DND5E.Scroll.CreateScroll",
      icon: '<i class="fa-solid fa-scroll"></i>',
      callback: async li => {
        let spell = game.items.get(li.dataset.entryId);
        if ( app.collection instanceof foundry.documents.collections.CompendiumCollection ) {
          spell = await app.collection.getDocument(li.dataset.entryId);
        }
        const scroll = await Item5e.createScrollFromSpell(spell);
        if ( scroll ) Item5e.create(scroll);
      },
      condition: li => {
        let item = game.items.get(li.dataset.documentId ?? li.dataset.entryId);
        if ( app.collection instanceof foundry.documents.collections.CompendiumCollection ) {
          item = app.collection.index.get(li.dataset.entryId);
        }
        return (item.type === "spell") && game.user.hasPermission("ITEM_CREATE");
      },
      group: "system"
    });
  }

  /* -------------------------------------------- */

  /**
   * @callback ItemContentsTransformer
   * @param {Item5e|object} item        Data for the item to transform.
   * @param {object} options
   * @param {string} options.container  ID of the container to create the items.
   * @param {number} options.depth      Current depth of the item being created.
   * @returns {Item5e|object|void}
   */

  /**
   * Prepare creation data for the provided items and any items contained within them. The data created by this method
   * can be passed to `createDocuments` with `keepId` always set to true to maintain links to container contents.
   * @param {Item5e[]} items                     Items to create.
   * @param {object} [context={}]                Context for the item's creation.
   * @param {Item5e} [context.container]         Container in which to create the item.
   * @param {boolean} [context.keepId=false]     Should IDs be maintained?
   * @param {ItemContentsTransformer} [context.transformAll]    Method called on provided items and their contents.
   * @param {ItemContentsTransformer} [context.transformFirst]  Method called only on provided items.
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
      const o = { container: containerId, depth };
      let newItemData = transformAll ? await transformAll(item, o) : item;
      if ( transformFirst && (depth === 0) ) newItemData = await transformFirst(newItemData, o);
      if ( !newItemData ) return;
      if ( newItemData instanceof Item ) newItemData = game.items.fromCompendium(newItemData, {
        clearSort: false, keepId: true, clearOwnership: false
      });
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
    if ( spell.pack ) return this.createScrollFromCompendiumSpell(spell.uuid, config);

    const values = {};
    if ( (spell instanceof Item5e) && spell.isOwned && (game.settings.get("dnd5e", "rulesVersion") === "modern") ) {
      const spellcastingClass = spell.actor.spellcastingClasses?.[spell.system.sourceClass];
      if ( spellcastingClass ) {
        values.bonus = spellcastingClass.spellcasting.attack;
        values.dc = spellcastingClass.spellcasting.save;
      } else {
        values.bonus = spell.actor.system.attributes?.spell?.mod;
        values.dc = spell.actor.system.attributes?.spell?.dc;
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
    const itemData = (spell instanceof Item5e) ? spell.toObject() : spell;
    const flags = itemData.flags ?? {};
    if ( Number.isNumeric(config.level) ) {
      flags.dnd5e ??= {};
      flags.dnd5e.scaling = Math.max(0, config.level - spell.system.level);
      flags.dnd5e.spellLevel = {
        value: config.level,
        base: spell.system.level
      };
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

    let { activities, level, properties, source } = itemData.system;

    // Get scroll data
    let scrollUuid;
    const id = CONFIG.DND5E.spellScrollIds[level];
    if ( foundry.data.validators.isValidId(id) ) {
      scrollUuid = game.packs.get(CONFIG.DND5E.sourcePacks.ITEMS).index.get(id).uuid;
    } else {
      scrollUuid = id;
    }
    const scrollItem = await fromUuid(scrollUuid);
    const scrollData = game.items.fromCompendium(scrollItem);

    // Create a composite description from the scroll description and the spell details
    const desc = this._createScrollDescription(scrollItem, itemData, null, config);

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
   * Create a consumable spell scroll Item from a spell Item.
   * @param {string} uuid                           UUID of the spell to add to the scroll.
   * @param {SpellScrollConfiguration} [config={}]  Configuration options for scroll creation.
   * @returns {Promise<Item5e|void>}                The created scroll consumable item.
   */
  static async createScrollFromCompendiumSpell(uuid, config={}) {
    const spell = await fromUuid(uuid);
    if ( !spell ) return;

    const values = {};

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

    /**
     * A hook event that fires before the item data for a scroll is created for a compendium spell.
     * @function dnd5e.preCreateScrollFromCompendiumSpell
     * @memberof hookEvents
     * @param {Item5e} spell                     Spell to add to the scroll.
     * @param {SpellScrollConfiguration} config  Configuration options for scroll creation.
     * @returns {boolean}                        Explicitly return `false` to prevent the scroll to be created.
     */
    if ( Hooks.call("dnd5e.preCreateScrollFromCompendiumSpell", spell, config) === false ) return;

    // Get scroll data
    let scrollUuid;
    const id = CONFIG.DND5E.spellScrollIds[spell.system.level];
    if ( foundry.data.validators.isValidId(id) ) {
      scrollUuid = game.packs.get(CONFIG.DND5E.sourcePacks.ITEMS).index.get(id).uuid;
    } else {
      scrollUuid = id;
    }
    const scrollItem = await fromUuid(scrollUuid);
    const scrollData = game.items.fromCompendium(scrollItem);

    for ( const level of Array.fromRange(spell.system.level + 1).reverse() ) {
      const values = CONFIG.DND5E.spellScrollValues[level];
      if ( values ) {
        config.values.bonus ??= values.bonus;
        config.values.dc ??= values.dc;
        break;
      }
    }

    const activity = {
      _id: staticID("dnd5escrollspell"),
      type: "cast",
      consumption: {
        targets: [{ type: "itemUses", value: "1" }]
      },
      spell: {
        challenge: {
          attack: config.values.bonus,
          save: config.values.dc,
          override: true
        },
        level: config.level,
        uuid
      }
    };

    // Create the spell scroll data
    const spellScrollData = foundry.utils.mergeObject(scrollData, {
      name: `${game.i18n.localize("DND5E.SpellScroll")}: ${spell.name}`,
      system: {
        activities: { ...(scrollData.system.activities ?? {}), [activity._id]: activity },
        description: {
          value: this._createScrollDescription(scrollItem, spell, `<p>@Embed[${uuid} inline]</p>`, config).trim()
        }
      }
    });

    /**
     * A hook event that fires after the item data for a scroll is created but before the item is returned.
     * @function dnd5e.createScrollFromSpell
     * @memberof hookEvents
     * @param {Item5e} spell                     The spell or item data to be made into a scroll.
     * @param {object} spellScrollData           The final item data used to make the scroll.
     * @param {SpellScrollConfiguration} config  Configuration options for scroll creation.
     */
    Hooks.callAll("dnd5e.createScrollFromSpell", spell, spellScrollData, config);

    return new this(spellScrollData);
  }

  /* -------------------------------------------- */

  /**
   * Create the description for a spell scroll.
   * @param {Item5e} scroll                         Base spell scroll.
   * @param {Item5e|object} spell                   Spell being added to the scroll.
   * @param {string} [spellDescription]             Description from the spell being added.
   * @param {SpellScrollConfiguration} [config={}]  Configuration options for scroll creation.
   * @returns {string}
   * @protected
   */
  static _createScrollDescription(scroll, spell, spellDescription, config={}) {
    spellDescription ??= spell.system.description.value;
    const isConc = spell.system.properties[spell instanceof Item5e ? "has" : "includes"]("concentration");
    const level = spell.system.level;
    switch ( config.explanation ) {
      case "full":
        // Split the scroll description into an intro paragraph and the remaining details
        const scrollDescription = scroll.system.description.value;
        const pdel = "</p>";
        const scrollIntroEnd = scrollDescription.indexOf(pdel);
        const scrollIntro = scrollDescription.slice(0, scrollIntroEnd + pdel.length);
        const scrollDetails = scrollDescription.slice(scrollIntroEnd + pdel.length);
        return [
          scrollIntro,
          `<h3>${spell.name} (${game.i18n.format("DND5E.LevelNumber", { level })})</h3>`,
          isConc ? `<p><em>${game.i18n.localize("DND5E.Scroll.RequiresConcentration")}</em></p>` : null,
          spellDescription,
          `<h3>${game.i18n.localize("DND5E.Scroll.Details")}</h3>`,
          scrollDetails
        ].filterJoin("");
      case "reference":
        return [
          "<p><em>",
          CONFIG.DND5E.spellLevels[level] ?? level,
          " &Reference[Spell Scroll]",
          isConc ? `, ${game.i18n.localize("DND5E.Scroll.RequiresConcentration")}` : null,
          "</em></p>",
          spellDescription
        ].filterJoin("");
    }
    return spellDescription;
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
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/dnd5e/templates/apps/document-create.hbs",
      {
        folders, name, type,
        folder: data.folder,
        hasFolders: folders.length > 0,
        types: types.map(type => {
          const label = CONFIG[this.documentName]?.typeLabels?.[type] ?? type;
          const data = {
            type,
            label: game.i18n.has(label) ? game.i18n.localize(label) : type,
            icon: this.getDefaultArtwork({ type })?.img ?? "icons/svg/item-bag.svg"
          };
          data.svg = data.icon?.endsWith(".svg");
          return data;
        }).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
      }
    );
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
        const fd = new foundry.applications.ux.FormDataExtended(form);
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
    source = super.migrateData(source);
    ActivitiesTemplate.initializeActivities(source);
    if ( source.type === "class" ) ClassData._migrateTraitAdvancement(source);
    else if ( source.type === "container" ) ContainerData._migrateWeightlessData(source);
    else if ( source.type === "equipment" ) EquipmentData._migrateStealth(source);
    else if ( source.type === "spell" ) SpellData._migrateComponentData(source);
    return source;
  }
}
