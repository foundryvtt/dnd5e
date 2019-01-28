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
   * @param {Boolean} highlight     Highlight critical successes and failures
   * @param {Boolean} fastForward   Allow fast-forward advantage selection
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   */
  static d20Roll({event, parts, data, template, title, alias, flavor, advantage=true, situational=true,
                  highlight=true, fastForward=true, onClose, dialogOptions}) {

    // Inner roll function
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
        highlightSuccess: roll.parts[0].total === 20,
        highlightFailure: roll.parts[0].total === 1
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
    renderTemplate(template, {formula: parts.join(" + "), data: data}).then(dlg => {
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
   * @param {Boolean} situational   Allow for an arbitrary situational bonus field
   * @param {Boolean} fastForward   Allow fast-forward advantage selection
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   */
  static damageRoll({event, parts, data, template, title, alias, flavor, critical=true, situational=true,
                     fastForward=true, onClose, dialogOptions}) {

    // Inner roll function
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
        flavor: flav
      });
    };

    // Modify the roll and handle fast-forwarding
    let crit = 0;
    if ( event.shiftKey || event.ctrlKey || event.metaKey )  return roll();
    else if ( event.altKey ) {
      crit = 1;
      return roll();
    }
    else parts = parts.concat(["@bonus"]);

    // Render modal dialog
    template = template || "public/systems/dnd5e/templates/chat/roll-dialog.html";
    renderTemplate(template, {formula: parts.join(" + "), data: data}).then(dlg => {
      new Dialog({
          title: title,
          content: dlg,
          buttons: {
            critical: {
              label: "Critical Hit",
              callback: () => crit = 1
            },
            normal: {
              label: "Normal",
            },
          },
          default: "normal",
          close: html => {
            if ( onClose ) onClose(html, parts, data);
            data['bonus'] = html.find('[name="bonus"]').val();
            roll()
          }
        }, dialogOptions).render(true);
    });
  }
}
/**
 * Activate certain behaviors on FVTT ready hook
 */
