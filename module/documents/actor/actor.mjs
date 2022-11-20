import { d10Roll, damageRoll } from "../../dice/dice.mjs";
import { simplifyBonus } from "../../utils.mjs";

/**
 * Extend the base Actor class to implement additional system-specific logic.
 */
export default class Actor5e extends Actor {

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
    this._prepareBaseStats();
    this._prepareBaseCounts();
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
    this._prepareInitiative(bonusData, checkBonus);
    this._prepareCounts();
    this._prepareStats();
    this._prepareHP();
    this._prepareMP();
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
    data.stats = this.system.stats;
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


  /**
   * Prepare the point stat data for an actor.
   * Specifically, physO, menO, physD, menD
   * @protected
   */
    _prepareBaseStats() {
    if ( this.type === "vehicle") return;
    const stats = {};
    for ( const key of Object.keys(CONFIG.SHAPER.stats) ) {
      stats[key] = this.system.stats[key];
    }
    this.system.stats = stats;
  }

  /**
 * Prepare the counter data for an actor.
 * @protected
 */
    _prepareBaseCounts() {
    if ( this.type === "vehicle") return;
    const counts = {};
    for ( const key of Object.keys(CONFIG.SHAPER.counts) ) {
      counts[key] = this.system.counts[key];
    }
    this.system.counts = counts;
  }

  /* -------------------------------------------- */

  /**
   * Perform any Character specific preparation.
   * Mutates several aspects of the system data object.
   * @protected
   */
  _prepareCharacterData() {
    //this.system.details.level = this.system.details?.level ?? 0;
    // Experience required for next level
    //const xp = this.system.details.xp;
  }

  /* -------------------------------------------- */

  /**
   * Perform any NPC specific preparation.
   * Mutates several aspects of the system data object.
   * @protected
   */
  _prepareNPCData() {
    const cr = this.system.details.cr;
    // Do I even need this here?
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

    // Skill modifiers
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
      skl.total = skl.mod + skl.bonus;

    }
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

    // Compute initiative modifier
    init.mod = (this.system.abilities.fin?.mod ?? 0) + (this.system.abilities.sol?.mod ?? 0);

    init.value = init.value ?? 0;
    init.bonus = init.value + (initiativeAlert ? 5 : 0);
    init.total = init.mod + init.bonus + globalCheckBonus;
  }

  /**
   * Prepare the max hp for an actor.
   * @protected
   */
  _prepareHP() {
    const hp = this.system.attributes.hp ?? {};

    const scale0 = this.system.abilities[hp.scale0];
    const scale1 = this.system.abilities[hp.scale1];
    
    const vit = this.system.counts['vitality'];

    const base = 3 * ( scale0.value + scale1.value ) + 15;

    const vim = vit.value * ( 5 + scale0.value + scale1.value );

    hp.max = base + vim;

  }

    /**
   * Prepare the max mp for an actor.
   * @protected
   */
     _prepareMP() {
      const mp = this.system.attributes.mp ?? {};
  
      const scale0 = this.system.abilities[mp.scale0];
      const scale1 = this.system.abilities[mp.scale1];
      
      const cap = this.system.counts['capacity'];
  
      const base = 3 * ( scale0.value + scale1.value ) + 15;
  
      const vig = cap.value * ( 5 + scale0.value + scale1.value );
      
      mp.max = base + vig;
  
    }


  /**
   * Prepare the point stat data for an actor.
   * Specifically, physO, menO, physD, menD
   * @protected
   */
  _prepareStats() {

    for ( const [id, st] of Object.entries(this.system.stats) ) {
      const scale0 = this.system.abilities[st.scale0];
      const scale1 = this.system.abilities[st.scale1];
      switch (id) {
        case "physO":
        case "menO":
          st.value = scale0.value + scale1.value + st.bonus;
          break;
        case "physD":
        case "menD":
          st.value = scale0.value + scale1.value + st.bonus + 10;
          break;
      }
    }
  }

  /**
 * Prepare the counter data for an actor.
 * @protected
 */
  _prepareCounts() {

    const counts = this.system.counts ??={};

    for ( const key of Object.keys(counts) ) {

      counts[key].value = counts[key].value ?? 0;

      // If the value is higher than the max or less than the min, clamp it
      if ( counts[key].value > counts[key].max ) counts[key].value = counts[key].max;
      else if ( counts[key].value < counts[key].min ) counts[key].value = counts[key].min;

    }
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
    if ( abl0?.bonuses?.check || abl1?.bonuses?.check ) {
      data.abilityCheckBonus = Roll.replaceFormulaData(abl0.bonuses.check, data);
      data.abilityCheckBonus = Roll.replaceFormulaData(abl1.bonuses.check, data);
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
   * 
   * Deprecated: No saving throws, so no need to have a separate dialog
   */
  rollAbility(abilityId, options={}) {

    this.rollAbilityTest(abilityId, options)
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
