
class Item5eSheet extends ItemSheet {

  getData() {
    const data = duplicate(this.item.data);
    data['abilities'] = game.system.template.actor.data.abilities;

    data['damageTypes'] = CONFIG.damageTypes;
    let types = (this.item.type === "equipment") ? "armorTypes" : this.item.type + "Types";
    data[types] = CONFIG[types];
    return data;
  }

  get template() {
    let type = this.item.type;
    return `public/systems/dnd5e/templates/item-${type}-sheet.html`;
  }

  activateListeners(html) {
    super.activateListeners(html);

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
          this.item.update({[target]: ed.getContent()}, true);
          ed.remove();
          ed.destroy();
        }
      }).then(ed => {
        button.hide();
        ed[0].focus();
      });
    });

    // Activate tabs
    html.find('.tabs').each((_, el) => new Tabs(el));
  }
}


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
  "thunder": "Thunder"
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

// Equipment Types
CONFIG.armorTypes = {
  "clothing": "Clothing",
  "light": "Light",
  "medium": "Medium",
  "heavy": "Heavy",
  "bonus": "Bonus",
  "natural": "Natural",
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
