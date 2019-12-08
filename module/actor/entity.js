import { Dice5e } from "../dice.js";
import { ShortRestDialog } from "../apps/short-rest.js";
import { SpellCastDialog } from "../apps/spell-cast-dialog.js";

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
    if ( actorData.type === "character" ) this._prepareCharacterData(data);
    else if ( actorData.type === "npc" ) this._prepareNPCData(data);

    // Ability modifiers and saves
    let saveBonus = getProperty(flags, "dnd5e.saveBonus") || 0;
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
    let spellAbl = data.abilities[data.attributes.spellcasting || "int"];
    let bonusDC = getProperty(flags, "dnd5e.spellDCBonus") || 0;
    data.attributes.spelldc = 8 + data.attributes.prof + (spellAbl ? spellAbl.mod : 0) + bonusDC;
  }

  /* -------------------------------------------- */

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(data) {

    // Level, experience, and proficiency
    data.details.level.value = parseInt(data.details.level.value);
    data.details.xp.max = this.getLevelExp(data.details.level.value || 1);
    let prior = this.getLevelExp(data.details.level.value - 1 || 0),
          req = data.details.xp.max - prior;
    data.details.xp.pct = Math.min(Math.round((data.details.xp.value -prior) * 100 / req), 99.5);
    data.attributes.prof = Math.floor((data.details.level.value + 7) / 4);
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
  /*  Socket Listeners and Handlers
  /* -------------------------------------------- */

  /**
   * Extend the default update method to enhance data before submission.
   * See the parent Entity.update method for full details.
   *
   * @param {Object} data     The data with which to update the Actor
   * @param {Object} options  Additional options which customize the update workflow
   * @return {Promise}        A Promise which resolves to the updated Entity
   */
  async update(data, options={}) {

    // Apply changes in Actor size to Token width/height
    if ( data["data.traits.size"] ) {
      let size = CONFIG.DND5E.tokenSizes[data["data.traits.size"]];
      if ( this.isToken ) this.token.update(this.token.scene._id, {height: size, width: size});
      else {
        setProperty(data, "token.height", size);
        setProperty(data, "token.width", size);
      }
    }
    return super.update(data, options);
  }

  /* -------------------------------------------- */

  /**
   * Extend OwnedItem creation logic for the 5e system to make weapons proficient by default when dropped on a NPC sheet
   * See the base Actor class for API documentation of this method
   */
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
    if ( configureDialog ) {
      const spellFormData = await SpellCastDialog.create(this, item);
      lvl = parseInt(spellFormData.get("level"));
      consume = Boolean(spellFormData.get("consume"));
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
    return Dice5e.d20Roll({
      event: options.event,
      parts: ["@mod"],
      data: {mod: skl.mod},
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
    return Dice5e.d20Roll({
      event: options.event,
      parts: ["@mod"],
      data: {mod: abl.mod},
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
    return Dice5e.d20Roll({
      event: options.event,
      parts: ["@mod"],
      data: {mod: abl.save},
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
      let hp = this.data.data.attributes.hp,
          dhp = Math.min(hp.max - hp.value, roll.total),
          hd = Math.max(this.data.data.attributes.hd.value - 1, 0);
      this.update({"data.attributes.hp.value": hp.value + dhp, "data.attributes.hd.value": hd});
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
    const updateItems = items.map(item => {
      return {
        "id": item.data.id,
        "data.uses.value": item.data.data.uses.max
      }
    });
    await this.updateManyOwnedItem(updateItems);

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
    const updateItems = items.map(item => {
      return {
        "id": item.data.id,
        "data.uses.value": item.data.data.uses.max
      }
    });

    // Perform the updates
    await this.update(updateData);
    await this.updateManyOwnedItem(updateItems);

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

