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
