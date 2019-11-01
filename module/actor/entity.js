import { Dice5e } from "../dice.js";

/**
 * Extend the base Actor class to implement additional logic specialized for D&D5e.
 */
export class Actor5e extends Actor {

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData(actorData) {
    actorData = super.prepareData(actorData);
    const data = actorData.data;
    const flags = actorData.flags;

    // Prepare Character data
    if ( actorData.type === "character" ) this._prepareCharacterData(data);
    else if ( actorData.type === "npc" ) this._prepareNPCData(data);

    // Ability modifiers and saves
    let saveBonus = getProperty(flags, "dnd5e.saveBonus") || 0;
    for (let abl of Object.values(data.abilities)) {
      abl.mod = Math.floor((abl.value - 10) / 2);
      abl.save = abl.mod + ((abl.proficient || 0) * data.attributes.prof.value) + saveBonus;
    }

    // Skill modifiers
    for (let skl of Object.values(data.skills)) {
      skl.value = parseFloat(skl.value || 0);
      skl.mod = data.abilities[skl.ability].mod + Math.floor(skl.value * data.attributes.prof.value);
      skl.passive = 10 + skl.mod;
    }

    // Initiative
    const init = data.attributes.init;
    init.mod = data.abilities.dex.mod;
    init.prof = getProperty(flags, "dnd5e.initiativeHalfProf") ? Math.floor(0.5 * data.attributes.prof.value) : 0;
    init.bonus = init.value + (getProperty(flags, "dnd5e.initiativeAlert") ? 5 : 0);
    init.total = init.mod + init.prof + init.bonus;

    // Armor Class formula // TODO: Allow this to be configurable in the future
    data.attributes.ac.min = 10 + data.abilities.dex.mod;

    // Spell DC
    let spellAbl = data.attributes.spellcasting.value || "int";
    let bonusDC = getProperty(flags, "dnd5e.spellDCBonus") || 0;
    data.attributes.spelldc.value = 8 + data.attributes.prof.value + data.abilities[spellAbl].mod + bonusDC;

    // Return the prepared Actor data
    return actorData;
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
    data.attributes.prof.value = Math.floor((data.details.level.value + 7) / 4);
  }

  /* -------------------------------------------- */

  /**
   * Prepare NPC type specific data
   */
  _prepareNPCData(data) {

    // Challenge Rating
    const cr = data.details.cr;
    const crLabels = {0: "0", 0.125: "1/8", 0.25: "1/4", 0.5: "1/2"};
    cr.value = parseFloat(cr.value || 0);
    cr.label = cr.value >= 1 ? String(cr.value) : crLabels[cr.value] || 1;

    // Kill Experience
    data.details.xp.value = this.getCRExp(data.details.cr.value);

    // Proficiency
    data.attributes.prof.value = Math.floor((Math.max(data.details.cr.value, 1) + 7) / 4);
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
  /*  Owned Item Management
  /* -------------------------------------------- */

  /**
   * Extend OwnedItem creation logic for the 5e system to make weapons proficient by default when dropped on a NPC sheet
   * See the base Actor class for API documentation of this method
   */
  async createOwnedItem(itemData, options) {

    // Assume NPCs are always proficient with weapons and always have spells prepared
    if ( !this.isPC ) {
      if ( itemData.type === "weapon" ) mergeObject(itemData, {"data.proficient.value": true});
      if ( itemData.type === "spell" ) mergeObject(itemData, {"data.prepared.value": true});
    }
    return super.createOwnedItem(itemData, options);
  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */

  /**
   * Roll a Skill Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollSkill(event, skillName) {
    let skl = this.data.data.skills[skillName],
      parts = ["@mod"],
      flavor = `${skl.label} Skill Check`;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: {mod: skl.mod},
      title: flavor,
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
  rollAbility(abilityId, options) {
    let abl = this.data.data.abilities[abilityId];
    new Dialog({
      title: `${abl.label} Ability Check`,
      content: `<p>What type of ${abl.label} check?</p>`,
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
    let abl = this.data.data.abilities[abilityId],
        parts = ["@mod"],
        flavor = `${abl.label} Ability Test`;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      data: {mod: abl.mod},
      title: flavor,
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
    let abl = this.data.data.abilities[abilityId],
        parts = ["@mod"],
        data = {mod: abl.save},
        flavor = `${abl.label} Saving Throw`;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      data: data,
      title: flavor,
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
   * Take a short rest, recovering resources and possibly rolling Hit Dice
   */
  async shortRest() {
    const data = this.data.data,
          update = {},
          promises = [];

    // Recover resources
    for ( let r of ["primary", "secondary"] ) {
      let res = data.resources[r];
      if ( res.max && res.sr ) {
        update[`data.resources.${r}.value`] = res.max;
      }
    }

    // Recover uses
    for (let item of this.data.items.filter(item => getProperty(item, "data.uses.type") === 'sr')) {
      item.data.uses.value = item.data.uses.max;
      promises.push(this.updateOwnedItem(item));
    }

    // Update the actor
    promises.push(this.update(update));
    return Promise.all(promises);
  }

  /* -------------------------------------------- */

  /**
   * Take a long rest, recovering HP, HD, resources, and spell slots
   * @return {Promise}    A Promise which resolves to an object containing details of the rest outcome
   */
  async longRest() {
    const data = this.data.data,
          update = {},
          promises = [];

    // Recover hit points
    let dhp = data.attributes.hp.max - data.attributes.hp.value;
    update["data.attributes.hp.value"] = data.attributes.hp.max;

    // Recover hit dice
    let recover_hd = Math.max(Math.floor(data.details.level.value/2), 1),
        dhd = Math.min(recover_hd, data.details.level.value - data.attributes.hd.value);
    update["data.attributes.hd.value"] = data.attributes.hd.value + dhd;

    // Recover resources
    for ( let r of ["primary", "secondary"] ) {
      let res = data.resources[r];
      if ( res.max && (res.lr || res.sr ) ) {
        update[`data.resources.${r}.value`] = res.max;
      }
    }

    // Recover uses
    const items = this.data.items.filter(i => i.data.uses && ["sr", "lr"].includes(i.data.uses.type));
    for (let item of items) {
      item.data.uses.value = item.data.uses.max;
      promises.push(this.updateOwnedItem(item));
    }

    // Recover spell slots
    for ( let [k, v] of Object.entries(data.spells) ) {
      if ( !v.max ) continue;
      update[`data.spells.${k}.value`] = v.max;
    }

    // Update the actor and return some update data for logging
    promises.push(this.update(update));
    return Promise.all(promises).then(() => {
      return {
        dhp: dhp,
        dhd: dhd
      }
    });
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

