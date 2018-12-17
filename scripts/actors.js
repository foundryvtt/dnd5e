
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
        let bonus = html.find('[name="bonus"]').val();
        new Roll(parts.join(" + "), {mod: skl.mod, bonus: bonus}).toMessage({
          alias: this.name,
          flavor: flavor
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
        let bonus = html.find('[name="bonus"]').val();
        new Roll(parts.join(" + "), {mod: abl.mod, bonus: bonus}).toMessage({
          alias: this.name,
          flavor: flavor
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
        let bonus = html.find('[name="bonus"]').val();
        new Roll(parts.join(" + "), {mod: abl.save, bonus: bonus}).toMessage({
          alias: this.name,
          flavor: flavor
        });
      }
    }).render(true);
  }
}


/* -------------------------------------------- */
/*  Actor Character Sheet                       */
/* -------------------------------------------- */

/**
 * Extend the basic ActorSheet class to do all the D&D5e things!
 */
class Actor5eSheet extends ActorSheet {

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

    // Prepare owned items
    this._prepareItems(sheetData.actor);

    // Return data to the sheet
    return sheetData;
  }

  /* -------------------------------------------- */

  _prepareItems(actorData) {

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
        initial = this.actor.data.flags["_sheetTab-" + tabs.attr("data-tab-container")];
      new Tabs(tabs, initial, clicked => {
        this.actor.data.flags["_sheetTab-" + clicked.parent().attr("data-tab-container")] = clicked.attr("data-tab");
      });
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Activate TinyMCE Editors
    html.find(".editor a.editor-edit").click(ev => {
      let button = $(ev.currentTarget),
        editor = button.siblings(".editor-content");
      let mce = createEditor({
        target: editor[0],
        height: editor.parent().height() - 40,
        save_enablewhendirty: true,
        save_onsavecallback: ed => {
          let target = editor.attr("data-edit");
          this.actor.update({[target]: ed.getContent()}, true);
          ed.remove();
          ed.destroy();
        }
      }).then(ed => {
        this.mce = ed[0];
        button.hide();
        ed[0].focus();
      });
    });

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

    html.find('.npc-roll-hp').click(ev => {
      let ad = this.actor.data.data;
      let hp = new Roll(ad.attributes.hp.formula).roll().total;
      Audio.play({src: CONFIG.sounds.dice, volume: 0.8});
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

  /**
   * Customize form submission for 5e actor sheets to save the content of any active MCE editor
   * @private
   */
  _onSubmit(event) {

    // Save MCE editor content
    if ( this.mce ) {
      const content = this.mce.getContent();
      this.element.find('[data-edit="data.details.biography.value"]').html(content);
    }

    // NPC Challenge Rating
    if (this.actor.data.type === "npc") {
      let form = $(event.currentTarget),
        cr = form.find('.level input'),
        val = cr.val(),
        crs = {"1/8": 0.125, "1/4": 0.25, "1/2": 0.5};
      cr.val(crs[val] || val);
    }

    // Parent submission steps
    super._onSubmit(event);
  }

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


CONFIG.Actor.entityClass = Actor5e;
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
