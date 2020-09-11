import { d20Roll, damageRoll } from "../dice.js";
import ShortRestDialog from "../apps/short-rest.js";
import LongRestDialog from "../apps/long-rest.js";
import AbilityUseDialog from "../apps/ability-use-dialog.js";
import AbilityTemplate from "../pixi/ability-template.js";
import {DND5E} from '../config.js';

/**
 * Extend the base Actor class to implement additional system-specific logic.
 */
export default class Actor5e extends Actor {

  /**
   * Is this Actor currently polymorphed into some other creature?
   * @return {boolean}
   */
  get isPolymorphed() {
    return this.getFlag("dnd5e", "isPolymorphed") || false;
  }

  /* -------------------------------------------- */

  /**
   * @override
   * TODO: This becomes unnecessary after 0.7.x is released
   */
  initialize() {
    try {
      this.prepareData();
    } catch(err) {
      console.error(`Failed to initialize data for ${this.constructor.name} ${this.id}:`);
      console.error(err);
    }
  }

  /* -------------------------------------------- */

  /**
   * @override
   * TODO: This becomes unnecessary after 0.7.x is released
   */
  prepareData() {
    const is07x = !isNewerVersion("0.7.1", game.data.version);
    if ( is07x ) this.data = duplicate(this._data);
    if (!this.data.img) this.data.img = CONST.DEFAULT_TOKEN;
    if ( !this.data.name ) this.data.name = "New " + this.entity;
    this.prepareBaseData();
    this.prepareEmbeddedEntities();
    if ( is07x ) this.applyActiveEffects();
    this.prepareDerivedData();
  }

  /* -------------------------------------------- */

  /**
   * @override
   * TODO: This becomes unnecessary after 0.7.x is released
   */
  applyActiveEffects() {
    if (!isNewerVersion("0.7.1", game.data.version)) return super.applyActiveEffects();
  }

  /* -------------------------------------------- */

