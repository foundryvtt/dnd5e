import { Dice5e } from "../dice.js";

/**
 * Override and extend the basic :class:`Item` implementation
 */
export class Item5e extends Item {

  get hasAttack() {
    return ["matk", "ratk", "satk"].includes(this.data.data.actionType)
  }

  get hasDamage() {
    return !!(this.data.data.damage && this.data.data.damage.parts.length);
  }

  get isVersatile() {
    return !!(this.hasDamage && this.data.data.damage.versatile);
  }

  get hasSave() {
    return !!(this.data.data.save && this.data.data.save.ability);
  }

  /* -------------------------------------------- */

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData(item) {
    super.prepareData(item);
    const C = CONFIG.DND5E;

    // Spell Items
    if ( item.type === "spell" ) {

      // Spell Level and School
      item.data.level.label = C.spellLevels[item.data.level.value];
      item.data.school.label = C.spellSchools[item.data.school.value];

      // Spell Components Label
      let comps = item.data.components;
      comps.label = Object.entries(comps).map(c => c[1] === true ? c[0].titleCase().slice(0,1) : null).filterJoin(",");
    }

    // Feat Items
    else if ( item.type === "feat" ) {
      const act = item.data.activation;
      if ( act && (act.type === C.abilityActivationTypes.legendary) ) item.data.featType = "Legendary Action";
      else if ( act && (act.type === C.abilityActivationTypes.lair) ) item.data.featType = "Lair Action";
      else if ( act && act.type ) {
        item.data.featType = item.data.damage.length ? "Attack" : "Action";
      }
      else item.data.featType = "Passive";
    }

    // Equipment Items
    else if ( item.type === "equipment" ) {
      item.data.armor.label = item.data.armor.value ? `${item.data.armor.value} AC` : "";
    }

    // Activated Items
    if ( item.data.hasOwnProperty("activation") ) {

      // Ability Activation Label
      let act = item.data.activation || {};
      if (act) act.label = [act.cost, C.abilityActivationTypes[act.type]].filterJoin(" ");

      // Target Label
      let tgt = item.data.target || {};
      if (["none", "touch", "self"].includes(tgt.units)) tgt.value = null;
      if (["none", "self"].includes(tgt.type)) {
        tgt.value = null;
        tgt.units = null;
      }
      tgt.label = [tgt.value, C.distanceUnits[tgt.units], C.targetTypes[tgt.type]].filterJoin(" ");

      // Range Label
      let rng = item.data.range || {};
      if (["none", "touch", "self"].includes(rng.units) || (rng.value === 0)) {
        rng.value = null;
        rng.long = null;
      }
      rng.label = [rng.value, C.distanceUnits[rng.units]].filterJoin(" ");

      // Duration Label
      let dur = item.data.duration || {};
      if (["inst", "perm"].includes(dur.units)) dur.value = null;
      dur.label = [dur.value, C.timePeriods[dur.units]].filterJoin(" ");

      // Recharge Label
      let chg = item.data.recharge || {};
      chg.label = chg.value ? (parseInt(chg.value) === 6 ? `Recharge [6]` : `Recharge [${chg.value}-6]`) : "";
    }

    // Item Actions
    if ( item.data.hasOwnProperty("actionType") ) {

      // Save DC
      let save = item.data.save || {};
      if ( !save.ability ) save.dc = null;
      save.label = save.ability ? `DC ${save.dc || ""} ${C.abilities[save.ability]}` : "";

      // Damage
      let dam = item.data.damage || {};
      if ( dam.parts ) dam.label = dam.parts.map(d => d[0]).join(" + ").replace(/\+ -/g, "- ");
    }
    return item;
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
      hasAttack: this.hasAttack,
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
  /*  Chat Card Data
  /* -------------------------------------------- */

  getChatData(htmlOptions) {
    const data = this[`_${this.data.type}ChatData`]();
    data.description.value = enrichHTML(data.description.value, htmlOptions);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for equipment type items
   * @private
   */
  _equipmentChatData() {
    const data = duplicate(this.data.data);
    const properties = [
      CONFIG.DND5E.armorTypes[data.armor.type],
      data.armor.label || null,
      data.equipped ? "Equipped" : "Not Equipped",
      data.proficient ? "Proficient": "Not Proficient",
      data.stealth.value ? "Stealth Disadvantage" : null,
    ];
    data.properties = properties.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for weapon type items
   * @private
   */
  _weaponChatData() {
    const data = duplicate(this.data.data);
    const properties = [
      CONFIG.DND5E.weaponTypes[data.weaponType],
      data.activation.label,
      data.range.label,
      data.proficient ? "Proficient" : "Not Proficient"
    ];
    data.properties = properties.filter(p => !!p);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for consumable type items
   * @private
   */
  _consumableChatData() {
    const data = duplicate(this.data.data);
    data.properties = [
      CONFIG.DND5E.consumableTypes[data.consumableType],
      data.charges.value + "/" + data.charges.max + " Charges"
    ];
    data.hasCharges = data.charges.value >= 0;
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for tool type items
   * @private
   */
  _toolChatData() {
    const data = duplicate(this.data.data);
    const properties = [
      CONFIG.DND5E.abilities[data.ability] || null,
      CONFIG.DND5E.proficiencyLevels[data.proficient || 0]
    ];
    data.properties = properties.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for tool type items
   * @private
   */
  _lootChatData() {
    const data = duplicate(this.data.data);
    data.properties = [
      "Loot",
      data.weight ? data.weight + " lbs." : null
    ].filter(p => !!p);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Render a chat card for Spell type data
   * @return {Object}
   * @private
   */
  _spellChatData() {
    const data = duplicate(this.data.data);
    const ad = this.actor.data.data;

    // Spell saving throw text
    const abl = data.ability || ad.attributes.spellcasting || "int";
    if ( this.hasSave && !data.save.dc ) data.save.dc = 8 + ad.abilities[abl].mod + ad.attributes.prof;
    data.save.label = `DC ${data.save.dc} ${CONFIG.DND5E.abilities[data.save.ability]}`;

    // Combine properties
    const props = [
      data.level.label,
      data.components.label,
      data.target.label,
      data.activation.label,
      data.range.label,
      data.duration.label,
    ];
    data.properties = props.filter(p => !!p);
    return data;
  }


  /* -------------------------------------------- */

  /**
   * Prepare chat card data for items of the "Feat" type
   */
  _featChatData() {
    const data = duplicate(this.data.data);
    const ad = this.actor.data.data;

    // Spell saving throw text
    const abl = data.ability || ad.attributes.spellcasting || "str";
    if ( this.hasSave && !data.save.dc ) data.save.dc = 8 + ad.abilities[abl].mod + ad.attributes.prof;
    data.save.label = `DC ${data.save.dc} ${CONFIG.DND5E.abilities[data.save.ability]}`;

    // Feat properties
    const props = [
      data.requirements,
      data.target.label,
      data.activation.label,
      data.range.label,
      data.duration.label,
    ];
    data.properties = props.filter(p => p);
    return data;
  }

  /* -------------------------------------------- */
  /*  Item Rolls - Attack, Damage, Saves, Checks  */
  /* -------------------------------------------- */

  /**
   * Place an attack roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollAttack(event) {
    const itemData = this.data.data;
    const actorData = this.actor.data.data;
    if ( !["matk", "ratk", "satk"].includes(itemData.actionType) ) {
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
      event: event,
      parts: parts,
      actor: this.actor,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      critical: crit,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Place a damage roll using an item (weapon, feat, spell, or equipment)
   * Rely upon the Dice5e.damageRoll logic for the core implementation
   */
  rollDamage(event, {versatile=false}={}) {
    const itemData = this.data.data;
    const actorData = this.actor.data.data;
    if ( !itemData.damage || (itemData.damage.length === 0) ) {
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

    // Call the roll helper utility
    Dice5e.damageRoll({
      event: event,
      parts: parts,
      actor: this.actor,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
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
   * Roll Spell Damage
   * Rely upon the Dice5e.damageRoll logic for the core implementation
   */
  rollSpellDamage(event) {
    if ( this.type !== "spell" ) throw "Wrong item type!";

    // Get data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || rollData.attributes.spellcasting || "int",
        parts = [itemData.damage.value],
        isHeal = itemData.spellType.value === "heal",
        dtype = CONFIG.DND5E.damageTypes[itemData.damageType.value];

    // Append damage type to title
    let title = this.name + (isHeal ? " - Healing" : " - Damage");
    if ( dtype && !isHeal ) title += ` (${dtype})`;

    // Add item to roll data
    rollData["mod"] = rollData.abilities[abl].mod;
    rollData.item = itemData;

    // Call the roll helper utility
    Dice5e.damageRoll({
      event: event,
      parts: parts,
      data: rollData,
      actor: this.actor,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Use a consumable item
   */
  rollConsumable(event) {
    let itemData = this.data.data;
    const formula = itemData.damage ? itemData.damage.label : itemData.formula;

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

  async rollRecharge() {
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
  rollToolCheck(event) {
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
      event: event,
      parts: parts,
      data: rollData,
      template: "systems/dnd5e/templates/chat/tool-roll-dialog.html",
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: (parts, data) => `${this.name} - ${CONFIG.DND5E.abilities[abl]} Check`,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
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

  /**
   * Roll a Feat Attack
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollFeatAttack(event) {
    if ( this.type !== "feat" ) throw "Wrong item type!";

    // Prepare roll data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = [`@abilities.${abl}.mod`, "@attributes.prof"],
        title = `${this.name} - Attack Roll`;
    rollData.item = itemData;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Feat Damage
   * Rely upon the Dice5e.damageRoll logic for the core implementation
   */
  rollFeatDamage(event) {
    if ( this.type !== "feat" ) throw "Wrong item type!";

    // Get data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = [itemData.damage.value],
        dtype = CONFIG.DND5E.damageTypes[itemData.damageType.value];

    // Append damage type to title
    let title = `${this.name} - Damage`;
    if ( dtype ) title += ` (${dtype})`;

    // Add item data to roll
    rollData["mod"] = rollData.abilities[abl].mod;
    rollData.item = itemData;

    // Call the roll helper utility
    Dice5e.damageRoll({
      event: event,
      parts: parts,
      data: rollData,
      actor: this.actor,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  static chatListeners(html) {

    // Chat card actions
    html.on('click', '.card-buttons button', ev => {
      ev.preventDefault();

      // Extract card data
      const button = $(ev.currentTarget),
            messageId = button.parents('.message').data("messageId"),
            senderId = game.messages.get(messageId).user._id,
            card = button.parents('.chat-card');

      // Confirm roll permission
      if ( !game.user.isGM && ( game.user._id !== senderId )) return;

      // Get the Actor from a synthetic Token
      let actor;
      const tokenKey = card.data("tokenId");
      if ( tokenKey ) {
        const [sceneId, tokenId] = tokenKey.split(".");
        let token;
        if ( sceneId === canvas.scene._id ) token = canvas.tokens.get(tokenId);
        else {
          const scene = game.scenes.get(sceneId);
          if ( !scene ) return;
          let tokenData = scene.data.tokens.find(t => t.id === Number(tokenId));
          if ( tokenData ) token = new Token(tokenData);
        }
        if ( !token ) return;
        actor = Actor.fromToken(token);
      } else actor = game.actors.get(card.data('actorId'));

      // Get the Item
      if ( !actor ) return;
      const itemId = Number(card.data("itemId"));
      const item = actor.getOwnedItem(itemId);

      // Get the Action
      const action = button.data("action");

      // Attack and Damage Rolls
      // TODO these action tags should be collapsed
      if ( ["attack", "spellAttack", "featAttack"].includes(action ) ) item.rollAttack(ev);
      if ( ["damage", "spellDamage", "featDamage"].includes(action) ) item.rollDamage(ev);
      else if ( action === "versatile" ) item.rollDamage(ev, {versatile: true});

      // Consumable usage
      else if ( action === "consume" ) item.rollConsumable(ev);

      // Tool usage
      else if ( action === "toolCheck" ) item.rollToolCheck(ev);
    });
  }
}
