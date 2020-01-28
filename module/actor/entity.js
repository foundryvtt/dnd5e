import { Dice5e } from "../dice.js";
import { ShortRestDialog } from "../apps/short-rest.js";
import { ShortRestV2Dialog } from "../apps/short-rest-v2.js";
import { SpellCastDialog } from "../apps/spell-cast-dialog.js";
import { AbilityTemplate } from "../pixi/ability-template.js";

import { ClassHelper } from "./class-helper.js";

/**
 * Extend the base Actor class to implement additional logic specialized for D&D5e.
 */
export class Actor5e extends Actor {

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // Get the Actor's data object
    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags;

    // Prepare Character data
    if ( actorData.type === "character" ) this._prepareCharacterData(actorData);
    else if ( actorData.type === "npc" ) this._prepareNPCData(data);

    // Ranged Weapon/Melee Weapon/Ranged Spell/Melee Spell attack bonuses are added when rolled since they are not a fixed value.
    // Damage bonus added when rolled since not a fixed value.

    // Ability modifiers and saves
    // Character All Ability Check" and All Ability Save bonuses added when rolled since not a fixed value.
    for (let abl of Object.values(data.abilities)) {
      abl.mod = Math.floor((abl.value - 10) / 2);
      abl.save = abl.mod + ((abl.proficient || 0) * data.attributes.prof);
    }

    // Skill modifiers
    for (let skl of Object.values(data.skills)) {
      skl.value = parseFloat(skl.value || 0);
      skl.bonus = parseInt(skl.bonus || 0);
      skl.mod = data.abilities[skl.ability].mod + skl.bonus + Math.floor(skl.value * data.attributes.prof);
      skl.passive = 10 + skl.mod;
    }

    // Initiative
    const init = data.attributes.init;
    init.mod = data.abilities.dex.mod;
    init.prof = getProperty(flags, "dnd5e.initiativeHalfProf") ? Math.floor(0.5 * data.attributes.prof) : 0;
    init.bonus = init.value + (getProperty(flags, "dnd5e.initiativeAlert") ? 5 : 0);
    init.total = init.mod + init.prof + init.bonus;

