class Dice5e {

  /**
   * A standardized helper function for managing core 5e "d20 rolls"
   *
   * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus, Advantage, or Disadvantage respectively
   *
   * @param {Event} event           The triggering event which initiated the roll
   * @param {Array} parts           The dice roll component parts, excluding the initial d20
   * @param {Object} data           Actor or item data against which to parse the roll
   * @param {String} template       The HTML template used to render the roll dialog
   * @param {String} title          The dice roll UI window title
   * @param {String} alias          The alias with which to post to chat
   * @param {Function} flavor       A callable function for determining the chat message flavor given parts and data
   * @param {Boolean} advantage     Allow rolling with advantage (and therefore also with disadvantage)
   * @param {Boolean} situational   Allow for an arbitrary situational bonus field
   * @param {Boolean} fastForward   Allow fast-forward advantage selection
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   */
  static d20Roll({event, parts, data, template, title, alias, flavor, advantage=true, situational=true,
                  fastForward=true, onClose, dialogOptions}) {

    // Inner roll function
    let rollMode = game.settings.get("core", "rollMode");
    let roll = () => {
      let flav = ( flavor instanceof Function ) ? flavor(parts, data) : title;
      if (adv === 1) {
        parts[0] = ["2d20kh"];
        flav = `${title} (Advantage)`;
      }
      else if (adv === -1) {
        parts[0] = ["2d20kl"];
        flav = `${title} (Disadvantage)`;
      }

      // Don't include situational bonus unless it is defined
      if (!data.bonus && parts.indexOf("@bonus") !== -1) parts.pop();

      // Execute the roll and send it to chat
      let roll = new Roll(parts.join("+"), data).roll();
      roll.toMessage({
        alias: alias,
        flavor: flav,
        rollMode: rollMode
      });
    };

    // Modify the roll and handle fast-forwarding
    let adv = 0;
    parts = ["1d20"].concat(parts);
    if ( event.shiftKey ) return roll();
    else if ( event.altKey ) {
      adv = 1;
      return roll();
    }
    else if ( event.ctrlKey || event.metaKey ) {
      adv = -1;
      return roll();
    } else parts = parts.concat(["@bonus"]);

    // Render modal dialog
    template = template || "public/systems/dnd5e/templates/chat/roll-dialog.html";
    let dialogData = {
      formula: parts.join(" + "),
      data: data,
      rollMode: rollMode,
      rollModes: CONFIG.rollModes
    };
    renderTemplate(template, dialogData).then(dlg => {
      new Dialog({
          title: title,
          content: dlg,
          buttons: {
            advantage: {
              label: "Advantage",
              callback: () => adv = 1
            },
            normal: {
              label: "Normal",
            },
            disadvantage: {
              label: "Disadvantage",
              callback: () => adv = -1
            }
          },
          default: "normal",
          close: html => {
            if ( onClose ) onClose(html, parts, data);
            rollMode = html.find('[name="rollMode"]').val();
            data['bonus'] = html.find('[name="bonus"]').val();
            roll()
          }
        }, dialogOptions).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * A standardized helper function for managing core 5e "d20 rolls"
   *
   * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus, Critical, or no bonus respectively
   *
   * @param {Event} event           The triggering event which initiated the roll
   * @param {Array} parts           The dice roll component parts, excluding the initial d20
   * @param {Object} data           Actor or item data against which to parse the roll
   * @param {String} template       The HTML template used to render the roll dialog
   * @param {String} title          The dice roll UI window title
   * @param {String} alias          The alias with which to post to chat
   * @param {Function} flavor       A callable function for determining the chat message flavor given parts and data
   * @param {Boolean} critical      Allow critical hits to be chosen
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   */
  static damageRoll({event={}, parts, data, template, title, alias, flavor, critical=true, onClose, dialogOptions}) {

    // Inner roll function
    let rollMode = game.settings.get("core", "rollMode");
    let roll = () => {
      let roll = new Roll(parts.join("+"), data),
          flav = ( flavor instanceof Function ) ? flavor(parts, data) : title;
      if ( crit ) {
        roll.alter(0, 2);
        flav = `${title} (Critical)`;
      }

      // Execute the roll and send it to chat
      roll.toMessage({
        alias: alias,
        flavor: flav,
        rollMode: rollMode
      });

      // Return the Roll object
      return roll;
    };

    // Modify the roll and handle fast-forwarding
    let crit = 0;
    if ( event.shiftKey || event.ctrlKey || event.metaKey )  return roll();
    else if ( event.altKey ) {
      crit = 1;
      return roll();
    }
    else parts = parts.concat(["@bonus"]);

    // Construct dialog data
    template = template || "public/systems/dnd5e/templates/chat/roll-dialog.html";
    let dialogData = {
      formula: parts.join(" + "),
      data: data,
      rollMode: rollMode,
      rollModes: CONFIG.rollModes
    };

    // Render modal dialog
    return new Promise(resolve => {
      renderTemplate(template, dialogData).then(dlg => {
        new Dialog({
          title: title,
          content: dlg,
          buttons: {
            critical: {
              condition: critical,
              label: "Critical Hit",
              callback: () => crit = 1
            },
            normal: {
              label: critical ? "Normal" : "Roll",
            },
          },
          default: "normal",
          close: html => {
            if (onClose) onClose(html, parts, data);
            rollMode = html.find('[name="rollMode"]').val();
            data['bonus'] = html.find('[name="bonus"]').val();
            resolve(roll());
          }
        }, dialogOptions).render(true);
      });
    });
  }
}

/**
 * Highlight critical success or failure on d20 rolls
 */
Hooks.on("renderChatMessage", (message, data, html) => {
  if ( !message.isRoll || message.roll.parts[0].faces !== 20 ) return;
  let d20 = message.roll.parts[0].total;
  if ( d20 === 20 ) html.find(".dice-total").addClass("success");
  else if ( d20 === 1 ) html.find(".dice-total").addClass("failure");
});


/**
 * Activate certain behaviors on FVTT ready hook
 */
Hooks.once("init", () => {

  /**
   * Register diagonal movement rule setting
   */
  game.settings.register("dnd5e", "diagonalMovement", {
    name: "Diagonal Movement Rule",
    hint: "Configure which diagonal movement rule should be used for games within this system.",
    scope: "world",
    config: true,
    default: "555",
    type: String,
    choices: {
      "555": "Player's Handbook (5/5/5)",
      "5105": "Dungeon Master's Guide (5/10/5)"
    },
    onChange: rule => canvas.grid.diagonalRule = rule
  });
});


/**
 * Activate certain behaviors on Canvas Initialization hook
 */
Hooks.on("canvasInit", () => {

  // Apply the current setting
  canvas.grid.diagonalRule = game.settings.get("dnd5e", "diagonalMovement");

  /**
   * Override default Grid measurement
   */
  SquareGrid.prototype.measureDistance = function(p0, p1) {
    let gs = canvas.dimensions.size,
        ray = new Ray(p0, p1),
        nx = Math.abs(Math.ceil(ray.dx / gs)),
        ny = Math.abs(Math.ceil(ray.dy / gs));

    // Get the number of straight and diagonal moves
    let nDiagonal = Math.min(nx, ny),
        nStraight = Math.abs(ny - nx);

    // Alternative DMG Movement
    if ( this.diagonalRule === "5105" ) {
      let nd10 = Math.floor(nDiagonal / 2);
      let spaces = (nd10 * 2) + (nDiagonal - nd10) + nStraight;
      return spaces * canvas.dimensions.distance;
    }

    // Standard PHB Movement
    else return (nStraight + nDiagonal) * canvas.scene.data.gridDistance;
  }
});

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
    const xps = [10, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 7200, 8400, 10000, 11500, 13000,
                 15000, 18000, 20000, 22000, 25000, 30000, 41000, 50000, 62000, 75000, 90000, _, _, _, 155000];
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
      alias: this.name
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
      alias: this.name
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
        flavor = `${abl.label} Saving Throw`;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: options.event,
      parts: parts,
      data: {mod: abl.save},
      title: flavor,
      alias: this.name
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
      alias: this.name,
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
  shortRest() {
    const data = this.data.data,
          update = {};

    // Recover resources
    for ( let r of ["primary", "secondary"] ) {
      let res = data.resources[r];
      if ( res.max && res.sr ) {
        update[`data.resources.${r}.value`] = res.max;
      }
    }

    // Update the actor
    this.update(update);
  }

  /* -------------------------------------------- */

  /**
   * Take a long rest, recovering HP, HD, resources, and spell slots
   */
  longRest() {
    const data = this.data.data,
          update = {};

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

    // Recover spell slots
    for ( let [k, v] of Object.entries(data.spells) ) {
      if ( !v.max ) continue;
      update[`data.spells.${k}.value`] = v.max;
    }

    // Update the actor
    this.update(update);

    // Return some update data for logging
    return {
      dhp: dhp,
      dhd: dhd
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply rolled dice damage to the token or tokens which are currently controlled.
   * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
   *
   * @param {HTMLElement} roll    The chat entry which contains the roll data
   * @param {Number} multiplier   A damage multiplier to apply to the rolled damage.
   */
  static applyDamage(roll, multiplier) {
    let value = Math.floor(parseFloat(roll.find('.dice-total').text()) * multiplier);

    // Filter tokens to which damage can be applied
    canvas.tokens.controlledTokens.filter(t => {
      if ( t.actor && t.data.actorLink ) return true;
      else if ( t.data.bar1.attribute === "attributes.hp" || t.data.bar2.attribute === "attributes.hp" ) return true;
      return false;
    }).forEach(t => {

      // For linked Tokens, update the Actor first deducting from the temporary hit point pool
      if ( t.actor && t.data.actorLink ) {
        let hp = t.actor.data.data.attributes.hp,
            tmp = parseInt(hp["temp"]),
            dt = Math.min(tmp, value);
        t.actor.update({
          "data.attributes.hp.temp": tmp - dt,
          "data.attributes.hp.value": Math.clamped(hp.value - (value - dt), 0, hp.max)
        });
      }

      // For unlinked Tokens, just update the resource bar directly
      else {
        let bar = (t.data.bar1.attribute === "attributes.hp") ? "bar1" : "bar2";
        t.update(canvas.id, {[`${bar}.value`]: Math.clamped(t.data[bar].value - value, 0, t.data[bar].max)});
      }
    });
  }
}

// Assign the actor class to the CONFIG
CONFIG.Actor.entityClass = Actor5e;


/**
 * Hijack Token health bar rendering to include temporary and temp-max health in the bar display
 * TODO: This should probably be replaced with a formal Token class extension
 * @private
 */
const _drawBar = Token.prototype._drawBar;
Token.prototype._drawBar = function(number, bar, data) {
  if ( data.attribute === "attributes.hp" ) {
    data = duplicate(data);
    data.value += parseInt(data['temp'] || 0);
    data.max += parseInt(data['tempmax'] || 0);
  }
  _drawBar.bind(this)(number, bar, data);
};


/**
 * Extend the basic ActorSheet class to do all the D&D5e things!
 */
class Actor5eSheet extends ActorSheet {
  constructor(...args) {
    super(...args);

    // Add additional class options
    this.options.classes.push(`${this.actorType}-sheet`);
  }

	/* -------------------------------------------- */

  /**
   * Extend and override the default options used by the 5e Actor Sheet
   */
	static get defaultOptions() {
	  const options = super.defaultOptions;
	  options.classes = options.classes.concat(["dnd5e", "actor"]);
    options.width = 650;
    options.height = 720;
    options.showUnpreparedSpells = true;
	  return options;
  }

	/* -------------------------------------------- */

  /**
   * The actor sheet template comes packaged with the system
   */
  get template() {
    const path = "public/systems/dnd5e/templates/actors/";
    if ( this.actor.data.type === "character" ) return path + "actor-sheet.html";
    else if ( this.actor.data.type === "npc" ) return path + "npc-sheet.html";
    else throw "Unrecognized Actor type " + this.actor.data.type;
  }

	/* -------------------------------------------- */

	get actorType() {
	  return this.actor.data.type;
  }

  /* -------------------------------------------- */

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    const sheetData = super.getData();

    // Level and CR
    if ( sheetData.actor.type === "npc" ) {
      let cr = sheetData.data.details.cr;
      let crs = {0: "0", 0.125: "1/8", 0.25: "1/4", 0.5: "1/2"};
      cr.str = (cr.value >= 1) ? String(cr.value) : crs[cr.value] || 0;
    }

    // Ability proficiency
    for ( let abl of Object.values(sheetData.data.abilities)) {
      abl.icon = this._getProficiencyIcon(abl.proficient);
      abl.hover = CONFIG.proficiencyLevels[abl.proficient];
    }

    // Update skill labels
    for ( let skl of Object.values(sheetData.data.skills)) {
      skl.ability = sheetData.data.abilities[skl.ability].label.substring(0, 3);
      skl.icon = this._getProficiencyIcon(skl.value);
      skl.hover = CONFIG.proficiencyLevels[skl.value];
    }

    // Clear some values
    let res = sheetData.data.resources;
    if ( res.primary && res.primary.value === 0 ) delete res.primary.value;
    if ( res.primary && res.primary.max === 0 ) delete res.primary.max;
    if ( res.secondary && res.secondary.value === 0 ) delete res.secondary.value;
    if ( res.secondary && res.secondary.max === 0 ) delete res.secondary.max;
    let hp = sheetData.data.attributes.hp;
    if ( hp.temp === 0 ) delete hp.temp;
    if ( hp.tempmax === 0 ) delete hp.tempmax;

    // Prepare owned items
    if ( this.actorType === "character" ) this._prepareCharacterItems(sheetData.actor);
    else if ( this.actorType === "npc" ) this._prepareNPCItems(sheetData.actor);

    // Return data to the sheet
    return sheetData;
  }

  /* -------------------------------------------- */

  /**
   * Organize and classify Items for Character sheets
   * @private
   */
  _prepareCharacterItems(actorData) {

    // Inventory
    const inventory = {
      weapon: { label: "Weapons", items: [] },
      equipment: { label: "Equipment", items: [] },
      consumable: { label: "Consumables", items: [] },
      tool: { label: "Tools", items: [] },
      backpack: { label: "Backpack", items: [] },
    };

    // Spellbook
    const spellbook = {};

    // Feats
    const feats = [];

    // Classes
    const classes = [];

    // Iterate through items, allocating to containers
    let totalWeight = 0;
    for ( let i of actorData.items ) {
      i.img = i.img || DEFAULT_TOKEN;

      // Inventory
      if ( Object.keys(inventory).includes(i.type) ) {
        i.data.quantity.value = i.data.quantity.value || 1;
        i.data.weight.value = i.data.weight.value || 0;
        i.totalWeight = Math.round(i.data.quantity.value * i.data.weight.value * 10) / 10;
        i.hasCharges = (i.type === "consumable") && i.data.charges.max > 0;
        inventory[i.type].items.push(i);
        totalWeight += i.totalWeight;
      }

      // Spells
      else if ( i.type === "spell" ) this._prepareSpell(actorData, spellbook, i);

      // Classes
      else if ( i.type === "class" ) {
        classes.push(i);
        classes.sort((a, b) => b.levels > a.levels);
      }

      // Feats
      else if ( i.type === "feat" ) feats.push(i);
    }

    // Assign and return
    actorData.inventory = inventory;
    actorData.spellbook = spellbook;
    actorData.feats = feats;
    actorData.classes = classes;

    // Inventory encumbrance
    let enc = {
      max: actorData.data.abilities.str.value * 15,
      value: Math.round(totalWeight * 10) / 10,
    };
    enc.pct = Math.min(enc.value * 100 / enc.max, 99);
    actorData.data.attributes.encumbrance = enc;
  }

  /* -------------------------------------------- */

  /**
   * Organize and classify Items for NPC sheets
   * @private
   */
  _prepareNPCItems(actorData) {

    // Actions
    const features = {
      weapons: {label: "Weapons", items: [], type: "weapon" },
      actions: { label: "Actions", items: [], type: "feat" },
      passive: { label: "Features", items: [], type: "feat" },
      equipment: { label: "Equipment", items: [], type: "equipment" }
    };

    // Spellbook
    const spellbook = {};

    // Iterate through items, allocating to containers
    for ( let i of actorData.items ) {
      i.img = i.img || DEFAULT_TOKEN;

      // Spells
      if ( i.type === "spell" ) this._prepareSpell(actorData, spellbook, i);

      // Features
      else if ( i.type === "weapon" ) features.weapons.items.push(i);
      else if ( i.type === "feat" ) {
        if ( i.data.featType.value === "passive" ) features.passive.items.push(i);
        else features.actions.items.push(i);
      }
      else if (["equipment", "consumable", "tool", "backpack"].includes(i.type)) features.equipment.items.push(i);
    }

    // Assign and return
    actorData.features = features;
    actorData.spellbook = spellbook;
  }

  /* -------------------------------------------- */

  /**
   * Insert a spell into the spellbook object when rendering the character sheet
   * @param {Object} actorData    The Actor data being prepared
   * @param {Object} spellbook    The spellbook data being prepared
   * @param {Object} spell        The spell data being prepared
   * @private
   */
  _prepareSpell(actorData, spellbook, spell) {
    let lvl = spell.data.level.value || 0,
        isNPC = this.actorType === "npc";

    // Determine whether to show the spell
    let showSpell = this.options.showUnpreparedSpells || isNPC || spell.data.prepared.value || (lvl === 0);
    if ( !showSpell ) return;

    // Extend the Spellbook level
    spellbook[lvl] = spellbook[lvl] || {
      isCantrip: lvl === 0,
      label: CONFIG.spellLevels[lvl],
      spells: [],
      uses: actorData.data.spells["spell"+lvl].value || 0,
      slots: actorData.data.spells["spell"+lvl].max || 0
    };

    // Add the spell to the spellbook at the appropriate level
    spell.data.school.str = CONFIG.spellSchools[spell.data.school.value];
    spellbook[lvl].spells.push(spell);
  }

  /* -------------------------------------------- */

  _cycleSkillProficiency(level) {
    const levels = [0, 1, 0.5, 2];
    let idx = levels.indexOf(level);
    return levels[(idx === levels.length - 1) ? 0 : idx + 1]
  }

  /* -------------------------------------------- */

  /**
   * Get the font-awesome icon used to display a certain level of skill proficiency
   * @private
   */
  _getProficiencyIcon(level) {
    const icons = {
      0: '<i class="far fa-circle"></i>',
      0.5: '<i class="fas fa-adjust"></i>',
      1: '<i class="fas fa-check"></i>',
      2: '<i class="fas fa-check-double"></i>'
    };
    return icons[level];
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers
  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html);

    // Pad field width
    html.find('[data-wpad]').each((i, e) => {
      let text = e.tagName === "INPUT" ? e.value : e.innerText,
        w = text.length * parseInt(e.getAttribute("data-wpad")) / 2;
      e.setAttribute("style", "flex: 0 0 " + w + "px");
    });

    // Activate tabs
    html.find('.tabs').each((_, el) => {
      let tabs = $(el),
        group = el.getAttribute("data-group"),
        initial = this.actor.data.flags[`_sheetTab-${group}`];
      new Tabs(tabs, {
        initial: initial,
        callback: clicked => this.actor.data.flags[`_sheetTab-${group}`] = clicked.attr("data-tab")
      });
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    /* -------------------------------------------- */
    /*  Abilities and Skills
     /* -------------------------------------------- */

    // Ability Proficiency
    html.find('.ability-proficiency').click(ev => {
      let field = $(ev.currentTarget).siblings('input[type="hidden"]');
      this.actor.update({[field[0].name]: 1 - parseInt(field[0].value)});
    });

    // Ability Checks
    html.find('.ability-name').click(event => {
      event.preventDefault();
      let ability = event.currentTarget.parentElement.getAttribute("data-ability");
      this.actor.rollAbility(ability, {event: event});
    });

    // Toggle Skill Proficiency
    html.find('.skill-proficiency').click(ev => {
      let field = $(ev.currentTarget).siblings('input[type="hidden"]');
      field.val(this._cycleSkillProficiency(parseFloat(field.val())));
      let formData = validateForm(field.parents('form')[0]);
      this.actor.update(formData, true);
    });

    // Roll Skill Checks
    html.find('.skill-name').click(ev => {
      let skl = ev.currentTarget.parentElement.getAttribute("data-skill");
      this.actor.rollSkill(ev, skl);
    });

    /* -------------------------------------------- */
    /*  Rollable Items                              */
    /* -------------------------------------------- */

    html.find('.item .rollable').click(event => this._onRollItemCard(event));

    /* -------------------------------------------- */
    /*  Inventory
    /* -------------------------------------------- */

    // Create New Item
    html.find('.item-create').click(ev => this._onItemCreate(ev));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      let itemId = Number($(ev.currentTarget).parents(".item").attr("data-item-id"));
      let Item = CONFIG.Item.entityClass;
      const item = new Item(this.actor.items.find(i => i.id === itemId), this.actor);
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      let li = $(ev.currentTarget).parents(".item"),
        itemId = Number(li.attr("data-item-id"));
      this.actor.deleteOwnedItem(itemId, true);
      li.slideUp(200, () => this.render(false));
    });

    // Toggle Spell prepared value
    html.find('.item-prepare').click(ev => {
      let itemId = Number($(ev.currentTarget).parents(".item").attr("data-item-id")),
          item = this.actor.items.find(i => { return i.id === itemId });
      item.data['prepared'].value = !item.data['prepared'].value;
      this.actor.updateOwnedItem(item, true);
    });

    // Re-render the sheet when toggling visibility of spells
    html.find('.prepared-toggle').click(ev => {
      this.options.showUnpreparedSpells = !this.options.showUnpreparedSpells;
      this.render()
    });

    /* -------------------------------------------- */
    /*  Miscellaneous
    /* -------------------------------------------- */

    /* Short Rest */
    html.find('.short-rest').click(ev => this._onShortRest(ev));

    // Long Rest
    html.find('.long-rest').click(ev => this._onLongRest(ev));

    /* Roll NPC HP */
    html.find('.npc-roll-hp').click(ev => {
      let ad = this.actor.data.data;
      let hp = new Roll(ad.attributes.hp.formula).roll().total;
      AudioHelper.play({src: CONFIG.sounds.dice});
      this.actor.update({"data.attributes.hp.value": hp, "data.attributes.hp.max": hp}, true);
    });

    /* Item Dragging */
    let handler = ev => this._onDragItemStart(ev);
    html.find('.item').each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
    });
  }

