import { Dice5e } from "../dice.js";
import { ShortRestDialog } from "../apps/short-rest.js";
import { SpellCastDialog } from "../apps/spell-cast-dialog.js";
import { AbilityTemplate } from "../pixi/ability-template.js";
import {DND5E} from '../config.js';


/**
 * Extend the base Actor class to implement additional logic specialized for D&D5e.
 */
export class Actor5e extends Actor {

  /**
   * Is this Actor currently polymorphed into some other creature?
   * @return {boolean}
   */
  get isPolymorphed() {
    return this.getFlag("dnd5e", "isPolymorphed") || false;
  }

  /* -------------------------------------------- */

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // Get the Actor's data object
    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags.dnd5e || {};

    // Prepare Character data
    if ( actorData.type === "character" ) this._prepareCharacterData(actorData);
    else if ( actorData.type === "npc" ) this._prepareNPCData(actorData);

    // Ability modifiers and saves
    // Character All Ability Check" and All Ability Save bonuses added when rolled since not a fixed value.
    const saveBonus = parseInt(getProperty(data, "bonuses.abilities.save")) || 0;
    for (let abl of Object.values(data.abilities)) {
      abl.mod = Math.floor((abl.value - 10) / 2);
      abl.prof = (abl.proficient || 0) * data.attributes.prof;
      abl.save = abl.mod + abl.prof + saveBonus;
    }

    // Skill modifiers
    const feats = DND5E.characterFlags;
    const athlete = flags.remarkableAthlete;
    const joat = flags.jackOfAllTrades;
    const observant = flags.observantFeat;
    let round = Math.floor;
    for (let [id, skl] of Object.entries(data.skills)) {
      skl.value = parseFloat(skl.value || 0);
      skl.bonus = parseInt(skl.bonus || 0);

      // Apply Remarkable Athlete or Jack of all Trades
      let multi = skl.value;
      if ( athlete && (skl.value === 0) && feats.remarkableAthlete.abilities.includes(skl.ability) ) {
        multi = 0.5;
        round = Math.ceil;
      }
      if ( joat && (skl.value === 0 ) ) multi = 0.5;

      // Compute modifier
      skl.mod = data.abilities[skl.ability].mod + skl.bonus + round(multi * data.attributes.prof);

      // Compute passive bonus
      const passive = observant && (feats.observantFeat.skills.includes(id)) ? 5 : 0;
      skl.passive = 10 + skl.mod + passive;
    }

    // Determine Initiative Modifier
    const init = data.attributes.init;
    init.mod = data.abilities.dex.mod;
    if ( joat ) init.prof = Math.floor(0.5 * data.attributes.prof);
    else if ( athlete ) init.prof = Math.ceil(0.5 * data.attributes.prof);
    else init.prof = 0;
    init.bonus = init.value + (flags.initiativeAlert ? 5 : 0);
    init.total = init.mod + init.prof + init.bonus;

