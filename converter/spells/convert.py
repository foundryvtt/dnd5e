
from .spells import Spell, loadSpells as loadSpellsFromFile
from ..common_lib import cmdize, equalsWithout
import argparse, json, os, shutil

def readOriginals(folder):
    spellMap = {}
    for l in range(10):
        directory = f"level-{l}" if l else "cantrip"
        dp, _, filenames = next(os.walk(os.path.join(folder, directory)))
        for fname in filenames:
            with open(os.path.join(dp,fname), "r") as sFp:
                spell = json.load(sFp)
            spellMap[cmdize(spell["name"])] = spell
    return spellMap

def updateNew(all_spells, spellMap):
    for spell in all_spells.values():
        originalSpell = spellMap[cmdize(spell.name)] if cmdize(spell.name) in spellMap else None
        if originalSpell is None:
            originalSpell = spellMap[cmdize(spell.brandedname)] if cmdize(spell.brandedname) in spellMap else None
        if originalSpell is not None:
            spell.originalId = originalSpell["_id"]
            spell.icon = originalSpell["img"]
            spell.effects = originalSpell["effects"]
            spell.createdtime = originalSpell["_stats"]["createdTime"]
            spell.formula = originalSpell["system"]["formula"]
            spell.parsedDamage = originalSpell["system"]["damage"]["parts"]

def loadSpells(filepath)->dict:
    with open(filepath, 'r', encoding="utf-8") as loadFp:
        all_spells = loadSpellsFromFile(loadFp)
    Spell._all_spells = all_spells

    updateNew(all_spells, readOriginals(os.path.join("packs","src","spells")))

    return all_spells

def writeSpells(all_spells):
    spellsDir = os.path.join("packs","src","spells")
    original_spells = readOriginals(spellsDir)
    shutil.rmtree(spellsDir)
    os.mkdir(spellsDir)
    os.mkdir(os.path.join(spellsDir,"cantrip"))
    for l in range(1, 10):
        os.mkdir(os.path.join(spellsDir,f"level-{l}"))

    for spell_key in sorted(all_spells.keys()):
        spell = all_spells[spell_key]
        subfolder = f"level-{spell.level}" if spell.level else "cantrip"
        spellJson = spell.toDb()
        if spell_key in original_spells and equalsWithout(spellJson, original_spells[spell_key]):
            spellJson = original_spells[spell_key]
        filename=cmdize(spell.name)+".json"
        with open(os.path.join(spellsDir, subfolder, filename), 'w', encoding="utf-8") as saveFp:
            saveFp.write(json.dumps(spellJson, indent=2)+"\n")

def main():
    parser = argparse.ArgumentParser(description="Update the spell lists and descriptions")
    parser.add_argument(
        "filepath",
        type=str,
        default=os.path.join("..","dm-helper-data","dnd-5e","spells.xml"),
        nargs="?",
        help="the spell XML file to use"
        )
    
    args = parser.parse_args()

    all_spells = loadSpells(args.filepath)
    
    writeSpells(all_spells)
    

if __name__ == "__main__":
    main()


