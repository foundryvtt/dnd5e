import {d20Roll, damageRoll} from "../dice.js";
import AbilityUseDialog from "../apps/ability-use-dialog.js";
import AbilityTemplate from "../pixi/ability-template.js";

/**
 * Override and extend the basic :class:`Item` implementation
 */
export default class Item5e extends Item {

  /* -------------------------------------------- */
  /*  Item Properties                             */
  /* -------------------------------------------- */

  /**
   * Determine which ability score modifier is used by this item
   * @type {string|null}
   */
  get abilityMod() {
    const itemData = this.data.data;
    if (!("ability" in itemData)) return null;

    // Case 1 - defined directly by the item
    if (itemData.ability) return itemData.ability;

    // Case 2 - inferred from a parent actor
    else if (this.actor) {
      const actorData = this.actor.data.data;

      // Spells - Use Actor spellcasting modifier
      if (this.data.type === "spell") return actorData.attributes.spellcasting || "int";

      // Tools - default to Intelligence
      else if (this.data.type === "tool") return "int";

      // Weapons
      else if (this.data.type === "weapon") {
        const wt = itemData.weaponType;

        // Melee weapons - Str or Dex if Finesse (PHB pg. 147)
        if ( ["simpleM", "martialM"].includes(wt) ) {
          if (itemData.properties.fin === true) {   // Finesse weapons
            return (actorData.abilities["dex"].mod >= actorData.abilities["str"].mod) ? "dex" : "str";
          }
          return "str";
        }

        // Ranged weapons - Dex (PH p.194)
        else if ( ["simpleR", "martialR"].includes(wt) ) return "dex";
      }
      return "str";
    }

    // Case 3 - unknown
    return null
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement an attack roll as part of its usage
   * @type {boolean}
   */
  get hasAttack() {
    return ["mwak", "rwak", "msak", "rsak"].includes(this.data.data.actionType);
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a damage roll as part of its usage
   * @type {boolean}
   */
  get hasDamage() {
    return !!(this.data.data.damage && this.data.data.damage.parts.length);
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a versatile damage roll as part of its usage
   * @type {boolean}
   */
  get isVersatile() {
    return !!(this.hasDamage && this.data.data.damage.versatile);
  }

  /* -------------------------------------------- */

  /**
   * Does the item provide an amount of healing instead of conventional damage?
   * @return {boolean}
   */
  get isHealing() {
    return (this.data.data.actionType === "heal") && this.data.data.damage.parts.length;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a saving throw as part of its usage
   * @type {boolean}
   */
  get hasSave() {
    return !!(this.data.data.save && this.data.data.save.ability);
  }

  /* -------------------------------------------- */

  /**
   * Does the Item have a target
   * @type {boolean}
   */
  get hasTarget() {
    const target = this.data.data.target;
    return target && !["none",""].includes(target.type);
  }

  /* -------------------------------------------- */

  /**
   * Does the Item have an area of effect target
   * @type {boolean}
   */
  get hasAreaTarget() {
    const target = this.data.data.target;
    return target && (target.type in CONFIG.DND5E.areaTargetTypes);
  }

  /* -------------------------------------------- */

  /**
   * A flag for whether this Item is limited in it's ability to be used by charges or by recharge.
   * @type {boolean}
   */
  get hasLimitedUses() {
    let chg = this.data.data.recharge || {};
    let uses = this.data.data.uses || {};
    return !!chg.value || (!!uses.per && (uses.max > 0));
  }

  /* -------------------------------------------- */
  /*	Data Preparation														*/
  /* -------------------------------------------- */

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // Get the Item's data
    const itemData = this.data;
    const actorData = this.actor ? this.actor.data : {};
    const data = itemData.data;
    const C = CONFIG.DND5E;
    const labels = {};

    // Classes
    if ( itemData.type === "class" ) {
      data.levels = Math.clamped(data.levels, 1, 20);
    }

    // Spell Level,  School, and Components
    if ( itemData.type === "spell" ) {
      labels.level = C.spellLevels[data.level];
      labels.school = C.spellSchools[data.school];
      labels.components = Object.entries(data.components).reduce((arr, c) => {
        if ( c[1] !== true ) return arr;
        arr.push(c[0].titleCase().slice(0, 1));
        return arr;
      }, []);
    }

    // Feat Items
    else if ( itemData.type === "feat" ) {
      const act = data.activation;
      if ( act && (act.type === C.abilityActivationTypes.legendary) ) labels.featType = "Legendary Action";
      else if ( act && (act.type === C.abilityActivationTypes.lair) ) labels.featType = "Lair Action";
      else if ( act && act.type ) labels.featType = data.damage.length ? "Attack" : "Action";
      else labels.featType = "Passive";
    }

    // Equipment Items
    else if ( itemData.type === "equipment" ) {
      labels.armor = data.armor.value ? `${data.armor.value} AC` : "";
    }

    // Activated Items
    if ( data.hasOwnProperty("activation") ) {

      // Ability Activation Label
      let act = data.activation || {};
      if ( act ) labels.activation = [act.cost, C.abilityActivationTypes[act.type]].filterJoin(" ");

      // Target Label
      let tgt = data.target || {};
      if (["none", "touch", "self"].includes(tgt.units)) tgt.value = null;
      if (["none", "self"].includes(tgt.type)) {
        tgt.value = null;
        tgt.units = null;
      }
      labels.target = [tgt.value, C.distanceUnits[tgt.units], C.targetTypes[tgt.type]].filterJoin(" ");

      // Range Label
      let rng = data.range || {};
      if (["none", "touch", "self"].includes(rng.units) || (rng.value === 0)) {
        rng.value = null;
        rng.long = null;
      }
      labels.range = [rng.value, rng.long ? `/ ${rng.long}` : null, C.distanceUnits[rng.units]].filterJoin(" ");

      // Duration Label
      let dur = data.duration || {};
      if (["inst", "perm"].includes(dur.units)) dur.value = null;
      labels.duration = [dur.value, C.timePeriods[dur.units]].filterJoin(" ");

      // Recharge Label
      let chg = data.recharge || {};
      labels.recharge = `Recharge [${chg.value}${parseInt(chg.value) < 6 ? "+" : ""}]`;
    }

    // Item Actions
    if ( data.hasOwnProperty("actionType") ) {

      // Save DC
      let save = data.save || {};
      if ( !save.ability ) save.dc = null;
      else if ( this.isOwned ) { // Actor owned items
        if ( save.scaling === "spell" ) save.dc = actorData.data.attributes.spelldc;
        else if ( save.scaling !== "flat" ) save.dc = this.actor.getSpellDC(save.scaling);
      } else { // Un-owned items
        if ( save.scaling !== "flat" ) save.dc = null;
      }
      labels.save = save.ability ? `DC ${save.dc || ""} ${C.abilities[save.ability]}` : "";

      // Damage
      let dam = data.damage || {};
      if ( dam.parts ) {
        labels.damage = dam.parts.map(d => d[0]).join(" + ").replace(/\+ -/g, "- ");
        labels.damageTypes = dam.parts.map(d => C.damageTypes[d[1]]).join(", ");
      }
    }

    // Assign labels
    this.labels = labels;
  }

  /* -------------------------------------------- */

  /**
   * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
   * @return {Promise}
   */
  async roll({configureDialog=true}={}) {

    // Basic template rendering data
    const token = this.actor.token;
    const templateData = {
      actor: this.actor,
      tokenId: token ? `${token.scene._id}.${token.id}` : null,
      item: this.data,
      data: this.getChatData(),
      labels: this.labels,
      hasAttack: this.hasAttack,
      isHealing: this.isHealing,
      hasDamage: this.hasDamage,
      isVersatile: this.isVersatile,
      isSpell: this.data.type === "spell",
      hasSave: this.hasSave,
      hasAreaTarget: this.hasAreaTarget
    };

    // For feature items, optionally show an ability usage dialog
    if (this.data.type === "feat") {
      let configured = await this._rollFeat(configureDialog);
      if ( configured === false ) return;
    } else if ( this.data.type === "consumable" ) {
      let configured = await this._rollConsumable(configureDialog);
      if ( configured === false ) return;
    }

    // For items which consume a resource, handle that here
    const allowed = await this._handleResourceConsumption({isCard: true, isAttack: false});
    if ( allowed === false ) return;

    // Render the chat card template
    const templateType = ["tool"].includes(this.data.type) ? this.data.type : "item";
    const template = `systems/dnd5e/templates/chat/${templateType}-card.html`;
    const html = await renderTemplate(template, templateData);

    // Basic chat message data
    const chatData = {
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      speaker: {
        actor: this.actor._id,
        token: this.actor.token,
        alias: this.actor.name
      }
    };

    // Toggle default roll mode
    let rollMode = game.settings.get("core", "rollMode");
    if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if ( rollMode === "blindroll" ) chatData["blind"] = true;

    // Create the chat message
    return ChatMessage.create(chatData);
  }

  /* -------------------------------------------- */

  /**
   * For items which consume a resource, handle the consumption of that resource when the item is used.
   * There are four types of ability consumptions which are handled:
   * 1. Ammunition (on attack rolls)
   * 2. Attributes (on card usage)
   * 3. Materials (on card usage)
   * 4. Item Charges (on card usage)
   *
   * @param {boolean} isCard      Is the item card being played?
   * @param {boolean} isAttack    Is an attack roll being made?
   * @return {Promise<boolean>}   Can the item card or attack roll be allowed to proceed?
   * @private
   */
  async _handleResourceConsumption({isCard=false, isAttack=false}={}) {
    const itemData = this.data.data;
    const consume = itemData.consume || {};
    if ( !consume.type ) return true;
    const actor = this.actor;
    const typeLabel = CONFIG.DND5E.abilityConsumptionTypes[consume.type];
    const amount = parseInt(consume.amount || 1);

    // Only handle certain types for certain actions
    if ( ((consume.type === "ammo") && !isAttack ) || ((consume.type !== "ammo") && !isCard) ) return true;

    // No consumed target set
    if ( !consume.target ) {
      ui.notifications.warn(game.i18n.format("DND5E.ConsumeWarningNoResource", {name: this.name, type: typeLabel}));
      return false;
    }

    // Identify the consumed resource and it's quantity
    let consumed = null;
    let quantity = 0;
    switch ( consume.type ) {
      case "attribute":
        consumed = getProperty(actor.data.data, consume.target);
        quantity = consumed || 0;
        break;
      case "ammo":
      case "material":
        consumed = actor.items.get(consume.target);
        quantity = consumed ? consumed.data.data.quantity : 0;
        break;
      case "charges":
        consumed = actor.items.get(consume.target);
        quantity = consumed ? consumed.data.data.uses.value : 0;
        break;
    }

    // Verify that the consumed resource is available
    if ( [null, undefined].includes(consumed) ) {
      ui.notifications.warn(game.i18n.format("DND5E.ConsumeWarningNoSource", {name: this.name, type: typeLabel}));
      return false;
    }
    if ( !quantity || (quantity - amount < 0) ) {
      ui.notifications.warn(game.i18n.format("DND5E.ConsumeWarningNoQuantity", {name: this.name, type: typeLabel}));
      return false;
    }

    // Update the consumed resource
    const remaining = Math.max(quantity - amount, 0);
    switch ( consume.type ) {
      case "attribute":
        await this.actor.update({[`data.${consume.target}`]: remaining});
        break;
      case "ammo":
      case "material":
        await consumed.update({"data.quantity": remaining});
        break;
      case "charges":
        await consumed.update({"data.uses.value": remaining});
    }
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Additional rolling steps when rolling a feat-type item
   * @private
   * @return {boolean} whether the roll should be prevented
   */
  async _rollFeat(configureDialog) {
    if ( this.data.type !== "feat" ) throw new Error("Wrong Item type");

    // Configure whether to consume a limited use or to place a template
    const usesRecharge = !!this.data.data.recharge.value;
    const uses = this.data.data.uses;
    let usesCharges = !!uses.per && (uses.max > 0);
    let placeTemplate = false;
    let consume = usesRecharge || usesCharges;

    // Determine whether the feat uses charges
    configureDialog = configureDialog && (consume || this.hasAreaTarget);
    if ( configureDialog ) {
      const usage = await AbilityUseDialog.create(this);
      if ( usage === null ) return false;
      consume = Boolean(usage.get("consume"));
      placeTemplate = Boolean(usage.get("placeTemplate"));
    }

    // Update Item data
    const current = getProperty(this.data, "data.uses.value") || 0;
    if ( consume && usesRecharge ) {
      await this.update({"data.recharge.charged": false});
    }
    else if ( consume && usesCharges ) {
      await this.update({"data.uses.value": Math.max(current - 1, 0)});
    }

    // Maybe initiate template placement workflow
    if ( this.hasAreaTarget && placeTemplate ) {
      const template = AbilityTemplate.fromItem(this);
      if ( template ) template.drawPreview(event);
      if ( this.owner && this.owner.sheet ) this.owner.sheet.minimize();
    }
    return true;
  }

  /* -------------------------------------------- */
  /*  Chat Cards																	*/
  /* -------------------------------------------- */

  /**
   * Prepare an object of chat data used to display a card for the Item in the chat log
   * @param {Object} htmlOptions    Options used by the TextEditor.enrichHTML function
   * @return {Object}               An object of chat data to render
   */
  getChatData(htmlOptions) {
    const data = duplicate(this.data.data);
    const labels = this.labels;

    // Rich text description
    data.description.value = TextEditor.enrichHTML(data.description.value, htmlOptions);

    // Item type specific properties
    const props = [];
    const fn = this[`_${this.data.type}ChatData`];
    if ( fn ) fn.bind(this)(data, labels, props);

    // General equipment properties
    if ( data.hasOwnProperty("equipped") && !["loot", "tool"].includes(this.data.type) ) {
      props.push(
        data.equipped ? "Equipped" : "Not Equipped",
        data.proficient ? "Proficient": "Not Proficient",
      );
    }

    // Ability activation properties
    if ( data.hasOwnProperty("activation") ) {
      props.push(
        labels.target,
        labels.activation,
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
   * Prepare chat card data for equipment type items
   * @private
   */
  _equipmentChatData(data, labels, props) {
    props.push(
      CONFIG.DND5E.equipmentTypes[data.armor.type],
      labels.armor || null,
      data.stealth.value ? "Stealth Disadvantage" : null,
    );
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for weapon type items
   * @private
   */
  _weaponChatData(data, labels, props) {
    props.push(
      CONFIG.DND5E.weaponTypes[data.weaponType],
    );
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for consumable type items
   * @private
   */
  _consumableChatData(data, labels, props) {
    props.push(
      CONFIG.DND5E.consumableTypes[data.consumableType],
      data.uses.value + "/" + data.uses.max + " Charges"
    );
    data.hasCharges = data.uses.value >= 0;
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for tool type items
   * @private
   */
  _toolChatData(data, labels, props) {
    props.push(
      CONFIG.DND5E.abilities[data.ability] || null,
      CONFIG.DND5E.proficiencyLevels[data.proficient || 0]
    );
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for tool type items
   * @private
   */
  _lootChatData(data, labels, props) {
    props.push(
      "Loot",
      data.weight ? data.weight + " lbs." : null
    );
  }

  /* -------------------------------------------- */

  /**
   * Render a chat card for Spell type data
   * @return {Object}
   * @private
   */
  _spellChatData(data, labels, props) {
    props.push(
      labels.level,
      labels.components,
    );
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for items of the "Feat" type
   * @private
   */
  _featChatData(data, labels, props) {
    props.push(data.requirements);
  }

  /* -------------------------------------------- */
  /*  Item Rolls - Attack, Damage, Saves, Checks  */
  /* -------------------------------------------- */

  /**
   * Place an attack roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the d20Roll logic for the core implementation
   *
   * @return {Promise.<Roll|null>}   A Promise which resolves to the created Roll instance
   */
  async rollAttack(options={}) {
    const itemData = this.data.data;
    const actorData = this.actor.data.data;
    const flags = this.actor.data.flags.dnd5e || {};
    if ( !this.hasAttack ) {
      throw new Error("You may not place an Attack Roll with this Item.");
    }
    const rollData = this.getRollData();

    // Define Roll bonuses
    const parts = [`@mod`];
    if ( (this.data.type !== "weapon") || itemData.proficient ) {
      parts.push("@prof");
    }

    // Attack Bonus
    const actorBonus = actorData.bonuses[itemData.actionType] || {};
    if ( itemData.attackBonus || actorBonus.attack ) {
      parts.push("@atk");
      rollData["atk"] = [itemData.attackBonus, actorBonus.attack].filterJoin(" + ");
    }

    // Compose roll options
    const rollConfig = {
      event: options.event,
      parts: parts,
      actor: this.actor,
      data: rollData,
      title: `${this.name} - Attack Roll`,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      dialogOptions: {
        width: 400,
        top: options.event ? options.event.clientY - 80 : null,
        left: window.innerWidth - 710
      }
    };

    // Expanded weapon critical threshold
    if (( this.data.type === "weapon" ) && flags.weaponCriticalThreshold) {
      rollConfig.critical = parseInt(flags.weaponCriticalThreshold);
    }

    // Elven Accuracy
    if ( ["weapon", "spell"].includes(this.data.type) ) {
      if (flags.elvenAccuracy && ["dex", "int", "wis", "cha"].includes(this.abilityMod)) {
        rollConfig.elvenAccuracy = true;
      }
    }

    // Apply Halfling Lucky
    if ( flags.halflingLucky ) rollConfig.halflingLucky = true;


    // Invoke the d20 roll helper
    const roll = await d20Roll(rollConfig);
    if ( roll === false ) return null;

    // Handle resource consumption if the attack roll was made
    const allowed = await this._handleResourceConsumption({isCard: false, isAttack: true});
    if ( allowed === false ) return null;
    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Place a damage roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the damageRoll logic for the core implementation
   *
   * @return {Promise.<Roll>}   A Promise which resolves to the created Roll instance
   */
  rollDamage({event, spellLevel=null, versatile=false}={}) {
    const itemData = this.data.data;
    const actorData = this.actor.data.data;
    if ( !this.hasDamage ) {
      throw new Error("You may not make a Damage Roll with this Item.");
    }
    const rollData = this.getRollData();
    if ( spellLevel ) rollData.item.level = spellLevel;

    // Define Roll parts
    const parts = itemData.damage.parts.map(d => d[0]);
    if ( versatile && itemData.damage.versatile ) parts[0] = itemData.damage.versatile;
    if ( (this.data.type === "spell") ) {
      if ( (itemData.scaling.mode === "cantrip") ) {
        const lvl = this.actor.data.type === "character" ? actorData.details.level : actorData.details.spellLevel;
        this._scaleCantripDamage(parts, lvl, itemData.scaling.formula );
      } else if ( spellLevel && (itemData.scaling.mode === "level") && itemData.scaling.formula ) {
        this._scaleSpellDamage(parts, itemData.level, spellLevel, itemData.scaling.formula );
      }
    }

    // Define Roll Data
    const actorBonus = actorData.bonuses[itemData.actionType] || {};
    if ( actorBonus.damage && parseInt(actorBonus.damage) !== 0 ) {
      parts.push("@dmg");
      rollData["dmg"] = actorBonus.damage;
    }

    // Call the roll helper utility
    const title = `${this.name} - Damage Roll`;
    const flavor = this.labels.damageTypes.length ? `${title} (${this.labels.damageTypes})` : title;
    return damageRoll({
      event: event,
      parts: parts,
      actor: this.actor,
      data: rollData,
      title: title,
      flavor: flavor,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      dialogOptions: {
        width: 400,
        top: event ? event.clientY - 80 : null,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Adjust a cantrip damage formula to scale it for higher level characters and monsters
   * @private
   */
  _scaleCantripDamage(parts, level, scale) {
    const add = Math.floor((level + 1) / 6);
    if ( add === 0 ) return;
    if ( scale && (scale !== parts[0]) ) {
      parts[0] = parts[0] + " + " + scale.replace(new RegExp(Roll.diceRgx, "g"), (match, nd, d) => `${add}d${d}`);
    } else {
      parts[0] = parts[0].replace(new RegExp(Roll.diceRgx, "g"), (match, nd, d) => `${parseInt(nd)+add}d${d}`);
    }
  }

  /* -------------------------------------------- */

  /**
   * Adjust the spell damage formula to scale it for spell level up-casting
   * @param {Array} parts         The original damage parts
   * @param {number} baseLevel    The default spell level
   * @param {number} spellLevel   The casted spell level
   * @param {string} formula      The scaling formula
   * @private
   */
  _scaleSpellDamage(parts, baseLevel, spellLevel, formula) {
    const upcastLevels = Math.max(spellLevel - baseLevel, 0);
    if ( upcastLevels === 0 ) return parts;
    const bonus = new Roll(formula).alter(0, upcastLevels);
    parts.push(bonus.formula);
    return parts;
  }

  /* -------------------------------------------- */

  /**
   * Place an attack roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the d20Roll logic for the core implementation
   *
   * @return {Promise.<Roll>}   A Promise which resolves to the created Roll instance
   */
  async rollFormula(options={}) {
    if ( !this.data.data.formula ) {
      throw new Error("This Item does not have a formula to roll!");
    }

    // Define Roll Data
    const rollData = this.getRollData();
    const title = `${this.name} - Other Formula`;

    // Invoke the roll and submit it to chat
    const roll = new Roll(rollData.item.formula, rollData).roll();
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: this.data.data.chatFlavor || title,
      rollMode: game.settings.get("core", "rollMode")
    });
    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Use a consumable item, deducting from the quantity or charges of the item.
   * @param {boolean} configureDialog   Whether to show a configuration dialog
   * @return {boolean}                  Whether further execution should be prevented
   * @private
   */
  async _rollConsumable(configureDialog) {
    if ( this.data.type !== "consumable" ) throw new Error("Wrong Item type");
    const itemData = this.data.data;

    // Determine whether to deduct uses of the item
    const uses = itemData.uses || {};
    const autoDestroy = uses.autoDestroy;
    let usesCharges = !!uses.per && (uses.max > 0);
    const recharge = itemData.recharge || {};
    const usesRecharge = !!recharge.value;

    // Display a configuration dialog to confirm the usage
    let placeTemplate = false;
    let consume = uses.autoUse || true;
    if ( configureDialog ) {
      const usage = await AbilityUseDialog.create(this);
      if ( usage === null ) return false;
      consume = Boolean(usage.get("consume"));
      placeTemplate = Boolean(usage.get("placeTemplate"));
    }

    // Update Item data
    if ( consume ) {
      const current = uses.value || 0;
      const remaining = usesCharges ? Math.max(current - 1, 0) : current;
      if ( usesRecharge ) await this.update({"data.recharge.charged": false});
      else {
        const q = itemData.quantity;
        // Case 1, reduce charges
        if ( remaining ) {
          await this.update({"data.uses.value": remaining});
        }
        // Case 2, reduce quantity
        else if ( q > 1 ) {
          await this.update({"data.quantity": q - 1, "data.uses.value": uses.max || 0});
        }
        // Case 3, destroy the item
        else if ( (q <= 1) && autoDestroy ) {
          await this.actor.deleteOwnedItem(this.id);
        }
        // Case 4, reduce item to 0 quantity and 0 charges
        else if ( (q === 1) ) {
          await this.update({"data.quantity": q - 1, "data.uses.value": 0});
        }
        // Case 5, item unusable, display warning and do nothing
        else {
          ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: this.name}));
        }
      }
    }

    // Maybe initiate template placement workflow
    if ( this.hasAreaTarget && placeTemplate ) {
      const template = AbilityTemplate.fromItem(this);
      if ( template ) template.drawPreview(event);
      if ( this.owner && this.owner.sheet ) this.owner.sheet.minimize();
    }
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Perform an ability recharge test for an item which uses the d6 recharge mechanic
   * @prarm {Object} options
   *
   * @return {Promise.<Roll>}   A Promise which resolves to the created Roll instance
   */
  async rollRecharge(options={}) {
    const data = this.data.data;
    if ( !data.recharge.value ) return;

    // Roll the check
    const roll = new Roll("1d6").roll();
    const success = roll.total >= parseInt(data.recharge.value);

    // Display a Chat Message
    const promises = [roll.toMessage({
      flavor: `${this.name} recharge check - ${success ? "success!" : "failure!"}`,
      speaker: ChatMessage.getSpeaker({actor: this.actor, token: this.actor.token})
    })];

    // Update the Item data
    if ( success ) promises.push(this.update({"data.recharge.charged": true}));
    return Promise.all(promises).then(() => roll);
  }

  /* -------------------------------------------- */

  /**
   * Roll a Tool Check
   * Rely upon the d20Roll logic for the core implementation
   *
   * @return {Promise.<Roll>}   A Promise which resolves to the created Roll instance
   */
  rollToolCheck(options={}) {
    if ( this.type !== "tool" ) throw "Wrong item type!";

    // Prepare roll data
    let rollData = this.getRollData();
    const parts = [`@mod`, "@prof"];
    const title = `${this.name} - Tool Check`;

    // Call the roll helper utility
    return d20Roll({
      event: options.event,
      parts: parts,
      data: rollData,
      template: "systems/dnd5e/templates/chat/tool-roll-dialog.html",
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: `${this.name} - Tool Check`,
      dialogOptions: {
        width: 400,
        top: options.event ? options.event.clientY - 80 : null,
        left: window.innerWidth - 710,
      },
      halflingLucky: this.actor.getFlag("dnd5e", "halflingLucky" ) || false
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
  getRollData() {
    if ( !this.actor ) return null;
    const rollData = this.actor.getRollData();
    rollData.item = duplicate(this.data.data);

    // Include an ability score modifier if one exists
    const abl = this.abilityMod;
    if ( abl ) {
      const ability = rollData.abilities[abl];
      rollData["mod"] = ability.mod || 0;
    }

    // Include a proficiency score
    const prof = "proficient" in rollData.item ? (rollData.item.proficient || 0) : 1;
    rollData["prof"] = Math.floor(prof * rollData.attributes.prof);
    return rollData;
  }

  /* -------------------------------------------- */
  /*  Chat Message Helpers                        */
  /* -------------------------------------------- */

  static chatListeners(html) {
    html.on('click', '.card-buttons button', this._onChatCardAction.bind(this));
    html.on('click', '.item-name', this._onChatCardToggleContent.bind(this));
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
    const message =  game.messages.get(messageId);
    const action = button.dataset.action;

    // Validate permission to proceed with the roll
    const isTargetted = action === "save";
    if ( !( isTargetted || game.user.isGM || message.isAuthor ) ) return;

    // Get the Actor from a synthetic Token
    const actor = this._getChatCardActor(card);
    if ( !actor ) return;

    // Get the Item
    const item = actor.getOwnedItem(card.dataset.itemId);
    if ( !item ) {
      return ui.notifications.error(`The requested item ${card.dataset.itemId} no longer exists on Actor ${actor.name}`)
    }
    const spellLevel = parseInt(card.dataset.spellLevel) || null;

    // Get card targets
    let targets = [];
    if ( isTargetted ) {
      targets = this._getChatCardTargets(card);
      if ( !targets.length ) {
        ui.notifications.warn(`You must have one or more controlled Tokens in order to use this option.`);
        return button.disabled = false;
      }
    }

    // Attack and Damage Rolls
    if ( action === "attack" ) await item.rollAttack({event});
    else if ( action === "damage" ) await item.rollDamage({event, spellLevel});
    else if ( action === "versatile" ) await item.rollDamage({event, spellLevel, versatile: true});
    else if ( action === "formula" ) await item.rollFormula({event});

    // Saving Throws for card targets
    else if ( action === "save" ) {
      for ( let t of targets ) {
        await t.rollAbilitySave(button.dataset.ability, {event});
      }
    }

    // Tool usage
    else if ( action === "toolCheck" ) await item.rollToolCheck({event});

    // Spell Template Creation
    else if ( action === "placeTemplate") {
      const template = AbilityTemplate.fromItem(item);
      if ( template ) template.drawPreview(event);
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
   * @return {Actor|null}         The Actor entity or null
   * @private
   */
  static _getChatCardActor(card) {

    // Case 1 - a synthetic actor from a Token
    const tokenKey = card.dataset.tokenId;
    if (tokenKey) {
      const [sceneId, tokenId] = tokenKey.split(".");
      const scene = game.scenes.get(sceneId);
      if (!scene) return null;
      const tokenData = scene.getEmbeddedEntity("Token", tokenId);
      if (!tokenData) return null;
      const token = new Token(tokenData);
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
   * @return {Array.<Actor>}      An Array of Actor entities, if any
   * @private
   */
  static _getChatCardTargets(card) {
    const character = game.user.character;
    const controlled = canvas.tokens.controlled;
    const targets = controlled.reduce((arr, t) => t.actor ? arr.concat([t.actor]) : arr, []);
    if ( character && (controlled.length === 0) ) targets.push(character);
    return targets;
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Create a consumable spell scroll Item from a spell Item.
   * @param {Item5e} spell      The spell to be made into a scroll
   * @return {Item5e}           The created scroll consumable item
   * @private
   */
  static async createScrollFromSpell(spell) {

    // Get spell data
    const itemData = spell instanceof Item5e ? spell.data : spell;
    const {actionType, description, source, activation, duration, target, range, damage, save, level} = itemData.data;

    // Get scroll data
    const scrollUuid = CONFIG.DND5E.spellScrollIds[level];
    const scrollItem = await fromUuid(scrollUuid);
    const scrollData = scrollItem.data;
    delete scrollData._id;

    // Split the scroll description into an intro paragraph and the remaining details
    const scrollDescription = scrollData.data.description.value;
    const pdel = '</p>';
    const scrollIntroEnd = scrollDescription.indexOf(pdel);
    const scrollIntro = scrollDescription.slice(0, scrollIntroEnd + pdel.length);
    const scrollDetails = scrollDescription.slice(scrollIntroEnd + pdel.length);

    // Create a composite description from the scroll description and the spell details
    const desc = `${scrollIntro}<hr/><h3>${itemData.name} (Level ${level})</h3><hr/>${description.value}<hr/><h3>Scroll Details</h3><hr/>${scrollDetails}`;

    // Create the spell scroll data
    const spellScrollData = mergeObject(scrollData, {
      name: `${game.i18n.localize("DND5E.SpellScroll")}: ${itemData.name}`,
      img: itemData.img,
      data: {
        "description.value": desc.trim(),
        source,
        actionType,
        activation,
        duration,
        target,
        range,
        damage,
        save,
        level
      }
    });
    return new this(spellScrollData);
  }
}