    // Prepare spell-casting data
    data.attributes.spelldc = this.getSpellDC(data.attributes.spellcasting);
    // TODO: Only do this IF we have already processed item types (see Entity#initialize)
    if ( this.items ) {
      this._computeSpellcastingProgression(actorData);
    }
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
   * Prepare data related to the spell-casting capabilities of the Actor
   * @private
   */
  _computeSpellcastingProgression (actorData) {
    const spells = actorData.data.spells;
    const isNPC = actorData.type === 'npc';

    // Translate the list of classes into spell-casting progression
    const progression = {
      total: 0,
      slot: 0,
      pact: 0
    };

    // Keep track of the last seen caster in case we're in a single-caster situation.
    let caster = null;

    // Tabulate the total spell-casting progression
    const classes = this.data.items.filter(i => i.type === "class");
    for ( let cls of classes ) {
      const d = cls.data;
      if ( d.spellcasting === "none" ) continue;
      const levels = d.levels;
      const prog = d.spellcasting;

      // Accumulate levels
      if ( prog !== "pact" ) {
        caster = cls;
        progression.total++;
      }
      switch (prog) {
        case 'third': progression.slot += Math.floor(levels / 3); break;
        case 'half': progression.slot += Math.floor(levels / 2); break;
        case 'full': progression.slot += levels; break;
        case 'artificer': progression.slot += Math.ceil(levels / 2); break;
        case 'pact': progression.pact += levels; break;
      }
    }

    // EXCEPTION: single-classed non-full progression rounds up, rather than down
    const isSingleClass = (progression.total === 1) && (progression.slot > 0);
    if (!isNPC && isSingleClass && ['half', 'third'].includes(caster.data.spellcasting) ) {
      const denom = caster.data.spellcasting === 'third' ? 3 : 2;
      progression.slot = Math.ceil(caster.data.levels / denom);
    }

    // EXCEPTION: NPC with an explicit spellcaster level
    if (isNPC && actorData.data.details.spellLevel) {
      progression.slot = actorData.data.details.spellLevel;
    }

    // Look up the number of slots per level from the progression table
    const levels = Math.clamped(progression.slot, 0, 20);
    const slots = DND5E.SPELL_SLOT_TABLE[levels - 1] || [];
    for ( let [n, lvl] of Object.entries(spells) ) {
      let i = parseInt(n.slice(-1));
      if ( lvl.override ) lvl.max = parseInt(lvl.override) || 0;
      else lvl.max = slots[i-1] || 0;
      lvl.value = lvl.value !== undefined ? Math.min(parseInt(lvl.value), lvl.max) : lvl.max;
    }

    // Determine the number of Warlock pact slots per level
    const pactLevel = Math.clamped(progression.pact, 0, 20);
    if ( pactLevel > 0) {
      spells.pact = spells.pact || {};
      spells.pact.level = Math.ceil(Math.min(10, pactLevel) / 2);
      spells.pact.max = Math.max(1, Math.min(pactLevel, 2), Math.min(pactLevel-8, 3), Math.min(pactLevel-13, 4));
      spells.pact.value = spells.pact.value !== undefined ? spells.pact.value : spells.pact.max;
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

  /** @override */
  getRollData() {
    const data = super.getRollData();
    data.classes = this.data.items.reduce((obj, i) => {
      if ( i.type === "class" ) {
        obj[i.name.slugify({strict: true})] = i.data;
      }
      return obj;
    }, {});
    data.prof = this.data.data.attributes.prof;
    return data;
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
    if ( newSize && (newSize !== getProperty(this.data, "data.traits.size")) ) {
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
    const usesSlots = (lvl > 0) && ["always", "prepared"].includes(item.data.data.preparation.mode);
    if ( !usesSlots ) return item.roll();

    // Configure the casting level and whether to consume a spell slot
    let consume = `spell${lvl}`;
    let placeTemplate = false;

    // Configure spell slot consumption and measured template placement from the form
    if ( configureDialog ) {
      const spellFormData = await SpellCastDialog.create(this, item);
      const isPact = spellFormData.get('level') === 'pact';
      const lvl = isPact ? this.data.data.spells.pact.level : parseInt(spellFormData.get("level"));
      if (Boolean(spellFormData.get("consume"))) {
        consume = isPact ? 'pact' : `spell${lvl}`;
      } else {
        consume = false;
      }
      placeTemplate = Boolean(spellFormData.get("placeTemplate"));

      // Create a temporary owned item to approximate the spell at a higher level
      if ( lvl !== item.data.data.level ) {
        item = item.constructor.createOwned(mergeObject(item.data, {"data.level": lvl}, {inplace: false}), this);
      }
    }

    // Update Actor data
    if ( consume && (lvl > 0) ) {
      await this.update({
        [`data.spells.${consume}.value`]: Math.max(parseInt(this.data.data.spells[consume].value) - 1, 0)
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
    return Dice5e.d20Roll(mergeObject(options, {
      parts: parts,
      data: data,
      title: `${CONFIG.DND5E.skills[skillId]} Skill Check`,
      speaker: ChatMessage.getSpeaker({actor: this}),
      halflingLucky: this.getFlag("dnd5e", "halflingLucky")
    }));
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
    const flags = this.data.flags || {};

    // Add feat-related proficiency bonuses
    if ( flags.dnd5e.remarkableAthlete && DND5E.characterFlags.remarkableAthlete.abilities.includes(abilityId) ) {
      parts.push("@proficiency");
      data.proficiency = Math.ceil(0.5 * this.data.data.attributes.prof);
    }
    else if ( flags.dnd5e.jackOfAllTrades ) {
      parts.push("@proficiency");
      data.proficiency = Math.floor(0.5 * this.data.data.attributes.prof);
    }

    // Add global actor bonus
    let actorBonus = getProperty(this.data.data.bonuses, "abilities.check");
    if ( !!actorBonus ) {
      parts.push("@checkBonus");
      data.checkBonus = actorBonus;
    }

    // Roll and return
    return Dice5e.d20Roll(mergeObject(options, {
      parts: parts,
      data: data,
      title: `${label} Ability Test`,
      speaker: ChatMessage.getSpeaker({actor: this}),
      halflingLucky: this.getFlag("dnd5e", "halflingLucky")
    }));
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

    // Include proficiency bonus
    if ( abl.prof > 0 ) {
      parts.push("@prof");
      data.prof = abl.prof;
    }

    // Include a global actor ability save bonus
    const actorBonus = getProperty(this.data.data.bonuses, "abilities.save");
    if ( !!actorBonus ) {
      parts.push("@saveBonus");
      data.saveBonus = actorBonus;
    }

    // Roll and return
    return Dice5e.d20Roll(mergeObject(options, {
      event: options.event,
      parts: parts,
      data: data,
      title: `${label} Saving Throw`,
      speaker: ChatMessage.getSpeaker({actor: this}),
      halflingLucky: this.getFlag("dnd5e", "halflingLucky")
    }));
  }

  /* -------------------------------------------- */

  /**
   * Perform a death saving throw, rolling a d20 plus any global save bonuses
   * @param {Object} options        Additional options which modify the roll
   * @return {Promise<Roll|null>}   A Promise which resolves to the Roll instance
   */
  async rollDeathSave(options={}) {

    // Evaluate a global saving throw bonus
    const speaker = ChatMessage.getSpeaker({actor: this});
    const parts = [];
    const data = {};
    const bonus = getProperty(this.data.data.bonuses, "abilities.save");
    if ( bonus ) {
      parts.push("@saveBonus");
      data["saveBonus"] = bonus;
    }

    // Evaluate the roll
    const roll = await Dice5e.d20Roll(mergeObject(options, {
      parts: parts,
      data: data,
      title: `Death Saving Throw`,
      speaker: speaker,
      halflingLucky: this.getFlag("dnd5e", "halflingLucky"),
      targetValue: 10
    }));
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
      allowcritical: false,
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

    // Recover pact slots.
    const pact = data.spells.pact;
    updateData['data.spells.pact.value'] = pact.override || pact.max;
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
      if ( !v.max && !v.override ) continue;
      updateData[`data.spells.${k}.value`] = v.override || v.max;
    }

    // Recover pact slots.
    const pact = data.spells.pact;
    updateData['data.spells.pact.value'] = pact.override || pact.max;

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
   * Convert all carried currency to the highest possible denomination to reduce the number of raw coins being
   * carried by an Actor.
   * @return {Promise<Actor5e>}
   */
  convertCurrency() {
    const curr = duplicate(this.data.data.currency);
    const convert = {
      cp: {into: "sp", each: 10},
      sp: {into: "ep", each: 5 },
      ep: {into: "gp", each: 2 },
      gp: {into: "pp", each: 10}
    };
    for ( let [c, t] of Object.entries(convert) ) {
      let change = Math.floor(curr[c] / t.each);
      curr[c] -= (change * t.each);
      curr[t.into] += change;
    }
    return this.update({"data.currency": curr});
  }

  /* -------------------------------------------- */

  /**
   * Transform this Actor into another one.
   *
   * @param {Actor} target The target Actor.
   * @param {boolean} [keepPhysical] Keep physical abilities (str, dex, con)
   * @param {boolean} [keepMental] Keep mental abilities (int, wis, cha)
   * @param {boolean} [keepSaves] Keep saving throw proficiencies
   * @param {boolean} [keepSkills] Keep skill proficiencies
   * @param {boolean} [mergeSaves] Take the maximum of the save proficiencies
   * @param {boolean} [mergeSkills] Take the maximum of the skill proficiencies
   * @param {boolean} [keepClass] Keep proficiency bonus
   * @param {boolean} [keepFeats] Keep features
   * @param {boolean} [keepSpells] Keep spells
   * @param {boolean} [keepItems] Keep items
   * @param {boolean} [keepBio] Keep biography
   * @param {boolean} [keepVision] Keep vision
   * @param {boolean} [transformTokens] Transform linked tokens too
   */
  async transformInto(target, { keepPhysical=false, keepMental=false, keepSaves=false, keepSkills=false,
    mergeSaves=false, mergeSkills=false, keepClass=false, keepFeats=false, keepSpells=false,
    keepItems=false, keepBio=false, keepVision=false, transformTokens=true}={}) {

    // Ensure the player is allowed to polymorph
    const allowed = game.settings.get("dnd5e", "allowPolymorphing");
    if ( !allowed && !game.user.isGM ) {
      return ui.notifications.warn(`You are not allowed to polymorph this actor!`);
    }

    // Get the original Actor data and the new source data
    const o = duplicate(this.data);
    o.flags.dnd5e = o.flags.dnd5e || {};
    const source = duplicate(target.data);

    // Prepare new data to merge from the source
    const d = {
      type: o.type, // Remain the same actor type
      name: `${o.name} (${source.name})`, // Append the new shape to your old name
      data: source.data, // Get the data model of your new form
      items: source.items, // Get the items of your new form
      token: source.token, // New token configuration
      img: source.img, // New appearance
      permission: o.permission, // Use the original actor permissions
      folder: o.folder, // Be displayed in the same sidebar folder
      flags: o.flags // Use the original actor flags
    };

    // Additional adjustments
    delete d.data.resources; // Don't change your resource pools
    delete d.data.currency; // Don't lose currency
    delete d.data.bonuses; // Don't lose global bonuses
    delete d.token.actorId; // Don't reference the old actor ID
    d.token.actorLink = o.token.actorLink; // Keep your actor link
    d.token.name = d.name; // Token name same as actor name
    d.data.details.alignment = o.data.details.alignment; // Don't change alignment
    d.data.attributes.exhaustion = o.data.attributes.exhaustion; // Keep your prior exhaustion level
    d.data.attributes.inspiration = o.data.attributes.inspiration; // Keep inspiration

    // Handle wildcard
    if ( source.token.randomImg ) {
      const images = await target.getTokenImages();
      d.token.img = images[0];
    }

    // Keep Token configurations
    const tokenConfig = ["displayName", "vision", "actorLink", "disposition", "displayBars", "bar1", "bar2"];
    if ( keepVision ) {
      tokenConfig.push(...['dimSight', 'brightSight', 'dimLight', 'brightLight', 'vision', 'sightAngle']);
    }
    for ( let c of tokenConfig ) {
      d.token[c] = o.token[c];
    }

    // Transfer ability scores
    const abilities = d.data.abilities;
    for ( let k of Object.keys(abilities) ) {
      const oa = o.data.abilities[k];
      if ( keepPhysical && ["str", "dex", "con"].includes(k) ) abilities[k] = oa;
      else if ( keepMental && ["int", "wis", "cha"].includes(k) ) abilities[k] = oa;
      if ( keepSaves ) abilities[k].proficient = oa.proficient;
      else if ( mergeSaves ) abilities[k].proficient = Math.max(abilities[k].proficient, oa.proficient)
    }

    // Transfer skills
    const skills = d.data.skills;
    if ( keepSkills ) d.data.skills = o.data.skills;
    else if ( mergeSkills ) {
      for ( let [k, s] of Object.entries(skills) ) {
        s.value = Math.max(s.proficient, o.data.skills[k].value);
      }
    }

    // Keep specific items from the original data
    d.items = d.items.concat(o.items.filter(i => {
      if ( i.type === "class" ) return true; // Always keep class levels
      else if ( i.type === "feat" ) return keepFeats;
      else if ( i.type === "spell" ) return keepSpells;
      else return keepItems;
    }));

    // Keep biography
    if (keepBio) d.data.details.biography = o.data.details.biography;

    // Keep senses
    if (keepVision) d.data.traits.senses = o.data.traits.senses;

    // Set new data flags
    if ( !this.isPolymorphed || !d.flags.dnd5e.originalActor ) d.flags.dnd5e.originalActor = this.id;
    d.flags.dnd5e.isPolymorphed = true;

    // Update unlinked Tokens in place since they can simply be re-dropped from the base actor
    if (this.isToken) {
      const tokenData = d.token;
      tokenData.actorData = d;
      delete tokenData.actorData.token;
      return this.token.update(tokenData);
    }

    // Update regular Actors by creating a new Actor with the Polymorphed data
    await this.sheet.close();
    const newActor = await this.constructor.create(d, {renderSheet: true});

    // Update placed Token instances
    if ( !transformTokens ) return;
    const tokens = this.getActiveTokens(true);
    const updates = tokens.map(t => {
      const newTokenData = duplicate(d.token);
      if ( !t.data.actorLink ) newTokenData.actorData = newActor.data;
      newTokenData._id = t.data._id;
      newTokenData.actorId = newActor.id;
      return newTokenData;
    });
    return canvas.scene.updateManyEmbeddedEntities("Token", updates);
  }

  /* -------------------------------------------- */

  /**
   * If this actor was transformed with transformTokens enabled, then its
   * active tokens need to be returned to their original state. If not, then
   * we can safely just delete this actor.
   */
  async revertOriginalForm() {
    if ( !this.isPolymorphed ) return;
    if ( !this.owner ) {
      return ui.notifications.warn(`You do not have permission to revert this Actor's polymorphed state.`);
    }

    // If we are reverting an unlinked token, simply replace it with the base actor prototype
    if ( this.isToken ) {
      const baseActor = game.actors.get(this.token.data.actorId);
      const prototypeTokenData = duplicate(baseActor.token);
      prototypeTokenData.actorData = null;
      return this.token.update(prototypeTokenData);
    }

    // Obtain a reference to the original actor
    const original = game.actors.get(this.getFlag('dnd5e', 'originalActor'));
    if ( !original ) return;

    // Get the Tokens which represent this actor
    const tokens = this.getActiveTokens(true);
    const tokenUpdates = tokens.map(t => {
      const tokenData = duplicate(original.data.token);
      tokenData._id = t.id;
      tokenData.actorId = original.id;
      return tokenData;
    });
    canvas.scene.updateManyEmbeddedEntities("Token", tokenUpdates);

    // Delete the polymorphed Actor and maybe re-render the original sheet
    const isRendered = this.sheet.rendered;
    if ( game.user.isGM ) await this.delete();
    original.sheet.render(isRendered);
    return original;
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

  /* -------------------------------------------- */

  /**
   * Add additional system-specific sidebar directory context menu options for D&D5e Actor entities
   * @param {jQuery} html         The sidebar HTML
   * @param {Array} entryOptions  The default array of context menu options
   */
  static addDirectoryContextOptions(html, entryOptions) {
    entryOptions.push({
      name: 'DND5E.PolymorphRestoreTransformation',
      icon: '<i class="fas fa-backward"></i>',
      callback: li => {
        const actor = game.actors.get(li.data('entityId'));
        return actor.revertOriginalForm();
      },
      condition: li => {
        const allowed = game.settings.get("dnd5e", "allowPolymorphing");
        if ( !allowed && !game.user.isGM ) return false;
        const actor = game.actors.get(li.data('entityId'));
        return actor && actor.isPolymorphed;
      }
    });
  }
}
