import {d10Roll, damageRoll} from "../dice/dice.mjs";
import simplifyRollFormula from "../dice/simplify-roll-formula.mjs";
import AbilityUseDialog from "../applications/item/ability-use-dialog.mjs";

/**
 * Override and extend the basic Item implementation.
 */
export default class Item5e extends Item {

  /**
   * Caches an item linked to this one, such as a subclass associated with a class.
   * @type {Item5e}
   * @private
   */
  _classLink;

  /* -------------------------------------------- */
  /*  Item Properties                             */
  /* -------------------------------------------- */

  /**
   * Which stat modifier is used by this item?
   * @type {string|null}
   */
  get statMod() {

    // Case 1 - defined directly by the item
    if ( this.system.stats ) return this.system.stats;

    // Case 2 - inferred from a parent actor
    if ( this.actor ) {

      // If a specific attack type is defined
      if ( this.hasAttack ) return {
        attack: "physO",
        spell: "menO"
      }[this.system.actionType];
    }

    // Case 3 - unknown
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Return an item's identifier.
   * @type {string}
   */
  get identifier() {
    return this.system.identifier || this.name.slugify({strict: true});
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement an attack roll as part of its usage?
   * @type {boolean}
   */
   get hasAttack() {
    return ["attack", "spell"].includes(this.system.actionType);
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a damage roll as part of its usage?
   * @type {boolean}
   */
  get hasDamage() {
    return this.isHealing;
  }

  /* -------------------------------------------- */

  /**
   * Does the item provide an amount of healing instead of conventional damage?
   * @type {boolean}
   */
  get isHealing() {
    return (this.system.actionType === "heal");
  }

  /* --------------------------------------------- */

  /**
   * Does the Item implement an ability check as part of its usage?
   * @type {boolean}
   */
  get hasAbilityCheck() {
    return (this.system.actionType === "abil") && this.system.ability;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item have a target?
   * @type {boolean}
   */
  get hasTarget() {
    const target = this.system.target;
    return target && !["none", ""].includes(target.type);
  }

  /* -------------------------------------------- */

  /**
   * Does the Item have an area of effect target?
   * @type {boolean}
   */
  get hasAreaTarget() {
    const target = this.system.target;
    return target && (target.type in CONFIG.SHAPER.areaTargetTypes);
  }

  /* -------------------------------------------- */

  /**
   * Is this Item limited in its ability to be used by charges or by recharge?
   * @type {boolean}
   */
  get hasLimitedUses() {
    let recharge = this.system.recharge || {};
    let uses = this.system.uses || {};
    return !!recharge.value || (uses.per && (uses.max > 0));
  }

  /* -------------------------------------------- */



  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /*
   * TODO: Look at these and modify them
  */
 
  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.labels = {};

    // Clear out linked item cache
    this._classLink = undefined;

    // Specialized preparation per Item type
    switch ( this.type ) {
      case "feat":
        this._prepareFeat(); break;
    }

    // Activated Items
    this._prepareActivation();
    this._prepareAction();

    // Un-owned items can have their final preparation done here, otherwise this needs to happen in the owning Actor
    if ( !this.isOwned ) this.prepareFinalAttributes();
  }

  /* -------------------------------------------- */

  /**
   * Prepare derived data for a feat-type item and define labels.
   * @protected
   */
  _prepareFeat() {
    const act = this.system.activation;
    const types = CONFIG.SHAPER.abilityActivationTypes;
    if ( act?.type ) {
      this.labels.featType = game.i18n.localize(this.system.damage.length ? "SHAPER.Attack" : "SHAPER.Action");
    }
    else this.labels.featType = game.i18n.localize("SHAPER.Passive");
  }


  /* -------------------------------------------- */

  /**
   * Prepare derived data for activated items and define labels.
   * @protected
   */
  _prepareActivation() {
    if ( !("activation" in this.system) ) return;
    const C = CONFIG.SHAPER;

    // Ability Activation Label
    const act = this.system.activation ?? {};
    this.labels.activation = [act.cost, C.abilityActivationTypes[act.type]].filterJoin(" ");

    // Target Label
    let tgt = this.system.target ?? {};
    if ( ["none", "self"].includes(tgt.units) ) tgt.value = null;
    if ( ["none", "self"].includes(tgt.type) ) {
      tgt.value = null;
      tgt.units = null;
    }
    this.labels.target = [tgt.value, C.distanceUnits[tgt.units], C.targetTypes[tgt.type]].filterJoin(" ");

    // Range Label
    let rng = this.system.range ?? {};
    if ( ["none", "self"].includes(rng.units) ) {
      rng.value = null;
      rng.long = null;
    }
    this.labels.range = [rng.value, rng.long ? `/ ${rng.long}` : null, C.distanceUnits[rng.units]].filterJoin(" ");

    // Duration Label
    let dur = this.system.duration ?? {};
    if ( ["inst", "perm"].includes(dur.units) ) dur.value = null;
    this.labels.duration = [dur.value, C.timePeriods[dur.units]].filterJoin(" ");

    // Recharge Label
    let chg = this.system.recharge ?? {};
    const chgSuffix = `${chg.value}${parseInt(chg.value) < 6 ? "+" : ""}`;
    this.labels.recharge = `${game.i18n.localize("SHAPER.Recharge")} [${chgSuffix}]`;
  }

  /* -------------------------------------------- */

  /**
   * Prepare derived data and labels for items which have an action which deals damage.
   * @protected
   */
  _prepareAction() {
    if ( !("actionType" in this.system) ) return;
    let dmg = this.system.damage || {};
    if ( dmg.parts ) {
      const types = CONFIG.SHAPER.damageTypes;
      this.labels.damage = dmg.parts.map(d => d[0]).join(" + ").replace(/\+ -/g, "- ");
      this.labels.damageTypes = dmg.parts.map(d => types[d[1]]).join(", ");
    }
  }



  /* -------------------------------------------- */

  /**
   * Compute item attributes which might depend on prepared actor data. If this item is embedded this method will
   * be called after the actor's data is prepared.
   * Otherwise, it will be called at the end of `Item5e#prepareDerivedData`.
   */
  prepareFinalAttributes() {


    // Action usage
    if ( "actionType" in this.system ) {
      this.labels.abilityCheck = game.i18n.format("SHAPER.AbilityPromptTitle", {
        ability: CONFIG.SHAPER.abilities[this.system.ability]
      });

      // To Hit
      this.getAttackToHit();

      // Limited Uses
      this.prepareMaxUses();

      // Damage Label
      this.getDerivedDamageLabel();
    }
  }

  /* -------------------------------------------- */

  /**
   * Populate a label with the compiled and simplified damage formula based on owned item
   * actor data. This is only used for display purposes and is not related to `Item5e#rollDamage`.
   * @returns {{damageType: string, formula: string, label: string}[]}
   */
  getDerivedDamageLabel() {
    if ( !this.hasDamage || !this.isOwned ) return [];
    const rollData = this.getRollData();
    const damageLabels = { ...CONFIG.SHAPER.damageTypes, ...CONFIG.SHAPER.healingTypes };
    const derivedDamage = this.system.damage?.parts?.map(damagePart => {
      let formula;
      try {
        const roll = new Roll(damagePart[0], rollData);
        formula = simplifyRollFormula(roll.formula, { preserveFlavor: true });
      }
      catch(err) {
        console.warn(`Unable to simplify formula for ${this.name}: ${err}`);
      }
      const damageType = damagePart[1];
      return { formula, damageType, label: `${formula} ${damageLabels[damageType] ?? ""}` };
    });
    return this.labels.derivedDamage = derivedDamage;
  }


  /* -------------------------------------------- */

  /**
   * Update a label to the Item detailing its total to hit bonus from the following sources:
   * - item document's innate attack bonus
   * - item's actor's global bonuses to the given item type
   * - item's ammunition if applicable
   * @returns {{rollData: object, parts: string[]}|null}  Data used in the item's Attack roll.
   */
  getAttackToHit() {
    if ( !this.hasAttack ) return null;
    const rollData = this.getRollData();
    const parts = [];

    // Include the item's innate attack bonus as the initial value and label
    const ab = this.system.attackBonus;
    if ( ab ) {
      parts.push(ab);
      this.labels.toHit = !/^[+-]/.test(ab) ? `+ ${ab}` : ab;
    }

    // Take no further action for un-owned items
    if ( !this.isOwned ) return {rollData, parts};

    // Ability score modifier
    parts.push("@mod");


    // Actor-level global bonus to attack rolls
    const actorBonus = this.actor.system.bonuses?.[this.system.actionType] || {};
    if ( actorBonus.attack ) parts.push(actorBonus.attack);


    // Condense the resulting attack bonus formula into a simplified label
    const roll = new Roll(parts.join("+"), rollData);
    const formula = simplifyRollFormula(roll.formula) || "0";
    this.labels.toHit = !/^[+-]/.test(formula) ? `+ ${formula}` : formula;
    return {rollData, parts};
  }

  /* -------------------------------------------- */

  /**
   * Retrieve an item's critical hit threshold. Uses the smallest value from among the following sources:
   * - item document
   * - item document's actor (if it has one)
   * - the constant '20'
   * @returns {number|null}  The minimum value that must be rolled to be considered a critical hit.
   */
  getCriticalThreshold() {
    const actorFlags = this.actor.flags.shaper || {};
    if ( !this.hasAttack ) return null;
    let actorThreshold = null;
    if ( this.type === "weapon" ) actorThreshold = actorFlags.weaponCriticalThreshold;
    return Math.min(this.system.critical?.threshold ?? 20, actorThreshold ?? 20);
  }

  /* -------------------------------------------- */

  /**
   * Populates the max uses of an item.
   * If the item is an owned item and the `max` is not numeric, calculate based on actor data.
   */
  prepareMaxUses() {
    const uses = this.system.uses;
    if ( !uses?.max ) return;
    let max = uses.max;
    if ( this.isOwned && !Number.isNumeric(max) ) {
      const property = game.i18n.localize("SHAPER.UsesMax");
      try {
        const rollData = this.actor.getRollData({ deterministic: true });
        max = Roll.safeEval(this.replaceFormulaData(max, rollData, { property }));
      } catch(e) {
        const message = game.i18n.format("SHAPER.FormulaMalformedError", { property, name: this.name });
        this.actor._preparationWarnings.push({ message, link: this.uuid, type: "error" });
        console.error(message, e);
        return;
      }
    }
    uses.max = Number(max);
  }

  /* -------------------------------------------- */

  /**
   * Replace referenced data attributes in the roll formula with values from the provided data.
   * If the attribute is not found in the provided data, display a warning on the actor.
   * @param {string} formula           The original formula within which to replace.
   * @param {object} data              The data object which provides replacements.
   * @param {object} options
   * @param {string} options.property  Name of the property to which this formula belongs.
   * @returns {string}                 Formula with replaced data.
   */
  replaceFormulaData(formula, data, { property }) {
    const dataRgx = new RegExp(/@([a-z.0-9_-]+)/gi);
    const missingReferences = new Set();
    formula = formula.replace(dataRgx, (match, term) => {
      let value = foundry.utils.getProperty(data, term);
      if ( value == null ) {
        missingReferences.add(match);
        return "0";
      }
      return String(value).trim();
    });
    if ( (missingReferences.size > 0) && this.actor ) {
      const listFormatter = new Intl.ListFormat(game.i18n.lang, { style: "long", type: "conjunction" });
      const message = game.i18n.format("SHAPER.FormulaMissingReferenceWarn", {
        property, name: this.name, references: listFormatter.format(missingReferences)
      });
      this.actor._preparationWarnings.push({ message, link: this.uuid, type: "warning" });
    }
    return formula;
  }

  /* -------------------------------------------- */

  /**
   * Configuration data for an item usage being prepared.
   *
   * @typedef {object} ItemUseConfiguration
   * @property {boolean} createMeasuredTemplate  Trigger a template creation
   * @property {boolean} consumeQuantity         Should the item's quantity be consumed?
   * @property {boolean} consumeRecharge         Should a recharge be consumed?
   * @property {boolean} consumeResource         Should a linked (non-ammo) resource be consumed?
   * @property {boolean} consumeUsage            Should limited uses be consumed?
   * @property {boolean} needsConfiguration      Is user-configuration needed?
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
   */


  /**
   * Trigger an item usage, optionally creating a chat message with followup actions.
   * @param {ItemUseConfiguration} [config]      Initial configuration data for the usage.
   * @param {ItemUseOptions} [options]           Options used for configuring item usage.
   * @returns {Promise<ChatMessage|object|void>} Chat message if options.createMessage is true, message data if it is
   *                                             false, and nothing if the roll wasn't performed.
   */
  async use(config={}, options={}) {
    let item = this;
    const is = item.system;
    const as = item.actor.system;

    // Ensure the options object is ready
    options = foundry.utils.mergeObject({
      configureDialog: true,
      createMessage: true,
      flags: {}
    }, options);

    // Reference aspects of the item data necessary for usage
    const resource = is.consume || {};        // Resource consumption
    const isSpell = item.type === "spell";    // Does the item require a spell slot?

    // Define follow-up actions resulting from the item usage
    config = foundry.utils.mergeObject({
      createMeasuredTemplate: item.hasAreaTarget,
      consumeQuantity: is.uses?.autoDestroy ?? false,
      consumeRecharge: !!is.recharge?.value,
      consumeResource: !!resource.target && !item.hasAttack,
      consumeUpkeep: !!is.upkeep?.value,
      consumeUsage: !!is.uses?.per
    }, config);

    // Display a configuration dialog to customize the usage
    if ( config.needsConfiguration === undefined ) config.needsConfiguration = config.createMeasuredTemplate
      || config.consumeRecharge || config.consumeResource || config.consumeUpkeep || config.consumeUsage;

    /**
     * A hook event that fires before an item usage is configured.
     * @function shaper.preUseItem
     * @memberof hookEvents
     * @param {Item5e} item                  Item being used.
     * @param {ItemUseConfiguration} config  Configuration data for the item usage being prepared.
     * @param {ItemUseOptions} options       Additional options used for configuring item usage.
     * @returns {boolean}                    Explicitly return `false` to prevent item from being used.
     */
    if ( Hooks.call("shaper.preUseItem", item, config, options) === false ) return;

    // Display configuration dialog
    if ( (options.configureDialog !== false) && config.needsConfiguration ) {
      const configuration = await AbilityUseDialog.create(item);
      if ( !configuration ) return;
      foundry.utils.mergeObject(config, configuration);
    }

    /**
     * A hook event that fires before an item's resource consumption has been calculated.
     * @function shaper.preItemUsageConsumption
     * @memberof hookEvents
     * @param {Item5e} item                  Item being used.
     * @param {ItemUseConfiguration} config  Configuration data for the item usage being prepared.
     * @param {ItemUseOptions} options       Additional options used for configuring item usage.
     * @returns {boolean}                    Explicitly return `false` to prevent item from being used.
     */
    if ( Hooks.call("shaper.preItemUsageConsumption", item, config, options) === false ) return;

    // Determine whether the item can be used by testing for resource consumption
    const usage = item._getUsageUpdates(config);
    if ( !usage ) return;

    /**
     * A hook event that fires after an item's resource consumption has been calculated but before any
     * changes have been made.
     * @function shaper.itemUsageConsumption
     * @memberof hookEvents
     * @param {Item5e} item                     Item being used.
     * @param {ItemUseConfiguration} config     Configuration data for the item usage being prepared.
     * @param {ItemUseOptions} options          Additional options used for configuring item usage.
     * @param {object} usage
     * @param {object} usage.actorUpdates       Updates that will be applied to the actor.
     * @param {object} usage.itemUpdates        Updates that will be applied to the item being used.
     * @param {object[]} usage.resourceUpdates  Updates that will be applied to other items on the actor.
     * @returns {boolean}                       Explicitly return `false` to prevent item from being used.
     */
    if ( Hooks.call("shaper.itemUsageConsumption", item, config, options, usage) === false ) return;

    // Commit pending data updates
    const { actorUpdates, itemUpdates, resourceUpdates } = usage;
    if ( !foundry.utils.isEmpty(itemUpdates) ) await item.update(itemUpdates);
    if ( config.consumeQuantity && (item.system.quantity === 0) ) await item.delete();
    if ( !foundry.utils.isEmpty(actorUpdates) ) await this.actor.update(actorUpdates);
    if ( resourceUpdates.length ) await this.actor.updateEmbeddedDocuments("Item", resourceUpdates);

    // Prepare card data & display it if options.createMessage is true
    const cardData = await item.displayCard(options);

    // Initiate measured template creation
    let templates;
    if ( config.createMeasuredTemplate ) {
      try {
        templates = await (shaper.canvas.AbilityTemplate.fromItem(item))?.drawPreview();
      } catch(err) {}
    }

    /**
     * A hook event that fires when an item is used, after the measured template has been created if one is needed.
     * @function shaper.useItem
     * @memberof hookEvents
     * @param {Item5e} item                                Item being used.
     * @param {ItemUseConfiguration} config                Configuration data for the roll.
     * @param {ItemUseOptions} options                     Additional options for configuring item usage.
     * @param {MeasuredTemplateDocument[]|null} templates  The measured templates if they were created.
     */
    Hooks.callAll("shaper.useItem", item, config, options, templates ?? null);

    return cardData;
  }

  /* -------------------------------------------- */

  /**
   * Verify that the consumed resources used by an Item are available and prepare the updates that should
   * be performed. If required resources are not available, display an error and return false.
   * @param {ItemUseConfiguration} config  Configuration data for an item usage being prepared.
   * @returns {object|boolean}             A set of data changes to apply when the item is used, or false.
   * @protected
   */
  _getUsageUpdates({
    consumeQuantity, consumeRecharge, consumeResource, consumeUpkeep, consumeUsage}) {
    const actorUpdates = {};
    const itemUpdates = {};
    const resourceUpdates = [];

    // Consume Recharge
    if ( consumeRecharge ) {
      const recharge = this.system.recharge || {};
      if ( recharge.charged === false ) {
        ui.notifications.warn(game.i18n.format("SHAPER.ItemNoUses", {name: this.name}));
        return false;
      }
      itemUpdates["system.recharge.charged"] = false;
    }

    // Consume Limited Resource
    if ( consumeResource ) {
      const canConsume = this._handleConsumeResource(itemUpdates, actorUpdates, resourceUpdates);
      if ( canConsume === false ) return false;
    }

    // Consume Upkeep Requirement TODO: Placeholder implementation
    if ( consumeUpkeep ) {
      const canConsume = this._handleConsumeResource(itemUpdates, actorUpdates, resourceUpdates);
      if ( canConsume === false ) return false;
    }
    // Consume Limited Usage
    if ( consumeUsage ) {
      const uses = this.system.uses || {};
      const available = Number(uses.value ?? 0);
      let used = false;
      const remaining = Math.max(available - 1, 0);
      if ( available >= 1 ) {
        used = true;
        itemUpdates["system.uses.value"] = remaining;
      }

      // Reduce quantity if not reducing usages or if usages hit zero, and we are set to consumeQuantity
      if ( consumeQuantity && (!used || (remaining === 0)) ) {
        const q = Number(this.system.quantity ?? 1);
        if ( q >= 1 ) {
          used = true;
          itemUpdates["system.quantity"] = Math.max(q - 1, 0);
          itemUpdates["system.uses.value"] = uses.max ?? 1;
        }
      }

      // If the item was not used, return a warning
      if ( !used ) {
        ui.notifications.warn(game.i18n.format("SHAPER.ItemNoUses", {name: this.name}));
        return false;
      }
    }

    // Return the configured usage
    return {itemUpdates, actorUpdates, resourceUpdates};
  }

  /* -------------------------------------------- */

  /**
   * Handle update actions required when consuming an external resource
   * @param {object} itemUpdates        An object of data updates applied to this item
   * @param {object} actorUpdates       An object of data updates applied to the item owner (Actor)
   * @param {object[]} resourceUpdates  An array of updates to apply to other items owned by the actor
   * @returns {boolean|void}            Return false to block further progress, or return nothing to continue
   * @protected
   */
  _handleConsumeResource(itemUpdates, actorUpdates, resourceUpdates) {
    const consume = this.system.consume || {};
    if ( !consume.type ) return;
    
    // No consumed target
    const typeLabel = CONFIG.SHAPER.abilityConsumptionTypes[consume.type];
    if ( !consume.target ) {
      ui.notifications.warn(game.i18n.format("SHAPER.ConsumeWarningNoResource", {name: this.name, type: typeLabel}));
      return false;
    }

    // Identify the consumed resource and its current quantity
    let resource = null;
    let amount = Number(consume.amount ?? 1);
    let quantity = 0;
    switch ( consume.type ) {
      case "attribute":
        resource = foundry.utils.getProperty(this.actor.system, consume.target);
        console.log(resource);
        quantity = resource || 0;
        break;
      case "charges":
        resource = this.actor.items.get(consume.target);
        if ( !resource ) break;
        const uses = resource.system.uses;
        if ( uses.per && uses.max ) quantity = uses.value;
        else if ( resource.system.recharge?.value ) {
          quantity = resource.system.recharge.charged ? 1 : 0;
          amount = 1;
        }
        break;
    }

    // Verify that a consumed resource is available
    if ( resource === undefined ) {
      ui.notifications.warn(game.i18n.format("SHAPER.ConsumeWarningNoSource", {name: this.name, type: typeLabel}));
      return false;
    }

    // Verify that the required quantity is available
    let remaining = quantity - amount;
    if ( remaining < 0 ) {
      ui.notifications.warn(game.i18n.format("SHAPER.ConsumeWarningNoQuantity", {name: this.name, type: typeLabel}));
      return false;
    }

    // Define updates to provided data objects
    switch ( consume.type ) {
      case "attribute":
        actorUpdates[`system.${consume.target}`] = remaining;
        break;
      case "ammo":
      case "material":
        resourceUpdates.push({_id: consume.target, "system.quantity": remaining});
        break;
      case "charges":
        const uses = resource.system.uses || {};
        const recharge = resource.system.recharge || {};
        const update = {_id: consume.target};
        if ( uses.per && uses.max ) update["system.uses.value"] = remaining;
        else if ( recharge.value ) update["system.recharge.charged"] = false;
        resourceUpdates.push(update);
        break;
    }
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
    const templateData = {
      actor: this.actor.toObject(false),
      tokenId: token?.uuid || null,
      item: this.toObject(false),
      data: await this.getChatData(),
      labels: this.labels,
      hasAttack: this.hasAttack,
      isHealing: this.isHealing,
      hasDamage: this.hasDamage,
      isSpell: this.type === "spell",
      hasSave: this.hasSave,
      hasAreaTarget: this.hasAreaTarget,
      isTool: this.type === "tool",
      hasAbilityCheck: this.hasAbilityCheck
    };
    const html = await renderTemplate("systems/shaper/templates/chat/item-card.hbs", templateData);

    // Create the ChatMessage data object
    const chatData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      flavor: this.system.chatFlavor || this.name,
      speaker: ChatMessage.getSpeaker({actor: this.actor, token}),
      flags: {"core.canPopout": true}
    };

    // If the Item was destroyed in the process of displaying its card - embed the item data in the chat message
    if ( (this.type === "consumable") && !this.actor.items.has(this.id) ) {
      chatData.flags["shaper.itemData"] = templateData.item;
    }

    // Merge in the flags from options
    chatData.flags = foundry.utils.mergeObject(chatData.flags, options.flags);

    /**
     * A hook event that fires before an item chat card is created.
     * @function shaper.preDisplayCard
     * @memberof hookEvents
     * @param {Item5e} item             Item for which the chat card is being displayed.
     * @param {object} chatData         Data used to create the chat message.
     * @param {ItemUseOptions} options  Options which configure the display of the item chat card.
     */
    Hooks.callAll("shaper.preDisplayCard", this, chatData, options);

    // Apply the roll mode to adjust message visibility
    ChatMessage.applyRollMode(chatData, options.rollMode ?? game.settings.get("core", "rollMode"));

    // Create the Chat Message or return its data
    const card = (options.createMessage !== false) ? await ChatMessage.create(chatData) : chatData;

    /**
     * A hook event that fires after an item chat card is created.
     * @function shaper.displayCard
     * @memberof hookEvents
     * @param {Item5e} item              Item for which the chat card is being displayed.
     * @param {ChatMessage|object} card  The created ChatMessage instance or ChatMessageData depending on whether
     *                                   options.createMessage was set to `true`.
     */
    Hooks.callAll("shaper.displayCard", this, card);

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
    const labels = this.labels;

    // Rich text description
    data.description.value = await TextEditor.enrichHTML(data.description.value, {
      async: true,
      relativeTo: this,
      ...htmlOptions
    });

    // Item type specific properties
    const props = [];
    switch ( this.type ) {
      case "feat":
        this._featChatData(data, labels, props); break;
      case "loot":
        this._lootChatData(data, labels, props); break;
    }

    // Equipment properties
    if ( data.hasOwnProperty("equipped") && !["loot", "tool"].includes(this.type) ) {

      props.push(
        game.i18n.localize(data.equipped ? "SHAPER.Equipped" : "SHAPER.Unequipped"),
      );
    }

    // Ability activation properties
    if ( data.hasOwnProperty("activation") ) {
      props.push(
        labels.activation + (data.activation?.condition ? ` (${data.activation.condition})` : ""),
        labels.target,
        labels.range,
        labels.duration
      );
    }

    // Filter properties and return
    data.properties = props.filter(p => !!p);
    return data;
  }


  /* -------------------------------------------- */

  /**
   * Prepare chat card data for items of the Feat type.
   * @param {object} data     Copy of item data being use to display the chat message.
   * @param {object} labels   Specially prepared item labels.
   * @param {string[]} props  Existing list of properties to be displayed. *Will be mutated.*
   * @private
   */
  _featChatData(data, labels, props) {
    props.push(data.requirements);
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for loot type items.
   * @param {object} data     Copy of item data being use to display the chat message.
   * @param {object} labels   Specially prepared item labels.
   * @param {string[]} props  Existing list of properties to be displayed. *Will be mutated.*
   * @private
   */
  _lootChatData(data, labels, props) {
    props.push(
      game.i18n.localize("SHAPER.ItemTypeLoot"),
      data.weight ? `${data.weight} ${game.i18n.localize("SHAPER.AbbreviationLbs")}` : null
    );
  }


  /* -------------------------------------------- */
  /*  Item Rolls - Attack, Damage, Saves, Checks  */
  /* -------------------------------------------- */

  /**
   * Place an attack roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the d10Roll logic for the core implementation
   *
   * @param {D10RollConfiguration} options  Roll options which are configured and provided to the d10Roll function
   * @returns {Promise<D10Roll|null>}       A Promise which resolves to the created Roll instance
   */
  async rollAttack(options={}) {
    const flags = this.actor.flags.shaper ?? {};
    if ( !this.hasAttack ) throw new Error("You may not place an Attack Roll with this Item.");

    let title = `${this.name} - ${game.i18n.localize("SHAPER.AttackRoll")}`;

    // Get the parts and rollData for this item's attack
    const {parts, rollData} = this.getAttackToHit();

    // Compose roll options
    const rollConfig = foundry.utils.mergeObject({
      parts,
      actor: this.actor,
      data: rollData,
      critical: this.getCriticalThreshold(),
      title,
      flavor: title,
      dialogOptions: {
        width: 400,
        top: options.event ? options.event.clientY - 80 : null,
        left: window.innerWidth - 710
      },
      messageData: {
        "flags.shaper.roll": {type: "attack", itemId: this.id },
        speaker: ChatMessage.getSpeaker({actor: this.actor})
      }
    }, options);

    /**
     * A hook event that fires before an attack is rolled for an Item.
     * @function shaper.preRollAttack
     * @memberof hookEvents
     * @param {Item5e} item                  Item for which the roll is being performed.
     * @param {D10RollConfiguration} config  Configuration data for the pending roll.
     * @returns {boolean}                    Explicitly return false to prevent the roll from being performed.
     */
    if ( Hooks.call("shaper.preRollAttack", this, rollConfig) === false ) return;

    const roll = await d10Roll(rollConfig);
    if ( roll === null ) return null;

    /**
     * A hook event that fires after an attack has been rolled for an Item.
     * @function shaper.rollAttack
     * @memberof hookEvents
     * @param {Item5e} item          Item for which the roll was performed.
     * @param {D10Roll} roll         The resulting roll.
     */
    Hooks.callAll("shaper.rollAttack", this, roll);

    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Place a damage roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the damageRoll logic for the core implementation.
   * @param {object} [config]
   * @param {MouseEvent} [config.event]    An event which triggered this roll, if any
   * @param {boolean} [config.critical]    Should damage be rolled as a critical hit?
   * @param {DamageRollConfiguration} [config.options]  Additional options passed to the damageRoll function
   * @returns {Promise<DamageRoll>}        A Promise which resolves to the created Roll instance, or null if the action
   *                                       cannot be performed.
   */
  async rollDamage({critical=false, event=null, options={}}={}) {
    if ( !this.hasDamage ) throw new Error("You may not make a Damage Roll with this Item.");
    const messageData = {
      "flags.shaper.roll": {type: "damage", itemId: this.id},
      speaker: ChatMessage.getSpeaker({actor: this.actor})
    };

    // Get roll data
    const dmg = this.system.damage;
    const parts = dmg.parts.map(d => d[0]);
    const rollData = this.getRollData();

    // Configure the damage roll
    const actionFlavor = game.i18n.localize(this.system.actionType === "heal" ? "SHAPER.Healing" : "SHAPER.DamageRoll");
    const title = `${this.name} - ${actionFlavor}`;
    const rollConfig = {
      actor: this.actor,
      critical: critical ?? event?.altKey ?? false,
      data: rollData,
      event: event,
      fastForward: event ? event.shiftKey || event.altKey || event.ctrlKey || event.metaKey : false,
      parts: parts,
      title: title,
      flavor: this.labels.damageTypes.length ? `${title} (${this.labels.damageTypes})` : title,
      dialogOptions: {
        width: 400,
        top: event ? event.clientY - 80 : null,
        left: window.innerWidth - 710
      },
      messageData
    };


    // Add damage bonus formula
    const actorBonus = foundry.utils.getProperty(this.actor.system, `bonuses.${this.system.actionType}`) || {};
    if ( actorBonus.damage && (parseInt(actorBonus.damage) !== 0) ) {
      parts.push(actorBonus.damage);
    }

    // Factor in extra weapon-specific critical damage
    if ( this.system.critical?.damage ) rollConfig.criticalBonusDamage = this.system.critical.damage;

    foundry.utils.mergeObject(rollConfig, options);

    /**
     * A hook event that fires before a damage is rolled for an Item.
     * @function shaper.preRollDamage
     * @memberof hookEvents
     * @param {Item5e} item                     Item for which the roll is being performed.
     * @param {DamageRollConfiguration} config  Configuration data for the pending roll.
     * @returns {boolean}                       Explicitly return false to prevent the roll from being performed.
     */
    if ( Hooks.call("shaper.preRollDamage", this, rollConfig) === false ) return;

    const roll = await damageRoll(rollConfig);

    /**
     * A hook event that fires after a damage has been rolled for an Item.
     * @function shaper.rollDamage
     * @memberof hookEvents
     * @param {Item5e} item      Item for which the roll was performed.
     * @param {DamageRoll} roll  The resulting roll.
     */
    if ( roll ) Hooks.callAll("shaper.rollDamage", this, roll);

    // Call the roll helper utility
    return roll;
  }


  /* -------------------------------------------- */

  /**
   * Prepare data needed to roll an attack using an item (weapon, feat, spell, or equipment)
   * and then pass it off to `d10Roll`.
   * @param {object} [options]
   * @returns {Promise<Roll>}   A Promise which resolves to the created Roll instance.
   */
  async rollFormula() {

    console.log(this.system);
    if ( !this.system.formula ) throw new Error("This Item does not have a formula to roll!");

    const rollConfig = {
      formula: this.system.formula,
      data: this.getRollData(),
      chatMessage: true
    };

    /**
     * A hook event that fires before a formula is rolled for an Item.
     * @function shaper.preRollFormula
     * @memberof hookEvents
     * @param {Item5e} item                 Item for which the roll is being performed.
     * @param {object} config               Configuration data for the pending roll.
     * @param {string} config.formula       Formula that will be rolled.
     * @param {object} config.data          Data used when evaluating the roll.
     * @param {boolean} config.chatMessage  Should a chat message be created for this roll?
     * @returns {boolean}                   Explicitly return false to prevent the roll from being performed.
     */
    if ( Hooks.call("shaper.preRollFormula", this, rollConfig) === false ) return;

    const roll = await new Roll(rollConfig.formula, rollConfig.data).roll({async: true});

    if ( rollConfig.chatMessage ) {
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor: this.actor}),
        flavor: `${this.name} - ${game.i18n.localize("SHAPER.OtherFormula")}`,
        rollMode: game.settings.get("core", "rollMode"),
        messageData: {"flags.shaper.roll": {type: "other", itemId: this.id }}
      });
    }

    /**
     * A hook event that fires after a formula has been rolled for an Item.
     * @function shaper.rollFormula
     * @memberof hookEvents
     * @param {Item5e} item  Item for which the roll was performed.
     * @param {Roll} roll    The resulting roll.
     */
    Hooks.callAll("shaper.rollFormula", this, roll);

    return roll;
  }

