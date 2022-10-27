import { d10Roll, damageRoll } from "../../dice/dice.mjs";
import { simplifyBonus } from "../../utils.mjs";
import Item5e from "../item.mjs";

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
    const flags = this.flags.shaper || {};
    this.labels = {};

    // Prepare abilities, skills, & everything else
    const globalBonuses = this.system.bonuses?.abilities ?? {};
    const bonusData = this.getRollData();
    const checkBonus = simplifyBonus(globalBonuses?.check, bonusData);
    this._prepareAbilities(bonusData, globalBonuses, checkBonus);
    this._prepareSkills(bonusData, globalBonuses, checkBonus);
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
    const levels = CONFIG.SHAPER.CHARACTER_EXP_LEVELS;
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
    return CONFIG.SHAPER.CR_EXP_LEVELS[cr];
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

    return data;
  }

  /* -------------------------------------------- */
  /*  Base Data Preparation Helpers               */
  /* -------------------------------------------- */

  /**
   * Update the actor's abilities list to match the abilities configured in `SHAPER.abilities`.
   * Mutates the system.abilities object.
   * @param {object} updates  Updates to be applied to the actor. *Will be mutated.*
   * @protected
   */
  _prepareBaseAbilities(updates) {
    const abilities = {};
    for ( const key of Object.keys(CONFIG.SHAPER.abilities) ) {
      abilities[key] = this.system.abilities[key];
    }
    this.system.abilities = abilities;
  }

  /* -------------------------------------------- */

  /**
   * Update the actor's skill list to match the skills configured in `SHAPER.skills`.
   * Mutates the system.skills object.
   * @param {object} updates  Updates to be applied to the actor. *Will be mutated*.
   * @private
   */
  _prepareBaseSkills(updates) {
    if ( this.type === "vehicle") return;
    const skills = {};
    for ( const [key, skill] of Object.entries(CONFIG.SHAPER.skills) ) {
      skills[key] = this.system.skills[key];
    }
    this.system.skills = skills;
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



    // Kill Experience
    this.system.details.xp.value = this.getCRExp(cr);

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
   * @protected
   */
  _prepareAbilities(bonusData, globalBonuses, checkBonus) {
    const flags = this.flags.shaper ?? {};
    for ( const [id, abl] of Object.entries(this.system.abilities) ) {
      abl.mod = abl.value;
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare skill checks. Mutates the values of system.skills.
   * @param {object} bonusData       Data produced by `getRollData` to be applied to bonus formulas.
   * @param {object} globalBonuses   Global bonus data.
   * @param {number} checkBonus      Global ability check bonus.
   * @protected
   */
  _prepareSkills(bonusData, globalBonuses, checkBonus) {
    if ( this.type === "vehicle" ) return;
    const flags = this.flags.shaper ?? {};

    // Skill modifiers
    const feats = CONFIG.SHAPER.characterFlags;
    const skillBonus = simplifyBonus(globalBonuses.skill, bonusData);
    for ( const [id, skl] of Object.entries(this.system.skills) ) {
      const ability0 = this.system.abilities[skl.ability0];
      const ability1 = this.system.abilities[skl.ability1];
      skl.value = Math.clamped(Number(skl.value).toNearest(0.5), 0, 2) ?? 0;
      const baseBonus = simplifyBonus(skl.bonuses?.check, bonusData);


      // Compute modifier
      const checkBonusAbl0 = simplifyBonus(ability0?.bonuses?.check, bonusData);
      const checkBonusAbl1 = simplifyBonus(ability1?.bonuses?.check, bonusData);
      skl.bonus = baseBonus + checkBonus + checkBonusAbl0 + checkBonusAbl1 + skillBonus;
      skl.mod = (ability0?.mod ?? 0) + (ability1?.mod ?? 0) + skl.points;
      skl.proficient = skl.value;
      skl.total = skl.mod + skl.bonus;

    }
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
    if ( game.settings.get("shaper", "currencyWeight") && currency ) {
      const numCoins = Object.values(currency).reduce((val, denom) => val + Math.max(denom, 0), 0);
      const currencyPerWeight = game.settings.get("shaper", "metricWeightUnits")
        ? CONFIG.SHAPER.encumbrance.currencyPerWeight.metric
        : CONFIG.SHAPER.encumbrance.currencyPerWeight.imperial;
      weight += numCoins / currencyPerWeight;
    }

    // Determine the Encumbrance size class
    let mod = {tiny: 0.5, sm: 1, med: 1, lg: 2, huge: 4, grg: 8}[this.system.traits.size] || 1;
    if ( this.flags.shaper?.powerfulBuild ) mod = Math.min(mod * 2, 8);

    const strengthMultiplier = game.settings.get("shaper", "metricWeightUnits")
      ? CONFIG.SHAPER.encumbrance.strMultiplier.metric
      : CONFIG.SHAPER.encumbrance.strMultiplier.imperial;

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
    const { initiativeAlert, jackOfAllTrades, remarkableAthlete } = this.flags.shaper ?? {};

    // Initiative modifiers
    const dexCheckBonus = simplifyBonus(this.system.abilities.dex?.bonuses?.check, bonusData);

    // Compute initiative modifier
    init.mod = this.system.abilities.dex?.mod ?? 0;

    init.value = init.value ?? 0;
    init.bonus = init.value + (initiativeAlert ? 5 : 0);
    init.total = init.mod + init.bonus + dexCheckBonus + globalCheckBonus;
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
      return scale;
    }, {});
  }

  /* -------------------------------------------- */


  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    const sourceId = this.getFlag("core", "sourceId");
    if ( sourceId?.startsWith("Compendium.") ) return;

    // Configure prototype token settings
    const s = CONFIG.SHAPER.tokenSizes[this.system.traits.size || "med"];
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
      let size = CONFIG.SHAPER.tokenSizes[newSize];
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
   * Determine whether the provided ability is usable for remarkable athlete.
   * @param {string} ability  Ability type to check.
   * @returns {boolean}       Whether the actor has the remarkable athlete flag and the ability is physical.
   * @private
   */
  _isRemarkableAthlete(ability) {
    return this.getFlag("shaper", "remarkableAthlete")
      && CONFIG.SHAPER.characterFlags.remarkableAthlete.abilities.includes(ability);
  }

  /* -------------------------------------------- */

  /**
   * Roll a Skill Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {string} skillId      The skill id (e.g. "ins")
   * @param {object} options      Options which configure how the skill check is rolled
   * @returns {Promise<D10Roll>}  A Promise which resolves to the created Roll instance
   */
  async rollSkill(skillId, options={}) {
    const skl = this.system.skills[skillId];
    const abl0 = this.system.abilities[skl.ability0];
    const abl1 = this.system.abilities[skl.ability1];
    const globalBonuses = this.system.bonuses?.abilities ?? {};
    const parts = ["@mod", "@abilityCheckBonus"];
    const data = this.getRollData();

    // Add ability modifier
    data.mod = skl.mod;
    data.points = skl.points;
    data.defaultAbility0 = skl.ability0;
    data.defaultAbility1 = skl.ability1;


    // Global ability check bonus
    if ( globalBonuses.check ) {
      parts.push("@checkBonus");
      data.checkBonus = Roll.replaceFormulaData(globalBonuses.check, data);
    }

    // Ability-specific check bonus
    // TODO: See what this does
    if ( abl0?.bonuses?.check ) {
      
      console.log(abl0.bonuses.check);
      data.abilityCheckBonus = Roll.replaceFormulaData(abl0.bonuses.check, data);
    }
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


    // Roll and return
    const flavor = game.i18n.format("SHAPER.SkillPromptTitle", {skill: CONFIG.SHAPER.skills[skillId]?.label ?? ""});
    const rollData = foundry.utils.mergeObject({
      parts: parts,
      data: data,
      title: `${flavor}: ${this.name}`,
      flavor,
      chooseModifier: true,
      messageData: {
        speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
        "flags.shaper.roll": {type: "skill", skillId }
      }
    }, options);

    /**
     * A hook event that fires before a skill check is rolled for an Actor.
     * @function shaper.preRollSkill
     * @memberof hookEvents
     * @param {Actor5e} actor                Actor for which the skill check is being rolled.
     * @param {D10RollConfiguration} config  Configuration data for the pending roll.
     * @param {string} skillId               ID of the skill being rolled as defined in `SHAPER.skills`.
     * @returns {boolean}                    Explicitly return `false` to prevent skill check from being rolled.
     */
    if ( Hooks.call("shaper.preRollSkill", this, rollData, skillId) === false ) return;

    const roll = await d10Roll(rollData);

    /**
     * A hook event that fires after a skill check has been rolled for an Actor.
     * @function shaper.rollSkill
     * @memberof hookEvents
     * @param {Actor5e} actor   Actor for which the skill check has been rolled.
     * @param {D10Roll} roll    The resulting roll.
     * @param {string} skillId  ID of the skill that was rolled as defined in `SHAPER.skills`.
     */
    if ( roll ) Hooks.callAll("shaper.rollSkill", this, roll, skillId);

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
    const label = CONFIG.SHAPER.abilities[abilityId] ?? "";
    new Dialog({
      title: `${game.i18n.format("SHAPER.AbilityPromptTitle", {ability: label})}: ${this.name}`,
      content: `<p>${game.i18n.format("SHAPER.AbilityPromptText", {ability: label})}</p>`,
      buttons: {
        test: {
          label: game.i18n.localize("SHAPER.ActionAbil"),
          callback: () => this.rollAbilityTest(abilityId, options)
        },
        save: {
          label: game.i18n.localize("SHAPER.ActionSave"),
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
   * @returns {Promise<D10Roll>}  A Promise which resolves to the created Roll instance
   */
  async rollAbilityTest(abilityId, options={}) {
    const label = CONFIG.SHAPER.abilities[abilityId] ?? "";
    const abl = this.system.abilities[abilityId];
    const globalBonuses = this.system.bonuses?.abilities ?? {};
    const parts = [];
    const data = this.getRollData();

    // Add ability modifier
    parts.push("@mod");
    data.mod = abl?.mod ?? 0;



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
    const flavor = game.i18n.format("SHAPER.AbilityPromptTitle", {ability: label});
    const rollData = foundry.utils.mergeObject({
      parts,
      data,
      title: `${flavor}: ${this.name}`,
      flavor,
      messageData: {
        speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
        "flags.shaper.roll": {type: "ability", abilityId }
      }
    }, options);

    /**
     * A hook event that fires before an ability test is rolled for an Actor.
     * @function shaper.preRollAbilityTest
     * @memberof hookEvents
     * @param {Actor5e} actor                Actor for which the ability test is being rolled.
     * @param {D10RollConfiguration} config  Configuration data for the pending roll.
     * @param {string} abilityId             ID of the ability being rolled as defined in `SHAPER.abilities`.
     * @returns {boolean}                    Explicitly return `false` to prevent ability test from being rolled.
     */
    if ( Hooks.call("shaper.preRollAbilityTest", this, rollData, abilityId) === false ) return;

    const roll = await d10Roll(rollData);

    /**
     * A hook event that fires after an ability test has been rolled for an Actor.
     * @function shaper.rollAbilityTest
     * @memberof hookEvents
     * @param {Actor5e} actor     Actor for which the ability test has been rolled.
     * @param {D10Roll} roll      The resulting roll.
     * @param {string} abilityId  ID of the ability that was rolled as defined in `SHAPER.abilities`.
     */
    if ( roll ) Hooks.callAll("shaper.rollAbilityTest", this, roll, abilityId);

    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Roll an Ability Saving Throw
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {string} abilityId    The ability ID (e.g. "str")
   * @param {object} options      Options which configure how ability tests are rolled
   * @returns {Promise<D10Roll>}  A Promise which resolves to the created Roll instance
   */
  async rollAbilitySave(abilityId, options={}) {
    const label = CONFIG.SHAPER.abilities[abilityId] ?? "";
    const abl = this.system.abilities[abilityId];
    const globalBonuses = this.system.bonuses?.abilities ?? {};
    const parts = [];
    const data = this.getRollData();

    // Add ability modifier
    parts.push("@mod");
    data.mod = abl?.mod ?? 0;



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
    const flavor = game.i18n.format("SHAPER.SavePromptTitle", {ability: label});
    const rollData = foundry.utils.mergeObject({
      parts,
      data,
      title: `${flavor}: ${this.name}`,
      flavor,
      messageData: {
        speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
        "flags.shaper.roll": {type: "save", abilityId }
      }
    }, options);

    /**
     * A hook event that fires before an ability save is rolled for an Actor.
     * @function shaper.preRollAbilitySave
     * @memberof hookEvents
     * @param {Actor5e} actor                Actor for which the ability save is being rolled.
     * @param {D10RollConfiguration} config  Configuration data for the pending roll.
     * @param {string} abilityId             ID of the ability being rolled as defined in `SHAPER.abilities`.
     * @returns {boolean}                    Explicitly return `false` to prevent ability save from being rolled.
     */
    if ( Hooks.call("shaper.preRollAbilitySave", this, rollData, abilityId) === false ) return;

    const roll = await d10Roll(rollData);

    /**
     * A hook event that fires after an ability save has been rolled for an Actor.
     * @function shaper.rollAbilitySave
     * @memberof hookEvents
     * @param {Actor5e} actor     Actor for which the ability save has been rolled.
     * @param {D10Roll} roll      The resulting roll.
     * @param {string} abilityId  ID of the ability that was rolled as defined in `SHAPER.abilities`.
     */
    if ( roll ) Hooks.callAll("shaper.rollAbilitySave", this, roll, abilityId);

    return roll;
  }

  /* -------------------------------------------- */

  /**
   * Perform a death saving throw, rolling a d20 plus any global save bonuses
   * @param {object} options          Additional options which modify the roll
   * @returns {Promise<D10Roll|null>} A Promise which resolves to the Roll instance
   */
  async rollDeathSave(options={}) {
    const death = this.system.attributes.death;

    // Display a warning if we are not at zero HP or if we already have reached 3
    if ( (this.system.attributes.hp.value > 0) || (death.failure >= 3) || (death.success >= 3) ) {
      ui.notifications.warn(game.i18n.localize("SHAPER.DeathSaveUnnecessary"));
      return null;
    }

    // Evaluate a global saving throw bonus
    const speaker = options.speaker || ChatMessage.getSpeaker({actor: this});
    const globalBonuses = this.system.bonuses?.abilities ?? {};
    const parts = [];
    const data = this.getRollData();


    // Include a global actor ability save bonus
    if ( globalBonuses.save ) {
      parts.push("@saveBonus");
      data.saveBonus = Roll.replaceFormulaData(globalBonuses.save, data);
    }

    // Evaluate the roll
    const flavor = game.i18n.localize("SHAPER.DeathSavingThrow");
    const rollData = foundry.utils.mergeObject({
      parts,
      data,
      title: `${flavor}: ${this.name}`,
      flavor,
      targetValue: 10,
      messageData: {
        speaker: speaker,
        "flags.shaper.roll": {type: "death"}
      }
    }, options);

    /**
     * A hook event that fires before a death saving throw is rolled for an Actor.
     * @function shaper.preRollDeathSave
     * @memberof hookEvents
     * @param {Actor5e} actor                Actor for which the death saving throw is being rolled.
     * @param {D10RollConfiguration} config  Configuration data for the pending roll.
     * @returns {boolean}                    Explicitly return `false` to prevent death saving throw from being rolled.
     */
    if ( Hooks.call("shaper.preRollDeathSave", this, rollData) === false ) return;

    const roll = await d10Roll(rollData);
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
        details.chatString = "SHAPER.DeathSaveCriticalSuccess";
      }

      // 3 Successes = survive and reset checks
      else if ( successes === 3 ) {
        details.updates = {
          "system.attributes.death.success": 0,
          "system.attributes.death.failure": 0
        };
        details.chatString = "SHAPER.DeathSaveSuccess";
      }

      // Increment successes
      else details.updates = {"system.attributes.death.success": Math.clamped(successes, 0, 3)};
    }

    // Save failure
    else {
      let failures = (death.failure || 0) + (roll.isFumble ? 2 : 1);
      details.updates = {"system.attributes.death.failure": Math.clamped(failures, 0, 3)};
      if ( failures >= 3 ) {  // 3 Failures = death
        details.chatString = "SHAPER.DeathSaveFailure";
      }
    }

    /**
     * A hook event that fires after a death saving throw has been rolled for an Actor, but before
     * updates have been performed.
     * @function shaper.rollDeathSave
     * @memberof hookEvents
     * @param {Actor5e} actor              Actor for which the death saving throw has been rolled.
     * @param {D10Roll} roll               The resulting roll.
     * @param {object} details
     * @param {object} details.updates     Updates that will be applied to the actor as a result of this save.
     * @param {string} details.chatString  Localizable string displayed in the create chat message. If not set, then
     *                                     no chat message will be displayed.
     * @returns {boolean}                  Explicitly return `false` to prevent updates from being performed.
     */
    if ( Hooks.call("shaper.rollDeathSave", this, roll, details) === false ) return roll;

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
  /*  Conversion & Transformation                 */
  /* -------------------------------------------- */

  /**
   * Convert all carried currency to the highest possible denomination to reduce the number of raw coins being
   * carried by an Actor.
   * @returns {Promise<Actor5e>}
   */
  convertCurrency() {
    const curr = foundry.utils.deepClone(this.system.currency);
    const conversion = Object.entries(CONFIG.SHAPER.currencies);
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
      let code = CONFIG.SHAPER.creatureTypes[typeData.value];
      localizedType = game.i18n.localize(typeData.swarm ? `${code}Pl` : code);
    }
    let type = localizedType;
    if ( typeData.swarm ) {
      type = game.i18n.format("SHAPER.CreatureSwarmPhrase", {
        size: game.i18n.localize(CONFIG.SHAPER.actorSizes[typeData.swarm]),
        type: localizedType
      });
    }
    if (typeData.subtype) type = `${type} (${typeData.subtype})`;
    return type;
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
        fill: CONFIG.SHAPER.tokenHPColors[dhp < 0 ? "damage" : "healing"],
        stroke: 0x000000,
        strokeThickness: 4,
        jitter: 0.25
      });
    }
  }
}
