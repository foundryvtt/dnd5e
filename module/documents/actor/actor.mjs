import Proficiency from "./proficiency.mjs";
import { d20Roll, damageRoll } from "../../dice/dice.mjs";
import { simplifyBonus } from "../../utils.mjs";
import ShortRestDialog from "../../applications/actor/short-rest.mjs";
import LongRestDialog from "../../applications/actor/long-rest.mjs";
import ProficiencySelector from "../../applications/proficiency-selector.mjs";
import Item5e from "../item.mjs";
import SelectItemsPrompt from "../../applications/select-items-prompt.mjs";

/**
 * Extend the base Actor class to implement additional system-specific logic.
 */
export default class Actor5e extends Actor {

  /**
   * The data source for Actor5e.classes allowing it to be lazily computed.
   * @type {Object<Item5e>}
   * @private
   */
  _classes;

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * A mapping of classes belonging to this Actor.
   * @type {Object<Item5e>}
   */
  get classes() {
    if ( this._classes !== undefined ) return this._classes;
    if ( !["character", "npc"].includes(this.type) ) return this._classes = {};
    return this._classes = this.items.filter(item => item.type === "class").reduce((obj, cls) => {
      obj[cls.identifier] = cls;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * Is this Actor currently polymorphed into some other creature?
   * @type {boolean}
   */
  get isPolymorphed() {
    return this.getFlag("dnd5e", "isPolymorphed") || false;
  }

  /* -------------------------------------------- */

  /**
   * The Actor's currently equipped armor, if any.
   * @type {Item5e|null}
   */
  get armor() {
    return this.system.attributes.ac.equippedArmor ?? null;
  }

  /* -------------------------------------------- */

  /**
   * The Actor's currently equipped shield, if any.
   * @type {Item5e|null}
   */
  get shield() {
    return this.system.attributes.ac.equippedShield ?? null;
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareData() {
    this._classes = undefined;
    this._preparationWarnings = [];
    super.prepareData();
    this.items.forEach(item => item.prepareFinalAttributes());
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareBaseData() {
    const updates = {};
    this._prepareBaseAbilities(updates);
    this._prepareBaseSkills(updates);
    if ( !foundry.utils.isEmpty(updates) ) {
      if ( !this.id ) this.updateSource(updates);
      else this.update(updates);
    }

    this._prepareBaseArmorClass();
    switch ( this.type ) {
      case "character":
        return this._prepareCharacterData();
      case "npc":
        return this._prepareNPCData();
      case "vehicle":
        return this._prepareVehicleData();
    }
  }

  /* --------------------------------------------- */

  /** @inheritDoc */
  applyActiveEffects() {
    // The Active Effects do not have access to their parent at preparation time, so we wait until this stage to
    // determine whether they are suppressed or not.
    this.effects.forEach(e => e.determineSuppression());
    return super.applyActiveEffects();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    const flags = this.flags.dnd5e || {};
    this.labels = {};

    // Retrieve data for polymorphed actors
    let originalSaves = null;
    let originalSkills = null;
    if ( this.isPolymorphed ) {
      const transformOptions = flags.transformOptions;
      const original = game.actors?.get(flags.originalActor);
      if ( original ) {
        if ( transformOptions.mergeSaves ) originalSaves = original.system.abilities;
        if ( transformOptions.mergeSkills ) originalSkills = original.system.skills;
      }
    }

    // Prepare abilities, skills, & everything else
    const globalBonuses = this.system.bonuses?.abilities ?? {};
    const bonusData = this.getRollData();
    const checkBonus = simplifyBonus(globalBonuses?.check, bonusData);
    this._prepareAbilities(bonusData, globalBonuses, checkBonus, originalSaves);
    this._prepareSkills(bonusData, globalBonuses, checkBonus, originalSkills);
    this._prepareArmorClass();
    this._prepareEncumbrance();
    this._prepareInitiative(bonusData, checkBonus);
    this._prepareScaleValues();
    this._prepareSpellcasting();
  }

  /* -------------------------------------------- */

  /**
   * Return the amount of experience required to gain a certain character level.
   * @param {number} level  The desired level.
   * @returns {number}      The XP required.
   */
  getLevelExp(level) {
    const levels = CONFIG.DND5E.CHARACTER_EXP_LEVELS;
    return levels[Math.min(level, levels.length - 1)];
  }

  /* -------------------------------------------- */

  /**
   * Return the amount of experience granted by killing a creature of a certain CR.
   * @param {number} cr     The creature's challenge rating.
   * @returns {number}      The amount of experience granted per kill.
   */
  getCRExp(cr) {
    if ( cr < 1.0 ) return Math.max(200 * cr, 10);
    return CONFIG.DND5E.CR_EXP_LEVELS[cr];
  }

  /* -------------------------------------------- */

  /**
   * @inheritdoc
   * @param {object} [options]
   * @param {boolean} [options.deterministic] Whether to force deterministic values for data properties that could be
   *                                            either a die term or a flat term.
   */
  getRollData({ deterministic=false }={}) {
    const data = foundry.utils.deepClone(super.getRollData());
    data.prof = new Proficiency(this.system.attributes.prof, 1);
    if ( deterministic ) data.prof = data.prof.flat;

    data.classes = {};
    for ( const [identifier, cls] of Object.entries(this.classes) ) {
      data.classes[identifier] = cls.system;
      if ( cls.subclass ) data.classes[identifier].subclass = cls.subclass.system;
    }
    return data;
  }

  /* -------------------------------------------- */
  /*  Base Data Preparation Helpers               */
  /* -------------------------------------------- */

  /**
   * Update the actor's abilities list to match the abilities configured in `DND5E.abilities`.
   * Mutates the system.abilities object.
   * @param {object} updates  Updates to be applied to the actor. *Will be mutated.*
   * @protected
   */
  _prepareBaseAbilities(updates) {
    const abilities = {};
    for ( const key of Object.keys(CONFIG.DND5E.abilities) ) {
      abilities[key] = this.system.abilities[key];
      if ( !abilities[key] ) {
        abilities[key] = foundry.utils.deepClone(game.system.template.Actor.templates.common.abilities.cha);

        // Honor: Charisma for NPC, 0 for vehicles
        if ( key === "hon" ) {
          if ( this.type === "vehicle" ) abilities[key].value = 0;
          else if ( this.type === "npc" ) abilities[key].value = this.system.abilities.cha?.value ?? 10;
        }

        // Sanity: Wisdom for NPC, 0 for vehicles
        else if ( key === "san" ) {
          if ( this.type === "vehicle" ) abilities[key].value = 0;
          else if ( this.type === "npc" ) abilities[key].value = this.system.abilities.wis?.value ?? 10;
        }

        updates[`system.abilities.${key}`] = foundry.utils.deepClone(abilities[key]);
      }
    }
    this.system.abilities = abilities;
  }

  /* -------------------------------------------- */

  /**
   * Update the actor's skill list to match the skills configured in `DND5E.skills`.
   * Mutates the system.skills object.
   * @param {object} updates  Updates to be applied to the actor. *Will be mutated*.
   * @private
   */
  _prepareBaseSkills(updates) {
    if ( this.type === "vehicle") return;
    const skills = {};
    for ( const [key, skill] of Object.entries(CONFIG.DND5E.skills) ) {
      skills[key] = this.system.skills[key];
      if ( !skills[key] ) {
        skills[key] = foundry.utils.deepClone(game.system.template.Actor.templates.creature.skills.acr);
        skills[key].ability = skill.ability;
        updates[`data.skills.${key}`] = foundry.utils.deepClone(skills[key]);
      }
    }
    this.system.skills = skills;
  }

  /* -------------------------------------------- */

  /**
   * Initialize derived AC fields for Active Effects to target.
   * Mutates the system.attributes.ac object.
   * @protected
   */
  _prepareBaseArmorClass() {
    const ac = this.system.attributes.ac;
    ac.armor = 10;
    ac.shield = ac.bonus = ac.cover = 0;
  }

  /* -------------------------------------------- */

  /**
   * Perform any Character specific preparation.
   * Mutates several aspects of the system data object.
   * @protected
   */
  _prepareCharacterData() {
    this.system.details.level = 0;
    this.system.attributes.hd = 0;
    this.system.attributes.attunement.value = 0;

    for ( const item of this.items ) {
      // Class levels & hit dice
      if ( item.type === "class" ) {
        const classLevels = parseInt(item.system.levels) || 1;
        this.system.details.level += classLevels;
        this.system.attributes.hd += classLevels - (parseInt(item.system.hitDiceUsed) || 0);
      }

      // Attuned items
      else if ( item.system.attunement === CONFIG.DND5E.attunementTypes.ATTUNED ) {
        this.system.attributes.attunement.value += 1;
      }
    }

    // Character proficiency bonus
    this.system.attributes.prof = Math.floor((this.system.details.level + 7) / 4);

    // Experience required for next level
    const xp = this.system.details.xp;
    xp.max = this.getLevelExp(this.system.details.level || 1);
    const prior = this.getLevelExp(this.system.details.level - 1 || 0);
    const required = xp.max - prior;
    const pct = Math.round((xp.value - prior) * 100 / required);
    xp.pct = Math.clamped(pct, 0, 100);
  }

  /* -------------------------------------------- */

  /**
   * Perform any NPC specific preparation.
   * Mutates several aspects of the system data object.
   * @protected
   */
  _prepareNPCData() {
    const cr = this.system.details.cr;

    // Attuned items
    this.system.attributes.attunement.value = this.items.filter(i => {
      return i.system.attunement === CONFIG.DND5E.attunementTypes.ATTUNED;
    }).length;

    // Kill Experience
    this.system.details.xp.value = this.getCRExp(cr);

    // Proficiency
    this.system.attributes.prof = Math.floor((Math.max(cr, 1) + 7) / 4);

    // Spellcaster Level
    if ( this.system.attributes.spellcasting && !Number.isNumeric(this.system.details.spellLevel) ) {
      this.system.details.spellLevel = Math.max(cr, 1);
    }
  }

  /* -------------------------------------------- */

  /**
   * Perform any Vehicle specific preparation.
   * Mutates several aspects of the system data object.
   * @protected
   */
  _prepareVehicleData() {
    this.system.attributes.prof = 0;
  }

  /* -------------------------------------------- */
  /*  Derived Data Preparation Helpers            */
  /* -------------------------------------------- */

  /**
   * Prepare abilities.
   * @param {object} bonusData      Data produced by `getRollData` to be applied to bonus formulas.
   * @param {object} globalBonuses  Global bonus data.
   * @param {number} checkBonus     Global ability check bonus.
   * @param {object} originalSaves  A transformed actor's original actor's abilities.
   * @protected
   */
  _prepareAbilities(bonusData, globalBonuses, checkBonus, originalSaves) {
    const flags = this.flags.dnd5e ?? {};
    const dcBonus = simplifyBonus(this.system.bonuses?.spell?.dc, bonusData);
    const saveBonus = simplifyBonus(globalBonuses.save, bonusData);
    for ( const [id, abl] of Object.entries(this.system.abilities) ) {
      if ( flags.diamondSoul ) abl.proficient = 1;  // Diamond Soul is proficient in all saves
      abl.mod = Math.floor((abl.value - 10) / 2);

      const isRA = this._isRemarkableAthlete(id);
      abl.checkProf = new Proficiency(this.system.attributes.prof, (isRA || flags.jackOfAllTrades) ? 0.5 : 0, !isRA);
      const saveBonusAbl = simplifyBonus(abl.bonuses?.save, bonusData);
      abl.saveBonus = saveBonusAbl + saveBonus;

      abl.saveProf = new Proficiency(this.system.attributes.prof, abl.proficient);
      const checkBonusAbl = simplifyBonus(abl.bonuses?.check, bonusData);
      abl.checkBonus = checkBonusAbl + checkBonus;

      abl.save = abl.mod + abl.saveBonus;
      if ( Number.isNumeric(abl.saveProf.term) ) abl.save += abl.saveProf.flat;
      abl.dc = 8 + abl.mod + this.system.attributes.prof + dcBonus;

      // If we merged saves when transforming, take the highest bonus here.
      if ( originalSaves && abl.proficient ) abl.save = Math.max(abl.save, originalSaves[id].save);
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare skill checks. Mutates the values of system.skills.
   * @param {object} bonusData       Data produced by `getRollData` to be applied to bonus formulas.
   * @param {object} globalBonuses   Global bonus data.
   * @param {number} checkBonus      Global ability check bonus.
   * @param {object} originalSkills  A transformed actor's original actor's skills.
   * @protected
   */
  _prepareSkills(bonusData, globalBonuses, checkBonus, originalSkills) {
    if ( this.type === "vehicle" ) return;
    const flags = this.flags.dnd5e ?? {};

    // Skill modifiers
    const feats = CONFIG.DND5E.characterFlags;
    const skillBonus = simplifyBonus(globalBonuses.skill, bonusData);
    for ( const [id, skl] of Object.entries(this.system.skills) ) {
      const ability = this.system.abilities[skl.ability];
      skl.value = Math.clamped(Number(skl.value).toNearest(0.5), 0, 2) ?? 0;
      const baseBonus = simplifyBonus(skl.bonuses?.check, bonusData);
      let roundDown = true;

      // Remarkable Athlete
      if ( this._isRemarkableAthlete(skl.ability) && (skl.value < 0.5) ) {
        skl.value = 0.5;
        roundDown = false;
      }

      // Jack of All Trades
      else if ( flags.jackOfAllTrades && (skl.value < 0.5) ) {
        skl.value = 0.5;
      }

      // Polymorph Skill Proficiencies
      if ( originalSkills ) {
        skl.value = Math.max(skl.value, originalSkills[id].value);
      }

      // Compute modifier
      const checkBonusAbl = simplifyBonus(ability?.bonuses?.check, bonusData);
      skl.bonus = baseBonus + checkBonus + checkBonusAbl + skillBonus;
      skl.mod = ability?.mod ?? 0;
      skl.prof = new Proficiency(this.system.attributes.prof, skl.value, roundDown);
      skl.proficient = skl.value;
      skl.total = skl.mod + skl.bonus;
      if ( Number.isNumeric(skl.prof.term) ) skl.total += skl.prof.flat;

      // Compute passive bonus
      const passive = flags.observantFeat && (feats.observantFeat.skills.includes(id)) ? 5 : 0;
      const passiveBonus = simplifyBonus(skl.bonuses?.passive, bonusData);
      skl.passive = 10 + skl.mod + skl.bonus + skl.prof.flat + passive + passiveBonus;
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare a character's AC value from their equipped armor and shield.
   * Mutates the value of the `system.attributes.ac` object.
   */
  _prepareArmorClass() {
    const ac = this.system.attributes.ac;

    // Apply automatic migrations for older data structures
    let cfg = CONFIG.DND5E.armorClasses[ac.calc];
    if ( !cfg ) {
      ac.calc = "flat";
      if ( Number.isNumeric(ac.value) ) ac.flat = Number(ac.value);
      cfg = CONFIG.DND5E.armorClasses.flat;
    }

    // Identify Equipped Items
    const armorTypes = new Set(Object.keys(CONFIG.DND5E.armorTypes));
    const {armors, shields} = this.itemTypes.equipment.reduce((obj, equip) => {
      const armor = equip.system.armor;
      if ( !equip.system.equipped || !armorTypes.has(armor?.type) ) return obj;
      if ( armor.type === "shield" ) obj.shields.push(equip);
      else obj.armors.push(equip);
      return obj;
    }, {armors: [], shields: []});

    // Determine base AC
    switch ( ac.calc ) {

      // Flat AC (no additional bonuses)
      case "flat":
        ac.value = Number(ac.flat);
        return;

      // Natural AC (includes bonuses)
      case "natural":
        ac.base = Number(ac.flat);
        break;

      default:
        let formula = ac.calc === "custom" ? ac.formula : cfg.formula;
        if ( armors.length ) {
          if ( armors.length > 1 ) this._preparationWarnings.push("DND5E.WarnMultipleArmor");
          const armorData = armors[0].system.armor;
          const isHeavy = armorData.type === "heavy";
          ac.armor = armorData.value ?? ac.armor;
          ac.dex = isHeavy ? 0 : Math.min(armorData.dex ?? Infinity, this.system.abilities.dex?.mod ?? 0);
          ac.equippedArmor = armors[0];
        }
        else ac.dex = this.system.abilities.dex?.mod ?? 0;

        const rollData = this.getRollData({ deterministic: true });
        rollData.attributes.ac = ac;
        try {
          const replaced = Roll.replaceFormulaData(formula, rollData);
          ac.base = Roll.safeEval(replaced);
        } catch(err) {
          this._preparationWarnings.push("DND5E.WarnBadACFormula");
          const replaced = Roll.replaceFormulaData(CONFIG.DND5E.armorClasses.default.formula, rollData);
          ac.base = Roll.safeEval(replaced);
        }
        break;
    }

    // Equipped Shield
    if ( shields.length ) {
      if ( shields.length > 1 ) this._preparationWarnings.push("DND5E.WarnMultipleShields");
      ac.shield = shields[0].system.armor.value ?? 0;
      ac.equippedShield = shields[0];
    }

    // Compute total AC and return
    ac.value = ac.base + ac.shield + ac.bonus + ac.cover;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the level and percentage of encumbrance for an Actor.
   * Optionally include the weight of carried currency by applying the standard rule from the PHB pg. 143.
   * Mutates the value of the `system.attributes.encumbrance` object.
   * @protected
   */
  _prepareEncumbrance() {
    const encumbrance = this.system.attributes.encumbrance ??= {};

    // Get the total weight from items
    const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
    let weight = this.items.reduce((weight, i) => {
      if ( !physicalItems.includes(i.type) ) return weight;
      const q = i.system.quantity || 0;
      const w = i.system.weight || 0;
      return weight + (q * w);
    }, 0);

    // [Optional] add Currency Weight (for non-transformed actors)
    const currency = this.system.currency;
    if ( game.settings.get("dnd5e", "currencyWeight") && currency ) {
      const numCoins = Object.values(currency).reduce((val, denom) => val + Math.max(denom, 0), 0);
      const currencyPerWeight = game.settings.get("dnd5e", "metricWeightUnits")
        ? CONFIG.DND5E.encumbrance.currencyPerWeight.metric
        : CONFIG.DND5E.encumbrance.currencyPerWeight.imperial;
      weight += numCoins / currencyPerWeight;
    }

    // Determine the Encumbrance size class
    let mod = {tiny: 0.5, sm: 1, med: 1, lg: 2, huge: 4, grg: 8}[this.system.traits.size] || 1;
    if ( this.flags.dnd5e?.powerfulBuild ) mod = Math.min(mod * 2, 8);

    const strengthMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
      ? CONFIG.DND5E.encumbrance.strMultiplier.metric
      : CONFIG.DND5E.encumbrance.strMultiplier.imperial;

    // Populate final Encumbrance values
    encumbrance.value = weight.toNearest(0.1);
    encumbrance.max = ((this.system.abilities.str?.value ?? 10) * strengthMultiplier * mod).toNearest(0.1);
    encumbrance.pct = Math.clamped((encumbrance.value * 100) / encumbrance.max, 0, 100);
    encumbrance.encumbered = encumbrance.pct > (200 / 3);
  }

  /* -------------------------------------------- */

  /**
   * Prepare the initiative data for an actor.
   * Mutates the value of the `system.attributes.init` object.
   * @param {object} bonusData         Data produced by `getRollData` to be applied to bonus formulas.
   * @param {number} globalCheckBonus  Global ability check bonus.
   * @protected
   */
  _prepareInitiative(bonusData, globalCheckBonus) {
    const init = this.system.attributes.init ??= {};
    const { initiativeAlert, jackOfAllTrades, remarkableAthlete } = this.flags.dnd5e ?? {};

    // Initiative modifiers
    const dexCheckBonus = simplifyBonus(this.system.abilities.dex?.bonuses?.check, bonusData);

    // Compute initiative modifier
    init.mod = this.system.abilities.dex?.mod ?? 0;
    init.prof = new Proficiency(
      this.system.attributes.prof, (jackOfAllTrades || remarkableAthlete) ? 0.5 : 0, !remarkableAthlete
    );
    init.value = init.value ?? 0;
    init.bonus = init.value + (initiativeAlert ? 5 : 0);
    init.total = init.mod + init.bonus + dexCheckBonus + globalCheckBonus;
    if ( Number.isNumeric(init.prof.term) ) init.total += init.prof.flat;
  }

  /* -------------------------------------------- */

  /**
   * Derive any values that have been scaled by the Advancement system.
   * Mutates the value of the `system.scale` object.
   * @protected
   */
  _prepareScaleValues() {
    this.system.scale = Object.entries(this.classes).reduce((scale, [identifier, cls]) => {
      scale[identifier] = cls.scaleValues;
      if ( cls.subclass ) scale[cls.subclass.identifier] = cls.subclass.scaleValues;
      return scale;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * Prepare data related to the spell-casting capabilities of the Actor.
   * Mutates the value of the system.spells object.
   * @protected
   */
  _prepareSpellcasting() {
    if ( this.type === "vehicle" ) return;
    const isNPC = this.type === "npc";
    const spells = this.system.spells;

    // Spellcasting DC
    const spellcastingAbility = this.system.abilities[this.system.attributes.spellcasting];
    this.system.attributes.spelldc = spellcastingAbility ? spellcastingAbility.dc : 8 + this.system.attributes.prof;

    // Translate the list of classes into spell-casting progression
    const progression = {total: 0, slot: 0, pact: 0};

    // Keep track of the last seen caster in case we're in a single-caster situation.
    let caster = null;

    // Tabulate the total spell-casting progression
    for ( let cls of Object.values(this.classes) ) {
      const prog = cls.spellcasting.progression;
      if ( prog === "none" ) continue;
      const levels = cls.system.levels;

      // Accumulate levels
      if ( prog !== "pact" ) {
        caster = cls;
        progression.total++;
      }
      switch (prog) {
        case "third": progression.slot += Math.floor(levels / 3); break;
        case "half": progression.slot += Math.floor(levels / 2); break;
        case "full": progression.slot += levels; break;
        case "artificer": progression.slot += Math.ceil(levels / 2); break;
        case "pact": progression.pact += levels; break;
      }
    }

    // EXCEPTION: single-classed non-full progression rounds up, rather than down
    const isSingleClass = (progression.total === 1) && (progression.slot > 0);
    if ( !isNPC && isSingleClass && ["half", "third"].includes(caster.spellcasting.progression) ) {
      const denom = caster.spellcasting.progression === "third" ? 3 : 2;
      progression.slot = Math.ceil(caster.system.levels / denom);
    }

    // EXCEPTION: NPC with an explicit spell-caster level
    if ( isNPC && this.system.details.spellLevel ) progression.slot = this.system.details.spellLevel;

    // Look up the number of slots per level from the progression table
    const levels = Math.clamped(progression.slot, 0, CONFIG.DND5E.maxLevel);
    const slots = CONFIG.DND5E.SPELL_SLOT_TABLE[Math.min(levels, CONFIG.DND5E.SPELL_SLOT_TABLE.length) - 1] || [];
    for ( let [n, lvl] of Object.entries(spells) ) {
      let i = parseInt(n.slice(-1));
      if ( Number.isNaN(i) ) continue;
      if ( Number.isNumeric(lvl.override) ) lvl.max = Math.max(parseInt(lvl.override), 0);
      else lvl.max = slots[i-1] || 0;
      lvl.value = parseInt(lvl.value);
    }

    // Determine the Actor's pact magic level (if any)
    let pl = Math.clamped(progression.pact, 0, CONFIG.DND5E.maxLevel);
    spells.pact = spells.pact || {};
    if ( (pl === 0) && isNPC && Number.isNumeric(spells.pact.override) ) pl = this.system.details.spellLevel;

    // Determine the number of Warlock pact slots per level
    if ( pl > 0 ) {
      spells.pact.level = Math.ceil(Math.min(10, pl) / 2);
      if ( Number.isNumeric(spells.pact.override) ) spells.pact.max = Math.max(parseInt(spells.pact.override), 1);
      else spells.pact.max = Math.max(1, Math.min(pl, 2), Math.min(pl - 8, 3), Math.min(pl - 13, 4));
      spells.pact.value = Math.min(spells.pact.value, spells.pact.max);
    } else {
      spells.pact.max = parseInt(spells.pact.override) || 0;
      spells.pact.level = spells.pact.max > 0 ? 1 : 0;
    }
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    const sourceId = this.getFlag("core", "sourceId");
    if ( sourceId?.startsWith("Compendium.") ) return;

    // Configure prototype token settings
    const s = CONFIG.DND5E.tokenSizes[this.system.traits.size || "med"];
    const prototypeToken = {width: s, height: s};
    if ( this.type === "character" ) Object.assign(prototypeToken, {vision: true, actorLink: true, disposition: 1});
    this.updateSource({prototypeToken});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);

    // Apply changes in Actor size to Token width/height
    const newSize = foundry.utils.getProperty(changed, "system.traits.size");
    if ( newSize && (newSize !== this.system.traits?.size) ) {
      let size = CONFIG.DND5E.tokenSizes[newSize];
      if ( !foundry.utils.hasProperty(changed, "prototypeToken.width") ) {
        changed.prototypeToken ||= {};
        changed.prototypeToken.height = size;
        changed.prototypeToken.width = size;
      }
    }

    // Reset death save counters
    const isDead = this.system.attributes.hp.value <= 0;
    if ( isDead && (foundry.utils.getProperty(changed, "system.attributes.hp.value") > 0) ) {
      foundry.utils.setProperty(changed, "system.attributes.death.success", 0);
      foundry.utils.setProperty(changed, "system.attributes.death.failure", 0);
    }
  }

  /* -------------------------------------------- */

  /**
   * Assign a class item as the original class for the Actor based on which class has the most levels.
   * @returns {Promise<Actor5e>}  Instance of the updated actor.
   * @protected
   */
  _assignPrimaryClass() {
    const classes = this.itemTypes.class.sort((a, b) => b.system.levels - a.system.levels);
    const newPC = classes[0]?.id || "";
    return this.update({"system.details.originalClass": newPC});
  }

  /* -------------------------------------------- */
  /*  Gameplay Mechanics                          */
  /* -------------------------------------------- */

  /** @override */
  async modifyTokenAttribute(attribute, value, isDelta, isBar) {
    if ( attribute === "attributes.hp" ) {
      const hp = this.system.attributes.hp;
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
   * @returns {Promise<Actor5e>}  A Promise which resolves once the damage has been applied
   */
  async applyDamage(amount=0, multiplier=1) {
    amount = Math.floor(parseInt(amount) * multiplier);
    const hp = this.system.attributes.hp;

    // Deduct damage from temp HP first
    const tmp = parseInt(hp.temp) || 0;
    const dt = amount > 0 ? Math.min(tmp, amount) : 0;

    // Remaining goes to health
    const tmpMax = parseInt(hp.tempmax) || 0;
    const dh = Math.clamped(hp.value - (amount - dt), 0, hp.max + tmpMax);

    // Update the Actor
    const updates = {
      "system.attributes.hp.temp": tmp - dt,
      "system.attributes.hp.value": dh
    };

    // Delegate damage application to a hook
    // TODO replace this in the future with a better modifyTokenAttribute function in the core
    const allowed = Hooks.call("modifyTokenAttribute", {
      attribute: "attributes.hp",
      value: amount,
      isDelta: false,
      isBar: true
    }, updates);
    return allowed !== false ? this.update(updates, {dhp: -amount}) : this;
  }

  /* -------------------------------------------- */
 
  /**
   * Apply a certain amount of temporary hit point, but only if it's more than the actor currently has.
   * @param {number} amount       An amount of temporary hit points to set
   * @returns {Promise<Actor5e>}  A Promise which resolves once the temp HP has been applied
   */
  async applyTempHP(amount=0) {
    amount = parseInt(amount);
    const hp = this.system.attributes.hp;

    // Update the actor if the new amount is greater than the current
    const tmp = parseInt(hp.temp) || 0;
    return amount > tmp ? this.update({"system.attributes.hp.temp": amount}) : this;
  }

  /* -------------------------------------------- */

  /**
   * Determine whether the provided ability is usable for remarkable athlete.
   * @param {string} ability  Ability type to check.
   * @returns {boolean}       Whether the actor has the remarkable athlete flag and the ability is physical.
   * @private
   */
  _isRemarkableAthlete(ability) {
    return this.getFlag("dnd5e", "remarkableAthlete")
      && CONFIG.DND5E.characterFlags.remarkableAthlete.abilities.includes(ability);
  }

  /* -------------------------------------------- */

  /**
   * Roll a Skill Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {string} skillId      The skill id (e.g. "ins")
   * @param {object} options      Options which configure how the skill check is rolled
   * @returns {Promise<D20Roll>}  A Promise which resolves to the created Roll instance
   */
  async rollSkill(skillId, options={}) {
    const skl = this.system.skills[skillId];
    const abl = this.system.abilities[skl.ability];
    const globalBonuses = this.system.bonuses?.abilities ?? {};
    const parts = ["@mod", "@abilityCheckBonus"];
    const data = this.getRollData();

    // Add ability modifier
    data.mod = skl.mod;
    data.defaultAbility = skl.ability;

    // Include proficiency bonus
    if ( skl.prof.hasProficiency ) {
      parts.push("@prof");
      data.prof = skl.prof.term;
    }

    // Global ability check bonus
    if ( globalBonuses.check ) {
      parts.push("@checkBonus");
      data.checkBonus = Roll.replaceFormulaData(globalBonuses.check, data);
    }

    // Ability-specific check bonus
    if ( abl?.bonuses?.check ) data.abilityCheckBonus = Roll.replaceFormulaData(abl.bonuses.check, data);
    else data.abilityCheckBonus = 0;

    // Skill-specific skill bonus
    if ( skl.bonuses?.check ) {
      const checkBonusKey = `${skillId}CheckBonus`;
      parts.push(`@${checkBonusKey}`);
      data[checkBonusKey] = Roll.replaceFormulaData(skl.bonuses.check, data);
    }

    // Global skill check bonus
    if ( globalBonuses.skill ) {
      parts.push("@skillBonus");
      data.skillBonus = Roll.replaceFormulaData(globalBonuses.skill, data);
    }

    // Add provided extra roll parts now because they will get clobbered by mergeObject below
    if ( options.parts?.length > 0 ) parts.push(...options.parts);

    // Reliable Talent applies to any skill check we have full or better proficiency in
    const reliableTalent = (skl.value >= 1 && this.getFlag("dnd5e", "reliableTalent"));

    // Roll and return
    const flavor = game.i18n.format("DND5E.SkillPromptTitle", {skill: CONFIG.DND5E.skills[skillId]?.label ?? ""});
    const rollData = foundry.utils.mergeObject({
      parts: parts,
      data: data,
      title: `${flavor}: ${this.name}`,
      flavor,
      chooseModifier: true,
      halflingLucky: this.getFlag("dnd5e", "halflingLucky"),
      reliableTalent,
      messageData: {
        speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
        "flags.dnd5e.roll": {type: "skill", skillId }
      }
    }, options);

    /**
     * A hook event that fires before a skill check is rolled for an Actor.
     * @function dnd5e.preRollSkill
     * @memberof hookEvents
     * @param {Actor5e} actor                Actor for which the skill check is being rolled.
     * @param {D20RollConfiguration} config  Configuration data for the pending roll.
     * @param {string} skillId               ID of the skill being rolled as defined in `DND5E.skills`.
     * @returns {boolean}                    Explicitly return `false` to prevent skill check from being rolled.
     */
    if ( Hooks.call("dnd5e.preRollSkill", this, rollData, skillId) === false ) return;

    const roll = await d20Roll(rollData);

    /**
     * A hook event that fires after a skill check has been rolled for an Actor.
     * @function dnd5e.rollSkill
     * @memberof hookEvents
     * @param {Actor5e} actor   Actor for which the skill check has been rolled.
     * @param {D20Roll} roll    The resulting roll.
     * @param {string} skillId  ID of the skill that was rolled as defined in `DND5E.skills`.
     */
    if ( roll ) Hooks.callAll("dnd5e.rollSkill", this, roll, skillId);

    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Roll a generic ability test or saving throw.
   * Prompt the user for input on which variety of roll they want to do.
   * @param {string} abilityId    The ability id (e.g. "str")
   * @param {object} options      Options which configure how ability tests or saving throws are rolled
   */
  rollAbility(abilityId, options={}) {
    const label = CONFIG.DND5E.abilities[abilityId] ?? "";
    new Dialog({
      title: `${game.i18n.format("DND5E.AbilityPromptTitle", {ability: label})}: ${this.name}`,
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
   * @param {string} abilityId    The ability ID (e.g. "str")
   * @param {object} options      Options which configure how ability tests are rolled
   * @returns {Promise<D20Roll>}  A Promise which resolves to the created Roll instance
   */
  async rollAbilityTest(abilityId, options={}) {
    const label = CONFIG.DND5E.abilities[abilityId] ?? "";
    const abl = this.system.abilities[abilityId];
    const globalBonuses = this.system.bonuses?.abilities ?? {};
    const parts = [];
    const data = this.getRollData();

    // Add ability modifier
    parts.push("@mod");
    data.mod = abl?.mod ?? 0;

    // Include proficiency bonus
    if ( abl?.checkProf.hasProficiency ) {
      parts.push("@prof");
      data.prof = abl.checkProf.term;
    }

    // Add ability-specific check bonus
    if ( abl?.bonuses?.check ) {
      const checkBonusKey = `${abilityId}CheckBonus`;
      parts.push(`@${checkBonusKey}`);
      data[checkBonusKey] = Roll.replaceFormulaData(abl.bonuses.check, data);
    }

    // Add global actor bonus
    if ( globalBonuses.check ) {
      parts.push("@checkBonus");
      data.checkBonus = Roll.replaceFormulaData(globalBonuses.check, data);
    }

    // Add provided extra roll parts now because they will get clobbered by mergeObject below
    if ( options.parts?.length > 0 ) parts.push(...options.parts);

    // Roll and return
    const flavor = game.i18n.format("DND5E.AbilityPromptTitle", {ability: label});
    const rollData = foundry.utils.mergeObject({
      parts,
      data,
      title: `${flavor}: ${this.name}`,
      flavor,
      halflingLucky: this.getFlag("dnd5e", "halflingLucky"),
      messageData: {
        speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
        "flags.dnd5e.roll": {type: "ability", abilityId }
      }
    }, options);

    /**
     * A hook event that fires before an ability test is rolled for an Actor.
     * @function dnd5e.preRollAbilityTest
     * @memberof hookEvents
     * @param {Actor5e} actor                Actor for which the ability test is being rolled.
     * @param {D20RollConfiguration} config  Configuration data for the pending roll.
     * @param {string} abilityId             ID of the ability being rolled as defined in `DND5E.abilities`.
     * @returns {boolean}                    Explicitly return `false` to prevent ability test from being rolled.
     */
    if ( Hooks.call("dnd5e.preRollAbilityTest", this, rollData, abilityId) === false ) return;

    const roll = await d20Roll(rollData);

    /**
     * A hook event that fires after an ability test has been rolled for an Actor.
     * @function dnd5e.rollAbilityTest
     * @memberof hookEvents
     * @param {Actor5e} actor     Actor for which the ability test has been rolled.
     * @param {D20Roll} roll      The resulting roll.
     * @param {string} abilityId  ID of the ability that was rolled as defined in `DND5E.abilities`.
     */
    if ( roll ) Hooks.callAll("dnd5e.rollAbilityTest", this, roll, abilityId);

    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Roll an Ability Saving Throw
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {string} abilityId    The ability ID (e.g. "str")
   * @param {object} options      Options which configure how ability tests are rolled
   * @returns {Promise<D20Roll>}  A Promise which resolves to the created Roll instance
   */
  async rollAbilitySave(abilityId, options={}) {
    const label = CONFIG.DND5E.abilities[abilityId] ?? "";
    const abl = this.system.abilities[abilityId];
    const globalBonuses = this.system.bonuses?.abilities ?? {};
    const parts = [];
    const data = this.getRollData();

    // Add ability modifier
    parts.push("@mod");
    data.mod = abl?.mod ?? 0;

    // Include proficiency bonus
    if ( abl?.saveProf.hasProficiency ) {
      parts.push("@prof");
      data.prof = abl.saveProf.term;
    }

    // Include ability-specific saving throw bonus
    if ( abl?.bonuses?.save ) {
      const saveBonusKey = `${abilityId}SaveBonus`;
      parts.push(`@${saveBonusKey}`);
      data[saveBonusKey] = Roll.replaceFormulaData(abl.bonuses.save, data);
    }

    // Include a global actor ability save bonus
    if ( globalBonuses.save ) {
      parts.push("@saveBonus");
      data.saveBonus = Roll.replaceFormulaData(globalBonuses.save, data);
    }

    // Add provided extra roll parts now because they will get clobbered by mergeObject below
    if ( options.parts?.length > 0 ) parts.push(...options.parts);

    // Roll and return
    const flavor = game.i18n.format("DND5E.SavePromptTitle", {ability: label});
    const rollData = foundry.utils.mergeObject({
      parts,
      data,
      title: `${flavor}: ${this.name}`,
      flavor,
      halflingLucky: this.getFlag("dnd5e", "halflingLucky"),
      messageData: {
        speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
        "flags.dnd5e.roll": {type: "save", abilityId }
      }
    }, options);

    /**
     * A hook event that fires before an ability save is rolled for an Actor.
     * @function dnd5e.preRollAbilitySave
     * @memberof hookEvents
     * @param {Actor5e} actor                Actor for which the ability save is being rolled.
     * @param {D20RollConfiguration} config  Configuration data for the pending roll.
     * @param {string} abilityId             ID of the ability being rolled as defined in `DND5E.abilities`.
     * @returns {boolean}                    Explicitly return `false` to prevent ability save from being rolled.
     */
    if ( Hooks.call("dnd5e.preRollAbilitySave", this, rollData, abilityId) === false ) return;

    const roll = await d20Roll(rollData);

    /**
     * A hook event that fires after an ability save has been rolled for an Actor.
     * @function dnd5e.rollAbilitySave
     * @memberof hookEvents
     * @param {Actor5e} actor     Actor for which the ability save has been rolled.
     * @param {D20Roll} roll      The resulting roll.
     * @param {string} abilityId  ID of the ability that was rolled as defined in `DND5E.abilities`.
     */
    if ( roll ) Hooks.callAll("dnd5e.rollAbilitySave", this, roll, abilityId);

    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Perform a death saving throw, rolling a d20 plus any global save bonuses
   * @param {object} options          Additional options which modify the roll
   * @returns {Promise<D20Roll|null>} A Promise which resolves to the Roll instance
   */
  async rollDeathSave(options={}) {
    const death = this.system.attributes.death;

    // Display a warning if we are not at zero HP or if we already have reached 3
    if ( (this.system.attributes.hp.value > 0) || (death.failure >= 3) || (death.success >= 3) ) {
      ui.notifications.warn(game.i18n.localize("DND5E.DeathSaveUnnecessary"));
      return null;
    }

    // Evaluate a global saving throw bonus
    const speaker = options.speaker || ChatMessage.getSpeaker({actor: this});
    const globalBonuses = this.system.bonuses?.abilities ?? {};
    const parts = [];
    const data = this.getRollData();

    // Diamond Soul adds proficiency
    if ( this.getFlag("dnd5e", "diamondSoul") ) {
      parts.push("@prof");
      data.prof = new Proficiency(this.system.attributes.prof, 1).term;
    }

    // Include a global actor ability save bonus
    if ( globalBonuses.save ) {
      parts.push("@saveBonus");
      data.saveBonus = Roll.replaceFormulaData(globalBonuses.save, data);
    }

    // Evaluate the roll
    const flavor = game.i18n.localize("DND5E.DeathSavingThrow");
    const rollData = foundry.utils.mergeObject({
      parts,
      data,
      title: `${flavor}: ${this.name}`,
      flavor,
      halflingLucky: this.getFlag("dnd5e", "halflingLucky"),
      targetValue: 10,
      messageData: {
        speaker: speaker,
        "flags.dnd5e.roll": {type: "death"}
      }
    }, options);

    /**
     * A hook event that fires before a death saving throw is rolled for an Actor.
     * @function dnd5e.preRollDeathSave
     * @memberof hookEvents
     * @param {Actor5e} actor                Actor for which the death saving throw is being rolled.
     * @param {D20RollConfiguration} config  Configuration data for the pending roll.
     * @returns {boolean}                    Explicitly return `false` to prevent death saving throw from being rolled.
     */
    if ( Hooks.call("dnd5e.preRollDeathSave", this, rollData) === false ) return;

    const roll = await d20Roll(rollData);
    if ( !roll ) return null;

    // Take action depending on the result
    const details = {};

    // Save success
    if ( roll.total >= (roll.options.targetValue ?? 10) ) {
      let successes = (death.success || 0) + 1;

      // Critical Success = revive with 1hp
      if ( roll.isCritical ) {
        details.updates = {
          "system.attributes.death.success": 0,
          "system.attributes.death.failure": 0,
          "system.attributes.hp.value": 1
        };
        details.chatString = "DND5E.DeathSaveCriticalSuccess";
      }

      // 3 Successes = survive and reset checks
      else if ( successes === 3 ) {
        details.updates = {
          "system.attributes.death.success": 0,
          "system.attributes.death.failure": 0
        };
        details.chatString = "DND5E.DeathSaveSuccess";
      }

      // Increment successes
      else details.updates = {"system.attributes.death.success": Math.clamped(successes, 0, 3)};
    }

    // Save failure
    else {
      let failures = (death.failure || 0) + (roll.isFumble ? 2 : 1);
      details.updates = {"system.attributes.death.failure": Math.clamped(failures, 0, 3)};
      if ( failures >= 3 ) {  // 3 Failures = death
        details.chatString = "DND5E.DeathSaveFailure";
      }
    }

    /**
     * A hook event that fires after a death saving throw has been rolled for an Actor, but before
     * updates have been performed.
     * @function dnd5e.rollDeathSave
     * @memberof hookEvents
     * @param {Actor5e} actor              Actor for which the death saving throw has been rolled.
     * @param {D20Roll} roll               The resulting roll.
     * @param {object} details
     * @param {object} details.updates     Updates that will be applied to the actor as a result of this save.
     * @param {string} details.chatString  Localizable string displayed in the create chat message. If not set, then
     *                                     no chat message will be displayed.
     * @returns {boolean}                  Explicitly return `false` to prevent updates from being performed.
     */
    if ( Hooks.call("dnd5e.rollDeathSave", this, roll, details) === false ) return roll;

    if ( !foundry.utils.isEmpty(details.updates) ) await this.update(details.updates);

    // Display success/failure chat message
    if ( details.chatString ) {
      let chatData = { content: game.i18n.format(details.chatString, {name: this.name}), speaker };
      ChatMessage.applyRollMode(chatData, roll.options.rollMode);
      await ChatMessage.create(chatData);
    }

    // Return the rolled result
    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Roll a hit die of the appropriate type, gaining hit points equal to the die roll plus your CON modifier
   * @param {string} [denomination]       The hit denomination of hit die to roll. Example "d8".
   *                                      If no denomination is provided, the first available HD will be used
   * @param {object} options              Additional options which modify the roll.
   * @returns {Promise<DamageRoll|null>}  The created Roll instance, or null if no hit die was rolled
   */
  async rollHitDie(denomination, options={}) {

    // If no denomination was provided, choose the first available
    let cls = null;
    if ( !denomination ) {
      cls = this.itemTypes.class.find(c => c.system.hitDiceUsed < c.system.levels);
      if ( !cls ) return null;
      denomination = cls.system.hitDice;
    }

    // Otherwise, locate a class (if any) which has an available hit die of the requested denomination
    else cls = this.items.find(i => {
      return (i.system.hitDice === denomination) && ((i.system.hitDiceUsed || 0) < (i.system.levels || 1));
    });

    // If no class is available, display an error notification
    if ( !cls ) {
      ui.notifications.error(game.i18n.format("DND5E.HitDiceWarn", {name: this.name, formula: denomination}));
      return null;
    }

    // Prepare roll data
    const flavor = game.i18n.localize("DND5E.HitDiceRoll");
    if ( options.fastForward === undefined ) options.fastForward = !options.dialog;
    const rollData = foundry.utils.mergeObject({
      event: new Event("hitDie"),
      parts: [`1${denomination}`, "@abilities.con.mod"],
      data: this.getRollData(),
      title: `${flavor}: ${this.name}`,
      flavor,
      allowCritical: false,
      dialogOptions: {width: 350},
      messageData: {
        speaker: ChatMessage.getSpeaker({actor: this}),
        "flags.dnd5e.roll": {type: "hitDie"}
      }
    }, options);

    /**
     * A hook event that fires before a hit die is rolled for an Actor.
     * @function dnd5e.preRollHitDie
     * @memberof hookEvents
     * @param {Actor5e} actor                   Actor for which the hit die is to be rolled.
     * @param {DamageRollConfiguration} config  Configuration data for the pending roll.
     * @param {string} denomination             Size of hit die to be rolled.
     * @returns {boolean}                       Explicitly return `false` to prevent hit die from being rolled.
     */
    if ( Hooks.call("dnd5e.preRollHitDie", this, rollData, denomination) === false ) return;

    const roll = await damageRoll(rollData);
    if ( !roll ) return roll;

    const hp = this.system.attributes.hp;
    const dhp = Math.min(hp.max + (hp.tempmax ?? 0) - hp.value, roll.total);
    const updates = {
      actor: {"system.attributes.hp.value": hp.value + dhp},
      class: {"system.hitDiceUsed": cls.system.hitDiceUsed + 1}
    };

    /**
     * A hook event that fires after a hit die has been rolled for an Actor, but before updates have been performed.
     * @function dnd5e.rollHitDie
     * @memberof hookEvents
     * @param {Actor5e} actor         Actor for which the hit die has been rolled.
     * @param {DamageRoll} roll       The resulting roll.
     * @param {object} updates
     * @param {object} updates.actor  Updates that will be applied to the actor.
     * @param {object} updates.class  Updates that will be applied to the class.
     * @returns {boolean}             Explicitly return `false` to prevent updates from being performed.
     */
    if ( Hooks.call("dnd5e.rollHitDie", this, roll, updates) === false ) return roll;

    // Perform updates
    if ( !foundry.utils.isEmpty(updates.actor) ) await this.update(updates.actor);
    if ( !foundry.utils.isEmpty(updates.class) ) await cls.update(updates.class);

    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Roll hit points for a specific class as part of a level-up workflow.
   * @param {Item5e} item      The class item whose hit dice to roll.
   * @returns {Promise<Roll>}  The completed roll.
   * @see {@link dnd5e.preRollClassHitPoints}
   */
  async rollClassHitPoints(item) {
    if ( item.type !== "class" ) throw new Error("Hit points can only be rolled for a class item.");
    const rollData = { formula: `1${item.system.hitDice}`, data: item.getRollData() };
    const flavor = game.i18n.format("DND5E.AdvancementHitPointsRollMessage", { class: item.name });
    const messageData = {
      title: `${flavor}: ${this.name}`,
      flavor,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      "flags.dnd5e.roll": { type: "hitPoints" }
    };

    /**
     * A hook event that fires before hit points are rolled for a character's class.
     * @function dnd5e.preRollClassHitPoints
     * @memberof hookEvents
     * @param {Actor5e} actor            Actor for which the hit points are being rolled.
     * @param {Item5e} item              The class item whose hit dice will be rolled.
     * @param {object} rollData
     * @param {string} rollData.formula  The string formula to parse.
     * @param {object} rollData.data     The data object against which to parse attributes within the formula.
     * @param {object} messageData       The data object to use when creating the message.
     */
    Hooks.callAll("dnd5e.preRollClassHitPoints", this, item, rollData, messageData);

    const roll = new Roll(rollData.formula, rollData.data);
    await roll.toMessage(messageData);
    return roll;
  }

  /* -------------------------------------------- */
  /*  Resting                                     */
  /* -------------------------------------------- */

  /**
   * Configuration options for a rest.
   *
   * @typedef {object} RestConfiguration
   * @property {boolean} dialog            Present a dialog window which allows for rolling hit dice as part of the
   *                                       Short Rest and selecting whether a new day has occurred.
   * @property {boolean} chat              Should a chat message be created to summarize the results of the rest?
   * @property {boolean} newDay            Does this rest carry over to a new day?
   * @property {boolean} [autoHD]          Should hit dice be spent automatically during a short rest?
   * @property {number} [autoHDThreshold]  How many hit points should be missing before hit dice are
   *                                       automatically spent during a short rest.
   */

  /**
   * Results from a rest operation.
   *
   * @typedef {object} RestResult
   * @property {number} dhp            Hit points recovered during the rest.
   * @property {number} dhd            Hit dice recovered or spent during the rest.
   * @property {object} updateData     Updates applied to the actor.
   * @property {object[]} updateItems  Updates applied to actor's items.
   * @property {boolean} longRest      Whether the rest type was a long rest.
   * @property {boolean} newDay        Whether a new day occurred during the rest.
   */

  /* -------------------------------------------- */

  /**
   * Take a short rest, possibly spending hit dice and recovering resources, item uses, and pact slots.
   * @param {RestConfiguration} [config]  Configuration options for a short rest.
   * @returns {Promise<RestResult>}       A Promise which resolves once the short rest workflow has completed.
   */
  async shortRest(config={}) {
    config = foundry.utils.mergeObject({
      dialog: true, chat: true, newDay: false, autoHD: false, autoHDThreshold: 3
    }, config);

    /**
     * A hook event that fires before a short rest is started.
     * @function dnd5e.preShortRest
     * @memberof hookEvents
     * @param {Actor5e} actor             The actor that is being rested.
     * @param {RestConfiguration} config  Configuration options for the rest.
     * @returns {boolean}                 Explicitly return `false` to prevent the rest from being started.
     */
    if ( Hooks.call("dnd5e.preShortRest", this, config) === false ) return;

    // Take note of the initial hit points and number of hit dice the Actor has
    const hd0 = this.system.attributes.hd;
    const hp0 = this.system.attributes.hp.value;

    // Display a Dialog for rolling hit dice
    if ( config.dialog ) {
      try { config.newDay = await ShortRestDialog.shortRestDialog({actor: this, canRoll: hd0 > 0});
      } catch(err) { return; }
    }

    // Automatically spend hit dice
    else if ( config.autoHD ) await this.autoSpendHitDice({ threshold: config.autoHDThreshold });

    // Return the rest result
    const dhd = this.system.attributes.hd - hd0;
    const dhp = this.system.attributes.hp.value - hp0;
    return this._rest(config.chat, config.newDay, false, dhd, dhp);
  }

  /* -------------------------------------------- */

  /**
   * Take a long rest, recovering hit points, hit dice, resources, item uses, and spell slots.
   * @param {RestConfiguration} [config]  Configuration options for a long rest.
   * @returns {Promise<RestResult>}       A Promise which resolves once the long rest workflow has completed.
   */
  async longRest(config={}) {
    config = foundry.utils.mergeObject({
      dialog: true, chat: true, newDay: true
    }, config);

    /**
     * A hook event that fires before a long rest is started.
     * @function dnd5e.preLongRest
     * @memberof hookEvents
     * @param {Actor5e} actor             The actor that is being rested.
     * @param {RestConfiguration} config  Configuration options for the rest.
     * @returns {boolean}                 Explicitly return `false` to prevent the rest from being started.
     */
    if ( Hooks.call("dnd5e.preLongRest", this, config) === false ) return;

    if ( config.dialog ) {
      try { config.newDay = await LongRestDialog.longRestDialog({actor: this}); }
      catch(err) { return; }
    }

    return this._rest(config.chat, config.newDay, true);
  }

  /* -------------------------------------------- */

  /**
   * Perform all of the changes needed for a short or long rest.
   *
   * @param {boolean} chat           Summarize the results of the rest workflow as a chat message.
   * @param {boolean} newDay         Has a new day occurred during this rest?
   * @param {boolean} longRest       Is this a long rest?
   * @param {number} [dhd=0]         Number of hit dice spent during so far during the rest.
   * @param {number} [dhp=0]         Number of hit points recovered so far during the rest.
   * @returns {Promise<RestResult>}  Consolidated results of the rest workflow.
   * @private
   */
  async _rest(chat, newDay, longRest, dhd=0, dhp=0) {
    let hitPointsRecovered = 0;
    let hitPointUpdates = {};
    let hitDiceRecovered = 0;
    let hitDiceUpdates = [];

    // Recover hit points & hit dice on long rest
    if ( longRest ) {
      ({ updates: hitPointUpdates, hitPointsRecovered } = this._getRestHitPointRecovery());
      ({ updates: hitDiceUpdates, hitDiceRecovered } = this._getRestHitDiceRecovery());
    }

    // Figure out the rest of the changes
    const result = {
      dhd: dhd + hitDiceRecovered,
      dhp: dhp + hitPointsRecovered,
      updateData: {
        ...hitPointUpdates,
        ...this._getRestResourceRecovery({ recoverShortRestResources: !longRest, recoverLongRestResources: longRest }),
        ...this._getRestSpellRecovery({ recoverSpells: longRest })
      },
      updateItems: [
        ...hitDiceUpdates,
        ...this._getRestItemUsesRecovery({ recoverLongRestUses: longRest, recoverDailyUses: newDay })
      ],
      longRest,
      newDay
    };

    /**
     * A hook event that fires after rest result is calculated, but before any updates are performed.
     * @function dnd5e.preRestCompleted
     * @memberof hookEvents
     * @param {Actor5e} actor      The actor that is being rested.
     * @param {RestResult} result  Details on the rest to be completed.
     * @returns {boolean}          Explicitly return `false` to prevent the rest updates from being performed.
     */
    if ( Hooks.call("dnd5e.preRestCompleted", this, result) === false ) return result;

    // Perform updates
    await this.update(result.updateData);
    await this.updateEmbeddedDocuments("Item", result.updateItems);

    // Display a Chat Message summarizing the rest effects
    if ( chat ) await this._displayRestResultMessage(result, longRest);

    if ( Hooks.events.restCompleted?.length ) foundry.utils.logCompatibilityWarning(
      "The restCompleted hook has been deprecated in favor of dnd5e.restCompleted.",
      { since: "DnD5e 1.6", until: "DnD5e 2.1" }
    );
    /** @deprecated since 1.6, targeted for removal in 2.1 */
    Hooks.callAll("restCompleted", this, result);

    /**
     * A hook event that fires when the rest process is completed for an actor.
     * @function dnd5e.restCompleted
     * @memberof hookEvents
     * @param {Actor5e} actor      The actor that just completed resting.
     * @param {RestResult} result  Details on the rest completed.
     */
    Hooks.callAll("dnd5e.restCompleted", this, result);

    // Return data summarizing the rest effects
    return result;
  }

  /* -------------------------------------------- */

  /**
   * Display a chat message with the result of a rest.
   *
   * @param {RestResult} result         Result of the rest operation.
   * @param {boolean} [longRest=false]  Is this a long rest?
   * @returns {Promise<ChatMessage>}    Chat message that was created.
   * @protected
   */
  async _displayRestResultMessage(result, longRest=false) {
    const { dhd, dhp, newDay } = result;
    const diceRestored = dhd !== 0;
    const healthRestored = dhp !== 0;
    const length = longRest ? "Long" : "Short";

    // Summarize the rest duration
    let restFlavor;
    switch (game.settings.get("dnd5e", "restVariant")) {
      case "normal": restFlavor = (longRest && newDay) ? "DND5E.LongRestOvernight" : `DND5E.${length}RestNormal`; break;
      case "gritty": restFlavor = (!longRest && newDay) ? "DND5E.ShortRestOvernight" : `DND5E.${length}RestGritty`; break;
      case "epic": restFlavor = `DND5E.${length}RestEpic`; break;
    }

    // Determine the chat message to display
    let message;
    if ( diceRestored && healthRestored ) message = `DND5E.${length}RestResult`;
    else if ( longRest && !diceRestored && healthRestored ) message = "DND5E.LongRestResultHitPoints";
    else if ( longRest && diceRestored && !healthRestored ) message = "DND5E.LongRestResultHitDice";
    else message = `DND5E.${length}RestResultShort`;

    // Create a chat message
    let chatData = {
      user: game.user.id,
      speaker: {actor: this, alias: this.name},
      flavor: game.i18n.localize(restFlavor),
      content: game.i18n.format(message, {
        name: this.name,
        dice: longRest ? dhd : -dhd,
        health: dhp
      })
    };
    ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
    return ChatMessage.create(chatData);
  }

  /* -------------------------------------------- */

  /**
   * Automatically spend hit dice to recover hit points up to a certain threshold.
   * @param {object} [options]
   * @param {number} [options.threshold=3]  A number of missing hit points which would trigger an automatic HD roll.
   * @returns {Promise<number>}             Number of hit dice spent.
   */
  async autoSpendHitDice({ threshold=3 }={}) {
    const hp = this.system.attributes.hp;
    const max = hp.max + hp.tempmax;
    let diceRolled = 0;
    while ( (this.system.attributes.hp.value + threshold) <= max ) {
      const r = await this.rollHitDie(undefined, {dialog: false});
      if ( r === null ) break;
      diceRolled += 1;
    }
    return diceRolled;
  }

  /* -------------------------------------------- */

  /**
   * Recovers actor hit points and eliminates any temp HP.
   * @param {object} [options]
   * @param {boolean} [options.recoverTemp=true]     Reset temp HP to zero.
   * @param {boolean} [options.recoverTempMax=true]  Reset temp max HP to zero.
   * @returns {object}                               Updates to the actor and change in hit points.
   * @protected
   */
  _getRestHitPointRecovery({recoverTemp=true, recoverTempMax=true}={}) {
    const hp = this.system.attributes.hp;
    let max = hp.max;
    let updates = {};
    if ( recoverTempMax ) updates["system.attributes.hp.tempmax"] = 0;
    else max += hp.tempmax;
    updates["system.attributes.hp.value"] = max;
    if ( recoverTemp ) updates["system.attributes.hp.temp"] = 0;
    return { updates, hitPointsRecovered: max - hp.value };
  }

  /* -------------------------------------------- */

  /**
   * Recovers actor resources.
   * @param {object} [options]
   * @param {boolean} [options.recoverShortRestResources=true]  Recover resources that recharge on a short rest.
   * @param {boolean} [options.recoverLongRestResources=true]   Recover resources that recharge on a long rest.
   * @returns {object}                                          Updates to the actor.
   * @protected
   */
  _getRestResourceRecovery({recoverShortRestResources=true, recoverLongRestResources=true}={}) {
    let updates = {};
    for ( let [k, r] of Object.entries(this.system.resources) ) {
      if ( Number.isNumeric(r.max) && ((recoverShortRestResources && r.sr) || (recoverLongRestResources && r.lr)) ) {
        updates[`system.resources.${k}.value`] = Number(r.max);
      }
    }
    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Recovers spell slots and pact slots.
   * @param {object} [options]
   * @param {boolean} [options.recoverPact=true]     Recover all expended pact slots.
   * @param {boolean} [options.recoverSpells=true]   Recover all expended spell slots.
   * @returns {object}                               Updates to the actor.
   * @protected
   */
  _getRestSpellRecovery({ recoverPact=true, recoverSpells=true }={}) {
    const spells = this.system.spells;
    let updates = {};
    if ( recoverPact ) {
      const pact = spells.pact;
      updates["system.spells.pact.value"] = pact.override || pact.max;
    }
    if ( recoverSpells ) {
      for ( let [k, v] of Object.entries(spells) ) {
        updates[`system.spells.${k}.value`] = Number.isNumeric(v.override) ? v.override : (v.max ?? 0);
      }
    }
    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Recovers class hit dice during a long rest.
   *
   * @param {object} [options]
   * @param {number} [options.maxHitDice]  Maximum number of hit dice to recover.
   * @returns {object}                     Array of item updates and number of hit dice recovered.
   * @protected
   */
  _getRestHitDiceRecovery({maxHitDice=undefined}={}) {

    // Determine the number of hit dice which may be recovered
    if ( maxHitDice === undefined ) maxHitDice = Math.max(Math.floor(this.system.details.level / 2), 1);

    // Sort classes which can recover HD, assuming players prefer recovering larger HD first.
    const sortedClasses = Object.values(this.classes).sort((a, b) => {
      return (parseInt(b.system.hitDice.slice(1)) || 0) - (parseInt(a.system.hitDice.slice(1)) || 0);
    });

    // Update hit dice usage
    let updates = [];
    let hitDiceRecovered = 0;
    for ( let item of sortedClasses ) {
      const hitDiceUsed = item.system.hitDiceUsed;
      if ( (hitDiceRecovered < maxHitDice) && (hitDiceUsed > 0) ) {
        let delta = Math.min(hitDiceUsed || 0, maxHitDice - hitDiceRecovered);
        hitDiceRecovered += delta;
        updates.push({_id: item.id, "system.hitDiceUsed": hitDiceUsed - delta});
      }
    }
    return { updates, hitDiceRecovered };
  }

  /* -------------------------------------------- */

  /**
   * Recovers item uses during short or long rests.
   *
   * @param {object} [options]
   * @param {boolean} [options.recoverShortRestUses=true]  Recover uses for items that recharge after a short rest.
   * @param {boolean} [options.recoverLongRestUses=true]   Recover uses for items that recharge after a long rest.
   * @param {boolean} [options.recoverDailyUses=true]      Recover uses for items that recharge on a new day.
   * @returns {Array<object>}                              Array of item updates.
   * @protected
   */
  _getRestItemUsesRecovery({ recoverShortRestUses=true, recoverLongRestUses=true, recoverDailyUses=true }={}) {
    let recovery = [];
    if ( recoverShortRestUses ) recovery.push("sr");
    if ( recoverLongRestUses ) recovery.push("lr");
    if ( recoverDailyUses ) recovery.push("day");
    let updates = [];
    for ( let item of this.items ) {
      if ( recovery.includes(item.system.uses?.per) ) {
        updates.push({_id: item.id, "system.uses.value": item.system.uses.max});
      }
      if ( recoverLongRestUses && item.system.recharge?.value ) {
        updates.push({_id: item.id, "system.recharge.charged": true});
      }
    }
    return updates;
  }

  /* -------------------------------------------- */
  /*  Conversion & Transformation                 */
  /* -------------------------------------------- */

  /**
   * Convert all carried currency to the highest possible denomination to reduce the number of raw coins being
   * carried by an Actor.
   * @returns {Promise<Actor5e>}
   */
  convertCurrency() {
    const curr = foundry.utils.deepClone(this.system.currency);
    const conversion = Object.entries(CONFIG.DND5E.currencies);
    conversion.reverse();
    for ( let [c, data] of conversion ) {
      const t = data.conversion;
      if ( !t ) continue;
      let change = Math.floor(curr[c] / t.each);
      curr[c] -= (change * t.each);
      curr[t.into] += change;
    }
    return this.update({"system.currency": curr});
  }

  /* -------------------------------------------- */

  /**
   * Options that determine what properties of the original actor are kept and which are replaced with
   * the target actor.
   *
   * @typedef {object} TransformationOptions
   * @property {boolean} [keepPhysical=false]    Keep physical abilities (str, dex, con)
   * @property {boolean} [keepMental=false]      Keep mental abilities (int, wis, cha)
   * @property {boolean} [keepSaves=false]       Keep saving throw proficiencies
   * @property {boolean} [keepSkills=false]      Keep skill proficiencies
   * @property {boolean} [mergeSaves=false]      Take the maximum of the save proficiencies
   * @property {boolean} [mergeSkills=false]     Take the maximum of the skill proficiencies
   * @property {boolean} [keepClass=false]       Keep proficiency bonus
   * @property {boolean} [keepFeats=false]       Keep features
   * @property {boolean} [keepSpells=false]      Keep spells
   * @property {boolean} [keepItems=false]       Keep items
   * @property {boolean} [keepBio=false]         Keep biography
   * @property {boolean} [keepVision=false]      Keep vision
   * @property {boolean} [transformTokens=true]  Transform linked tokens too
   */

  /**
   * Transform this Actor into another one.
   *
   * @param {Actor5e} target                      The target Actor.
   * @param {TransformationOptions} [options={}]  Options that determine how the transformation is performed.
   * @returns {Promise<Array<Token>>|null}        Updated token if the transformation was performed.
   */
  async transformInto(target, { keepPhysical=false, keepMental=false, keepSaves=false, keepSkills=false,
    mergeSaves=false, mergeSkills=false, keepClass=false, keepFeats=false, keepSpells=false,
    keepItems=false, keepBio=false, keepVision=false, transformTokens=true }={}) {

    // Ensure the player is allowed to polymorph
    const allowed = game.settings.get("dnd5e", "allowPolymorphing");
    if ( !allowed && !game.user.isGM ) {
      return ui.notifications.warn(game.i18n.localize("DND5E.PolymorphWarn"));
    }

    // Get the original Actor data and the new source data
    const o = this.toObject();
    o.flags.dnd5e = o.flags.dnd5e || {};
    o.flags.dnd5e.transformOptions = {mergeSkills, mergeSaves};
    const source = target.toObject();

    // Prepare new data to merge from the source
    const d = {
      type: o.type, // Remain the same actor type
      name: `${o.name} (${source.name})`, // Append the new shape to your old name
      system: source.system, // Get the systemdata model of your new form
      items: source.items, // Get the items of your new form
      effects: o.effects.concat(source.effects), // Combine active effects from both forms
      img: source.img, // New appearance
      ownership: o.ownership, // Use the original actor permissions
      folder: o.folder, // Be displayed in the same sidebar folder
      flags: o.flags // Use the original actor flags
    };

    // Specifically delete some data attributes
    delete d.system.resources; // Don't change your resource pools
    delete d.system.currency; // Don't lose currency
    delete d.system.bonuses; // Don't lose global bonuses

    // Specific additional adjustments
    d.system.details.alignment = o.system.details.alignment; // Don't change alignment
    d.system.attributes.exhaustion = o.system.attributes.exhaustion; // Keep your prior exhaustion level
    d.system.attributes.inspiration = o.system.attributes.inspiration; // Keep inspiration
    d.system.spells = o.system.spells; // Keep spell slots
    d.system.attributes.ac.flat = target.system.attributes.ac.value; // Override AC

    // Token appearance updates
    d.prototypeToken = {name: d.name, texture: {}};
    for ( const k of ["width", "height", "alpha", "lockRotation"] ) {
      d.prototypeToken[k] = source.prototypeToken[k];
    }
    for ( const k of ["offsetX", "offsetY", "scaleX", "scaleY", "src", "tint"] ) {
      d.prototypeToken.texture[k] = source.prototypeToken.texture[k];
    }
    const vision = keepVision ? o.prototypeToken : source.prototypeToken;
    for ( const k of ["dimSight", "brightSight", "dimLight", "brightLight", "vision", "sightAngle"] ) {
      d.prototypeToken[k] = vision[k];
    }
    if ( source.prototypeToken.randomImg ) {
      const images = await target.getTokenImages();
      d.prototypeToken.texture.src = images[Math.floor(Math.random() * images.length)];
    }

    // Transfer ability scores
    const abilities = d.system.abilities;
    for ( let k of Object.keys(abilities) ) {
      const oa = o.system.abilities[k];
      const prof = abilities[k].proficient;
      if ( keepPhysical && ["str", "dex", "con"].includes(k) ) abilities[k] = oa;
      else if ( keepMental && ["int", "wis", "cha"].includes(k) ) abilities[k] = oa;
      if ( keepSaves ) abilities[k].proficient = oa.proficient;
      else if ( mergeSaves ) abilities[k].proficient = Math.max(prof, oa.proficient);
    }

    // Transfer skills
    if ( keepSkills ) d.system.skills = o.system.skills;
    else if ( mergeSkills ) {
      for ( let [k, s] of Object.entries(d.system.skills) ) {
        s.value = Math.max(s.value, o.system.skills[k].value);
      }
    }

    // Keep specific items from the original data
    d.items = d.items.concat(o.items.filter(i => {
      if ( ["class", "subclass"].includes(i.type) ) return keepClass;
      else if ( i.type === "feat" ) return keepFeats;
      else if ( i.type === "spell" ) return keepSpells;
      else return keepItems;
    }));

    // Transfer classes for NPCs
    if ( !keepClass && d.system.details.cr ) {
      d.items.push({
        type: "class",
        name: game.i18n.localize("DND5E.PolymorphTmpClass"),
        data: { levels: d.system.details.cr }
      });
    }

    // Keep biography
    if ( keepBio ) d.system.details.biography = o.system.details.biography;

    // Keep senses
    if ( keepVision ) d.system.traits.senses = o.system.traits.senses;

    // Set new data flags
    if ( !this.isPolymorphed || !d.flags.dnd5e.originalActor ) d.flags.dnd5e.originalActor = this.id;
    d.flags.dnd5e.isPolymorphed = true;

    // Update unlinked Tokens in place since they can simply be re-dropped from the base actor
    if ( this.isToken ) {
      const tokenData = d.prototypeToken;
      delete d.prototypeToken;
      tokenData.actorData = d;
      return this.token.update(tokenData);
    }

    // Close sheet for non-transformed Actor
    await this.sheet.close();

    /**
     * A hook event that fires just before the actor is transformed.
     * @function dnd5e.transformActor
     * @memberof hookEvents
     * @param {Actor5e} actor                  The original actor before transformation.
     * @param {Actor5e} target                 The target actor into which to transform.
     * @param {object} data                    The data that will be used to create the new transformed actor.
     * @param {TransformationOptions} options  Options that determine how the transformation is performed.
     */
    Hooks.callAll("dnd5e.transformActor", this, target, d, {
      keepPhysical, keepMental, keepSaves, keepSkills, mergeSaves, mergeSkills,
      keepClass, keepFeats, keepSpells, keepItems, keepBio, keepVision, transformTokens
    });

    // Create new Actor with transformed data
    const newActor = await this.constructor.create(d, {renderSheet: true});

    // Update placed Token instances
    if ( !transformTokens ) return;
    const tokens = this.getActiveTokens(true);
    const updates = tokens.map(t => {
      const newTokenData = foundry.utils.deepClone(d.prototypeToken);
      newTokenData._id = t.id;
      newTokenData.actorId = newActor.id;
      newTokenData.actorLink = true;
      return newTokenData;
    });
    return canvas.scene?.updateEmbeddedDocuments("Token", updates);
  }

  /* -------------------------------------------- */

  /**
   * If this actor was transformed with transformTokens enabled, then its
   * active tokens need to be returned to their original state. If not, then
   * we can safely just delete this actor.
   * @returns {Promise<Actor>|null}  Original actor if it was reverted.
   */
  async revertOriginalForm() {
    if ( !this.isPolymorphed ) return;
    if ( !this.isOwner ) {
      return ui.notifications.warn(game.i18n.localize("DND5E.PolymorphRevertWarn"));
    }

    // If we are reverting an unlinked token, simply replace it with the base actor prototype
    if ( this.isToken ) {
      const baseActor = game.actors.get(this.token.actorId);
      const prototypeTokenData = await baseActor.getTokenData();
      const tokenUpdate = {actorData: {}};
      for ( let k of ["width", "height", "scale", "img", "mirrorX", "mirrorY", "tint", "alpha", "lockRotation", "name"] ) {
        tokenUpdate[k] = prototypeTokenData[k];
      }
      await this.token.update(tokenUpdate, {recursive: false});
      await this.sheet.close();
      const actor = this.token.getActor();
      actor.sheet.render(true);
      return actor;
    }

    // Obtain a reference to the original actor
    const original = game.actors.get(this.getFlag("dnd5e", "originalActor"));
    if ( !original ) return;

    // Get the Tokens which represent this actor
    if ( canvas.ready ) {
      const tokens = this.getActiveTokens(true);
      const tokenData = await original.getTokenData();
      const tokenUpdates = tokens.map(t => {
        const update = duplicate(tokenData);
        update._id = t.id;
        delete update.x;
        delete update.y;
        return update;
      });
      canvas.scene.updateEmbeddedDocuments("Token", tokenUpdates);
    }

    // Delete the polymorphed version of the actor, if possible
    const isRendered = this.sheet.rendered;
    if ( game.user.isGM ) await this.delete();
    else if ( isRendered ) this.sheet.close();
    if ( isRendered ) original.sheet.render(isRendered);
    return original;
  }

  /* -------------------------------------------- */

  /**
   * Add additional system-specific sidebar directory context menu options for Actor documents
   * @param {jQuery} html         The sidebar HTML
   * @param {Array} entryOptions  The default array of context menu options
   */
  static addDirectoryContextOptions(html, entryOptions) {
    entryOptions.push({
      name: "DND5E.PolymorphRestoreTransformation",
      icon: '<i class="fas fa-backward"></i>',
      callback: li => {
        const actor = game.actors.get(li.data("documentId"));
        return actor.revertOriginalForm();
      },
      condition: li => {
        const allowed = game.settings.get("dnd5e", "allowPolymorphing");
        if ( !allowed && !game.user.isGM ) return false;
        const actor = game.actors.get(li.data("documentId"));
        return actor && actor.isPolymorphed;
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Format a type object into a string.
   * @param {object} typeData          The type data to convert to a string.
   * @returns {string}
   */
  static formatCreatureType(typeData) {
    if ( typeof typeData === "string" ) return typeData; // Backwards compatibility
    let localizedType;
    if ( typeData.value === "custom" ) {
      localizedType = typeData.custom;
    } else {
      let code = CONFIG.DND5E.creatureTypes[typeData.value];
      localizedType = game.i18n.localize(typeData.swarm ? `${code}Pl` : code);
    }
    let type = localizedType;
    if ( typeData.swarm ) {
      type = game.i18n.format("DND5E.CreatureSwarmPhrase", {
        size: game.i18n.localize(CONFIG.DND5E.actorSizes[typeData.swarm]),
        type: localizedType
      });
    }
    if (typeData.subtype) type = `${type} (${typeData.subtype})`;
    return type;
  }

  /* -------------------------------------------- */

  /**
   * Populate a proficiency object with a `selected` field containing a combination of
   * localizable group & individual proficiencies from `value` and the contents of `custom`.
   *
   * @param {object} data          Object containing proficiency data.
   * @param {string[]} data.value  Array of standard proficiency keys.
   * @param {string} data.custom   Semicolon-separated string of custom proficiencies.
   * @param {string} type          "armor", "weapon", or "tool"
   */
  static prepareProficiencies(data, type) {
    const profs = CONFIG.DND5E[`${type}Proficiencies`];
    const itemTypes = CONFIG.DND5E[`${type}Ids`];

    let values = [];
    if ( data.value ) values = data.value instanceof Array ? data.value : [data.value];

    data.selected = {};
    for ( const key of values ) {
      if ( profs[key] ) {
        data.selected[key] = profs[key];
      } else if ( itemTypes && itemTypes[key] ) {
        const item = ProficiencySelector.getBaseItem(itemTypes[key], { indexOnly: true });
        if ( item ) data.selected[key] = item.name;
      } else if ( type === "tool" && CONFIG.DND5E.vehicleTypes[key] ) {
        data.selected[key] = CONFIG.DND5E.vehicleTypes[key];
      }
    }

    // Add custom entries
    if ( data.custom ) data.custom.split(";").forEach((c, i) => data.selected[`custom${i+1}`] = c.trim());
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritdoc */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    this._displayScrollingDamage(options.dhp);
  }

  /* -------------------------------------------- */

  /**
   * Display changes to health as scrolling combat text.
   * Adapt the font size relative to the Actor's HP total to emphasize more significant blows.
   * @param {number} dhp      The change in hit points that was applied
   * @private
   */
  _displayScrollingDamage(dhp) {
    if ( !dhp ) return;
    dhp = Number(dhp);
    const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
    for ( const t of tokens ) {
      const pct = Math.clamped(Math.abs(dhp) / this.system.attributes.hp.max, 0, 1);
      canvas.interface.createScrollingText(t.center, dhp.signedString(), {
        anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
        fontSize: 16 + (32 * pct), // Range between [16, 48]
        fill: CONFIG.DND5E.tokenHPColors[dhp < 0 ? "damage" : "healing"],
        stroke: 0x000000,
        strokeThickness: 4,
        jitter: 0.25
      });
    }
  }

  /* -------------------------------------------- */
  /*  DEPRECATED METHODS                          */
  /* -------------------------------------------- */

  /**
   * Given a list of items to add to the Actor, optionally prompt the user for which they would like to add.
   * @param {Item5e[]} items         The items being added to the Actor.
   * @param {boolean} [prompt=true]  Whether or not to prompt the user.
   * @returns {Promise<Item5e[]>}
   * @deprecated since dnd5e 1.6, targeted for removal in 2.1
   */
  async addEmbeddedItems(items, prompt=true) {
    foundry.utils.logCompatibilityWarning(
      "Actor5e#addEmbeddedItems has been deprecated.", { since: "DnD5e 1.6", until: "DnD5e 2.1" }
    );
    let itemsToAdd = items;
    if ( !items.length ) return [];

    // Obtain the array of item creation data
    let toCreate = [];
    if (prompt) {
      const itemIdsToAdd = await SelectItemsPrompt.create(items, {
        hint: game.i18n.localize("DND5E.AddEmbeddedItemPromptHint")
      });
      for (let item of items) {
        if (itemIdsToAdd.includes(item.id)) toCreate.push(item.toObject());
      }
    }
    else toCreate = items.map(item => item.toObject());

    // Create the requested items
    if (itemsToAdd.length === 0) return [];
    return Item5e.createDocuments(toCreate, {parent: this});
  }

  /* -------------------------------------------- */

  /**
   * Get a list of features to add to the Actor when a class item is updated.
   * Optionally prompt the user for which they would like to add.
   * @param {object} [options]
   * @param {string} [options.classIdentifier] Identifier slug of the class if it has been changed.
   * @param {string} [options.subclassName]    Name of the selected subclass if it has been changed.
   * @param {number} [options.level]           New class level if it has been changed.
   * @returns {Promise<Item5e[]>}              Any new items that should be added to the actor.
   * @deprecated since dnd5e 1.6, targeted for removal in 2.1
   */
  async getClassFeatures({classIdentifier, subclassName, level}={}) {
    foundry.utils.logCompatibilityWarning(
      "Actor5e#getClassFeatures has been deprecated. Please refer to the Advancement API for its replacement.",
      { since: "DnD5e 1.6", until: "DnD5e 2.1" }
    );
    const existing = new Set(this.items.map(i => i.name));
    const features = await Actor5e.loadClassFeatures({classIdentifier, subclassName, level});
    return features.filter(f => !existing.has(f.name)) || [];
  }

  /* -------------------------------------------- */

  /**
   * Return the features which a character is awarded for each class level.
   * @param {object} [options]
   * @param {string} [options.classIdentifier] Identifier slug of the class being added or updated.
   * @param {string} [options.subclassName]    Name of the subclass of the class being added, if any.
   * @param {number} [options.level]           The number of levels in the added class.
   * @param {number} [options.priorLevel]      The previous level of the added class.
   * @returns {Promise<Item5e[]>}              Items that should be added based on the changes made.
   * @deprecated since dnd5e 1.6, targeted for removal in 2.1
   */
  static async loadClassFeatures({classIdentifier="", subclassName="", level=1, priorLevel=0}={}) {
    foundry.utils.logCompatibilityWarning(
      "Actor5e#loadClassFeatures has been deprecated. Please refer to the Advancement API for its replacement.",
      { since: "DnD5e 1.6", until: "DnD5e 2.1" }
    );
    subclassName = subclassName.slugify();

    // Get the configuration of features which may be added
    const clsConfig = CONFIG.DND5E.classFeatures[classIdentifier];
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
        const preparation = feature.system.preparation;
        preparation.mode = "always";
        preparation.prepared = true;
      }
    }
    return features;
  }

  /* -------------------------------------------- */

  /**
   * Determine a character's AC value from their equipped armor and shield.
   * @returns {object}
   * @private
   * @deprecated since dnd5e 2.0, targeted for removal in 2.2
   */
  _computeArmorClass() {
    foundry.utils.logCompatibilityWarning(
      "Actor5e#_computeArmorClass has been renamed Actor5e#_prepareArmorClass.",
      { since: "DnD5e 2.0", until: "DnD5e 2.2" }
    );
    this._prepareArmorClass();
    return this.system.attributes.ac;
  }

  /* -------------------------------------------- */

  /**
   * Compute the level and percentage of encumbrance for an Actor.
   * @returns {object}  An object describing the character's encumbrance level
   * @private
   * @deprecated since dnd5e 2.0, targeted for removal in 2.2
   */
  _computeEncumbrance() {
    foundry.utils.logCompatibilityWarning(
      "Actor5e#_computeEncumbrance has been renamed Actor5e#_prepareEncumbrance.",
      { since: "DnD5e 2.0", until: "DnD5e 2.2" }
    );
    this._prepareEncumbrance();
    return this.system.attributes.encumbrance;
  }

  /* -------------------------------------------- */

  /**
   * Calculate the initiative bonus to display on a character sheet.
   * @private
   * @deprecated since dnd5e 2.0, targeted for removal in 2.2
   */
  _computeInitiativeModifier() {
    foundry.utils.logCompatibilityWarning(
      "Actor5e#_computeInitiativeModifier has been renamed Actor5e#_prepareInitiative.",
      { since: "DnD5e 2.0", until: "DnD5e 2.2" }
    );
    this._prepareInitiative();
  }

  /* -------------------------------------------- */

  /**
   * Prepare data related to the spell-casting capabilities of the Actor.
   * Mutates the value of the system.spells object.
   * @private
   * @deprecated since dnd5e 2.0, targeted for removal in 2.2
   */
  _computeSpellcastingProgression() {
    foundry.utils.logCompatibilityWarning(
      "Actor5e#_computeSpellcastingProgression has been renamed Actor5e#_prepareSpellcasting.",
      { since: "DnD5e 2.0", until: "DnD5e 2.2" }
    );
    this._prepareSpellcasting();
  }

  /* -------------------------------------------- */

  /**
   * Convert a bonus value to a simple integer for displaying on the sheet.
   * @param {number|string|null} bonus  Actor's bonus value.
   * @param {object} data               Actor data to use for replacing @ strings.
   * @returns {number}                  Simplified bonus as an integer.
   * @protected
   * @deprecated since dnd5e 2.0, targeted for removal in 2.2
   */
  _simplifyBonus(bonus, data) {
    foundry.utils.logCompatibilityWarning(
      "Actor#_simplifyBonus has been made a utility function and can be accessed at dnd5e.utils.simplifyBonus.",
      { since: "DnD5e 2.0", until: "DnD5e 2.2" }
    );
    return simplifyBonus(bonus, data);
  }
}
