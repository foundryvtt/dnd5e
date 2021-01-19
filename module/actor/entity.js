import { d20Roll, damageRoll } from "../dice.js";
import ShortRestDialog from "../apps/short-rest.js";
import LongRestDialog from "../apps/long-rest.js";
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

  /** @override */
  prepareBaseData() {
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
    const dcBonus = Number.isNumeric(data.bonuses?.spell?.dc) ? parseInt(data.bonuses.spell.dc) : 0;
    const saveBonus = Number.isNumeric(bonuses.save) ? parseInt(bonuses.save) : 0;
    const checkBonus = Number.isNumeric(bonuses.check) ? parseInt(bonuses.check) : 0;
    for (let [id, abl] of Object.entries(data.abilities)) {
      if ( flags.diamondSoul ) abl.proficient = 1;  // Diamond Soul is proficient in all saves
      abl.mod = Math.floor((abl.value - 10) / 2);
      abl.prof = (abl.proficient || 0) * data.attributes.prof;
      abl.saveBonus = saveBonus;
      abl.checkBonus = checkBonus;
      abl.save = abl.mod + abl.prof + abl.saveBonus;
      abl.dc = 8 + abl.mod + data.attributes.prof + dcBonus;

      // If we merged saves when transforming, take the highest bonus here.
      if (originalSaves && abl.proficient) {
        abl.save = Math.max(abl.save, originalSaves[id].save);
      }
    }

    // Inventory encumbrance
    data.attributes.encumbrance = this._computeEncumbrance(actorData);

    // Prepare skills
    this._prepareSkills(actorData, bonuses, checkBonus, originalSkills);

    // Determine Initiative Modifier
    const init = data.attributes.init;
    const athlete = flags.remarkableAthlete;
    const joat = flags.jackOfAllTrades;
    init.mod = data.abilities.dex.mod;
    if ( joat ) init.prof = Math.floor(0.5 * data.attributes.prof);
    else if ( athlete ) init.prof = Math.ceil(0.5 * data.attributes.prof);
    else init.prof = 0;
    init.value = init.value ?? 0;
    init.bonus = init.value + (flags.initiativeAlert ? 5 : 0);
    init.total = init.mod + init.prof + init.bonus;

    // Prepare spell-casting data
    data.attributes.spelldc = data.attributes.spellcasting ? data.abilities[data.attributes.spellcasting].dc : 10;
    this._computeSpellcastingProgression(this.data);

    // Compute owned item attributes which depend on prepared Actor data
    this.items.forEach(item => {
      item.getSaveDC();
      item.getAttackToHit();
    });
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

  /** @override */
  getRollData() {
    const data = super.getRollData();
    data.classes = this.data.items.reduce((obj, i) => {
      if ( i.type === "class" ) {
        obj[i.name.slugify({strict: true})] = i.data;
      }
      return obj;
    }, {});
    data.prof = this.data.data.attributes.prof || 0;
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Return the features which a character is awarded for each class level
   * @param {string} className        The class name being added
   * @param {string} subclassName     The subclass of the class being added, if any
   * @param {number} level            The number of levels in the added class
   * @param {number} priorLevel       The previous level of the added class
   * @return {Promise<Item5e[]>}     Array of Item5e entities
   */
  static async getClassFeatures({className="", subclassName="", level=1, priorLevel=0}={}) {
    className = className.toLowerCase();
    subclassName = subclassName.slugify();

    // Get the configuration of features which may be added
    const clsConfig = CONFIG.DND5E.classFeatures[className];
    if (!clsConfig) return [];

    // Acquire class features
    let ids = [];
    for ( let [l, f] of Object.entries(clsConfig.features || {}) ) {
      l = parseInt(l);
      if ( (l <= level) && (l > priorLevel) ) ids = ids.concat(f);
    }

    // Acquire subclass features
    const subConfig = clsConfig.subclasses[subclassName] || {};
    for ( let [l, f] of Object.entries(subConfig.features || {}) ) {
      l = parseInt(l);
      if ( (l <= level) && (l > priorLevel) ) ids = ids.concat(f);
    }

    // Load item data for all identified features
    const features = [];
    for ( let id of ids ) {
      features.push(await fromUuid(id));
    }

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
    const createItems = embeddedName === "OwnedItem" ? await this._createClassFeatures(data) : [];
    let updated = await super.updateEmbeddedEntity(embeddedName, data, options);
    if ( createItems.length ) await this.createEmbeddedEntity("OwnedItem", createItems);
    return updated;
  }

  /* -------------------------------------------- */

  /**
   * Create additional class features in the Actor when a class item is updated.
   * @private
   */
  async _createClassFeatures(updated) {
    let toCreate = [];
    for (let u of updated instanceof Array ? updated : [updated]) {
      const item = this.items.get(u._id);
      if (!item || (item.data.type !== "class")) continue;
      const updateData = expandObject(u);
      const config = {
        className: updateData.name || item.data.name,
        subclassName: getProperty(updateData, "data.subclass") || item.data.data.subclass,
        level: getProperty(updateData, "data.levels"),
        priorLevel: item ? item.data.data.levels : 0
      }

      // Get and create features for an increased class level
      let changed = false;
      if ( config.level && (config.level > config.priorLevel)) changed = true;
      if ( config.subclassName !== item.data.data.subclass ) changed = true;

      // Get features to create
      if ( changed ) {
        const existing = new Set(this.items.map(i => i.name));
        const features = await Actor5e.getClassFeatures(config);
        for ( let f of features ) {
          if ( !existing.has(f.name) ) toCreate.push(f);
        }
      }
    }
    return toCreate
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
    for (let [id, skl] of Object.entries(data.skills)) {
      skl.value = Math.clamped(Number(skl.value).toNearest(0.5), 0, 2) ?? 0;
      let round = Math.floor;

      // Remarkable
      if ( athlete && (skl.value < 0.5) && feats.remarkableAthlete.abilities.includes(skl.ability) ) {
        skl.value = 0.5;
        round = Math.ceil;
      }

      // Jack of All Trades
      if ( joat && (skl.value < 0.5) ) {
        skl.value = 0.5;
      }

      // Polymorph Skill Proficiencies
      if ( originalSkills ) {
        skl.value = Math.max(skl.value, originalSkills[id].value);
      }

      // Compute modifier
      skl.bonus = checkBonus + skillBonus;
      skl.mod = data.abilities[skl.ability].mod;
      skl.prof = round(skl.value * data.attributes.prof);
      skl.total = skl.mod + skl.prof + skl.bonus;

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

    // EXCEPTION: NPC with an explicit spell-caster level
    if (isNPC && actorData.data.details.spellLevel) {
      progression.slot = actorData.data.details.spellLevel;
    }

    // Look up the number of slots per level from the progression table
    const levels = Math.clamped(progression.slot, 0, 20);
    const slots = DND5E.SPELL_SLOT_TABLE[levels - 1] || [];
    for ( let [n, lvl] of Object.entries(spells) ) {
      let i = parseInt(n.slice(-1));
      if ( Number.isNaN(i) ) continue;
      if ( Number.isNumeric(lvl.override) ) lvl.max = Math.max(parseInt(lvl.override), 0);
      else lvl.max = slots[i-1] || 0;
      lvl.value = parseInt(lvl.value);
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
      spells.pact.max = parseInt(spells.pact.override) || 0
      spells.pact.level = spells.pact.max > 0 ? 1 : 0;
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
      return weight + (q * w);
    }, 0);

    // [Optional] add Currency Weight (for non-transformed actors)
    if ( game.settings.get("dnd5e", "currencyWeight") && actorData.data.currency ) {
      const currency = actorData.data.currency;
      const numCoins = Object.values(currency).reduce((val, denom) => val += Math.max(denom, 0), 0);
      weight += numCoins / CONFIG.DND5E.encumbrance.currencyPerWeight;
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
    weight = weight.toNearest(0.1);
    const max = actorData.data.abilities.str.value * CONFIG.DND5E.encumbrance.strMultiplier * mod;
    const pct = Math.clamped((weight * 100) / max, 0, 100);
    return { value: weight.toNearest(0.1), max, pct, encumbered: pct > (2/3) };
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
  async createEmbeddedEntity(embeddedName, itemData, options={}) {

    // Pre-creation steps for owned items
    if ( embeddedName === "OwnedItem" ) this._preCreateOwnedItem(itemData, options);

    // Standard embedded entity creation
    return super.createEmbeddedEntity(embeddedName, itemData, options);
  }

  /* -------------------------------------------- */

  /**
   * A temporary shim function which will eventually (in core fvtt version 0.8.0+) be migrated to the new abstraction layer
   * @param itemData
   * @param options
   * @private
   */
  _preCreateOwnedItem(itemData, options) {
    if ( this.data.type === "vehicle" ) return;
    const isNPC = this.data.type === 'npc';
    let initial = {};
    switch ( itemData.type ) {

      case "weapon":
        if ( getProperty(itemData, "data.equipped") === undefined ) {
          initial["data.equipped"] = isNPC;       // NPCs automatically equip weapons
        }
        if ( getProperty(itemData, "data.proficient") === undefined ) {
          if ( isNPC ) {
            initial["data.proficient"] = true;    // NPCs automatically have equipment proficiency
          } else {
            const weaponProf = {
              "natural": true,
              "simpleM": "sim",
              "simpleR": "sim",
              "martialM": "mar",
              "martialR": "mar"
            }[itemData.data?.weaponType];         // Player characters check proficiency
            const actorWeaponProfs = this.data.data.traits?.weaponProf?.value || [];
            const hasWeaponProf = (weaponProf === true) || actorWeaponProfs.includes(weaponProf);
            initial["data.proficient"] = hasWeaponProf;
          }
        }
        break;

      case "equipment":
        if ( getProperty(itemData, "data.equipped") === undefined ) {
          initial["data.equipped"] = isNPC;       // NPCs automatically equip equipment
        }
        if ( getProperty(itemData, "data.proficient") === undefined ) {
          if ( isNPC ) {
            initial["data.proficient"] = true;    // NPCs automatically have equipment proficiency
          } else {
            const armorProf = {
              "natural": true,
              "clothing": true,
              "light": "lgt",
              "medium": "med",
              "heavy": "hvy",
              "shield": "shl"
            }[itemData.data?.armor?.type];        // Player characters check proficiency
            const actorArmorProfs = this.data.data.traits?.armorProf?.value || [];
            const hasEquipmentProf = (armorProf === true) || actorArmorProfs.includes(armorProf);
            initial["data.proficient"] = hasEquipmentProf;
          }
        }
        break;

      case "spell":
        if ( getProperty(itemData, "data.proficient") === undefined ) {
          initial["data.prepared"] = isNPC;       // NPCs automatically prepare spells
        }
        break;
    }
    mergeObject(itemData, initial);
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

    // Delegate damage application to a hook
    // TODO replace this in the future with a better modifyTokenAttribute function in the core
    const allowed = Hooks.call("modifyTokenAttribute", {
      attribute: "attributes.hp",
      value: amount,
      isDelta: false,
      isBar: true
    }, updates);
    return allowed !== false ? this.update(updates) : this;
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

    // Diamond Soul adds proficiency
    if ( this.getFlag("dnd5e", "diamondSoul") ) {
      parts.push("@prof");
      data.prof = this.data.data.attributes.prof;
    }

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
    const dhp = Math.min(hp.max + (hp.tempmax ?? 0) - hp.value, roll.total);
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
    if ( chat ) {

      // Summarize the rest duration
      let restFlavor;
      switch (game.settings.get("dnd5e", "restVariant")) {
        case 'normal': restFlavor = game.i18n.localize("DND5E.ShortRestNormal"); break;
        case 'gritty': restFlavor = game.i18n.localize(newDay ? "DND5E.ShortRestOvernight" : "DND5E.ShortRestGritty"); break;
        case 'epic':  restFlavor = game.i18n.localize("DND5E.ShortRestEpic"); break;
      }

      // Summarize the health effects
      let srMessage = "DND5E.ShortRestResultShort";
      if ((dhd !== 0) && (dhp !== 0)) srMessage = "DND5E.ShortRestResult";

      // Create a chat message
      ChatMessage.create({
        user: game.user._id,
        speaker: {actor: this, alias: this.name},
        flavor: restFlavor,
        content: game.i18n.format(srMessage, {name: this.name, dice: -dhd, health: dhp})
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
   * @param {boolean} newDay  Whether the long rest carries over to a new day
   * @return {Promise}        A Promise which resolves once the long rest workflow has completed
   */
  async longRest({dialog=true, chat=true, newDay=true}={}) {
    const data = this.data.data;

    // Maybe present a confirmation dialog
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
      updateData[`data.spells.${k}.value`] = Number.isNumeric(v.override) ? v.override : (v.max ?? 0);
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

    // Determine the chat message to display
    if ( chat ) {
      let lrMessage = "DND5E.LongRestResultShort";
      if((dhp !== 0) && (dhd !== 0)) lrMessage = "DND5E.LongRestResult";
      else if ((dhp !== 0) && (dhd === 0)) lrMessage = "DND5E.LongRestResultHitPoints";
      else if ((dhp === 0) && (dhd !== 0)) lrMessage = "DND5E.LongRestResultHitDice";
      ChatMessage.create({
        user: game.user._id,
        speaker: {actor: this, alias: this.name},
        flavor: restFlavor,
        content: game.i18n.format(lrMessage, {name: this.name, health: dhp, dice: dhd})
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
    const o = duplicate(this.toJSON());
    o.flags.dnd5e = o.flags.dnd5e || {};
    o.flags.dnd5e.transformOptions = {mergeSkills, mergeSaves};
    const source = duplicate(target.toJSON());

    // Prepare new data to merge from the source
    const d = {
      type: o.type, // Remain the same actor type
      name: `${o.name} (${source.name})`, // Append the new shape to your old name
      data: source.data, // Get the data model of your new form
      items: source.items, // Get the items of your new form
      effects: o.effects.concat(source.effects), // Combine active effects from both forms
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
      d.token.img = images[Math.floor(Math.random() * images.length)];
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
    return canvas.scene?.updateEmbeddedEntity("Token", updates);
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
    if ( canvas.ready ) {
      const tokens = this.getActiveTokens(true);
      const tokenUpdates = tokens.map(t => {
        const tokenData = duplicate(original.data.token);
        tokenData._id = t.id;
        tokenData.actorId = original.id;
        return tokenData;
      });
      canvas.scene.updateEmbeddedEntity("Token", tokenUpdates);
    }

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

  /* -------------------------------------------- */
  /*  DEPRECATED METHODS                          */
  /* -------------------------------------------- */

  /**
   * @deprecated since dnd5e 0.97
   */
  getSpellDC(ability) {
    console.warn(`The Actor5e#getSpellDC(ability) method has been deprecated in favor of Actor5e#data.data.abilities[ability].dc`);
    return this.data.data.abilities[ability]?.dc;
  }

  /* -------------------------------------------- */

  /**
   * Cast a Spell, consuming a spell slot of a certain level
   * @param {Item5e} item   The spell being cast by the actor
   * @param {Event} event   The originating user interaction which triggered the cast
   * @deprecated since dnd5e 1.2.0
   */
  async useSpell(item, {configureDialog=true}={}) {
    console.warn(`The Actor5e#useSpell method has been deprecated in favor of Item5e#roll`);
    if ( item.data.type !== "spell" ) throw new Error("Wrong Item type");
    return item.roll();
  }
}