    // Spell DC
    data.attributes.spelldc = this.getSpellDC(data.attributes.spellcasting);
  }

  /* -------------------------------------------- */

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {

    let level = ClassHelper.getLevelByClasses(actorData);

    // Level, experience, and proficiency
    actorData.data.details.level.value = level;;
    actorData.data.details.xp.max = this.getLevelExp(level || 1);
    const prior = this.getLevelExp(level - 1 || 0);
    const req = actorData.data.details.xp.max - prior;
    actorData.data.details.xp.pct = Math.clamped(0, Math.round((actorData.data.details.xp.value -prior) * 100 / req), 99.5);
    actorData.data.attributes.prof = Math.floor((actorData.data.details.level.value + 7) / 4);
  }

  /* -------------------------------------------- */

  /**
   * Prepare NPC type specific data
   */
  _prepareNPCData(data) {

    // Kill Experience
    data.details.xp.value = this.getCRExp(data.details.cr);

    // Proficiency
    data.attributes.prof = Math.floor((Math.max(data.details.cr, 1) + 7) / 4);

    // Spellcaster Level
    if ( data.attributes.spellcasting && !data.details.spellLevel ) {
      data.details.spellLevel = Math.max(data.details.cr, 1);
    }
  }

  /* -------------------------------------------- */

  /**
   * Return the amount of experience required to gain a certain character level.
   * @param level {Number}  The desired level
   * @return {Number}       The XP required
   */
  getLevelExp(level) {
    const levels = CONFIG.DND5E.CHARACTER_EXP_LEVELS;
    return levels[Math.min(level, levels.length - 1)];
  }

  /* -------------------------------------------- */

  /**
   * Return the amount of experience granted by killing a creature of a certain CR.
   * @param cr {Number}     The creature's challenge rating
   * @return {Number}       The amount of experience granted per kill
   */
  getCRExp(cr) {
    if (cr < 1.0) return Math.max(200 * cr, 10);
    return CONFIG.DND5E.CR_EXP_LEVELS[cr];
  }

  /* -------------------------------------------- */

  /**
   * Return the spell DC for this actor using a certain ability score
   * @param {string} ability    The ability score, i.e. "str"
   * @return {number}           The spell DC
   */
  getSpellDC(ability) {
    const bonus = this.getFlag("dnd5e", "spellDCBonus") || 0;
    ability = this.data.data.abilities[ability];
    const prof = this.data.data.attributes.prof;
    return 8 + (ability ? ability.mod : 0) + prof + bonus;
  }

  /* -------------------------------------------- */
  /*  Socket Listeners and Handlers
  /* -------------------------------------------- */

  /** @override */
  static async create(data, options={}) {
    data.token = data.token || {};
    if ( data.type === "character" ) {
      mergeObject(data.token, {
        vision: true,
        dimSight: 30,
        brightSight: 0,
        actorLink: true,
        disposition: 1
      }, {overwrite: false});
    }
    return super.create(data, options);
  }

  /* -------------------------------------------- */

  /** @override */
  async update(data, options={}) {

    // Apply changes in Actor size to Token width/height
    const newSize = data["data.traits.size"];
    if ( newSize !== getProperty(this.data, "data.traits.size") ) {
      let size = CONFIG.DND5E.tokenSizes[newSize];
      if ( this.isToken ) this.token.update({height: size, width: size});
      else if ( !data["token.width"] && !hasProperty(data, "token.width") ) {
        data["token.height"] = size;
        data["token.width"] = size;
      }
    }
    return super.update(data, options);
  }

  /* -------------------------------------------- */

  /** @override */
  async createOwnedItem(itemData, options) {

    // Assume NPCs are always proficient with weapons and always have spells prepared
    if ( !this.isPC ) {
      let t = itemData.type;
      let initial = {};
      if ( t === "weapon" ) initial["data.proficient"] = true;
      if ( ["weapon", "equipment"].includes(t) ) initial["data.equipped"] = true;
      if ( t === "spell" ) initial["data.prepared"] = true;
      mergeObject(itemData, initial);
    }
    return super.createOwnedItem(itemData, options);
  }

  /* -------------------------------------------- */

  /** @override */
  async modifyTokenAttribute(attribute, value, isDelta) {
    if ( attribute !== "attributes.hp" ) return super.modifyTokenAttribute(attribute, value, isDelta);

    // Get current and delta HP
    const hp = getProperty(this.data.data, attribute);
    const tmp = parseInt(hp.temp) || 0;
    const current = hp.value + tmp;
    const max = hp.max + (parseInt(hp.tempmax) || 0);
    const delta = isDelta ? value : value - current;

    // For negative changes, deduct from temp HP
    let dtmp = delta < 0 ? Math.max(-1*tmp, delta) : 0;
    let dhp = delta - dtmp;
    return this.update({
      "data.attributes.hp.temp": tmp + dtmp,
      "data.attributes.hp.value": Math.clamped(hp.value + dhp, 0, max)
    });
  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */

  /**
   * Cast a Spell, consuming a spell slot of a certain level
   * @param {Item5e} item   The spell being cast by the actor
   * @param {Event} event   The originating user interaction which triggered the cast 
   */
  async useSpell(item, {configureDialog=true}={}) {
    if ( item.data.type !== "spell" ) throw new Error("Wrong Item type");

    // Determine if the spell uses slots
    let lvl = item.data.data.level;
    const usesSlots = (lvl > 0) && item.data.data.preparation.mode === "prepared";
    if ( !usesSlots ) return item.roll();

    // Configure the casting level and whether to consume a spell slot
    let consume = true;
    let placeTemplate = false;
        
    if ( configureDialog ) {
      const spellFormData = await SpellCastDialog.create(this, item);
      lvl = parseInt(spellFormData.get("level"));
      consume = Boolean(spellFormData.get("consume"));
      placeTemplate = Boolean(spellFormData.get("placeTemplate"));
      if ( lvl !== item.data.data.level ) {
        item = item.constructor.createOwned(mergeObject(item.data, {"data.level": lvl}, {inplace: false}), this);
      } 
    }

    // Update Actor data
    if ( consume && (lvl > 0) ) {
      await this.update({
        [`data.spells.spell${lvl}.value`]: Math.max(parseInt(this.data.data.spells["spell"+lvl].value) - 1, 0)
      });
    }

    // Initiate ability template placement workflow if selected
    if (item.hasAreaTarget && placeTemplate) {
      const template = AbilityTemplate.fromItem(item);
      if ( template ) template.drawPreview(event);
      if (this.sheet) this.sheet.minimize();
    }

    // Invoke the Item roll
    return item.roll();
  }

  /* -------------------------------------------- */

  /**
   * Roll a Skill Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {string} skillId      The skill id (e.g. "ins")
   * @param {Object} options      Options which configure how the skill check is rolled
   */
  rollSkill(skillId, options={}) {
    const skl = this.data.data.skills[skillId];
    const parts = ["@mod"];
    var data = {mod: skl.mod};

    const sklBonus = getProperty(this.data.data, "bonuses.skillCheck");
    if (![undefined, "", "0"].includes(sklBonus)) {
      parts.push("@skillBonus");
      data.skillBonus = sklBonus;
    }

    return Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      data: data,
      title: `${CONFIG.DND5E.skills[skillId]} Skill Check`,
      speaker: ChatMessage.getSpeaker({actor: this}),
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll a generic ability test or saving throw.
   * Prompt the user for input on which variety of roll they want to do.
   * @param {String}abilityId     The ability id (e.g. "str")
   * @param {Object} options      Options which configure how ability tests or saving throws are rolled
   */
  rollAbility(abilityId, options={}) {
    const label = CONFIG.DND5E.abilities[abilityId];
    new Dialog({
      title: `${label} Ability Check`,
      content: `<p>What type of ${label} check?</p>`,
      buttons: {
        test: {
          label: "Ability Test",
          callback: () => this.rollAbilityTest(abilityId, options)
        },
        save: {
          label: "Saving Throw",
          callback: () => this.rollAbilitySave(abilityId, options)
        }
      }
    }).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Roll an Ability Test
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {String} abilityId    The ability ID (e.g. "str")
   * @param {Object} options      Options which configure how ability tests are rolled
   */
  rollAbilityTest(abilityId, options={}) {
    const label = CONFIG.DND5E.abilities[abilityId];
    const abl = this.data.data.abilities[abilityId];
    const parts = ["@mod"];
    const data = {mod: abl.mod};
    const checkBonus = getProperty(this.data.data, "bonuses.abilityCheck");

    if (![undefined, "", "0"].includes(checkBonus)) {
      parts.push("@checkBonus");
      data.checkBonus = checkBonus;
    }

    return Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      data: data,
      title: `${label} Ability Test`,
      speaker: ChatMessage.getSpeaker({actor: this}),
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll an Ability Saving Throw
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {String} abilityId    The ability ID (e.g. "str")
   * @param {Object} options      Options which configure how ability tests are rolled
   */
  rollAbilitySave(abilityId, options={}) {
    const label = CONFIG.DND5E.abilities[abilityId];
    const abl = this.data.data.abilities[abilityId];
    const parts = ["@mod"];
    const data = {mod: abl.save};
    const saveBonus = getProperty(this.data.data, "bonuses.abilitySave");

    if (![undefined, "", "0"].includes(saveBonus)) {
      parts.push("@saveBonus")
      data.saveBonus = saveBonus;
    }
    
    return Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      data: data,
      title: `${label} Saving Throw`,
      speaker: ChatMessage.getSpeaker({actor: this}),
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll a hit die of the appropriate type, gaining hit points equal to the die roll plus your CON modifier
   * @param {String} formula    The hit die type to roll
   */
  rollHitDie(formula) {

    // Prepare roll data
    let parts = [formula, "@abilities.con.mod"],
        title = `Roll Hit Die`,
        rollData = duplicate(this.data.data);

    // Confirm the actor has HD available
    if ( rollData.attributes.hd.value === 0 ) throw new Error(`${this.name} has no Hit Dice remaining!`);

    // Call the roll helper utility
    return Dice5e.damageRoll({
      event: new Event("hitDie"),
      parts: parts,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this}),
      critical: false,
      dialogOptions: {width: 350}
    }).then(roll => {
      if ( !roll ) return;
      let hp = this.data.data.attributes.hp,
          dhp = Math.min(hp.max - hp.value, roll.total),
          hd = Math.max(this.data.data.attributes.hd.value - 1, 0);
      this.update({"data.attributes.hp.value": hp.value + dhp, "data.attributes.hd.value": hd});
    })
  }

  /**
   * Roll a hit die of the appropriate type, gaining hit points equal to the die roll plus your CON modifier.
   * Mark this die as "used" from the players pool of hit die.
   * @param {String} formula    The hit die type to roll
   * @param {String} featureId  The featureId of the class we are rolling
   */
  async rollSpecificHitDie(formula, featureId) {

    // Prepare roll data
    let parts = [formula, "@abilities.con.mod"],
        title = `Roll Hit Die`,
        rollData = duplicate(this.data.data);
    rollData.featureId = featureId;

    let hitDiceRemainingCount = ClassHelper.hitDiceRemainingCount(this.data);

    // Confirm the actor has HD available
    if ( hitDiceRemainingCount === 0 ) throw new Error(`${this.name} has no Hit Dice remaining!`);

    // Call the roll helper utility
    return Dice5e.damageRoll({
      event: new Event("hitDie"),
      parts: parts,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this}),
      critical: false,
      dialogOptions: {width: 350}
    }).then(roll => {
      let hp = this.data.data.attributes.hp,
          dhp = Math.min(hp.max - hp.value, roll.total),
          updateData = {};
      
      updateData["data.attributes.hp.value"] = hp.value + dhp;

      this.update(updateData);

      let activeClass = this.data.items.filter(item => item.type === "class" && item._id === roll.data.featureId);
      
      if (activeClass.length == 1) {
        let newHdUsed = Number(activeClass[0].data.hitDiceUsed) + 1;
        let id = activeClass[0]._id;

        let updateClass = [{
          "_id": id,
          "data.hitDiceUsed": newHdUsed
        }];

        this.updateManyEmbeddedEntities("OwnedItem", updateClass);
      }

      return true;
    })
  }

  /* -------------------------------------------- */

  /**
   * Cause this Actor to take a Short Rest
   * During a Short Rest resources and limited item uses may be recovered
   * @param {boolean} dialog  Present a dialog window which allows for rolling hit dice as part of the Short Rest
   * @param {boolean} chat    Summarize the results of the rest workflow as a chat message
   * @return {Promise}        A Promise which resolves once the short rest workflow has completed
   */
  async shortRest({dialog=true, chat=true}={}) {
    const data = this.data.data;

    // Take note of the initial hit points and hit dice the Actor has
    const hd0 = data.attributes.hd.value;
    const hp0 = data.attributes.hp.value;

    // Display a Dialog for rolling hit dice
    if ( dialog ) {
      const rested = await ShortRestDialog.shortRestDialog({actor: this, canRoll: hd0 > 0});
      if ( !rested ) return;
    }

    // Note the change in HP and HD which occurred
    const dhd = data.attributes.hd.value - hd0;
    const dhp = data.attributes.hp.value - hp0;

    // Recover character resources
    const updateData = {};
    for ( let [k, r] of Object.entries(data.resources) ) {
      if ( r.max && r.sr ) {
        updateData[`data.resources.${k}.value`] = r.max;
      }
    }
    await this.update(updateData);

    // Recover item uses
    const items = this.items.filter(item => item.data.data.uses && (item.data.data.uses.per === "sr"));
    const updateItems = items.map(item => {return { _id: item._id, "data.uses.value": item.data.data.uses.max}});
    await this.updateManyEmbeddedEntities("OwnedItem", updateItems);

    // Display a Chat Message summarizing the rest effects
    if ( chat ) {
      let msg = `${this.name} takes a short rest spending ${-dhd} Hit Dice to recover ${dhp} Hit Points.`;
      ChatMessage.create({
        user: game.user._id,
        speaker: {actor: this, alias: this.name},
        content: msg,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      });
    }

    // Return data summarizing the rest effects
    return {
      dhd: dhd,
      dhp: dhp,
      updateData: updateData,
      updateItems: updateItems
    }
  }

  /**
   * Cause this Actor to take a Short Rest, present Hit Dice based on the Class levels
   * During a Short Rest resources and limited item uses may be recovered
   * @param {boolean} dialog  Present a dialog window which allows for rolling hit dice as part of the Short Rest
   * @param {boolean} chat    Summarize the results of the rest workflow as a chat message
   * @return {Promise}        A Promise which resolves once the short rest workflow has completed
   */
  async shortRestV2({dialog=true, chat=true}={}) {
    const data = this.data.data;

    // Take note of the initial hit points and hit dice the Actor has
    const hd0 = ClassHelper.hitDiceRemainingCount(this.data);
    const hp0 = data.attributes.hp.value;

    // Display a Dialog for rolling hit dice
    if ( dialog ) {
      const rested = await ShortRestV2Dialog.shortRestDialog({actor: this, canRoll: hd0 > 0});
      if ( !rested ) return;
    }

    // Note the change in HP and HD which occurred
    const dhd = ClassHelper.hitDiceRemainingCount(this.data) - hd0;
    const dhp = data.attributes.hp.value - hp0;

    // Recover character resources
    const updateData = {};
    for ( let [k, r] of Object.entries(data.resources) ) {
      if ( r.max && r.sr ) {
        updateData[`data.resources.${k}.value`] = r.max;
      }
    }
    await this.update(updateData);

    // Recover item uses
    const items = this.items.filter(item => item.data.data.uses && (item.data.data.uses.per === "sr"));
    const updateItems = items.map(item => {
      return {
        "id": item.data.id,
        "data.uses.value": item.data.data.uses.max
      }
    });
    await this.updateManyEmbeddedEntities("OwnedItem", updateItems);

    // Display a Chat Message summarizing the rest effects
    if ( chat ) {
      let msg = `${this.name} takes a short rest spending ${-dhd} Hit Dice to recover ${dhp} Hit Points.`;
      ChatMessage.create({
        user: game.user._id,
        speaker: {actor: this, alias: this.name},
        content: msg,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      });
    }

    // Return data summarizing the rest effects
    return {
      dhd: dhd,
      dhp: dhp,
      updateData: updateData,
      updateItems: updateItems
    }
  }

  /**
   * Take a long rest, recovering HP, HD, resources, and spell slots
   * Base the HD on their class levels
   * @param {boolean} dialog  Present a confirmation dialog window whether or not to take a long rest
   * @param {boolean} chat    Summarize the results of the rest workflow as a chat message
   * @return {Promise}        A Promise which resolves once the long rest workflow has completed
   */
  async longRestV2({dialog=true, chat=true}={}) {
    const data = this.data.data;
    const updateData = {};

    // Maybe present a confirmation dialog
    if ( dialog ) {
      try {
        await ShortRestDialog.longRestDialog(this);
      } catch(err) {
        return;
      }
    }

    // Recover HP to full
    let dhp = data.attributes.hp.max - data.attributes.hp.value;
    updateData["data.attributes.hp.value"] = data.attributes.hp.max;

    // Recover HD to one-half level (rounded up)
    let hitDiceRecovery = [];
    let dhd = 0;
    let level = ClassHelper.getLevelByClasses(this.data);
    let numberOfHitDiceToRecover = Math.max(Math.ceil(level / 2), 1);
    let classList = ClassHelper.listClasses(this.data);
    
    classList.forEach(item => {

      if (numberOfHitDiceToRecover <= 0){
        return;
      }

      var hdUsed = item.data.hitDiceUsed;

      // We have enough remaining HD to recover everything
      if (numberOfHitDiceToRecover >= hdUsed){
        hitDiceRecovery.push({
          "_id": item._id,
          "data.hitDiceUsed": 0
        });

        dhd += hdUsed;
        numberOfHitDiceToRecover -= hdUsed;
      }
      // We don't have enough remaining HD, just recover what we can.
      else {
        let newHdUsed = hdUsed - numberOfHitDiceToRecover;
        hitDiceRecovery.push({
          "_id": item._id,
          "data.hitDiceUsed": newHdUsed
        });

        dhd += numberOfHitDiceToRecover;
        numberOfHitDiceToRecover = 0
      }

    });

    // Recover character resources
    for ( let [k, r] of Object.entries(data.resources) ) {
      if ( r.max && (r.sr || r.lr) ) {
        updateData[`data.resources.${k}.value`] = r.max;
      }
    }

    // Recover spell slots
    for ( let [k, v] of Object.entries(data.spells) ) {
      if ( !v.max ) continue;
      updateData[`data.spells.${k}.value`] = v.max;
    }

    // Recover limited item uses
    const items = this.items.filter(i => i.data.data.uses && ["sr", "lr"].includes(i.data.data.uses.per));
    const updateItems = items.map(item => {
      return {
        "id": item.data.id,
        "data.uses.value": item.data.data.uses.max
      }
    });

    // Perform the updates
    await this.update(updateData);
    await this.updateManyEmbeddedEntities("OwnedItem", hitDiceRecovery);
    await this.updateManyEmbeddedEntities("OwnedItem", updateItems);

    // Display a Chat Message summarizing the rest effects
    if ( chat ) {
      ChatMessage.create({
        user: game.user._id,
        speaker: {actor: this, alias: this.name},
        content: `${this.name} takes a long rest and recovers ${dhp} Hit Points and ${dhd} Hit Dice.`
      });
    }

    // Return data summarizing the rest effects
    return {
      dhd: dhd,
      dhp: dhp,
      updateData: updateData,
      updateItems: updateItems
    }
  }


  /* -------------------------------------------- */

  /**
   * Take a long rest, recovering HP, HD, resources, and spell slots
   * @param {boolean} dialog  Present a confirmation dialog window whether or not to take a long rest
   * @param {boolean} chat    Summarize the results of the rest workflow as a chat message
   * @return {Promise}        A Promise which resolves once the long rest workflow has completed
   */
  async longRest({dialog=true, chat=true}={}) {
    const data = this.data.data;
    const updateData = {};

    // Maybe present a confirmation dialog
    if ( dialog ) {
      try {
        await ShortRestDialog.longRestDialog(this);
      } catch(err) {
        return;
      }
    }

    // Recover HP and one-half HD
    let dhp = data.attributes.hp.max - data.attributes.hp.value;
    let recover_hd = Math.max(Math.floor(data.details.level.value/2), 1);
    let dhd = Math.min(recover_hd, data.details.level.value - data.attributes.hd.value);
    updateData["data.attributes.hp.value"] = data.attributes.hp.max;
    updateData["data.attributes.hd.value"] = data.attributes.hd.value + dhd;

    // Recover character resources
    for ( let [k, r] of Object.entries(data.resources) ) {
      if ( r.max && (r.sr || r.lr) ) {
        updateData[`data.resources.${k}.value`] = r.max;
      }
    }

    // Recover spell slots
    for ( let [k, v] of Object.entries(data.spells) ) {
      if ( !v.max ) continue;
      updateData[`data.spells.${k}.value`] = v.max;
    }

    // Recover limited item uses
    const items = this.items.filter(i => i.data.data.uses && ["sr", "lr"].includes(i.data.data.uses.per));
    const updateItems = items.map(item => { return {_id: item._id, "data.uses.value": item.data.data.uses.max} });

    // Perform the updates
    await this.update(updateData);
    await this.updateManyEmbeddedEntities("OwnedItem", updateItems);

    // Display a Chat Message summarizing the rest effects
    if ( chat ) {
      ChatMessage.create({
        user: game.user._id,
        speaker: {actor: this, alias: this.name},
        content: `${this.name} takes a long rest and recovers ${dhp} Hit Points and ${dhd} Hit Dice.`
      });
    }

    // Return data summarizing the rest effects
    return {
      dhd: dhd,
      dhp: dhp,
      updateData: updateData,
      updateItems: updateItems
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply rolled dice damage to the token or tokens which are currently controlled.
   * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
   *
   * @param {HTMLElement} roll    The chat entry which contains the roll data
   * @param {Number} multiplier   A damage multiplier to apply to the rolled damage.
   * @return {Promise}
   */
  static async applyDamage(roll, multiplier) {
    let value = Math.floor(parseFloat(roll.find('.dice-total').text()) * multiplier);
    const promises = [];
    for ( let t of canvas.tokens.controlled ) {
      let a = t.actor,
          hp = a.data.data.attributes.hp,
          tmp = parseInt(hp.temp) || 0,
          dt = value > 0 ? Math.min(tmp, value) : 0;
      promises.push(t.actor.update({
        "data.attributes.hp.temp": tmp - dt,
        "data.attributes.hp.value": Math.clamped(hp.value - (value - dt), 0, hp.max)
      }));
    }
    return Promise.all(promises);
  }
}

