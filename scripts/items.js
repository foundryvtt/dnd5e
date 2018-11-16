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

  /**
   * Roll a Weapon Attack
   */
  rollWeaponAttack(ev) {
    if ( this.type !== "weapon" ) throw "Wrong item type!";

    // Get data
    let abl = this.actor.data.data.abilities[this.data.data.ability.value || "str"],
      prof = this.actor.data.data.attributes.prof.value,
      hit = this.data.data.bonus.value || 0,
      parts = ["1d20", "@hit", "@mod", "@prof", "@bonus"],
      flavor = `${this.name} - Attack Roll`;

    // Render modal dialog
    let template = "public/systems/dnd5e/templates/chat/roll-dialog.html";
    console.log(ev);
    renderTemplate(template, {formula: parts.join(" + ")}).then(dlg => {
      new Dialog({
        title: flavor,
        content: dlg,
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
          new Roll(parts.join(" + "), {hit: hit, mod: abl.mod, prof: prof, bonus: bonus}).toMessage({
            alias: this.actor.name,
            flavor: flavor
          });
        }
      }, { width: 400, top: ev.clientY - 80, left: window.innerWidth - 710 }).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Weapon Damage
   */
  rollWeaponDamage(ev, alternate=false) {
    if ( this.type !== "weapon" ) throw "Wrong item type!";

    // Get data
    let abl = this.actor.data.data.abilities[this.data.data.ability.value || "str"],
      dmg = alternate ? this.data.data.damage2.value : this.data.data.damage.value,
      parts = [dmg, "@mod", "@bonus"],
      flavor = `${this.name} - Damage Roll`;

    // Render modal dialog
    let template = "public/systems/dnd5e/templates/chat/roll-dialog.html";
    renderTemplate(template, {formula: parts.join(" + ")}).then(dlg => {
      new Dialog({
        title: flavor,
        content: dlg,
        buttons: {
          advantage: {
            label: "Critical Hit",
            callback: () => {
              parts[0] = Roll.alter(dmg, 0, 2);
              flavor += " (Critical)"
            }
          },
          normal: {
            label: "Normal",
          },
        },
        close: html => {
          let bonus = html.find('[name="bonus"]').val();
          new Roll(parts.join(" + "), {mod: abl.mod, bonus: bonus}).toMessage({
            alias: this.actor.name,
            flavor: flavor
          });
        }
      }, { width: 400, top: ev.clientY - 80, left: window.innerWidth - 710 }).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll a Spell Attack
   */
  rollSpellAttack(ev) {
    if ( this.type !== "spell" ) throw "Wrong item type!";
    let ability = this.data.data.ability.value || this.actor.data.data.attributes.spellcasting.value;

    // Get data
    let abl = this.actor.data.data.abilities[ability],
      prof = this.actor.data.data.attributes.prof.value,
      parts = ["1d20", "@mod", "@prof", "@bonus"],
      flavor = `${this.name} - Spell Attack Roll`;

    // Render modal dialog
    let template = "public/systems/dnd5e/templates/chat/roll-dialog.html";
    console.log(ev);
    renderTemplate(template, {formula: parts.join(" + ")}).then(dlg => {
      new Dialog({
        title: flavor,
        content: dlg,
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
          new Roll(parts.join(" + "), {mod: abl.mod, prof: prof, bonus: bonus}).toMessage({
            alias: this.actor.name,
            flavor: flavor
          });
        }
      }, { width: 400, top: ev.clientY - 80, left: window.innerWidth - 710 }).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Spell Damage
   */
  rollSpellDamage(ev) {
    if ( this.type !== "spell" ) throw "Wrong item type!";
    let ability = this.data.data.ability.value || this.actor.data.data.attributes.spellcasting.value;

    // Get data
    let abl = this.actor.data.data.abilities[ability],
      dmg = this.data.data.damage.value,
      parts = [dmg, "@bonus"],
      flavor = `${this.name} - Damage Roll`;

    // Render modal dialog
    let template = "public/systems/dnd5e/templates/chat/roll-dialog.html";
    renderTemplate(template, {formula: parts.join(" + ")}).then(dlg => {
      new Dialog({
        title: flavor,
        content: dlg,
        buttons: {
          advantage: {
            label: "Critical Hit",
            callback: () => {
              parts[0] = Roll.alter(dmg, 0, 2);
              flavor += " (Critical)"
            }
          },
          normal: {
            label: "Normal",
          },
        },
        close: html => {
          let bonus = html.find('[name="bonus"]').val();
          new Roll(parts.join(" + "), {mod: abl.mod, bonus: bonus}).toMessage({
            alias: this.actor.name,
            flavor: flavor
          });
        }
      }, { width: 400, top: ev.clientY - 80, left: window.innerWidth - 710 }).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Use a consumable item
   */
  useConsumable(ev) {
    new Roll(this.data.data.consume.value).toMessage({
      alias: this.actor.name,
      flavor: `Uses ${this.name}`
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll a Tool check
   */
  toolCheck(ev) {
    if ( this.type !== "tool" ) throw "Wrong item type!";

    // Get data
    let ad = this.actor.data.data,
      abl = ad.abilities[this.data.data.ability.value],
      prof = ad.attributes.prof.value * (this.data.data.proficient.value || 0),
      parts = ["1d20", "@mod", "@prof", "@bonus"],
      flavor = `${this.name} - Tool Check`;

    // Render modal dialog
    let template = "public/systems/dnd5e/templates/chat/roll-dialog.html";
    renderTemplate(template, {formula: parts.join(" + ")}).then(dlg => {
      new Dialog({
        title: flavor,
        content: dlg,
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
          new Roll(parts.join(" + "), {mod: abl.mod, prof: prof, bonus: bonus}).toMessage({
            alias: this.actor.name,
            flavor: flavor
          });
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
          senderId = game.data.chat.find(m => m._id === messageId).user._id;

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
      else if ( action === "consume" ) item.useConsumable(ev);

      // Tool usage
      else if ( action === "toolCheck" ) item.toolCheck(ev);
    });

    // Dice roll context
    new ContextMenu(html, ".dice-roll", {
      "Apply Damage": {
        icon: '<i class="fas fa-user-minus"></i>',
        callback: event => this.applyDamage(event, 1)
      },
      "Apply Healing": {
        icon: '<i class="fas fa-user-plus"></i>',
        callback: event => this.applyDamage(event, -1)
      },
      "Double Damage": {
        icon: '<i class="fas fa-user-injured"></i>',
        callback: event => this.applyDamage(event, 2)

      },
      "Half Damage": {
        icon: '<i class="fas fa-user-shield"></i>',
        callback: event => this.applyDamage(event, 0.5)
      }
    });
  }

  /* -------------------------------------------- */

  static applyDamage(event, multiplier) {
    let roll = $(event.currentTarget).parents('.dice-roll'),
        value = Math.floor(parseFloat(roll.find('.dice-total').text()) * multiplier);

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
Hooks.on('renderChatLog', html => Item5e.chatListeners(html));

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
    if ( this.item.type === "spell" ) {
      data["spellSchools"] = CONFIG.spellSchools;
      data["spellLevels"] = CONFIG.spellLevels;
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
      this.item.actor.updateOwnedItem(itemData, true);
      this.render(false);
    }

    // Update unowned items
    else {
      this.item.update(itemData, true);
      this.render(false);
    }

    // Destroy the editor
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
