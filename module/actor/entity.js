import { Dice5e } from "../dice.js";
import { ShortRestDialog } from "../apps/short-rest.js";
import { SpellCastDialog } from "../apps/spell-cast-dialog.js";
import { AbilityTemplate } from "../pixi/ability-template.js";


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
    else if ( actorData.type === "npc" ) this._prepareNPCData(actorData);

    // Ranged Weapon/Melee Weapon/Ranged Spell/Melee Spell attack bonuses are added when rolled since they are not a fixed value.
    // Damage bonus added when rolled since not a fixed value.

    // Ability modifiers and saves
    // Character All Ability Check" and All Ability Save bonuses added when rolled since not a fixed value.
    const saveBonus = parseInt(getProperty(data, "bonuses.abilities.save")) || 0;
    for (let abl of Object.values(data.abilities)) {
      abl.mod = Math.floor((abl.value - 10) / 2);
      abl.save = abl.mod + ((abl.proficient || 0) * data.attributes.prof) + saveBonus;
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
    const data = actorData.data;

    // Determine character level and available hit dice based on owned Class items
    const [level, hd] = actorData.items.reduce((arr, item) => {
      if ( item.type === "class" ) {
        const classLevels = parseInt(item.data.levels) || 1;
        arr[0] += classLevels;
        arr[1] += classLevels - (parseInt(item.data.hitDiceUsed) || 0);
      }
      return arr;
    }, [0, 0]);
    data.details.level = level;
    data.attributes.hd = hd;

    // Character proficiency bonus
    data.attributes.prof = Math.floor((level + 7) / 4);

    // Experience required for next level
    const xp = data.details.xp;
    xp.max = this.getLevelExp(level || 1);
    const prior = this.getLevelExp(level - 1 || 0);
    const required = xp.max - prior;
    const pct = Math.round((xp.value - prior) * 100 / required);
    xp.pct = Math.clamped(pct, 0, 100);
  }

  /* -------------------------------------------- */

  /**
   * Prepare NPC type specific data
   */
  _prepareNPCData(actorData) {
    const data = actorData.data;

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
    const actorData = this.data.data;
    const bonus = parseInt(getProperty(actorData, "bonuses.spell.dc")) || 0;
    ability = actorData.abilities[ability];
    const prof = actorData.attributes.prof;
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
  async modifyTokenAttribute(attribute, value, isDelta, isBar) {
    if ( attribute !== "attributes.hp" ) return super.modifyTokenAttribute(attribute, value, isDelta, isBar);

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
      if ( this.sheet.rendered ) this.sheet.minimize();
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
   * @return {Promise.<Roll>}   A Promise which resolves to the created Roll instance
   */
  rollSkill(skillId, options={}) {
    const skl = this.data.data.skills[skillId];
    const parts = ["@mod"];
    const data = {mod: skl.mod};

    // Include a global actor skill bonus
    const actorBonus = getProperty(this.data.data.bonuses, "abilities.skill");
    if ( !!actorBonus ) {
      parts.push("@skillBonus");
      data.skillBonus = actorBonus;
    }

    // Roll and return
    return Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      data: data,
      title: `${CONFIG.DND5E.skills[skillId]} Skill Check`,
      speaker: ChatMessage.getSpeaker({actor: this}),
      halflingLucky: this.getFlag("dnd5e", "halflingLucky")
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
   * @return {Promise.<Roll>}   A Promise which resolves to the created Roll instance
   */
  rollAbilityTest(abilityId, options={}) {
    const label = CONFIG.DND5E.abilities[abilityId];
    const abl = this.data.data.abilities[abilityId];
    const parts = ["@mod"];
    const data = {mod: abl.mod};

    // Include a global actor ability check bonus
    const actorBonus = getProperty(this.data.data.bonuses, "abilities.check");
    if ( !!actorBonus ) {
      parts.push("@checkBonus");
      data.checkBonus = actorBonus;
    }

    // Roll and return
    return Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      data: data,
      title: `${label} Ability Test`,
      speaker: ChatMessage.getSpeaker({actor: this}),
      halflingLucky: this.getFlag("dnd5e", "halflingLucky")
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll an Ability Saving Throw
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {String} abilityId    The ability ID (e.g. "str")
   * @param {Object} options      Options which configure how ability tests are rolled
   * @return {Promise.<Roll>}   A Promise which resolves to the created Roll instance
   */
  rollAbilitySave(abilityId, options={}) {
    const label = CONFIG.DND5E.abilities[abilityId];
    const abl = this.data.data.abilities[abilityId];
    const parts = ["@mod"];
    const data = {mod: abl.mod};

    // Include a global actor ability save bonus
    const actorBonus = getProperty(this.data.data.bonuses, "abilities.save");
    if ( !!actorBonus ) {
      parts.push("@saveBonus");
      data.saveBonus = actorBonus;
    }

    // Roll and return
    return Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      data: data,
      title: `${label} Saving Throw`,
      speaker: ChatMessage.getSpeaker({actor: this}),
      halflingLucky: this.getFlag("dnd5e", "halflingLucky")
    });
  }

  /* -------------------------------------------- */

  /**
   * Perform a death saving throw, rolling a d20 plus any global save bonuses
   * @param {Object} options        Additional options which modify the roll
   * @return {Promise<Roll|null>}   A Promise which resolves to the Roll instance
   */
  async rollDeathSave(options={}) {

    // Execute the d20 roll dialog
    const bonus = getProperty(this.data.data.bonuses, "abilities.save");
    const parts = !!bonus ? ["@saveBonus"] : [];
    const speaker = ChatMessage.getSpeaker({actor: this});
    const roll = await Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      data: {saveBonus: parseInt(bonus)},
      title: `Death Saving Throw`,
      speaker: speaker,
      halflingLucky: this.getFlag("dnd5e", "halflingLucky")
    });
    if ( !roll ) return null;

    // Take action depending on the result
    const success = roll.total >= 10;
    const death = this.data.data.attributes.death;
    
    // Save success
    if ( success ) {
      let successes = (death.success || 0) + (roll.total === 20 ? 2 : 1);
      if ( successes === 3 ) {      // Survival
        await this.update({
          "data.attributes.death.success": 0,
          "data.attributes.death.failure": 0,
          "data.attributes.hp.value": 1
        });
        await ChatMessage.create({content: `${this.name} has survived with 3 death save successes!`, speaker});
      }
      else await this.update({"data.attributes.death.success": Math.clamped(successes, 0, 3)});
    } 
    
    // Save failure
    else {
      let failures = (death.failure || 0) + (roll.total === 1 ? 2 : 1);
      await this.update({"data.attributes.death.failure": Math.clamped(failures, 0, 3)});
      if ( failures === 3 ) {       // Death
        await ChatMessage.create({content: `${this.name} has died with 3 death save failures!`, speaker});
      }
    }

    // Return the rolled result
    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Roll a hit die of the appropriate type, gaining hit points equal to the die roll plus your CON modifier
   * @param {string} formula    The hit die type to roll. Example "d8"
   */
  async rollHitDie(formula) {

    // Find a class (if any) which has an available hit die of the requested denomination
    const cls = this.items.find(i => {
      const d = i.data.data;
      return (d.hitDice === formula) && ((d.levels || 1) - (d.hitDiceUsed || 0) > 0);
    });

    // If no class is available, display an error notification
    if ( !cls ) {
      return ui.notifications.error(`${this.name} has no available ${formula} Hit Dice remaining!`);
    }

    // Prepare roll data
    const parts = [formula, "@abilities.con.mod"];
    const title = `Roll Hit Die`;
    const rollData = duplicate(this.data.data);

    // Call the roll helper utility
    const roll = await Dice5e.damageRoll({
      event: new Event("hitDie"),
      parts: parts,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this}),
      critical: false,
      dialogOptions: {width: 350}
    });
    if ( !roll ) return;

    // Adjust actor data
    await cls.update({"data.hitDiceUsed": cls.data.data.hitDiceUsed + 1});
    const hp = this.data.data.attributes.hp;
    const dhp = Math.min(hp.max - hp.value, roll.total);
    return this.update({"data.attributes.hp.value": hp.value + dhp});
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

    // Take note of the initial hit points and number of hit dice the Actor has
    const hd0 = data.attributes.hd;
    const hp0 = data.attributes.hp.value;

    // Display a Dialog for rolling hit dice
    if ( dialog ) {
      const rested = await ShortRestDialog.shortRestDialog({actor: this, canRoll: hd0 > 0});
      if ( !rested ) return;
    }

    // Note the change in HP and HD which occurred
    const dhd = data.attributes.hd - hd0;
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
        _id: item._id,
        "data.uses.value": item.data.data.uses.max
      };
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

  /* -------------------------------------------- */

  /**
   * Take a long rest, recovering HP, HD, resources, and spell slots
   * @param {boolean} dialog  Present a confirmation dialog window whether or not to take a long rest
   * @param {boolean} chat    Summarize the results of the rest workflow as a chat message
   * @return {Promise}        A Promise which resolves once the long rest workflow has completed
   */
  async longRest({dialog=true, chat=true}={}) {
    const data = this.data.data;

    // Maybe present a confirmation dialog
    if ( dialog ) {
      try {
        await ShortRestDialog.longRestDialog(this);
      } catch(err) {
        return;
      }
    }

    // Recover hit points to full, and eliminate any existing temporary HP
    const dhp = data.attributes.hp.max - data.attributes.hp.value;
    const updateData = {
      "data.attributes.hp.value": data.attributes.hp.max,
      "data.attributes.hp.temp": 0,
      "data.attributes.hp.tempmax": 0
    };

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


    // Determine the number of hit dice which may be recovered
    let recoverHD = Math.max(Math.floor(data.details.level / 2), 1);
    let dhd = 0;

    // Sort classes which can recover HD, assuming players prefer recovering larger HD first.
    const updateItems = this.items.filter(item => item.data.type === "class").sort((a, b) => {
      let da = parseInt(a.data.data.hitDice.slice(1)) || 0;
      let db = parseInt(b.data.data.hitDice.slice(1)) || 0;
      return db - da;
    }).reduce((updates, item) => {
      const d = item.data.data;
      if ( (recoverHD > 0) && (d.hitDiceUsed > 0) ) {
        let delta = Math.min(d.hitDiceUsed || 0, recoverHD);
        recoverHD -= delta;
        dhd += delta;
        updates.push({_id: item.id, "data.hitDiceUsed": d.hitDiceUsed - delta});
      }
      return updates;
    }, []);

    // Iterate over owned items, restoring uses per day and recovering Hit Dice
    for ( let item of this.items ) {
      const d = item.data.data;
      if ( d.uses && ["sr", "lr"].includes(d.uses.per) ) {
        updateItems.push({_id: item.id, "data.uses.value": d.uses.max});
      }
      else if ( d.recharge && d.recharge.value ) {
        updateItems.push({_id: item.id, "data.recharge.charged": true});
      }
    }

    // Perform the updates
    await this.update(updateData);
    if ( updateItems.length ) await this.updateManyEmbeddedEntities("OwnedItem", updateItems);

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

