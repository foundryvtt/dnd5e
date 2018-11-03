const path = require('path');
const fs = require('fs');


class Import5ET {
  constructor() {
    this.monsters = {
      index: JSON.parse(fs.readFileSync(path.join(this.path, "bestiary", "index.json"))),
      srd: JSON.parse(fs.readFileSync(path.join(this.path, "bestiary", "srd-monsters.json"))).monsters
    };
    this.spells = {
      index: JSON.parse(fs.readFileSync(path.join(this.path, "spells", "index.json"))),
      srd: JSON.parse(fs.readFileSync(path.join(this.path, "spells", "srd-spells.json"))).spells
    }
  };

  /* ----------------------------------------- */

  get path() {
    return "../5etools/data/"
  }

  /* ----------------------------------------- */
  /*  Monsters                                 */
  /* ----------------------------------------- */

  importMonsters(file) {
    const pack = game.packs['dnd5e.monsters'];

    // Delete the existing Monsters compendium
    if ( fs.existsSync(pack.metadata.path) ) fs.unlinkSync(pack.metadata.path);

    // Create new data
    let data = JSON.parse(fs.readFileSync(path.join(this.path, "bestiary", file)));

    // Filter monsters for those included in the SRD
    const monsters = data.monster.filter(m => this.monsters.srd.includes(m.name));
    console.log(monsters.length);

    // Create a new entry every 300ms to avoid database collision
    let i = 0;
    let ivl = null;
    ivl = setInterval(() => {
      if ( i === monsters.length ) {
        clearInterval(ivl);
        console.log("ALL DONE!");
      }
      console.log(i);
      let m = monsters[i++];
      let actor = this._importMonster(pack, m);
      let entry = new pack(actor);
      console.log(`Saving entry ${entry.name}`);
      entry.save();
    }, 250);
  }

  /* ----------------------------------------- */

  _importMonster(pack, data) {
    let actor = db.Actor.create({name: data.name, type: "npc"});
    let d = actor.data;
    delete data["name"];

    // Abilities
    for ( let [a, abl] of Object.entries(d.abilities) ) {
      abl.value = data[a];
      delete data[a];
    }

    // Attributes
    let ac = data.ac[0];
    if ( ac instanceof Object ) ac = ac.ac;
    d.attributes.ac.value = ac;
    delete data["ac"];

    d.attributes.hp.value = data.hp.average;
    d.attributes.hp.max = data.hp.average;
    d.attributes.hp.formula = data.hp.formula;
    delete data["hp"];

    let speeds = [];
    for ( let [k, v] of Object.entries(data.speed) ) { speeds.push(`${k.capitalize()} ${v} ft.`) };
    d.attributes.speed.value = speeds.join(" ");
    delete data["speed"];

    // Skills
    if ( data.skill ) {
      for ( let s of Object.keys(data.skill) ) {
        let skl = Object.values(d.skills).find(skl => skl.label.toLowerCase() === s);
        skl.value = 1;
      }
      delete data["skill"];
    }

    // Details
    let aligns = {"C": "Chaotic", "N": "Neutral", "L": "Lawful", "E": "Evil", "G": "Good", "U": "Unaligned"};
    d.details.alignment.value = data.alignment.map(a => aligns[a]).join(" ");
    delete data["alignment"];

    d.details.cr.value = eval(data.cr);
    delete data["cr"];
    d.attributes.prof.value = Math.floor((d.details.cr.value + 7) / 4);

    let type = (data.type instanceof Object ) ? data.type.type || "" : data.type;
    d.details.type.value = type.titleCase();
    delete data["type"];

    if ( data.environment ) {
      d.details.environment.value = data.environment[0].titleCase();
      delete data["environment"];
    }

    d.details.source.value = `${data.source} pg. ${data.page}`;
    delete data["source"];
    delete data["page"];

    // Traits
    d.traits.size.value = {T: "Tiny", S: "Small", M: "Medium", L: "Large", H: "Huge", E: "Enormous"}[data.size];
    delete data["size"];

    d.traits.languages.value = data.languages;
    delete data["languages"];
    delete data["languageTags"];

    d.traits.perception.value = data.passive;
    delete data["passive"];

    // TODO: Traits and Actions
    delete data["trait"];
    delete data["action"];

    // Make sure there is nothing left over
    if ( data.soundClip ) delete data["soundClip"];
    if ( Object.keys(data) > 0 ) throw "FIX THIS ONE!";
    return actor;
  }

  /* ----------------------------------------- */
  /*  Spells                                   */
  /* ----------------------------------------- */

  importSpells(file) {
    const pack = game.packs['dnd5e.spells'];

    // Delete the existing Monsters compendium
    if ( fs.existsSync(pack.metadata.path) ) fs.unlinkSync(pack.metadata.path);

    // Get spell entries for the spells included in the SRD
    let data = JSON.parse(fs.readFileSync(path.join(this.path, "spells", file)));
    const spells = data.spell.filter(s => this.spells.srd.includes(s.name));
    console.log(spells.length);

    // Create a new entry every 250ms to avoid database collision
    let i = 0;
    let ivl = null;
    ivl = setInterval(() => {
      if ( i === spells.length ) {
        clearInterval(ivl);
        console.log("ALL DONE!");
      }
      console.log(i);
      let s = spells[i++];
      let spell = this._importSpell(pack, s);
      let entry = new pack(spell);
      console.log(`Saving entry ${entry.name}`);
      entry.save();
    }, 150);
  }

  /* ----------------------------------------- */

