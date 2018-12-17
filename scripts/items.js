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
      }, true);
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
      data.time.value,
      data.duration.value
    ];
    data.properties = props.filter(p => p);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Roll a Weapon Attack
   * Holding SHIFT when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus
   */
  rollWeaponAttack(ev) {
    if ( this.type !== "weapon" ) throw "Wrong item type!";

    // Prepare roll data
    let rollData = duplicate(this.actor.data.data),
        abl = this.data.data.ability.value || "str",
        parts = ["1d20", "@hit", "@mod", "@prof", "@bonus"],
        adv = 0,
        flavor = `${this.name} - Attack Roll`;
    mergeObject(rollData, {
      hit: this.data.data.bonus.value,
      mod: rollData.abilities[abl].mod,
      prof: rollData.attributes.prof.value,
      bonus: null
    });

    // Define roll function
    let roll = () => {
      if ( adv === 1 ) {
        parts[0] = "2d20kh";
        flavor += " (Advantage)";
      }
      else if ( adv === -1 ) {
        parts[0] = "2d20kl";
        flavor += " (Disadvantage)"
      }
      let formula = parts.join("+");

      // Execute the roll and send it to chat
      let roll = new Roll(formula, rollData).roll();
      roll.toMessage({
        alias: this.actor.name,
        flavor: flavor,
        highlightSuccess: roll.parts[0].total === 20,
        highlightFailure: roll.parts[0].total === 1
      });
    };

    // Fast-forward rolls
    if ( keyboard.isDown(KEYS.SHIFT) ) return roll();
    else if ( keyboard.isDown(KEYS.ALT ) ) {
      adv = 1;
      return roll();
    }
    else if ( keyboard.isDown(KEYS.CTRL ) ) {
      adv = -1;
      return roll();
    }

    // Render modal dialog
    let template = "public/systems/dnd5e/templates/chat/roll-dialog.html";
    renderTemplate(template, {formula: parts.join(" + ")}).then(dlg => {
      new Dialog({
        title: flavor,
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
          rollData['bonus'] = html.find('[name="bonus"]').val();
          roll();
        }
      }, { width: 400, top: ev.clientY - 80, left: window.innerWidth - 710 }).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Weapon Damage
   * Holding SHIFT when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal damage roll with no bonus damage
   */
  rollWeaponDamage(ev, alternate=false) {
    if ( this.type !== "weapon" ) throw "Wrong item type!";

    // Get data
    let rollData = duplicate(this.actor.data.data),
        abl = this.data.data.ability.value || "str",
        parts = [alternate ? this.data.data.damage2.value : this.data.data.damage.value, "@mod", "@bonus"],
        critical = false,
        flavor = `${this.name} - Damage Roll`;
    mergeObject(rollData, { mod: rollData.abilities[abl].mod, bonus: null });

    // Define roll function
    let roll = () => {
      let roll = new Roll(parts.join("+"), rollData);
      if ( critical ) {
        roll.alter(0, 2);
        flavor += " (Critical)";
      }
      roll.toMessage({ alias: this.actor.name, flavor: flavor});
    };

    // Fast-forward rolls
    if ( [KEYS.SHIFT, KEYS.CTRL].some(k => keyboard.isDown(k)) ) return roll();
    else if ( keyboard.isDown(KEYS.ALT ) ) {
      critical = true;
      return roll();
    }

    // Render modal dialog
    let template = "public/systems/dnd5e/templates/chat/roll-dialog.html";
    renderTemplate(template, {formula: parts.join(" + ")}).then(dlg => {
      new Dialog({
        title: flavor,
        content: dlg,
        buttons: {
          advantage: {
            label: "Critical Hit",
            callback: () => critical = true
          },
          normal: {
            label: "Normal",
          },
        },
        default: "normal",
        close: html => {
          rollData['bonus'] = html.find('[name="bonus"]').val();
          roll();
        }
      }, { width: 400, top: ev.clientY - 80, left: window.innerWidth - 710 }).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Spell Damage
   * Holding SHIFT when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal damage roll with no damage
   */
  rollSpellAttack(ev) {
    if ( this.type !== "spell" ) throw "Wrong item type!";

    // Prepare roll data
    let rollData = duplicate(this.actor.data.data),
        abl = this.data.data.ability.value || this.actor.data.data.attributes.spellcasting.value || "int",
        parts = ["1d20", "@mod", "@prof", "@bonus"],
        adv = 0,
        flavor = `${this.name} - Spell Attack Roll`;
    mergeObject(rollData, {
      mod: rollData.abilities[abl].mod,
      prof: rollData.attributes.prof.value,
      bonus: null
    });

    // Define roll function
    let roll = () => {
      if ( adv === 1 ) {
        parts[0] = "2d20kh";
        flavor += " (Advantage)";
      }
      else if ( adv === -1 ) {
        parts[0] = "2d20kl";
        flavor += " (Disadvantage)"
      }
      let formula = parts.join("+");

      // Execute the roll and send it to chat
      let roll = new Roll(formula, rollData).roll();
      roll.toMessage({
        alias: this.actor.name,
        flavor: flavor,
        highlightSuccess: roll.parts[0].total === 20,
        highlightFailure: roll.parts[0].total === 1
      });
    };

    // Fast-forward rolls
    if ( keyboard.isDown(KEYS.SHIFT) ) return roll();
    else if ( keyboard.isDown(KEYS.ALT ) ) {
      adv = 1;
      return roll();
    }
    else if ( keyboard.isDown(KEYS.CTRL ) ) {
      adv = -1;
      return roll();
    }

    // Render modal dialog
    let template = "public/systems/dnd5e/templates/chat/roll-dialog.html";
    renderTemplate(template, {formula: parts.join(" + ")}).then(dlg => {
      new Dialog({
        title: flavor,
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
          rollData['bonus'] = html.find('[name="bonus"]').val();
          roll();
        }
      }, { width: 400, top: ev.clientY - 80, left: window.innerWidth - 710 }).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Spell Damage
   * Holding SHIFT when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal damage roll with no bonus damage
   */
  rollSpellDamage(ev) {
    if ( this.type !== "spell" ) throw "Wrong item type!";

    // Get data
    let rollData = duplicate(this.actor.data.data),
        abl = this.data.data.ability.value || this.actor.data.data.attributes.spellcasting.value || "int",
        parts = [this.data.data.damage.value, "@bonus"],
        critical = false,
        flavor = `${this.name} - Damage Roll`;
    mergeObject(rollData, { mod: rollData.abilities[abl].mod, bonus: null });

    // Define roll function
    let roll = () => {
      let roll = new Roll(parts.join("+"), rollData);
      if ( critical ) {
        roll.alter(0, 2);
        flavor += " (Critical)";
      }
      roll.toMessage({ alias: this.actor.name, flavor: flavor});
    };

    // Fast-forward rolls
    if ( [KEYS.SHIFT, KEYS.CTRL].some(k => keyboard.isDown(k)) ) return roll();
    else if ( keyboard.isDown(KEYS.ALT ) ) {
      critical = true;
      return roll();
    }

    // Render modal dialog
    let template = "public/systems/dnd5e/templates/chat/roll-dialog.html";
    renderTemplate(template, {formula: parts.join(" + ")}).then(dlg => {
      new Dialog({
        title: flavor,
        content: dlg,
        buttons: {
          advantage: {
            label: "Critical Hit",
            callback: () => critical = true
          },
          normal: {
            label: "Normal",
          },
        },
        default: "normal",
        close: html => {
          rollData['bonus'] = html.find('[name="bonus"]').val();
          roll();
        }
      }, { width: 400, top: ev.clientY - 80, left: window.innerWidth - 710 }).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Use a consumable item
   */
  rollConsumable(ev) {
    new Roll(this.data.data.consume.value).toMessage({
      alias: this.actor.name,
      flavor: `Uses ${this.name}`
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll a Tool Check
   * Holding SHIFT when the attack is rolled will "fast-forward".
   * This chooses the default options with no advantage and no bonus
   */
  rollToolCheck(ev) {
    if ( this.type !== "tool" ) throw "Wrong item type!";

    // Prepare roll data
    let rollData = duplicate(this.actor.data.data),
      abl = this.data.data.ability.value || "int",
      ability = rollData.abilities[abl],
      prof = rollData.attributes.prof.value * (this.data.data.proficient.value || 0),
      parts = ["1d20", "@mod", "@prof", "@bonus"],
      adv = 0,
      flavor = `${this.name} - Tool Check`;
    mergeObject(rollData, {mod: ability.mod, prof: prof, bonus: null});

    // Define roll function
    let roll = () => {
      flavor = `${this.name} - ${ability.label}`;
      if ( adv === 1 ) {
        parts[0] = "2d20kh";
        flavor += " (Advantage)";
      }
      else if ( adv === -1 ) {
        parts[0] = "2d20kl";
        flavor += " (Disadvantage)"
      }
      let formula = parts.join("+");

      // Execute the roll and send it to chat
      let roll = new Roll(formula, rollData).roll();
      roll.toMessage({
        alias: this.actor.name,
        flavor: flavor,
        highlightSuccess: roll.parts[0].total === 20,
        highlightFailure: roll.parts[0].total === 1
      });
    };

    // Fast-forward rolls
    if ( keyboard.isDown(KEYS.SHIFT) ) return roll();
    else if ( keyboard.isDown(KEYS.ALT ) ) {
      adv = 1;
      return roll();
    }
    else if ( keyboard.isDown(KEYS.CTRL ) ) {
      adv = -1;
      return roll();
    }

    // Render modal dialog
    let template = "public/systems/dnd5e/templates/chat/tool-roll-dialog.html";
    renderTemplate(template, { formula: parts.join(" + "), ability: abl, abilities: rollData.abilities}).then(dlg => {
      new Dialog({
        title: flavor,
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
          ability = rollData.abilities[html.find('[name="ability"]').val()];
          mergeObject(rollData, {bonus: html.find('[name="bonus"]').val(), mod: ability.mod});
          roll();
        }
      }, { width: 400, top: ev.clientY - 80, left: window.innerWidth - 710 }).render(true);
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


/* -------------------------------------------- */


// Activate global listeners
Hooks.on('renderChatLog', (log, html, data) => Item5e.chatListeners(html));

// Assign Item5e class to CONFIG
CONFIG.Item.entityClass = Item5e;


/* -------------------------------------------- */


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

	  // Activate TinyMCE Editors
	  html.find(".editor a.editor-edit").click(ev => {
	    let button = $(ev.currentTarget),
	        editor = button.siblings(".editor-content");
	    createEditor({
        target: editor[0],
        height: editor.parent().height() - 40,
        save_enablewhendirty: true,
        save_onsavecallback: ed => this._onSaveMCE(ed, editor.attr("data-edit"))
      }).then(ed => {
        this.mce = ed[0];
        button.hide();
        this.mce.focus();
      });
    });

    // Activate tabs
    html.find('.tabs').each((_, el) => new Tabs(el));
  }

  /* -------------------------------------------- */

  /**
   * Customize sheet closing behavior to ensure we clean up the MCE editor
   */
  close() {
    super.close();
    if ( this.mce ) this.mce.destroy();
  }

  /* -------------------------------------------- */
  /*  Saving and Submission                       */
  /* -------------------------------------------- */

  /**
   * Extend the default Item Sheet submission logic to save the content of any active MCE editor
   * @private
   */
  _onSubmit(ev) {
    if ( this.mce ) {
      const content = this.mce.getContent();
      this.element.find('[data-edit="data.description.value"]').html(content);
    }
    super._onSubmit(ev);
  };

  /* -------------------------------------------- */

  /**
   * Handle using the Save button on the MCE editor
   * @private
   */
  _onSaveMCE(ed, target) {
    const form = this.element.find('.item-sheet')[0];
    const itemData = validateForm(form);
    itemData[target] = ed.getContent();

    // Update owned items
    if (this.item.isOwned) {
      itemData.id = this.item.data.id;
      this.item.actor.updateOwnedItem(itemData, true).then(item => {
        this.item = item;
        this.render(false);
      });
    }

    // Update unowned items
    else {
      this.item.update(itemData, true);
      this.render(false);
    }

    // Destroy the editor
    this.mce = null;
    ed.remove();
    ed.destroy();
  }
}


/* -------------------------------------------- */


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
  "attack": "Special Attack",
  "ability": "Active Ability"
};