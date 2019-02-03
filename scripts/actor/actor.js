/**
 * Extend the base Actor class to implement additional logic specialized for D&D5e.
 */
class Actor5e extends Actor {

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData(actorData) {
    actorData = super.prepareData(actorData);
    const data = actorData.data;

    // Prepare Character data
    if ( actorData.type === "character" ) this._prepareCharacterData(data);
    else if ( actorData.type === "npc" ) this._prepareNPCData(data);

    // Ability modifiers and saves
    for (let abl of Object.values(data.abilities)) {
      abl.mod = Math.floor((abl.value - 10) / 2);
      abl.save = abl.mod + ((abl.proficient || 0) * data.attributes.prof.value);
    }

    // Skill modifiers
    for (let skl of Object.values(data.skills)) {
      skl.value = parseFloat(skl.value || 0);
      skl.mod = data.abilities[skl.ability].mod + Math.floor(skl.value * data.attributes.prof.value);
    }

    // Attributes
    data.attributes.init.mod = data.abilities.dex.mod + (data.attributes.init.value || 0);
    data.attributes.ac.min = 10 + data.abilities.dex.mod;

    // Spell DC
    let spellAbl = data.attributes.spellcasting.value || "int";
    data.attributes.spelldc.value = 8 + data.attributes.prof.value + data.abilities[spellAbl].mod;

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

    // CR, kill exp, and proficiency
    data.details.cr.value = parseFloat(data.details.cr.value) || 0;
    data.details.xp.value = this.getCRExp(data.details.cr.value);
    data.attributes.prof.value = Math.floor((Math.max(data.details.cr.value, 1) + 7) / 4);
  }

  /* -------------------------------------------- */

  /**
   * Return the amount of experience required to gain a certain character level.
   * @param level {Number}  The desired level
   * @return {Number}       The XP required
   */
  getLevelExp(level) {
    const levels = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000,
      120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
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
    let _ = undefined;
    const xps = [10, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 18000, 20000, 22000,
        25000, 27500, 30000, 32500, 36500, _, _, _, _, _, 155000];
    return xps[cr];
  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */

  /**
   * Roll a Skill Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollSkill(skillName) {
    let skl = this.data.data.skills[skillName],
      parts = ["@mod"],
      flavor = `${skl.label} Skill Check`;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: {mod: skl.mod},
      title: flavor,
      alias: this.actor,
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll a generic ability test or saving throw.
   * Prompt the user for input on which variety of roll they want to do.
   * @param abilityId {String}    The ability id (e.g. "str")
   */
  rollAbility(abilityId) {
    let abl = this.data.data.abilities[abilityId];
    new Dialog({
      title: `${abl.label} Ability Check`,
      content: `<p>What type of ${abl.label} check?</p>`,
      buttons: {
        test: {
          label: "Ability Test",
          callback: () => this.rollAbilityTest(abilityId)
        },
        save: {
          label: "Saving Throw",
          callback: () => this.rollAbilitySave(abilityId)
        }
      }
    }).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Roll an Ability Test
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param abilityId {String}    The ability ID (e.g. "str")
   */
  rollAbilityTest(abilityId) {
    let abl = this.data.data.abilities[abilityId],
        parts = ["@mod"],
        flavor = `${abl.label} Ability Test`;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: {mod: abl.mod},
      title: flavor,
      alias: this.actor,
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll an Ability Saving Throw
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param abilityId {String}    The ability ID (e.g. "str")
   */
  rollAbilitySave(abilityId) {
    let abl = this.data.data.abilities[abilityId],
        parts = ["1d20", "@mod", "@bonus"],
        flavor = `${abl.label} Saving Throw`;

    // Create a dialog
    new Dialog({
      title: flavor,
      content: this._skillSaveRollModalHTML,
      buttons: {
        advantage: {
          label: "Advantage",
          callback: () => {
            parts[0] = "2d20kh";
            flavor += " (Advantage)"
          }
        },
        normal: {
          label: "Normal",
        },
        disadvantage: {
          label: "Disadvantage",
          callback: () => {
            parts[0] = "2d20kl";
            flavor += " (Disadvantage)"
          }
        }
      },
      close: html => {
        let bonus = html.find('[name="bonus"]').val(),
            roll = new Roll(parts.join(" + "), {mod: abl.save, bonus: bonus}).roll();
        roll.toMessage({
          alias: this.name,
          flavor: flavor,
          highlightSuccess: roll.parts[0].total === 20,
          highlightFailure: roll.parts[0].total === 1
        });
      }
    }).render(true);
  }
}

// Assign the actor class to the CONFIG
CONFIG.Actor.entityClass = Actor5e;