  /** @override */
  prepareBaseData() {

    // Compute initial ability score modifiers in base data since these may be referenced
    for (let abl of Object.values(this.data.data.abilities)) {
      abl.mod = Math.floor((abl.value - 10) / 2);
    }

    // Type-specific base data preparation
    switch ( this.data.type ) {
      case "character":
        return this._prepareCharacterData(this.data);
      case "npc":
        return this._prepareNPCData(this.data);
      case "vehicle":
        return this._prepareVehicleData(this.data);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags.dnd5e || {};
    const bonuses = getProperty(data, "bonuses.abilities") || {};

    // Retrieve data for polymorphed actors
    let originalSaves = null;
    let originalSkills = null;
    if (this.isPolymorphed) {
      const transformOptions = this.getFlag('dnd5e', 'transformOptions');
      const original = game.actors?.get(this.getFlag('dnd5e', 'originalActor'));
      if (original) {
        if (transformOptions.mergeSaves) {
          originalSaves = original.data.data.abilities;
        }
        if (transformOptions.mergeSkills) {
          originalSkills = original.data.data.skills;
        }
      }
    }

    // Ability modifiers and saves
    const saveBonus = Number.isNumeric(bonuses.save) ? parseInt(bonuses.save) : 0;
    const checkBonus = Number.isNumeric(bonuses.check) ? parseInt(bonuses.check) : 0;
    for (let [id, abl] of Object.entries(data.abilities)) {
      abl.mod = Math.floor((abl.value - 10) / 2);
      abl.prof = (abl.proficient || 0) * data.attributes.prof;
      abl.saveBonus = saveBonus;
      abl.checkBonus = checkBonus;
      abl.save = abl.mod + abl.prof + abl.saveBonus;

      // If we merged saves when transforming, take the highest bonus here.
      if (originalSaves && abl.proficient) {
        abl.save = Math.max(abl.save, originalSaves[id].save);
      }
    }
    this._prepareSkills(actorData, bonuses, checkBonus, originalSkills);

    // Determine Initiative Modifier
    const init = data.attributes.init;
    const athlete = flags.remarkableAthlete;
    const joat = flags.jackOfAllTrades;
    init.mod = data.abilities.dex.mod;
    if ( joat ) init.prof = Math.floor(0.5 * data.attributes.prof);
    else if ( athlete ) init.prof = Math.ceil(0.5 * data.attributes.prof);
    else init.prof = 0;
    init.bonus = init.value + (flags.initiativeAlert ? 5 : 0);
    init.total = init.mod + init.prof + init.bonus;

    // Prepare spell-casting data
    data.attributes.spelldc = this.getSpellDC(data.attributes.spellcasting);
    this._computeSpellcastingProgression(this.data);
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
    let bonus = getProperty(actorData, "bonuses.spell.dc");
    bonus = Number.isNumeric(bonus) ? parseInt(bonus) : 0;
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

  /**
   * Return the features which a character is awarded for each class level
   * @param cls {Object}    Data object for class, equivalent to Item5e.data or raw compendium entry
   * @return {Promise<Item5e[]>}     Array of Item5e entities
   */
  static async getClassFeatures(cls) {
    const level = cls.data.levels;
    const className = cls.name.toLowerCase();

    const clsConfig = CONFIG.DND5E.classFeatures[className];
    let featureIDs = clsConfig["features"][level] || [];
    const subclassName = cls.data.subclass.toLowerCase().slugify();
    if ( subclassName != "" ) {
      const subclassConfig = clsConfig["subclasses"][subclassName];
      if ( subclassConfig != undefined ) {
        const subclassFeatureIDs = subclassConfig["features"][level];
        if ( subclassFeatureIDs ) {
          featureIDs = featureIDs.concat(subclassFeatureIDs);
        }
      }
      else {
        console.warn("Invalid subclass: " + subclassName);
      }
    }
    const features = await Promise.all(featureIDs.map(id => fromUuid(id)));

    // Class spells should always be prepared
    for ( const feature of features ) {
      if ( feature.type === "spell" ) {
        const preparation = feature.data.data.preparation;
        preparation.mode = "always";
        preparation.prepared = true;
      }
    }

    return features;
  }

  /* -------------------------------------------- */

  /** @override */
  async updateEmbeddedEntity(embeddedName, data, options={}) {
    super.updateEmbeddedEntity(embeddedName, data, options);

    // Add class / subclass features
    const item = this.data.items.find(i => i._id === data._id);
    if ( item.type === "class" && (item.data.subclass != data.data.subclass || item.data.levels != data.data.levels) ) {
      const features = await Actor5e.getClassFeatures(data);
      this.createEmbeddedEntity("OwnedItem", features);
    }
  }

  /* -------------------------------------------- */
  /*  Data Preparation Helpers                    */
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

    // Inventory encumbrance
    data.attributes.encumbrance = this._computeEncumbrance(actorData);
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
    if ( data.attributes.spellcasting && !Number.isNumeric(data.details.spellLevel) ) {
      data.details.spellLevel = Math.max(data.details.cr, 1);
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare vehicle type-specific data
   * @param actorData
   * @private
   */
  _prepareVehicleData(actorData) {}

  /* -------------------------------------------- */

  /**
   * Prepare skill checks.
   * @param actorData
   * @param bonuses Global bonus data.
   * @param checkBonus Ability check specific bonus.
   * @param originalSkills A transformed actor's original actor's skills.
   * @private
   */
  _prepareSkills(actorData, bonuses, checkBonus, originalSkills) {
    if (actorData.type === 'vehicle') return;

    const data = actorData.data;
    const flags = actorData.flags.dnd5e || {};

    // Skill modifiers
    const feats = DND5E.characterFlags;
    const athlete = flags.remarkableAthlete;
    const joat = flags.jackOfAllTrades;
    const observant = flags.observantFeat;
    const skillBonus = Number.isNumeric(bonuses.skill) ? parseInt(bonuses.skill) :  0;
    let round = Math.floor;
    for (let [id, skl] of Object.entries(data.skills)) {
      skl.value = parseFloat(skl.value || 0);

      // Apply Remarkable Athlete or Jack of all Trades
      let multi = skl.value;
      if ( athlete && (skl.value === 0) && feats.remarkableAthlete.abilities.includes(skl.ability) ) {
        multi = 0.5;
        round = Math.ceil;
      }
      if ( joat && (skl.value === 0 ) ) multi = 0.5;

      // Compute modifier
      skl.bonus = checkBonus + skillBonus;
      skl.mod = data.abilities[skl.ability].mod;
      skl.prof = round(multi * data.attributes.prof);
      skl.total = skl.mod + skl.prof + skl.bonus;

      // If we merged skills when transforming, take the highest bonus here.
      if (originalSkills && skl.value > 0.5) {
        skl.total = Math.max(skl.total, originalSkills[id].total);
      }

      // Compute passive bonus
      const passive = observant && (feats.observantFeat.skills.includes(id)) ? 5 : 0;
      skl.passive = 10 + skl.total + passive;
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare data related to the spell-casting capabilities of the Actor
   * @private
   */
  _computeSpellcastingProgression (actorData) {
    if (actorData.type === 'vehicle') return;
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
      if ( Number.isNaN(i) ) continue;
      if ( Number.isNumeric(lvl.override) ) lvl.max = Math.max(parseInt(lvl.override), 1);
      else lvl.max = slots[i-1] || 0;
      lvl.value = Math.min(parseInt(lvl.value), lvl.max);
    }

    // Determine the Actor's pact magic level (if any)
    let pl = Math.clamped(progression.pact, 0, 20);
    spells.pact = spells.pact || {};
    if ( (pl === 0) && isNPC && Number.isNumeric(spells.pact.override) ) pl = actorData.data.details.spellLevel;

    // Determine the number of Warlock pact slots per level
    if ( pl > 0) {
      spells.pact.level = Math.ceil(Math.min(10, pl) / 2);
      if ( Number.isNumeric(spells.pact.override) ) spells.pact.max = Math.max(parseInt(spells.pact.override), 1);
      else spells.pact.max = Math.max(1, Math.min(pl, 2), Math.min(pl - 8, 3), Math.min(pl - 13, 4));
      spells.pact.value = Math.min(spells.pact.value, spells.pact.max);
    } else {
      spells.pact.level = 0;
      spells.pact.max = 0;
    }
  }

  /* -------------------------------------------- */

  /**
   * Compute the level and percentage of encumbrance for an Actor.
   *
   * Optionally include the weight of carried currency across all denominations by applying the standard rule
   * from the PHB pg. 143
   * @param {Object} actorData      The data object for the Actor being rendered
   * @returns {{max: number, value: number, pct: number}}  An object describing the character's encumbrance level
   * @private
   */
  _computeEncumbrance(actorData) {

    // Get the total weight from items
    const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
    let weight = actorData.items.reduce((weight, i) => {
      if ( !physicalItems.includes(i.type) ) return weight;
      const q = i.data.quantity || 0;
      const w = i.data.weight || 0;
      return weight + Math.round(q * w * 10) / 10;
    }, 0);

    // [Optional] add Currency Weight
    if ( game.settings.get("dnd5e", "currencyWeight") ) {
      const currency = actorData.data.currency;
      const numCoins = Object.values(currency).reduce((val, denom) => val += Math.max(denom, 0), 0);
      weight += Math.round((numCoins * 10) / CONFIG.DND5E.encumbrance.currencyPerWeight) / 10;
    }

    // Determine the encumbrance size class
    let mod = {
      tiny: 0.5,
      sm: 1,
      med: 1,
      lg: 2,
      huge: 4,
      grg: 8
    }[actorData.data.traits.size] || 1;
    if ( this.getFlag("dnd5e", "powerfulBuild") ) mod = Math.min(mod * 2, 8);

    // Compute Encumbrance percentage
    const max = actorData.data.abilities.str.value * CONFIG.DND5E.encumbrance.strMultiplier * mod;
    const pct = Math.clamped((weight* 100) / max, 0, 100);
    return { value: weight, max, pct, encumbered: pct > (2/3) };
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

    // TODO: 0.7.1 compatibility - remove when stable
    if ( !data.hasOwnProperty("data") ) data = expandObject(data);

    // Apply changes in Actor size to Token width/height
    const newSize = getProperty(data, "data.traits.size");
    if ( newSize && (newSize !== getProperty(this.data, "data.traits.size")) ) {
      let size = CONFIG.DND5E.tokenSizes[newSize];
      if ( this.isToken ) this.token.update({height: size, width: size});
      else if ( !data["token.width"] && !hasProperty(data, "token.width") ) {
        data["token.height"] = size;
        data["token.width"] = size;
      }
    }

    // Reset death save counters
    if ( (this.data.data.attributes.hp.value <= 0) && (getProperty(data, "data.attributes.hp.value") > 0) ) {
      setProperty(data, "data.attributes.death.success", 0);
      setProperty(data, "data.attributes.death.failure", 0);
    }

    // Perform the update
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
  /*  Gameplay Mechanics                          */
  /* -------------------------------------------- */

  /** @override */
  async modifyTokenAttribute(attribute, value, isDelta, isBar) {
    if ( attribute === "attributes.hp" ) {
      const hp = getProperty(this.data.data, attribute);
      const delta = isDelta ? (-1 * value) : (hp.value + hp.temp) - value;
      return this.applyDamage(delta);
    }
    return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
  }

  /* -------------------------------------------- */

  /**
   * Apply a certain amount of damage or healing to the health pool for Actor
   * @param {number} amount       An amount of damage (positive) or healing (negative) to sustain
   * @param {number} multiplier   A multiplier which allows for resistance, vulnerability, or healing
   * @return {Promise<Actor>}     A Promise which resolves once the damage has been applied
   */
  async applyDamage(amount=0, multiplier=1) {
    amount = Math.floor(parseInt(amount) * multiplier);
    const hp = this.data.data.attributes.hp;

    // Deduct damage from temp HP first
    const tmp = parseInt(hp.temp) || 0;
    const dt = amount > 0 ? Math.min(tmp, amount) : 0;

    // Remaining goes to health
    const tmpMax = parseInt(hp.tempmax) || 0;
    const dh = Math.clamped(hp.value - (amount - dt), 0, hp.max + tmpMax);

    // Update the Actor
    const updates = {
      "data.attributes.hp.temp": tmp - dt,
      "data.attributes.hp.value": dh
    };
    return this.update(updates);
  }

  /* -------------------------------------------- */

  /**
   * Cast a Spell, consuming a spell slot of a certain level
   * @param {Item5e} item   The spell being cast by the actor
   * @param {Event} event   The originating user interaction which triggered the cast
   */
  async useSpell(item, {configureDialog=true}={}) {
    if ( item.data.type !== "spell" ) throw new Error("Wrong Item type");
    const itemData = item.data.data;

    // Configure spellcasting data
    let lvl = itemData.level;
    const usesSlots = (lvl > 0) && CONFIG.DND5E.spellUpcastModes.includes(itemData.preparation.mode);
    const limitedUses = !!itemData.uses.per;
    let consumeSlot = `spell${lvl}`;
    let consumeUse = false;
    let placeTemplate = false;

    // Configure spell slot consumption and measured template placement from the form
    if ( configureDialog && (usesSlots || item.hasAreaTarget || limitedUses) ) {
      const usage = await AbilityUseDialog.create(item);
      if ( usage === null ) return;

      // Determine consumption preferences
      consumeSlot = Boolean(usage.get("consumeSlot"));
      consumeUse = Boolean(usage.get("consumeUse"));
      placeTemplate = Boolean(usage.get("placeTemplate"));

      // Determine the cast spell level
      const isPact = usage.get('level') === 'pact';
      const lvl = isPact ? this.data.data.spells.pact.level : parseInt(usage.get("level"));
      if ( lvl !== item.data.data.level ) {
        const upcastData = mergeObject(item.data, {"data.level": lvl}, {inplace: false});
        item = item.constructor.createOwned(upcastData, this);
      }

      // Denote the spell slot being consumed
      if ( consumeSlot ) consumeSlot = isPact ? "pact" : `spell${lvl}`;
    }

    // Update Actor data
    if ( usesSlots && consumeSlot && (lvl > 0) ) {
      const slots = parseInt(this.data.data.spells[consumeSlot].value);
      if ( slots === 0 || Number.isNaN(slots) ) {
        return ui.notifications.error(game.i18n.localize("DND5E.SpellCastNoSlots"));
      }
      await this.update({
        [`data.spells.${consumeSlot}.value`]: Math.max(parseInt(this.data.data.spells[consumeSlot].value) - 1, 0)
      });
    }

    // Update Item data
    if ( limitedUses && consumeUse ) {
      const uses = parseInt(itemData.uses.value || 0);
      if ( uses <= 0 ) ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name}));
      await item.update({"data.uses.value": Math.max(parseInt(item.data.data.uses.value || 0) - 1, 0)})
    }

    // Initiate ability template placement workflow if selected
    if ( placeTemplate && item.hasAreaTarget ) {
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
   * @return {Promise<Roll>}      A Promise which resolves to the created Roll instance
   */
  rollSkill(skillId, options={}) {
    const skl = this.data.data.skills[skillId];
    const bonuses = getProperty(this.data.data, "bonuses.abilities") || {};

    // Compose roll parts and data
    const parts = ["@mod"];
    const data = {mod: skl.mod + skl.prof};

    // Ability test bonus
    if ( bonuses.check ) {
      data["checkBonus"] = bonuses.check;
      parts.push("@checkBonus");
    }

    // Skill check bonus
    if ( bonuses.skill ) {
      data["skillBonus"] = bonuses.skill;
      parts.push("@skillBonus");
    }

    // Add provided extra roll parts now because they will get clobbered by mergeObject below
    if (options.parts?.length > 0) {
      parts.push(...options.parts);
    }

    // Reliable Talent applies to any skill check we have full or better proficiency in
    const reliableTalent = (skl.value >= 1 && this.getFlag("dnd5e", "reliableTalent"));

    // Roll and return
    const rollData = mergeObject(options, {
      parts: parts,
      data: data,
      title: game.i18n.format("DND5E.SkillPromptTitle", {skill: CONFIG.DND5E.skills[skillId]}),
      halflingLucky: this.getFlag("dnd5e", "halflingLucky"),
      reliableTalent: reliableTalent,
      messageData: {"flags.dnd5e.roll": {type: "skill", skillId }}
    });
    rollData.speaker = options.speaker || ChatMessage.getSpeaker({actor: this});
    return d20Roll(rollData);
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
      title: game.i18n.format("DND5E.AbilityPromptTitle", {ability: label}),
      content: `<p>${game.i18n.format("DND5E.AbilityPromptText", {ability: label})}</p>`,
      buttons: {
        test: {
          label: game.i18n.localize("DND5E.ActionAbil"),
          callback: () => this.rollAbilityTest(abilityId, options)
        },
        save: {
          label: game.i18n.localize("DND5E.ActionSave"),
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
   * @return {Promise<Roll>}      A Promise which resolves to the created Roll instance
   */
  rollAbilityTest(abilityId, options={}) {
    const label = CONFIG.DND5E.abilities[abilityId];
    const abl = this.data.data.abilities[abilityId];

    // Construct parts
    const parts = ["@mod"];
    const data = {mod: abl.mod};

    // Add feat-related proficiency bonuses
    const feats = this.data.flags.dnd5e || {};
    if ( feats.remarkableAthlete && DND5E.characterFlags.remarkableAthlete.abilities.includes(abilityId) ) {
      parts.push("@proficiency");
      data.proficiency = Math.ceil(0.5 * this.data.data.attributes.prof);
    }
    else if ( feats.jackOfAllTrades ) {
      parts.push("@proficiency");
      data.proficiency = Math.floor(0.5 * this.data.data.attributes.prof);
    }

    // Add global actor bonus
    const bonuses = getProperty(this.data.data, "bonuses.abilities") || {};
    if ( bonuses.check ) {
      parts.push("@checkBonus");
      data.checkBonus = bonuses.check;
    }

    // Add provided extra roll parts now because they will get clobbered by mergeObject below
    if (options.parts?.length > 0) {
      parts.push(...options.parts);
    }

    // Roll and return
    const rollData = mergeObject(options, {
      parts: parts,
      data: data,
      title: game.i18n.format("DND5E.AbilityPromptTitle", {ability: label}),
      halflingLucky: feats.halflingLucky,
      messageData: {"flags.dnd5e.roll": {type: "ability", abilityId }}
    });
    rollData.speaker = options.speaker || ChatMessage.getSpeaker({actor: this});
    return d20Roll(rollData);
  }

  /* -------------------------------------------- */

  /**
   * Roll an Ability Saving Throw
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {String} abilityId    The ability ID (e.g. "str")
   * @param {Object} options      Options which configure how ability tests are rolled
   * @return {Promise<Roll>}      A Promise which resolves to the created Roll instance
   */
  rollAbilitySave(abilityId, options={}) {
    const label = CONFIG.DND5E.abilities[abilityId];
    const abl = this.data.data.abilities[abilityId];

    // Construct parts
    const parts = ["@mod"];
    const data = {mod: abl.mod};

    // Include proficiency bonus
    if ( abl.prof > 0 ) {
      parts.push("@prof");
      data.prof = abl.prof;
    }

    // Include a global actor ability save bonus
    const bonuses = getProperty(this.data.data, "bonuses.abilities") || {};
    if ( bonuses.save ) {
      parts.push("@saveBonus");
      data.saveBonus = bonuses.save;
    }

    // Add provided extra roll parts now because they will get clobbered by mergeObject below
    if (options.parts?.length > 0) {
      parts.push(...options.parts);
    }

    // Roll and return
    const rollData = mergeObject(options, {
      parts: parts,
      data: data,
      title: game.i18n.format("DND5E.SavePromptTitle", {ability: label}),
      halflingLucky: this.getFlag("dnd5e", "halflingLucky"),
      messageData: {"flags.dnd5e.roll": {type: "save", abilityId }}
    });
    rollData.speaker = options.speaker || ChatMessage.getSpeaker({actor: this});
    return d20Roll(rollData);
  }

  /* -------------------------------------------- */

  /**
   * Perform a death saving throw, rolling a d20 plus any global save bonuses
   * @param {Object} options        Additional options which modify the roll
   * @return {Promise<Roll|null>}   A Promise which resolves to the Roll instance
   */
  async rollDeathSave(options={}) {

    // Display a warning if we are not at zero HP or if we already have reached 3
    const death = this.data.data.attributes.death;
    if ( (this.data.data.attributes.hp.value > 0) || (death.failure >= 3) || (death.success >= 3)) {
      ui.notifications.warn(game.i18n.localize("DND5E.DeathSaveUnnecessary"));
      return null;
    }

    // Evaluate a global saving throw bonus
    const parts = [];
    const data = {};
    const speaker = options.speaker || ChatMessage.getSpeaker({actor: this});

    // Include a global actor ability save bonus
    const bonuses = getProperty(this.data.data, "bonuses.abilities") || {};
    if ( bonuses.save ) {
      parts.push("@saveBonus");
      data.saveBonus = bonuses.save;
    }

    // Evaluate the roll
    const rollData = mergeObject(options, {
      parts: parts,
      data: data,
      title: game.i18n.localize("DND5E.DeathSavingThrow"),
      speaker: speaker,
      halflingLucky: this.getFlag("dnd5e", "halflingLucky"),
      targetValue: 10,
      messageData: {"flags.dnd5e.roll": {type: "death"}}
    });
    rollData.speaker = speaker;
    const roll = await d20Roll(rollData);
    if ( !roll ) return null;

    // Take action depending on the result
    const success = roll.total >= 10;
    const d20 = roll.dice[0].total;

    // Save success
    if ( success ) {
      let successes = (death.success || 0) + 1;

      // Critical Success = revive with 1hp
      if ( d20 === 20 ) {
        await this.update({
          "data.attributes.death.success": 0,
          "data.attributes.death.failure": 0,
          "data.attributes.hp.value": 1
        });
        await ChatMessage.create({content: game.i18n.format("DND5E.DeathSaveCriticalSuccess", {name: this.name}), speaker});
      }

      // 3 Successes = survive and reset checks
      else if ( successes === 3 ) {
        await this.update({
          "data.attributes.death.success": 0,
          "data.attributes.death.failure": 0
        });
        await ChatMessage.create({content: game.i18n.format("DND5E.DeathSaveSuccess", {name: this.name}), speaker});
      }

      // Increment successes
      else await this.update({"data.attributes.death.success": Math.clamped(successes, 0, 3)});
    }

    // Save failure
    else {
      let failures = (death.failure || 0) + (d20 === 1 ? 2 : 1);
      await this.update({"data.attributes.death.failure": Math.clamped(failures, 0, 3)});
      if ( failures >= 3 ) {  // 3 Failures = death
        await ChatMessage.create({content: game.i18n.format("DND5E.DeathSaveFailure", {name: this.name}), speaker});
      }
    }

    // Return the rolled result
    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Roll a hit die of the appropriate type, gaining hit points equal to the die roll plus your CON modifier
   * @param {string} [denomination]   The hit denomination of hit die to roll. Example "d8".
   *                                  If no denomination is provided, the first available HD will be used
   * @param {boolean} [dialog]        Show a dialog prompt for configuring the hit die roll?
   * @return {Promise<Roll|null>}     The created Roll instance, or null if no hit die was rolled
   */
  async rollHitDie(denomination, {dialog=true}={}) {

    // If no denomination was provided, choose the first available
    let cls = null;
    if ( !denomination ) {
      cls = this.itemTypes.class.find(c => c.data.data.hitDiceUsed < c.data.data.levels);
      if ( !cls ) return null;
      denomination = cls.data.data.hitDice;
    }

    // Otherwise locate a class (if any) which has an available hit die of the requested denomination
    else {
      cls = this.items.find(i => {
        const d = i.data.data;
        return (d.hitDice === denomination) && ((d.hitDiceUsed || 0) < (d.levels || 1));
      });
    }

    // If no class is available, display an error notification
    if ( !cls ) {
      ui.notifications.error(game.i18n.format("DND5E.HitDiceWarn", {name: this.name, formula: denomination}));
      return null;
    }

    // Prepare roll data
    const parts = [`1${denomination}`, "@abilities.con.mod"];
    const title = game.i18n.localize("DND5E.HitDiceRoll");
    const rollData = duplicate(this.data.data);

    // Call the roll helper utility
    const roll = await damageRoll({
      event: new Event("hitDie"),
      parts: parts,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: this}),
      allowcritical: false,
      fastForward: !dialog,
      dialogOptions: {width: 350},
      messageData: {"flags.dnd5e.roll": {type: "hitDie"}}
    });
    if ( !roll ) return null;

    // Adjust actor data
    await cls.update({"data.hitDiceUsed": cls.data.data.hitDiceUsed + 1});
    const hp = this.data.data.attributes.hp;
    const dhp = Math.min(hp.max - hp.value, roll.total);
    await this.update({"data.attributes.hp.value": hp.value + dhp});
    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Cause this Actor to take a Short Rest
   * During a Short Rest resources and limited item uses may be recovered
   * @param {boolean} dialog  Present a dialog window which allows for rolling hit dice as part of the Short Rest
   * @param {boolean} chat    Summarize the results of the rest workflow as a chat message
   * @param {boolean} autoHD  Automatically spend Hit Dice if you are missing 3 or more hit points
   * @param {boolean} autoHDThreshold   A number of missing hit points which would trigger an automatic HD roll
   * @return {Promise}        A Promise which resolves once the short rest workflow has completed
   */
  async shortRest({dialog=true, chat=true, autoHD=false, autoHDThreshold=3}={}) {

    // Take note of the initial hit points and number of hit dice the Actor has
    const hp = this.data.data.attributes.hp;
    const hd0 = this.data.data.attributes.hd;
    const hp0 = hp.value;
    let newDay = false;

    // Display a Dialog for rolling hit dice
    if ( dialog ) {
      try {
        newDay = await ShortRestDialog.shortRestDialog({actor: this, canRoll: hd0 > 0});
      } catch(err) {
        return;
      }
    }

    // Automatically spend hit dice
    else if ( autoHD ) {
      while ( (hp.value + autoHDThreshold) <= hp.max ) {
        const r = await this.rollHitDie(undefined, {dialog: false});
        if ( r === null ) break;
      }
    }

    // Note the change in HP and HD which occurred
    const dhd = this.data.data.attributes.hd - hd0;
    const dhp = this.data.data.attributes.hp.value - hp0;

    // Recover character resources
    const updateData = {};
    for ( let [k, r] of Object.entries(this.data.data.resources) ) {
      if ( r.max && r.sr ) {
        updateData[`data.resources.${k}.value`] = r.max;
      }
    }

    // Recover pact slots.
    const pact = this.data.data.spells.pact;
    updateData['data.spells.pact.value'] = pact.override || pact.max;
    await this.update(updateData);

    // Recover item uses
    const recovery = newDay ? ["sr", "day"] : ["sr"];
    const items = this.items.filter(item => item.data.data.uses && recovery.includes(item.data.data.uses.per));
    const updateItems = items.map(item => {
      return {
        _id: item._id,
        "data.uses.value": item.data.data.uses.max
      };
    });
    await this.updateEmbeddedEntity("OwnedItem", updateItems);

    // Display a Chat Message summarizing the rest effects
    let restFlavor;
    switch (game.settings.get("dnd5e", "restVariant")) {
      case 'normal': restFlavor = game.i18n.localize("DND5E.ShortRestNormal"); break;
      case 'gritty': restFlavor = game.i18n.localize(newDay ? "DND5E.ShortRestOvernight" : "DND5E.ShortRestGritty"); break;
      case 'epic':  restFlavor = game.i18n.localize("DND5E.ShortRestEpic"); break;
    }

    if ( chat ) {
      ChatMessage.create({
        user: game.user._id,
        speaker: {actor: this, alias: this.name},
        flavor: restFlavor,
        content: game.i18n.format("DND5E.ShortRestResult", {name: this.name, dice: -dhd, health: dhp})
      });
    }

    // Return data summarizing the rest effects
    return {
      dhd: dhd,
      dhp: dhp,
      updateData: updateData,
      updateItems: updateItems,
      newDay: newDay
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
    let newDay = false;
    if ( dialog ) {
      try {
        newDay = await LongRestDialog.longRestDialog({actor: this});
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
    const recovery = newDay ? ["sr", "lr", "day"] : ["sr", "lr"];
    for ( let item of this.items ) {
      const d = item.data.data;
      if ( d.uses && recovery.includes(d.uses.per) ) {
        updateItems.push({_id: item.id, "data.uses.value": d.uses.max});
      }
      else if ( d.recharge && d.recharge.value ) {
        updateItems.push({_id: item.id, "data.recharge.charged": true});
      }
    }

    // Perform the updates
    await this.update(updateData);
    if ( updateItems.length ) await this.updateEmbeddedEntity("OwnedItem", updateItems);

    // Display a Chat Message summarizing the rest effects
    let restFlavor;
    switch (game.settings.get("dnd5e", "restVariant")) {
      case 'normal': restFlavor = game.i18n.localize(newDay ? "DND5E.LongRestOvernight" : "DND5E.LongRestNormal"); break;
      case 'gritty': restFlavor = game.i18n.localize("DND5E.LongRestGritty"); break;
      case 'epic':  restFlavor = game.i18n.localize("DND5E.LongRestEpic"); break;
    }

    if ( chat ) {
      ChatMessage.create({
        user: game.user._id,
        speaker: {actor: this, alias: this.name},
        flavor: restFlavor,
        content: game.i18n.format("DND5E.LongRestResult", {name: this.name, health: dhp, dice: dhd})
      });
    }

    // Return data summarizing the rest effects
    return {
      dhd: dhd,
      dhp: dhp,
      updateData: updateData,
      updateItems: updateItems,
      newDay: newDay
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
    const convert = CONFIG.DND5E.currencyConversion;
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
      return ui.notifications.warn(game.i18n.localize("DND5E.PolymorphWarn"));
    }

    // Get the original Actor data and the new source data
    const o = duplicate(this.data);
    o.flags.dnd5e = o.flags.dnd5e || {};
    o.flags.dnd5e.transformOptions = {mergeSkills, mergeSaves};
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
    d.data.spells = o.data.spells; // Keep spell slots

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
      const prof = abilities[k].proficient;
      if ( keepPhysical && ["str", "dex", "con"].includes(k) ) abilities[k] = oa;
      else if ( keepMental && ["int", "wis", "cha"].includes(k) ) abilities[k] = oa;
      if ( keepSaves ) abilities[k].proficient = oa.proficient;
      else if ( mergeSaves ) abilities[k].proficient = Math.max(prof, oa.proficient);
    }

    // Transfer skills
    if ( keepSkills ) d.data.skills = o.data.skills;
    else if ( mergeSkills ) {
      for ( let [k, s] of Object.entries(d.data.skills) ) {
        s.value = Math.max(s.value, o.data.skills[k].value);
      }
    }

    // Keep specific items from the original data
    d.items = d.items.concat(o.items.filter(i => {
      if ( i.type === "class" ) return keepClass;
      else if ( i.type === "feat" ) return keepFeats;
      else if ( i.type === "spell" ) return keepSpells;
      else return keepItems;
    }));

    // Transfer classes for NPCs
    if (!keepClass && d.data.details.cr) {
      d.items.push({
        type: 'class',
        name: game.i18n.localize('DND5E.PolymorphTmpClass'),
        data: { levels: d.data.details.cr }
      });
    }

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
    Hooks.callAll('dnd5e.transformActor', this, target, d, {
      keepPhysical, keepMental, keepSaves, keepSkills, mergeSaves, mergeSkills,
      keepClass, keepFeats, keepSpells, keepItems, keepBio, keepVision, transformTokens
    });
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
    return canvas.scene.updateEmbeddedEntity("Token", updates);
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
      return ui.notifications.warn(game.i18n.localize("DND5E.PolymorphRevertWarn"));
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
    canvas.scene.updateEmbeddedEntity("Token", tokenUpdates);

    // Delete the polymorphed Actor and maybe re-render the original sheet
    const isRendered = this.sheet.rendered;
    if ( game.user.isGM ) await this.delete();
    original.sheet.render(isRendered);
    return original;
  }

  /* -------------------------------------------- */

  /**
   * Add additional system-specific sidebar directory context menu options for Actor entities
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