  /* -------------------------------------------- */
  /*  Saving and Submission                       */
  /* -------------------------------------------- */

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  _updateObject(event, formData) {

    // Format NPC Challenge Rating
    if (this.actor.data.type === "npc") {
      let cr = this.form["data.details.cr.value"],
         crs = {"1/8": 0.125, "1/4": 0.25, "1/2": 0.5};
      formData["data.details.cr.value"] = crs[cr.value] || parseInt(cr.value);
    }

    // Parent ActorSheet update steps
    super._updateObject(event, formData);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  _onDragItemStart(event) {
    let itemId = Number(event.currentTarget.getAttribute("data-item-id"));
	  event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      actorId: this.actor._id,
      id: itemId
    }));
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
   * @private
   */
  _onRollItemCard(event) {
    event.preventDefault();
    let itemId = Number($(event.currentTarget).parents(".item").attr("data-item-id")),
        Item = CONFIG.Item.entityClass,
        item = new Item(this.actor.items.find(i => i.id === itemId), this.actor);
    item.roll();
  }

  /* -------------------------------------------- */

  /**
   * Take a short rest, calling the relevant function on the Actor instance
   * @private
   */
  _onShortRest(event) {
    event.preventDefault();
    let hd0 = this.actor.data.data.attributes.hd.value,
        hp0 = this.actor.data.data.attributes.hp.value;
    renderTemplate("public/systems/dnd5e/templates/chat/short-rest.html").then(html => {
      new ShortRestDialog(this.actor, {
        title: "Short Rest",
        content: html,
        buttons: {
          rest: {
            icon: '<i class="fas fa-bed"></i>',
            label: "Rest",
            callback: dlg => {
              this.actor.shortRest();
              let dhd = hd0 - this.actor.data.data.attributes.hd.value,
                  dhp = this.actor.data.data.attributes.hp.value - hp0;
              let msg = `${this.actor.name} takes a short rest spending ${dhd} Hit Dice to recover ${dhp} Hit Points.`;
              ChatMessage.create({
                user: game.user._id,
                alias: this.actor.name,
                content: msg
              });
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
          },
        },
        default: 'rest'
      }).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Take a long rest, calling the relevant function on the Actor instance
   * @private
   */
  _onLongRest(event) {
    event.preventDefault();
    new Dialog({
      title: "Long Rest",
      content: '<p>Take a long rest?</p><p>On a long rest you will recover hit points, half your maximum hit dice, ' +
        'primary or secondary resources, and spell slots per day.</p>',
      buttons: {
        rest: {
          icon: '<i class="fas fa-bed"></i>',
          label: "Rest",
          callback: dlg => {
            let update = this.actor.longRest();
            let msg = `${this.actor.name} takes a long rest and recovers ${update.dhp} Hit Points and ${update.dhd} Hit Dice.`;
            ChatMessage.create({
              user: game.user._id,
              alias: this.actor.name,
              content: msg
            });
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        },
      },
      default: 'rest'
    }).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    let header = event.currentTarget,
        data = duplicate(header.dataset);
    data["name"] = `New ${data.type.capitalize()}`;
    this.actor.createOwnedItem(data, true, {renderSheet: true});
  }
}


/* -------------------------------------------- */


/**
 * A helper Dialog subclass for rolling Hit Dice on short rest
 * @type {Dialog}
 */
class ShortRestDialog extends Dialog {
  constructor(actor, dialogData, options) {
    super(dialogData, options);
    this.actor = actor;
  }

  activateListeners(html) {
    super.activateListeners(html);
    let btn = html.find("#roll-hd");
    if ( this.actor.data.data.attributes.hd.value === 0 ) btn[0].disabled = true;
    btn.click(ev => {
      event.preventDefault();
      let fml = ev.target.form.hd.value;
      this.actor.rollHitDie(fml).then(roll => {
        if ( this.actor.data.data.attributes.hd.value === 0 ) btn[0].disabled = true;
      });
    })
  }
}


/* -------------------------------------------- */


CONFIG.Actor.sheetClass = Actor5eSheet;


/**
 * Skill Proficiency Levels
 */
CONFIG.proficiencyLevels = {
  0: "Not Proficient",
  1: "Proficient",
  0.5: "Jack of all Trades",
  2: "Expertise"
};


/* -------------------------------------------- */

/**
 * Override and extend the basic :class:`Item` implementation
 */
class Item5e extends Item {

  /**
   * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
   * @return {Promise}
   */
  async roll() {

    // Basic template rendering data
    const template = `public/systems/dnd5e/templates/chat/${this.data.type}-card.html`;
    const templateData = {
      actor: this.actor,
      item: this.data,
      data: this[this.data.type+"ChatData"]()
    };

    // Basic chat message data
    const chatData = {
      user: game.user._id,
      alias: this.actor.name,
    };

    // Toggle default roll mode
    let rollMode = game.settings.get("core", "rollMode");
    if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperIDs("GM");
    if ( rollMode === "blindroll" ) chatData["blind"] = true;

    // Render the template
    chatData["content"] = await renderTemplate(template, templateData);

    // Create the chat message
    return ChatMessage.create(chatData, {displaySheet: false});
  }

  /* -------------------------------------------- */

  equipmentChatData() {
    const data = duplicate(this.data.data);
    const properties = [
      CONFIG.armorTypes[data.armorType.value],
      data.armor.value + " AC",
      data.equipped.value ? "Equipped" : null,
      data.stealth.value ? "Stealth Disadv." : null,
    ];
    data.properties = properties.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  weaponChatData() {
    return this.data.data;
  }

  /* -------------------------------------------- */

  consumableChatData() {
    const data = duplicate(this.data.data);
    data.consumableType.str = CONFIG.consumableTypes[data.consumableType.value];
    data.properties = [data.consumableType.str, data.charges.value + "/" + data.charges.max + " Charges"];
    data.hasCharges = data.charges.value >= 0;
    return data;
  }

  /* -------------------------------------------- */

  toolChatData() {
    const data = duplicate(this.data.data);
    let abl = this.actor.data.data.abilities[data.ability.value].label,
        prof = data.proficient.value || 0;
    const properties = [abl, CONFIG.proficiencyLevels[prof]];
    data.properties = properties.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  backpackChatData() {
    return duplicate(this.data.data);
  }

  /* -------------------------------------------- */

  spellChatData() {
    const data = duplicate(this.data.data),
          ad = this.actor.data.data;

    // Spell saving throw text and DC
    data.isSave = data.spellType.value === "save";
    if ( data.ability.value ) data.save.dc = 8 + ad.abilities[data.ability.value].mod + ad.attributes.prof.value;
    else data.save.dc = ad.attributes.spelldc.value;
    data.save.str = data.save.value ? this.actor.data.data.abilities[data.save.value].label : "";

    // Spell attack labels
    data.damageLabel = data.spellType.value === "heal" ? "Healing" : "Damage";
    data.isAttack = data.spellType.value === "attack";

    // Combine properties
    const props = [
      CONFIG.spellSchools[data.school.value],
      CONFIG.spellLevels[data.level.value],
      data.components.value + " Components",
      data.target.value,
      data.time.value,
      data.duration.value,
      data.concentration.value ? "Concentration" : null,
      data.ritual.value ? "Ritual" : null
    ];
    data.properties = props.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare chat card data for items of the "Feat" type
   */
  featChatData() {
    const data = duplicate(this.data.data),
          ad = this.actor.data.data;

    // Feat button actions
    data.isSave = data.save.value !== "";
    if ( data.isSave ) {
      let abl = data.ability.value || ad.attributes.spellcasting.value || "str";
      data.save.dc = 8 + ad.abilities[abl].mod + ad.attributes.prof.value;
      data.save.str = data.save.value ? this.actor.data.data.abilities[data.save.value].label : "";
    }

    // Feat attack attributes
    data.isAttack = data.featType.value === "attack";

    // Feat properties
    const props = [
      data.requirements.value,
      data.target.value,
      data.range.value,
      data.time.value,
      data.duration.value
    ];
    data.properties = props.filter(p => p);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Roll a Weapon Attack
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollWeaponAttack(event) {
    if ( this.type !== "weapon" ) throw "Wrong item type!";

    // Prepare roll data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = ["@item.bonus.value", `@abilities.${abl}.mod`, "@attributes.prof.value"],
        title = `${this.name} - Attack Roll`;
    rollData.item = itemData;
    if ( !itemData.proficient.value ) parts.pop();

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      alias: this.actor.name,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Weapon Damage
   * Rely upon the Dice5e.damageRoll logic for the core implementation
   */
  rollWeaponDamage(event, alternate=false) {
    if ( this.type !== "weapon" ) throw "Wrong item type!";

    // Get data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = [alternate ? itemData.damage2.value : itemData.damage.value, `@abilities.${abl}.mod`],
        dtype = CONFIG.damageTypes[alternate ? itemData.damage2Type.value : itemData.damageType.value];

    // Append damage type to title
    let title = `${this.name} - Damage`;
    if ( dtype ) title += ` (${dtype})`;

    // Call the roll helper utility
    rollData.item = itemData;
    Dice5e.damageRoll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      alias: this.actor.name,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Spell Damage
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollSpellAttack(event) {
    if ( this.type !== "spell" ) throw "Wrong item type!";

    // Prepare roll data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || rollData.attributes.spellcasting.value || "int",
        parts = [`@abilities.${abl}.mod`, "@attributes.prof.value"],
        title = `${this.name} - Spell Attack Roll`;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      alias: this.actor.name,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Spell Damage
   * Rely upon the Dice5e.damageRoll logic for the core implementation
   */
  rollSpellDamage(event) {
    if ( this.type !== "spell" ) throw "Wrong item type!";

    // Get data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || rollData.attributes.spellcasting.value || "int",
        parts = [itemData.damage.value],
        isHeal = itemData.spellType.value === "heal",
        dtype = CONFIG.damageTypes[itemData.damageType.value];

    // Append damage type to title
    let title = this.name + (isHeal ? " - Healing" : " - Damage");
    if ( dtype && !isHeal ) title += ` (${dtype})`;

    // Add item to roll data
    rollData["mod"] = rollData.abilities[abl].mod;
    rollData.item = itemData;

    // Call the roll helper utility
    Dice5e.damageRoll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      alias: this.actor.name,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Use a consumable item
   */
  rollConsumable(ev) {
    let itemData = this.data.data;

    // Submit the roll to chat
    let cv = itemData['consume'].value,
        content = `Uses ${this.name}`;
    if ( cv ) {
      new Roll(cv).toMessage({
        alias: this.actor.name,
        flavor: content
      });
    } else {
      ChatMessage.create({user: game.user._id, alias: this.actor.name, content: content})
    }

    // Deduct consumed charges from the item
    if ( itemData['autoUse'].value ) {
      let qty = itemData['quantity'],
          chg = itemData['charges'];

      // Deduct an item quantity
      if ( chg.value <= 1 && qty.value > 1 ) {
        this.actor.updateOwnedItem({
          id: this.data.id,
          'data.quantity.value': Math.max(qty.value - 1, 0),
          'data.charges.value': chg.max
        }, true);
      }

      // Optionally destroy the item
      else if ( chg.value <= 1 && qty.value <= 1 && itemData['autoDestroy'].value ) {
        this.actor.deleteOwnedItem(this.data.id);
      }

      // Deduct the remaining charges
      else {
        this.actor.updateOwnedItem({id: this.data.id, 'data.charges.value': Math.max(chg.value - 1, 0)}, true);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Roll a Tool Check
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollToolCheck(event) {
    if ( this.type !== "tool" ) throw "Wrong item type!";

    // Prepare roll data
    let rollData = duplicate(this.actor.data.data),
      abl = this.data.data.ability.value || "int",
      ability = rollData.abilities[abl],
      parts = [`@abilities.${abl}.mod`, "@proficiency"],
      title = `${this.name} - Tool Check`;
    rollData["ability"] = abl;
    rollData["proficiency"] = (this.data.data.proficient.value || 0) * rollData.attributes.prof.value;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: rollData,
      template: "public/systems/dnd5e/templates/chat/tool-roll-dialog.html",
      title: title,
      alias: this.actor.name,
      flavor: (parts, data) => `${this.name} - ${data.abilities[data.ability].label} Check`,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710,
      },
      onClose: (html, parts, data) => {
        abl = html.find('[name="ability"]').val();
        data.ability = abl;
        parts[1] = `@abilities.${abl}.mod`;
      }
    }).then(roll => {
      roll.toMessage({
        alias: alias,
        flavor: flavor,
        highlightSuccess: roll.parts[0].total === 20,
        highlightFailure: roll.parts[0].total === 1
      });
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll a Feat Attack
   * Rely upon the Dice5e.d20Roll logic for the core implementation
   */
  rollFeatAttack(event) {
    if ( this.type !== "feat" ) throw "Wrong item type!";

    // Prepare roll data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = [`@abilities.${abl}.mod`, "@attributes.prof.value"],
        title = `${this.name} - Attack Roll`;
    rollData.item = itemData;

    // Call the roll helper utility
    Dice5e.d20Roll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      alias: this.actor.name,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Feat Damage
   * Rely upon the Dice5e.damageRoll logic for the core implementation
   */
  rollFeatDamage(event) {
    if ( this.type !== "feat" ) throw "Wrong item type!";

    // Get data
    let itemData = this.data.data,
        rollData = duplicate(this.actor.data.data),
        abl = itemData.ability.value || "str",
        parts = [itemData.damage.value],
        dtype = CONFIG.damageTypes[itemData.damageType.value];

    // Append damage type to title
    let title = `${this.name} - Damage`;
    if ( dtype ) title += ` (${dtype})`;

    // Add item data to roll
    rollData["mod"] = rollData.abilities[abl].mod;
    rollData.item = itemData;

    // Call the roll helper utility
    Dice5e.damageRoll({
      event: event,
      parts: parts,
      data: rollData,
      title: title,
      alias: this.actor.name,
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /* -------------------------------------------- */

  static chatListeners(html) {

    // Chat card actions
    html.on('click', '.card-buttons button', ev => {
      ev.preventDefault();

      // Extract card data
      let button = $(ev.currentTarget),
          messageId = button.parents('.message').attr("data-message-id"),
          senderId = game.messages.get(messageId).user._id;

      // Confirm roll permission
      if ( !game.user.isGM && ( game.user._id !== senderId )) return;

      // Extract action data
      let action = button.attr("data-action"),
          card = button.parents('.chat-card'),
          actor = game.actors.get(card.attr('data-actor-id')),
          itemId = Number(card.attr("data-item-id"));

      // Get the item
      if ( !actor ) return;
      let itemData = actor.items.find(i => i.id === itemId);
      if ( !itemData ) return;
      let item = new Item5e(itemData, actor);

      // Weapon attack
      if ( action === "weaponAttack" ) item.rollWeaponAttack(ev);
      else if ( action === "weaponDamage" ) item.rollWeaponDamage(ev);
      else if ( action === "weaponDamage2" ) item.rollWeaponDamage(ev, true);

      // Spell actions
      else if ( action === "spellAttack" ) item.rollSpellAttack(ev);
      else if ( action === "spellDamage" ) item.rollSpellDamage(ev);

      // Feat actions
      else if ( action === "featAttack" ) item.rollFeatAttack(ev);
      else if ( action === "featDamage" ) item.rollFeatDamage(ev);

      // Consumable usage
      else if ( action === "consume" ) item.rollConsumable(ev);

      // Tool usage
      else if ( action === "toolCheck" ) item.rollToolCheck(ev);
    });
  }
}

// Assign Item5e class to CONFIG
CONFIG.Item.entityClass = Item5e;


/**
 * Hook into chat log context menu to add damage application options
 */
Hooks.on("getChatLogEntryContext", (html, options) => {

  // Condition
  let canApply = li => canvas.tokens.controlledTokens.length && li.find(".dice-roll").length;

  // Apply Damage to Token
  options["Apply Damage"] = {
    icon: '<i class="fas fa-user-minus"></i>',
    condition: canApply,
    callback: li => Actor5e.applyDamage(li, 1)
  };

  // Apply Healing to Token
  options["Apply Healing"] = {
    icon: '<i class="fas fa-user-plus"></i>',
    condition: canApply,
    callback: li => Actor5e.applyDamage(li, -1)
  };

  // Apply Double-Damage
  options["Double Damage"] = {
    icon: '<i class="fas fa-user-injured"></i>',
    condition: canApply,
    callback: li => Actor5e.applyDamage(li, 2)
  };

  // Apply Half-Damage
  options["Half Damage"] = {
    icon: '<i class="fas fa-user-shield"></i>',
    condition: canApply,
    callback: li => Actor5e.applyDamage(li, 0.5)
  }
});

/**
 * Override and extend the basic :class:`ItemSheet` implementation
 */
class Item5eSheet extends ItemSheet {
  constructor(item, options) {
    super(item, options);
    this.mce = null;
  }

  /* -------------------------------------------- */

  /**
   * Use a type-specific template for each different item type
   */
  get template() {
    let type = this.item.type;
    return `public/systems/dnd5e/templates/items/item-${type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /**
   * Prepare item sheet data
   * Start with the base item data and extending with additional properties for rendering.
   */
  getData() {
    const data = super.getData();
    data['abilities'] = game.system.template.actor.data.abilities;
    data['damageTypes'] = CONFIG.damageTypes;
    let types = (this.item.type === "equipment") ? "armorTypes" : this.item.type + "Types";
    data[types] = CONFIG[types];

    // Spell-specific data
    if ( this.item.type === "spell" ) {
      data["spellSchools"] = CONFIG.spellSchools;
      data["spellLevels"] = CONFIG.spellLevels;
    }

    // Tool-specific data
    else if ( this.item.type === "tool" ) {
      data["proficiencies"] = CONFIG.proficiencyLevels;
    }
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for interactive item sheet events
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    new Tabs(html.find(".tabs"));
  }
}

// Activate global listeners
Hooks.on('renderChatLog', (log, html, data) => Item5e.chatListeners(html));

// Override CONFIG
CONFIG.Item.sheetClass = Item5eSheet;

// Standard D&D Damage Types
CONFIG.damageTypes = {
  "acid": "Acid",
  "bludgeoning": "Bludgeoning",
  "cold": "Cold",
  "fire": "Fire",
  "force": "Force",
  "lightning": "Lightning",
  "necrotic": "Necrotic",
  "piercing": "Piercing",
  "poison": "Poison",
  "psychic": "Psychic",
  "radiant": "Radiant",
  "slashing": "Slashing",
  "thunder": "Thunder",
  "healing": "Healing"
};

// Weapon Types
CONFIG.weaponTypes = {
  "simpleM": "Simple Melee",
  "simpleR": "Simple Ranged",
  "martialM": "Martial Melee",
  "martialR": "Martial Ranged",
  "natural": "Natural",
  "improv": "Improvised",
  "ammo": "Ammunition"
};

// Weapon Properties
CONFIG.weaponProperties = {
  "thr": "Thrown",
  "amm": "Ammunition",
  "fir": "Firearm",
  "rel": "Reload",
  "two": "Two-Handed",
  "fin": "Finesse",
  "lgt": "Light",
  "ver": "Versatile",
  "hvy": "Heavy",
  "rch": "Reach"
};

// Equipment Types
CONFIG.armorTypes = {
  "clothing": "Clothing",
  "light": "Light Armor",
  "medium": "Medium Armor",
  "heavy": "Heavy Armor",
  "bonus": "Magical Bonus",
  "natural": "Natural Armor",
  "shield": "Shield"
};

// Consumable Types
CONFIG.consumableTypes = {
  "potion": "Potion",
  "scroll": "Scroll",
  "wand": "Wand",
  "rod": "Rod",
  "trinket": "Trinket"
};

// Spell Types
CONFIG.spellTypes = {
  "attack": "Spell Attack",
  "save": "Saving Throw",
  "heal": "Healing",
  "utility": "Utility"
};

// Spell Schools
CONFIG.spellSchools = {
  "abj": "Abjuration",
  "con": "Conjuration",
  "div": "Divination",
  "enc": "Enchantment",
  "evo": "Evocation",
  "ill": "Illusion",
  "nec": "Necromancy",
  "trs": "Transmutation",
};

// Spell Levels
CONFIG.spellLevels = {
  0: "Cantrip",
  1: "1st Level",
  2: "2nd Level",
  3: "3rd Level",
  4: "4th Level",
  5: "5th Level",
  6: "6th Level",
  7: "7th Level",
  8: "8th Level",
  9: "9th Level"
};

// Feat Types
CONFIG.featTypes = {
  "passive": "Passive Ability",
  "attack": "Ability Attack",
  "ability": "Generic Action"
};