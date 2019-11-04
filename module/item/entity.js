import { Dice5e } from "../dice.js";

/**
 * Override and extend the basic :class:`Item` implementation
 */
export class Item5e extends Item {

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
      if ( item.data.activation.type === C.abilityActivationTypes.legendary ) item.data.featType = "Legendary Action";
      else if ( item.data.activation.type === C.abilityActivationTypes.lair ) item.data.featType = "Lair Action";
      else if ( item.data.activation.type ) {
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
      if (["none", "touch"].includes(tgt.units)) tgt.value = null;
      tgt.label = [tgt.value, C.distanceUnits[tgt.units], C.targetTypes[tgt.type]].filterJoin(" ");

      // Range Label
      let rng = item.data.range || {};
      if (["none", "touch"].includes(rng.units)) rng.value = null;
      else if (rng.value === 0) rng.units = null;
      rng.label = [rng.value, C.distanceUnits[rng.units]].filterJoin(" ");

      // Duration Label
      let dur = item.data.duration || {};
      if (["inst", "perm"].includes(dur.units)) dur.value = null;
      dur.label = [dur.value, C.timePeriods[dur.units]].filterJoin(" ");
    }

    // Item Actions
    if ( item.data.hasOwnProperty("actionType") ) {

      // Save DC
      let save = item.data.save || {};
      if ( !save.ability ) save.dc = null;
      save.label = save.ability ? `DC ${save.dc} ${C.abilities[save.ability]}` : "";

      // Damage
      let dam = item.data.damage || {};
      if ( !(dam instanceof Array) && (dam[0] !== undefined) ) dam = [Object.values(dam[0])];
      item.data.damageFormula = item.data.damage.map(d => d[0]).join(" + ").replace(/\+ -/g, "- ");
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
    const template = `public/systems/dnd5e/templates/chat/${this.data.type}-card.html`
    const token = this.actor.token;
    const templateData = {
      actor: this.actor,
      tokenId: token ? `${token.scene._id}.${token.id}` : null,
      item: this.data,
      data: this.getChatData()
    };

    // Basic chat message data
    const chatData = {
      user: game.user._id,
      type: CHAT_MESSAGE_TYPES.OTHER,
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

    // Render the template
    chatData["content"] = await renderTemplate(template, templateData);

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

  _equipmentChatData() {
    const data = duplicate(this.data.data);
    const properties = [
      CONFIG.DND5E.armorTypes[data.armorType.value],
      data.armor.value + " AC",
      data.equipped.value ? "Equipped" : null,
      data.stealth.value ? "Stealth Disadv." : null,
    ];
    data.properties = properties.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  _weaponChatData() {
    const data = duplicate(this.data.data);
    const properties = [
      data.range.value,
      CONFIG.DND5E.weaponTypes[data.weaponType.value],
      data.proficient.value ? "" : "Not Proficient"
    ];
    data.properties = properties.filter(p => !!p);
    return data;
  }

  /* -------------------------------------------- */

  _consumableChatData() {
    const data = duplicate(this.data.data);
    data.consumableType.str = CONFIG.DND5E.consumableTypes[data.consumableType.value];
    data.properties = [data.consumableType.str, data.charges.value + "/" + data.charges.max + " Charges"];
    data.hasCharges = data.charges.value >= 0;
    return data;
  }

  /* -------------------------------------------- */

  _toolChatData() {
    const data = duplicate(this.data.data);
    let abl = this.actor.data.data.abilities[data.ability.value].label,
        prof = data.proficient.value || 0;
    const properties = [abl, CONFIG.DND5E.proficiencyLevels[prof]];
    data.properties = properties.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  _backpackChatData() {
    const data = duplicate(this.data.data);
    data.properties = [];
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Render a chat card for Spell type data
   * @return {Object}
   * @private
   */
  _spellChatData() {
    const data = duplicate(this.data.data),
          ad = this.actor.data.data;

    // Spell saving throw text and DC
    data.isSave = data.spellType.value === "save";
    if ( data.ability.value ) data.save.dc = 8 + ad.abilities[data.ability.value].mod + ad.attributes.prof.value;
    else data.save.dc = ad.attributes.spelldc.value;
    data.save.str = data.save.value ? this.actor.data.data.abilities[data.save.value].label : "";

    // Spell attack labels
    data.damageLabel = data.spellType.value === "heal" ? "Healing" : "Damage";
    data.isAttack = data.spellType.value === "attack";

    // Combine properties
    const props = [
      CONFIG.DND5E.spellSchools[data.school.value],
      CONFIG.DND5E.spellLevels[data.level.value],
      data.components.value,
      data.target.value,
      data.range.value,
      data.time.value,
      data.duration.value,
      data.concentration.value ? "Concentration" : null,
      data.ritual.value ? "Ritual" : null
    ];
    data.properties = props.filter(p => !!p);
    return data;
  }


  /* -------------------------------------------- */

  /**
   * Prepare chat card data for items of the "Feat" type
   */
  _featChatData() {
    const data = duplicate(this.data.data),
          ad = this.actor.data.data;

    // Feat button actions
    data.isSave = data.save.value !== "";
    if ( data.isSave ) {
      let abl = data.ability.value || ad.attributes.spellcasting.value || "str";
      data.save.dc = 8 + ad.abilities[abl].mod + ad.attributes.prof.value;
      data.save.str = data.save.value ? this.actor.data.data.abilities[data.save.value].label : "";
    }

    // Feat attack attributes
    data.isAttack = data.featType.value === "attack";

    // Feat properties
    const props = [
      data.requirements.value,
      data.target.value,
      data.range.value,
      data.time.value,
      data.duration.value
    ];
    data.properties = props.filter(p => p);
    return data;
  }

  /* -------------------------------------------- */
  /*  Roll Attacks
  /* -------------------------------------------- */

  /**
   * Roll a Weapon Attack
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollWeaponAttack(event) {
    if ( this.type !== "weapon" ) throw "Wrong item type!";

    // Prepare roll data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = ["@item.bonus.value", `@abilities.${abl}.mod`, "@attributes.prof.value"],
        title = `${this.name} - Attack Roll`;
    rollData.item = itemData;
    if ( !itemData.proficient.value ) parts.pop();

    // Allow for expanded critical range
    let critThreshold = this.actor.getFlag("dnd5e", "weaponCriticalThreshold") || 20;

    // TODO: Incorporate Elven Accuracy

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      actor: this.actor,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      critical: critThreshold,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Weapon Damage
   * Rely upon the Dice5e.damageRoll logic for the core implementation
   */
  rollWeaponDamage(event, alternate=false) {
    if ( this.type !== "weapon" ) throw "Wrong item type!";

    // Get data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = [alternate ? itemData.damage2.value : itemData.damage.value, `@abilities.${abl}.mod`],
        dtype = CONFIG.DND5E.damageTypes[alternate ? itemData.damage2Type.value : itemData.damageType.value];

    // Append damage type to title
    let title = `${this.name} - Damage`;
    if ( dtype ) title += ` (${dtype})`;

    // Call the roll helper utility
    rollData.item = itemData;
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
   * Roll Spell Damage
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollSpellAttack(event) {
    if ( this.type !== "spell" ) throw "Wrong item type!";

    // Prepare roll data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || rollData.attributes.spellcasting.value || "int",
        parts = [`@abilities.${abl}.mod`, "@attributes.prof.value"],
        title = `${this.name} - Spell Attack Roll`;

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
   * Roll Spell Damage
   * Rely upon the Dice5e.damageRoll logic for the core implementation
   */
  rollSpellDamage(event) {
    if ( this.type !== "spell" ) throw "Wrong item type!";

    // Get data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || rollData.attributes.spellcasting.value || "int",
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
  rollConsumable(ev) {
    let itemData = this.data.data;

    // Submit the roll to chat
    let cv = itemData['consume'].value,
        content = `Uses ${this.name}`;
    if ( cv ) {
      new Roll(cv).toMessage({
        speaker: ChatMessage.getSpeaker({actor: this.actor}),
        flavor: content
      });
    } else {
      ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({actor: this.actor}),
        content: content
      })
    }

    // Deduct consumed charges from the item
    if ( itemData['autoUse'].value ) {
      let qty = itemData['quantity'],
          chg = itemData['charges'];

      // Deduct an item quantity
      if ( chg.value <= 1 && qty.value > 1 ) {
        this.actor.updateOwnedItem({
          id: this.data.id,
          'data.quantity.value': Math.max(qty.value - 1, 0),
          'data.charges.value': chg.max
        }, true);
      }

      // Optionally destroy the item
      else if ( chg.value <= 1 && qty.value <= 1 && itemData['autoDestroy'].value ) {
        this.actor.deleteOwnedItem(this.data.id);
      }

      // Deduct the remaining charges
      else {
        this.actor.updateOwnedItem({id: this.data.id, 'data.charges.value': Math.max(chg.value - 1, 0)});
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Roll a Tool Check
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollToolCheck(event) {
    if ( this.type !== "tool" ) throw "Wrong item type!";

    // Prepare roll data
    let rollData = duplicate(this.actor.data.data),
      abl = this.data.data.ability.value || "int",
      parts = [`@abilities.${abl}.mod`, "@proficiency"],
      title = `${this.name} - Tool Check`;
    rollData["ability"] = abl;
    rollData["proficiency"] = Math.floor((this.data.data.proficient.value || 0) * rollData.attributes.prof.value);

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: rollData,
      template: "public/systems/dnd5e/templates/chat/tool-roll-dialog.html",
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: (parts, data) => `${this.name} - ${data.abilities[data.ability].label} Check`,
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
        parts = [`@abilities.${abl}.mod`, "@attributes.prof.value"],
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

      // Weapon attack
      if ( action === "weaponAttack" ) item.rollWeaponAttack(ev);
      else if ( action === "weaponDamage" ) item.rollWeaponDamage(ev);
      else if ( action === "weaponDamage2" ) item.rollWeaponDamage(ev, true);

      // Spell actions
      else if ( action === "spellAttack" ) item.rollSpellAttack(ev);
      else if ( action === "spellDamage" ) item.rollSpellDamage(ev);

      // Feat actions
      else if ( action === "featAttack" ) item.rollFeatAttack(ev);
      else if ( action === "featDamage" ) item.rollFeatDamage(ev);

      // Consumable usage
      else if ( action === "consume" ) item.rollConsumable(ev);

      // Tool usage
      else if ( action === "toolCheck" ) item.rollToolCheck(ev);
    });
  }
}
