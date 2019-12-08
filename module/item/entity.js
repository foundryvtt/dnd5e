import { Dice5e } from "../dice.js";

/**
 * Override and extend the basic :class:`Item` implementation
 */
export class Item5e extends Item {

  /* -------------------------------------------- */
  /*  Item Properties                             */
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

    // Spell Level,  School, and Components
    if ( itemData.type === "spell" ) {
      labels.level = C.spellLevels[data.level];
      labels.school = C.spellSchools[data.school];
      labels.components = Object.entries(data.components).map(c => {
        c[1] === true ? c[0].titleCase().slice(0,1) : null
      }).filterJoin(",");
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
      labels.recharge = chg.value ? (parseInt(chg.value) === 6 ? `Recharge [6]` : `Recharge [${chg.value}-6]`) : "";
    }

    // Item Actions
    if ( data.hasOwnProperty("actionType") ) {

      // Save DC
      let save = data.save || {};
      if ( !save.ability ) save.dc = null;
      if ( this.isOwned && (save.ability && !save.dc) ) {
        save.dc = actorData.data.attributes.spelldc;
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
  async roll() {

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
      hasSave: this.hasSave
    };

    // Render the chat card template
    const templateType = ["tool", "consumable"].includes(this.data.type) ? this.data.type : "item";
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
    if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperIDs("GM");
    if ( rollMode === "blindroll" ) chatData["blind"] = true;

    // Create the chat message
    return ChatMessage.create(chatData, {displaySheet: false});
  }

  /* -------------------------------------------- */
  /*  Chat Cards																	*/
  /* -------------------------------------------- */

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
      CONFIG.DND5E.armorTypes[data.armor.type],
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
   */
  _featChatData(data, labels, props) {
    props.push(
      data.requirements
    );
  }

  /* -------------------------------------------- */
  /*  Item Rolls - Attack, Damage, Saves, Checks  */
  /* -------------------------------------------- */

  /**
   * Place an attack roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollAttack(options={}) {
    const itemData = this.data.data;
    const actorData = this.actor.data.data;
    if ( !this.hasAttack ) {
      throw new Error("You may not place an Attack Roll with this Item.");
    }

    // Determine ability score modifier
    let abl = itemData.ability;
    if ( !abl && (this.data.type === "spell") ) abl = actorData.attributes.spellcasting || "int";
    else if ( !abl ) abl = "str";

    // Define Roll parts
    const parts = ["@item.attackBonus", `@abilities.${abl}.mod`, "@attributes.prof"];
    if ( (this.data.type === "weapon") && !itemData.proficient ) parts.pop();

    // Define Critical threshold
    let crit = 20;
    if ( this.data.type === "weapon" ) crit = this.actor.getFlag("dnd5e", "weaponCriticalThreshold") || 20;

    // Define Roll Data
    const rollData = duplicate(actorData);
    rollData.item = itemData;
    const title = `${this.name} - Attack Roll`;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      actor: this.actor,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      critical: crit,
      dialogOptions: {
        width: 400,
        top: options.event ? options.event.clientY - 80 : null,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Place a damage roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the Dice5e.damageRoll logic for the core implementation
   */
  rollDamage({event, versatile=false}={}) {
    const itemData = this.data.data;
    const actorData = this.actor.data.data;
    if ( !this.hasDamage ) {
      throw new Error("You may not make a Damage Roll with this Item.");
    }

    // Determine ability score modifier
    let abl = itemData.ability;
    if ( !abl && (this.data.type === "spell") ) abl = actorData.attributes.spellcasting || "int";
    else if ( !abl ) abl = "str";

    // Define Roll parts
    const parts = itemData.damage.parts.map(d => d[0]);
    if ( versatile && itemData.damage.versatile ) parts[0] = itemData.damage.versatile;
    if ( (this.data.type === "spell") && (itemData.scaling.mode === "cantrip") ) {
      const lvl = this.actor.data.type === "character" ? actorData.details.level.value : actorData.details.cr;
      this._scaleCantripDamage(parts, lvl, itemData.scaling.formula );
    }

    // Define Roll Data
    const rollData = mergeObject(duplicate(actorData), {
      item: itemData,
      mod: actorData.abilities[abl].mod,
      prof: actorData.attributes.prof
    });
    const title = `${this.name} - Damage Roll`;
    const flavor = this.labels.damageTypes.length ? `${title} (${this.labels.damageTypes})` : title;

    // Call the roll helper utility
    Dice5e.damageRoll({
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
   * Place an attack roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  async rollFormula(options={}) {
    const itemData = this.data.data;
    const actorData = this.actor.data.data;
    if ( !itemData.formula ) {
      throw new Error("This Item does not have a formula to roll!");
    }

    // Define Roll Data
    const rollData = duplicate(actorData);
    rollData.item = itemData;
    const title = `${this.name} - Other Formula`;

    const roll = new Roll(itemData.formula, rollData).roll();
    return roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: itemData.chatFlavor || title,
      rollMode: game.settings.get("core", "rollMode")
    });
  }

  /* -------------------------------------------- */

  /**
   * Use a consumable item
   */
  rollConsumable(options={}) {
    let itemData = this.data.data;
    const labels = this.labels;
    const formula = itemData.damage ? labels.damage : itemData.formula;

    // Submit the roll to chat
    if ( formula ) {
      new Roll(formula).toMessage({
        speaker: ChatMessage.getSpeaker({actor: this.actor}),
        flavor: `Consumes ${this.name}`
      });
    } else {
      ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({actor: this.actor}),
        content: `Consumes ${this.name}`
      })
    }

    // Deduct consumed charges from the item
    if ( itemData.uses.autoUse ) {
      let q = itemData.quantity;
      let c = itemData.uses.value;

      // Deduct an item quantity
      if ( c <= 1 && q > 1 ) {
        this.actor.updateOwnedItem({
          id: this.data.id,
          'data.quantity': Math.max(q - 1, 0),
          'data.uses.value': itemData.uses.max
        }, true);
      }

      // Optionally destroy the item
      else if ( c <= 1 && q <= 1 && itemData.uses.autoDestroy ) {
        this.actor.deleteOwnedItem(this.data.id);
      }

      // Deduct the remaining charges
      else {
        this.actor.updateOwnedItem({id: this.data.id, 'data.uses.value': Math.max(c - 1, 0)});
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Perform an ability recharge test for an item which uses the d6 recharge mechanic
   * @prarm {Object} options
   */
  async rollRecharge(options={}) {
    const data = this.data.data;
    if ( !data.recharge.value ) return;

    // Roll the check
    const roll = new Roll("1d6").roll();
    const success = roll.total >= parseInt(data.recharge.value);

    // Display a Chat Message
    const rollMode = game.settings.get("core", "rollMode");
    const chatData = {
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      flavor: `${this.name} recharge check - ${success ? "success!" : "failure!"}`,
      whisper: ( ["gmroll", "blindroll"].includes(rollMode) ) ? ChatMessage.getWhisperIDs("GM") : null,
      blind: rollMode === "blindroll",
      roll: roll,
      speaker: {
        actor: this.actor._id,
        token: this.actor.token,
        alias: this.actor.name
      }
    };

    // Update the Item data
    const promises = [ChatMessage.create(chatData)];
    if ( success ) promises.push(this.update({"data.recharge.charged": true}));
    return Promise.all(promises);
  }

  /* -------------------------------------------- */

  /**
   * Roll a Tool Check
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollToolCheck(options={}) {
    if ( this.type !== "tool" ) throw "Wrong item type!";
    const itemData = this.data.data;

    // Prepare roll data
    let rollData = duplicate(this.actor.data.data),
      abl = itemData.ability || "int",
      parts = [`@abilities.${abl}.mod`, "@proficiency"],
      title = `${this.name} - Tool Check`;
    rollData["ability"] = abl;
    rollData["proficiency"] = Math.floor((itemData.proficient || 0) * rollData.attributes.prof);

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      data: rollData,
      template: "systems/dnd5e/templates/chat/tool-roll-dialog.html",
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: `${this.name} - ${CONFIG.DND5E.abilities[abl]} Check`,
      dialogOptions: {
        width: 400,
        top: options.event ? event.clientY - 80 : null,
        left: window.innerWidth - 710,
      },
      onClose: (html, parts, data) => {
        abl = html.find('[name="ability"]').val();
        data.ability = abl;
        parts[1] = `@abilities.${abl}.mod`;
      }
    });
  }

  /* -------------------------------------------- */

  static chatListeners(html) {
    html.on('click', '.card-buttons button', this._onChatCardAction.bind(this));
  }

  /* -------------------------------------------- */

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

    // Get card targets
    const targets = isTargetted ? this._getChatCardTargets(card) : [];

    // Attack and Damage Rolls
    if ( action === "attack" ) await item.rollAttack({event});
    else if ( action === "damage" ) await item.rollDamage({event});
    else if ( action === "versatile" ) await item.rollDamage({event, versatile: true});
    else if ( action === "formula" ) await item.rollFormula({event});

    // Saving Throws for card targets
    else if ( action === "save" ) {
      for ( let t of targets ) {
        await t.rollAbilitySave(button.dataset.ability, {event});
      }
    }

    // Consumable usage
    else if ( action === "consume" ) await item.rollConsumable({event});

    // Tool usage
    else if ( action === "toolCheck" ) await item.rollToolCheck({event});

    // Re-enable the button
    button.disabled = false;
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
      const tokenData = scene.getEmbeddedEntity("tokens", tokenId);
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
   * @return {Array.<Actor>}      The Actor entity or null
   * @private
   */
  static _getChatCardTargets(card) {
    const character = game.user.character;
    const controlled = canvas.tokens.controlled;
    const targets = controlled.reduce((arr, t) => t.actor ? arr.concat([t.actor]) : arr, []);
    if ( character && (controlled.length === 0) ) targets.push(character);
    if ( !targets.length ) throw new Error(`You must designate a specific Token as the roll target`);
    return targets;
  }
}
