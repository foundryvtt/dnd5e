const path = require('path');
const fs = require('fs');







class Import5ET {
  constructor() {
    this.monsters = {
      index: JSON.parse(fs.readFileSync(path.join(this.path, "bestiary", "index.json"))),
      srd: JSON.parse(fs.readFileSync(path.join(this.path, "bestiary", "srd-monsters.json"))).monsters
    }
  };

  importMonsters(file) {
    const pack = game.packs['dnd5e.monsters'];

    // Delete the existing Monsters compendium
    if ( fs.existsSync(pack.metadata.path) ) fs.unlinkSync(pack.metadata.path);

    // Create new data
    let data = JSON.parse(fs.readFileSync(path.join(this.path, "bestiary", file))).monster;
    let i = 0;
    for ( let m of data) {
      setTimeout(() => {
        let actor = this._importMonster(pack, m);
        let entry = new pack(actor);
        console.log(`Saving entry ${entry.name}`);
        entry.save();
      }, 100 * i);
      i++;
    }
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
    d.attributes.ac.value = data.ac;
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

    d.traits.perception = data.passive;
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

  get path() {
    return "../5etools/data/"
  }

  /* ----------------------------------------- */

  static fixAC(e) {
    if ( e.data.attributes.ac.value instanceof Number ) {
      console.log("already fixed");
      return;
    }
    let ac = e.data.attributes.ac.value[0];
    if ( ac instanceof Object ) ac = ac.ac;
    e.data.attributes.ac.value = ac;
    e.save();
    console.log(`Saving entry ${e.name}`);
  }
}



module.exports = {
  Import5ET: Import5ET
};



// tools = require("./public/systems/dnd5e/server/import").Import5ET
// t = new tools();