  /**
   * Perform an ability recharge
   */
  async recharge() {
    const recharge = this.system.recharge ?? {};
    if ( !recharge.value ) return;

    let cd = recharge.value - 1;

    if ( cd <=0 ){
      this.update({"system.recharge.charged": true});
    }
    else {
      this.update({"system.recharge.value": cd});
    }

  }
  /* -------------------------------------------- */

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item.
   * @returns {object}  Data used for @ formula replacement in Roll formulas.
   * @private
   */
  getRollData() {
    if ( !this.actor ) return null;
    const actorRollData = this.actor.getRollData();
    const rollData = {
      ...actorRollData,
      item: this.toObject().system
    };

    // Include stat modifier if one exists
    const stat = this.statMod;
    if ( stat ) {
      const s = rollData.stats[stat];
      if ( !s ) {
        console.warn(`Item ${this.name} in Actor ${this.actor.name} has an invalid item ability modifier of ${s} defined`);
      }
      rollData.mod = s?.value ?? 0;
    }
    return rollData;
  }

  /* -------------------------------------------- */
  /*  Chat Message Helpers                        */
  /* -------------------------------------------- */

  /**
   * Apply listeners to chat messages.
   * @param {HTML} html  Rendered chat message.
   */
  static chatListeners(html) {
    html.on("click", ".card-buttons button", this._onChatCardAction.bind(this));
    html.on("click", ".item-name", this._onChatCardToggleContent.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle execution of a chat card action via a click event on one of the card buttons
   * @param {Event} event       The originating click event
   * @returns {Promise}         A promise which resolves once the handler workflow is complete
   * @private
   */
  static async _onChatCardAction(event) {
    event.preventDefault();

    // Extract card data
    const button = event.currentTarget;
    button.disabled = true;
    const card = button.closest(".chat-card");
    const messageId = card.closest(".message").dataset.messageId;
    const message = game.messages.get(messageId);
    const action = button.dataset.action;

    // Validate permission to proceed with the roll
    const isTargetted = action === "save";
    if ( !( isTargetted || game.user.isGM || message.isAuthor ) ) return;

    // Recover the actor for the chat card
    const actor = await this._getChatCardActor(card);
    if ( !actor ) return;

    // Get the Item from stored flag data or by the item ID on the Actor
    const storedData = message.getFlag("shaper", "itemData");
    const item = storedData ? new this(storedData, {parent: actor}) : actor.items.get(card.dataset.itemId);
    if ( !item ) {
      const err = game.i18n.format("SHAPER.ActionWarningNoItem", {item: card.dataset.itemId, name: actor.name});
      return ui.notifications.error(err);
    }

    // Handle different actions
    let targets;
    switch ( action ) {
      case "attack":
        await item.rollAttack({event}); break;
      case "damage":
        await item.rollDamage({
          critical: event.altKey,
          event: event
        });
        break;
      case "formula":
        await item.rollFormula({event}); break;
      case "placeTemplate":
        const template = shaper.canvas.AbilityTemplate.fromItem(item);
        if ( template ) template.drawPreview();
        break;
      case "abilityCheck":
        targets = this._getChatCardTargets(card);
        for ( let token of targets ) {
          const speaker = ChatMessage.getSpeaker({scene: canvas.scene, token: token});
          await token.actor.rollAbilityTest(button.dataset.ability, { event, speaker });
        }
        break;
    }

    // Re-enable the button
    button.disabled = false;
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the visibility of chat card content when the name is clicked
   * @param {Event} event   The originating click event
   * @private
   */
  static _onChatCardToggleContent(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const card = header.closest(".chat-card");
    const content = card.querySelector(".card-content");
    content.style.display = content.style.display === "none" ? "block" : "none";
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
   * Get the Actor which is the author of a chat card
   * @param {HTMLElement} card    The chat card being used
   * @returns {Actor[]}            An Array of Actor documents, if any
   * @private
   */
  static _getChatCardTargets(card) {
    let targets = canvas.tokens.controlled.filter(t => !!t.actor);
    if ( !targets.length && game.user.character ) targets = targets.concat(game.user.character.getActiveTokens());
    if ( !targets.length ) ui.notifications.warn(game.i18n.localize("SHAPER.ActionWarningNoToken"));
    return targets;
  }

 
  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);

    if ( !this.isEmbedded || (this.parent.type === "vehicle") ) return;
    let updates;
    if ( updates ) return this.updateSource(updates);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if ( (userId !== game.user.id) || !this.parent ) return;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
    if ( (this.type !== "class") || !("levels" in (changed.system || {})) ) return;

    // Check to make sure the updated class level isn't below zero
    if ( changed.system.levels <= 0 ) {
      ui.notifications.warn(game.i18n.localize("SHAPER.MaxClassLevelMinimumWarn"));
      changed.system.levels = 1;
    }

    // Check to make sure the updated class level doesn't exceed level cap
    if ( changed.system.levels > CONFIG.SHAPER.maxLevel ) {
      ui.notifications.warn(game.i18n.format("SHAPER.MaxClassLevelExceededWarn", {max: CONFIG.SHAPER.maxLevel}));
      changed.system.levels = CONFIG.SHAPER.maxLevel;
    }
    if ( !this.isEmbedded || (this.parent.type !== "character") ) return;

    // Check to ensure the updated character doesn't exceed level cap
    const newCharacterLevel = this.actor.system.details.level + (changed.system.levels - this.system.levels);
    if ( newCharacterLevel > CONFIG.SHAPER.maxLevel ) {
      ui.notifications.warn(game.i18n.format("SHAPER.MaxCharacterLevelExceededWarn", {max: CONFIG.SHAPER.maxLevel}));
      changed.system.levels -= newCharacterLevel - CONFIG.SHAPER.maxLevel;
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if ( (userId !== game.user.id) || !this.parent ) return;
  }
}