Hooks.on("ready", () => {

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
  if ( canvas.ready ) canvas.grid.diagonalRule = game.settings.get("dnd5e", "diagonalMovement");

  /**
   * Override default Grid measurement
   */
  GridLayer.prototype.measureDistance = function(p0, p1) {
    let gs = this.dimensions.size,
        ray = new Ray(p0, p1),
        nx = Math.abs(Math.ceil(ray.dx / gs)),
        ny = Math.abs(Math.ceil(ray.dy / gs));

    // Get the number of straight and diagonal moves
    let nDiagonal = Math.min(nx, ny),
        nStraight = Math.abs(ny - nx);

    // Alternative DMG Movement
    if ( this.diagonalRule === "5105" ) {
      let nd10 = Math.floor((nDiagonal + 1) / 3);
      return ((nd10 * 2) + nDiagonal - nd10 + nStraight) * canvas.dimensions.distance;
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
    const xps = [10, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 18000, 20000, 22000,
        25000, 27500, 30000, 32500, 36500, _, _, _, _, _, 155000];
    return xps[cr];
  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */

  get _skillSaveRollModalHTML() {
    return `
    <form>
        <div class="form-group">
            <label>Formula</label>
            <input type="text" name="formula" value="1d20 + @mod + @bonus" disabled/>
        </div>
        <div class="form-group">
            <label>Situational Bonus?</label>
            <input type="text" name="bonus" value="" placeholder="e.g. +1d4"/>
        </div>
    </form>
    `;
  }

  /* -------------------------------------------- */

  /**
   * Roll a Skill Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollSkill(skillName) {
    let skl = this.data.data.skills[skillName],
      abl = this.data.data.abilities[skl.ability],
      parts = ["1d20", "@mod", "@bonus"],
      flavor = `${skl.label} Skill Check`;

    // Create a dialog
    new Dialog({
      title: `${skl.label} (${abl.label}) Skill Check`,
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
            roll = new Roll(parts.join(" + "), {mod: skl.mod, bonus: bonus}).roll();
        roll.toMessage({
          alias: this.name,
          flavor: flavor,
          highlightSuccess: roll.parts[0].total === 20,
          highlightFailure: roll.parts[0].total === 1
        });
      }
    }).render(true);
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
        parts = ["1d20", "@mod", "@bonus"],
        flavor = `${abl.label} Ability Test`;

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
            roll = new Roll(parts.join(" + "), {mod: abl.mod, bonus: bonus}).roll();
        roll.toMessage({
          alias: this.name,
          flavor: flavor,
          highlightSuccess: roll.parts[0].total === 20,
          highlightFailure: roll.parts[0].total === 1
        });
      }
    }).render(true);
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

/**
 * Extend the basic ActorSheet class to do all the D&D5e things!
 */
class Actor5eSheet extends ActorSheet {

  /**
   * Extend and override the default options used by the 5e Actor Sheet
   */
	static get defaultOptions() {
	  const options = super.defaultOptions;
	  options.classes = options.classes.concat(["dnd5e", "actor-sheet"]);
    options.width = 650;
    options.height = 720;
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
      else if ( i.type === "spell" ) {
        let lvl = i.data.level.value || 0;
        spellbook[lvl] = spellbook[lvl] || {
          isCantrip: lvl === 0,
          label: CONFIG.spellLevels[lvl],
          spells: [],
          uses: actorData.data.spells["spell"+lvl].value || 0,
          slots: actorData.data.spells["spell"+lvl].max || 0
        };
        i.data.school.str = CONFIG.spellSchools[i.data.school.value];
        spellbook[lvl].spells.push(i);
      }

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
      equipment: { label: "Equipment", items: [], type: "armor" }
    };

    // Spellbook
    const spellbook = {};

    // Iterate through items, allocating to containers
    for ( let i of actorData.items ) {
      i.img = i.img || DEFAULT_TOKEN;

      // Spells
      if ( i.type === "spell" ) {
        let lvl = i.data.level.value || 0;
        spellbook[lvl] = spellbook[lvl] || {
          isCantrip: lvl === 0,
          label: CONFIG.spellLevels[lvl],
          spells: [],
          uses: actorData.data.spells["spell"+lvl].value || 0,
          slots: actorData.data.spells["spell"+lvl].max || 0
        };
        i.data.school.str = CONFIG.spellSchools[i.data.school.value];
        spellbook[lvl].spells.push(i);
      }

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
    html.find('.ability-name').click(ev => {
      let abl = ev.currentTarget.parentElement.getAttribute("data-ability");
      this.actor.rollAbility(abl);
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
      this.actor.rollSkill(skl);
    });

    /* -------------------------------------------- */
    /*  Rollable Items                              */
    /* -------------------------------------------- */

    html.find('.item .rollable').click(ev => {
      let itemId = Number($(ev.currentTarget).parents(".item").attr("data-item-id")),
        Item = CONFIG.Item.entityClass,
        item = new Item(this.actor.items.find(i => i.id === itemId), this.actor);
      item.roll();
    });

    /* -------------------------------------------- */
    /*  Inventory
    /* -------------------------------------------- */

    // Create New Item
    html.find('.item-create').click(ev => {
      let type = ev.currentTarget.getAttribute("data-item-type");
      this.actor.createOwnedItem({name: "New " + type.capitalize(), type: type}, true, {renderSheet: true});
    });

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

    /* -------------------------------------------- */
    /*  Miscellaneous
    /* -------------------------------------------- */

    /* Short Rest */
    html.find('.short-rest').click(ev => {
      ev.preventDefault();
      ui.notifications.info("Short Rest functionality not yet implemented, just testing the button!");
    });

    /* Short Rest */
    html.find('.long-rest').click(ev => {
      ev.preventDefault();
      ui.notifications.info("Long Rest functionality not yet implemented, just testing the button!");
    });

    /* Roll NPC HP */
    html.find('.npc-roll-hp').click(ev => {
      let ad = this.actor.data.data;
      let hp = new Roll(ad.attributes.hp.formula).roll().total;
      AudioHelper.play({src: CONFIG.sounds.dice, volume: 0.8});
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
      val = cr.value,
      crs = {"1/8": 0.125, "1/4": 0.25, "1/2": 0.5};
      cr.value = crs[val] || val;
    }

    // Parent ActorSheet update steps
    super._updateObject(event, formData);
  }

  /* -------------------------------------------- */
  /*  Drag and Drop                               */
  /* -------------------------------------------- */

  _onDragItemStart(event) {
    let itemId = Number(event.currentTarget.getAttribute("data-item-id"));
	  event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      actorId: this.actor._id,
      id: itemId
    }));
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
  roll() {
    const data = {
      template: `public/systems/dnd5e/templates/chat/${this.data.type}-card.html`,
      actor: this.actor,
      item: this.data,
      data: this[this.data.type+"ChatData"]()
    };
    renderTemplate(data.template, data).then(html => {
      ChatMessage.create({
        user: game.user._id,
        alias: this.actor.name,
        content: html
      }, {displaySheet: false});
    });
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
    let abl = this.actor.data.data.abilities[data.ability.value].label;
    const properties = [abl, data.proficient.value ? "Proficient" : null];
    data.properties = properties.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  backpackChatData() {
    return duplicate(this.data.data);
  }

  /* -------------------------------------------- */

  spellChatData() {
    const data = duplicate(this.data.data);
    data.save.str = data.save.value ? this.actor.data.data.abilities[data.save.value].label : "";
    data.isSave = data.spellType.value === "save";
    data.isAttack = data.spellType.value === "attack";
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
    const data = duplicate(this.data.data);

    // Feat button actions
    data.isSave = data.save.value !== "";
    data.save.str = data.save.value ? this.actor.data.data.abilities[data.save.value].label : "";
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
        title = `${this.name} - Damage Roll`;
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
        abl = itemData.ability.value || "str",
        parts = [itemData.damage.value],
        title = `${this.name} - Damage Roll`;
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

      // No charges are remaining
      if ( itemData['autoDestroy'] && chg.value <= 1 ) {

        // Deduct an item quantity
        if ( qty.value > 1 ) {
          this.actor.updateOwnedItem({
            id: this.data.id,
            'data.quantity.value': qty.value - 1,
            'data.charges.value': chg.max
          }, true);
        }

        // Destroy the item
        else this.actor.deleteOwnedItem(this.data.id);
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
      parts = [`@abilities.${abl}.mod`, "@attributes.prof.value"],
      title = `${this.name} - Tool Check`;
    rollData["ability"] = abl;
    if ( !this.data.data.proficient.value ) parts.pop();

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
        title = `${this.name} - Damage Roll`;
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

    // Dice roll context
    new ContextMenu(html, ".dice-roll", {
      "Apply Damage": {
        icon: '<i class="fas fa-user-minus"></i>',
        callback: li => this.applyDamage(li, 1)
      },
      "Apply Healing": {
        icon: '<i class="fas fa-user-plus"></i>',
        callback: li => this.applyDamage(li, -1)
      },
      "Double Damage": {
        icon: '<i class="fas fa-user-injured"></i>',
        callback: li => this.applyDamage(li, 2)

      },
      "Half Damage": {
        icon: '<i class="fas fa-user-shield"></i>',
        callback: li => this.applyDamage(li, 0.5)
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
   */
  static applyDamage(roll, multiplier) {
    let value = Math.floor(parseFloat(roll.find('.dice-total').text()) * multiplier);

    // Get tokens to which damage can be applied
    const tokens = canvas.tokens.controlledTokens.filter(t => {
      if ( t.actor && t.data.actorLink ) return true;
      else if ( t.data.bar1.attribute === "attributes.hp" || t.data.bar2.attribute === "attributes.hp" ) return true;
      return false;
    });
    if ( tokens.length === 0 ) return;

    // Apply damage to all tokens
    for ( let t of tokens ) {
      if ( t.actor && t.data.actorLink ) {
        let hp = parseInt(t.actor.data.data.attributes.hp.value),
            max = parseInt(t.actor.data.data.attributes.hp.max);
        t.actor.update({"data.attributes.hp.value": Math.clamped(hp - value, 0, max)}, true);
      }
      else {
        let bar = (t.data.bar1.attribute === "attributes.hp") ? "bar1" : "bar2";
        t.update({[`${bar}.value`]: Math.clamped(t.data[bar].value - value, 0, t.data[bar].max)}, true);
      }
    }
  }
}

// Assign Item5e class to CONFIG
CONFIG.Item.entityClass = Item5e;

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