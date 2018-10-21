
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

    // Level, experience, and proficiency
    data.details.level.value = parseInt(data.details.level.value);
    data.details.xp.max = this.getLevelExp(data.details.level.value || 1);
    let prior = this.getLevelExp(data.details.level.value - 1 || 0),
          req = data.details.xp.max - prior;
    data.details.xp.pct = Math.min(Math.round((data.details.xp.value -prior) * 100 / req), 99.5);
    data.attributes.prof.value = Math.floor((data.details.level.value + 7) / 4);

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
    data.attributes.spelldc.value = 8 + data.attributes.prof.value + data.abilities.int.mod;
    return actorData;
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
          flavor: flavor,
          sound: "sounds/dice.wav"
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
          flavor: flavor,
          sound: "sounds/dice.wav"
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
          flavor: flavor,
          sound: "sounds/dice.wav"
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
    return "public/systems/dnd5e/templates/actor-sheet.html";
  }

  /* -------------------------------------------- */

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    let actorData = duplicate(this.actor.data);

    // Flag permissions
    actorData.owner = this.actor.owner;

    // Ability proficiency
    for ( let abl of Object.values(actorData.data.abilities)) {
      abl.icon = this._getProficiencyIcon(abl.proficient);
      abl.hover = this._getProficiencyHover(abl.proficient);
    }

    // Update skill labels
    for ( let skl of Object.values(actorData.data.skills)) {
      skl.ability = actorData.data.abilities[skl.ability].label.substring(0, 3);
      skl.icon = this._getProficiencyIcon(skl.value);
      skl.hover = this._getProficiencyHover(skl.value);
    }

    // Prepare owned items
    actorData = this._prepareItems(actorData);

    // Return data to the sheet
    return actorData;
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
    const spellbook = {}

    // Feats
    const feats = {
      class: { label: "Class", items: [] },
      feats: { label: "Feats", items: [] },
      abilities: { label: "Abilities", items: [] },
    };

    // Classes
    const classes = [];

    // Iterate through items, allocating to containers
    for ( let i of actorData.items ) {
      i.img = i.img || DEFAULT_TOKEN;

      // Inventory
      if ( Object.keys(inventory).includes(i.type) ) {
        i.data.quantity.value = i.data.quantity.value || 1;
        i.data.weight.value = i.data.weight.value || 0;
        i.totalWeight = i.data.quantity.value * i.data.weight.value;
        inventory[i.type].items.push(i);
      }

      // Class
      if ( i.type === "class" ) {
        classes.push(i);
        classes.sort((a, b) => b.levels > a.levels);
      }
    }

    // Assign and return
    actorData.inventory = inventory;
    actorData.spellbook = spellbook;
    actorData.feats = feats;
    actorData.classes = classes;
    return actorData;
  }

  /* -------------------------------------------- */

  _cycleSkillProficiency(level) {
    const levels = [0, 1, 0.5, 2];
    let idx = levels.indexOf(level);
    return levels[(idx === levels.length - 1) ? 0 : idx + 1]
  }

  /* -------------------------------------------- */

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

  _getProficiencyHover(level) {
    return {
      0: "Not Proficient",
      1: "Proficient",
      0.5: "Jack of all Trades",
      2: "Expertise"
    }[level];
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

	  // Profile Image Edit
    html.find('img.sheet-profile').click(ev => {
      new Dialog({
        title: `${this.actor.name} Profile Image`,
        content: `<div class="form-group-stacked">
                    <input type="text" name="img" value="${this.actor.img}" placeholder="Image Path" autocomplete="off"/>
                  </div>`,
        buttons: {
          save: {
            icon: '<i class="fas fa-save"></i>',
            label: "Save",
            callback: html => this.actor.update({img: html.find('input[name="img"]').val()}, true)
          },
        }
      }).render(true);
    });

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
        button.hide();
        ed[0].focus();
      });
    });

	  // Update on remove focus, but only if we have not acquired focus on another element
    html.find("input").focusout(ev => {
      setTimeout(() => {
        if ( $(":focus").length ) return;
        let input = $(ev.currentTarget),
            formData = validateForm(input.parents('form')[0]);
        this.actor.update(formData, true);
      }, 50);
    });

    // Activate tabs
    html.find('.tabs').each((_, el) => {
      let tabs = $(el),
          initial = this.actor.data.flags["_sheetTab-"+tabs.attr("data-tab-container")];
      new Tabs(tabs, initial, clicked => {
        this.actor.data.flags["_sheetTab-"+clicked.parent().attr("data-tab-container")] = clicked.attr("data-tab");
      });
    });


    /* -------------------------------------------- */
    /*  Abilities and Skills
    /* -------------------------------------------- */

    // Ability Proficiency
    html.find('.ability-proficiency').click(ev => {
      let field = $(ev.currentTarget).siblings('input[type="hidden"]');
      field.val(1 - field.val());
      let formData = validateForm(field.parents('form')[0]);
      this.actor.update(formData, true);
    });

    // Ability Checks
    html.find('h3.ability-name').click(ev => {
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
    html.find('h3.skill-name').click(ev => {
      let skl = ev.currentTarget.parentElement.getAttribute("data-skill");
      this.actor.rollSkill(skl);
    });

    /* -------------------------------------------- */
    /*  Inventory
    /* -------------------------------------------- */

    // Create New Item
    html.find('.item-create').click(ev => {
      let type = ev.currentTarget.getAttribute("data-item-type");
      this.actor.createOwnedItem({name: "New " + type.capitalize(), type: type}, true);
    });

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      let itemId = $(ev.currentTarget).parents(".item").attr("data-item-id");
      const item = new Item(this.actor.items.find(i => i.itemId === itemId));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      let li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.attr("data-item-id"), true);
      li.slideUp(200, () => li.remove());
    })
  }
}


/* -------------------------------------------- */


CONFIG.Actor.actorClass = Actor5e;
CONFIG.Actor.sheetClass = Actor5eSheet;
CONFIG.Actor5eSheet = {
  "width": 720,
  "height": 800
};


/* -------------------------------------------- */