  _importSpell(pack, data) {
    let s = db.Item.create({name: data.name, type: "spell"});
    let d = s.data;
    delete data["name"];

    // Source
    d.source.value = `${data.source} pg. ${data.page}`;
    delete data["source"];
    delete data["page"];

    // Description (maybe)
    if ( data.entries ) {
      let ps = data.entries.map(e => `<p>${e}</p>`);
      d.description.value = ps.join("");
      delete data["entries"];
    }

    // Type
    if ( data.isHeal ) {
      data.spellType = "heal";
      delete data["isHeal"];
    }
    else if ( data.savingThrow ) {
      data.spellType = "save";
      delete data["savingThrow"];
    }
    else if ( data.spellAttack ) {
      data.spellType = "attack";
      delete data["spellAttack"];
    } else data.spellType = "utility";

    // Level and school
    d.level.value = data.level;
    delete data["level"];
    const schools = {
      "A": "abj",
      "C": "con",
      "D": "div",
      "E": "enc",
      "V": "evo",
      "I": "ill",
      "N": "nec",
      "T": "trs"
    };
    d.school.value = schools[data.school];
    delete data["school"];

    // Make sure there is nothing left over
    //if ( Object.keys(data).length > 0 ) throw "FIX THIS ONE!";
    console.log(data);
    return s;
  }

  /* ----------------------------------------- */
  /*  Items
  /* ----------------------------------------- */

  importItems(file) {
    const pack = game.packs['dnd5e.items'];

    // Delete the existing Monsters compendium
    if ( fs.existsSync(pack.metadata.path) ) fs.unlinkSync(pack.metadata.path);

    // Create new data
    let data = JSON.parse(fs.readFileSync(path.join(this.path, "items", file))).basicitem;
    let i = 0;
    for ( let d of data ) {
      let item = null;
      if ( ["R", "A", "M", "SCF", "AF"].includes(d.type) ) {
        item = this._importWeapon(d);
      } 
      else if ( ["LA", "MA", "HA", "S"].includes(d.type) ) {
        item = this._importArmor(d);
      } 
      else throw `Type ${d.type} not handled!`;

      // Save
      setTimeout(() => {
        let entry = new pack(item);
        console.log(`Saving entry ${entry.name}`);
        entry.save();
      }, 100 * i++);
    }
  }

  /* ----------------------------------------- */

  _importWeapon(data) {

    // Create the placeholder Item
    let item = db.Item.create({name: data.name, type: "weapon"});
    let d = item.data;
    delete data["name"];

    // Damage
    if ( data.dmg1 ) {
      let match = data.dmg1.match("{@dice ([0-9a-z]+)}");
      d.damage.value = match ? match[1] : undefined;
      delete data["dmg1"];  
    }

    if ( data.dmg2 ) {
      let match = data.dmg2.match("{@dice ([0-9a-z]+)}");
      d.damage2.value = match ? match[1] : undefined;
      delete data["dmg2"];  
    }

    const dtypes = {
      "P": "piercing",
      "S": "slashing",
      "B": "bludgeoning"
    };
    d.damageType.value = dtypes[data.dmgType];
    delete data["dmgType"];

    // Description (maybe)
    if ( data.entries ) {
      let ps = data.entries.map(e => `<p>${e}</p>`);
      d.description.value = ps.join("");
      delete data["entries"];
    }

    // Source
    d.source.value = `${data.source} pg. ${data.page}`;
    delete data["source"];
    delete data["page"];

    // Properties
    const properties = {
      "T": "Thrown",
      "A": "Ammunition",
      "AF": "Firearm",
      "RLD": "Reload",
      "2H": "Two-Handed",
      "F": "Finesse",
      "L": "Light",
      "V": "Versatile",
      "H": "Heavy",
      "R": "Reach"
    };
    let props = data.property || [];
    d.properties.value = props.join("");
    delete data["property"];

    // Range
    if ( data.range ) {
      d.range.value = data.range;
      delete data["range"];
    }

    // Weapon Type
    if ( data.weaponCategory ) {
      d.weaponType.value = data.weaponCategory.toLowerCase() + data.type;
      delete data["weaponCategory"];
      delete data["type"];
    }

    // Price
    if ( data.value ) {
      d.price.value = parseInt(data.value.match('([0-9,]+)( gp)?')[1]);
      delete data.value;
    }

    d.weight.value = parseFloat(data.weight);
    delete data.weight;

    if ( Object.keys(data).length > 0 ) throw "FIX THIS ONE!";
    return item;
  }

  /* ----------------------------------------- */

  _importArmor(data) {

    // Create the placeholder Item
    let item = db.Item.create({name: data.name, type: "equipment"});
    let d = item.data;
    delete data["name"];

    // Armor class
    d.armor.value = data.ac;
    delete data["ac"];

    // Source
    d.source.value = `${data.source} pg. ${data.page}`;
    delete data["source"];
    delete data["page"];

    // Description (maybe)
    if ( data.entries ) {
      let ps = data.entries.map(e => `<p>${e}</p>`);
      d.description.value = ps.join("");
      delete data["entries"];
    }

    // Price
    if ( data.value ) {
      d.price.value = parseInt(data.value.match('([0-9,]+)( gp)?')[1]);
      delete data.value;
    }

    d.weight.value = parseFloat(data.weight);
    delete data.weight;

    // Type
    const types = {
      "LA": "light",
      "MA": "medium",
      "HA": "heavy",
      "S": "shield"
    };
    d.armorType.value = types[data.type];

    if ( Object.keys(data).length > 0 ) throw "FIX THIS ONE!";
    return item;
  }
}


module.exports = {
  Import5ET: Import5ET
};


// tools = require("../public/systems/dnd5e/server/import").Import5ET;
// t = new tools();
// t.importMonsters("bestiary-mm.json");
// t.importItems("basicitems.json");
// t.importSpells("spells-phb.json");
