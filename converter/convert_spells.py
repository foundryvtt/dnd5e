
from .spells import loadSpells
from .common_lib import cmdize
import argparse, json, os, shutil

def readOriginals(idFp):
    spellMap = {}
    for line in idFp:
        spell = json.loads(line)
        spellMap[spell["name"]] = spell
    return spellMap

def updateNew(all_spells, spellMap):
    for spell in all_spells.values():
        originalSpell = spellMap[spell.name] if spell.name in spellMap else None
        if originalSpell is None:
            originalSpell = spellMap[spell.brandedname] if spell.brandedname in spellMap else None
        if originalSpell is not None:
            spell.originalId = originalSpell["_id"]
            spell.icon = originalSpell["img"]
            spell.effects = originalSpell["effects"]
            spell.createdtime = originalSpell["_stats"]["createdTime"]


def main():
    parser = argparse.ArgumentParser(description="Update the spell lists and descriptions")
    parser.add_argument(
        "filepath",
        type=str,
        default=os.path.join("..","dm-helper-data","dnd-5e","spells.xml"),
        nargs="?",
        help="the spell XML file to use"
        )
    parser.add_argument(
        "original",
        type=str,
        default=os.path.join("packs","spells.db"),
        nargs="?",
        help="the original spell.db file to pull IDs from"
        )
    parser.add_argument(
        "out",
        type=str,
        default=os.path.join("packs","src","spells"),
        nargs="?",
        help="the spell folder to write to"
        )
    
    args = parser.parse_args()

    with open(args.filepath, 'r', encoding="utf-8") as loadFp:
        all_spells = loadSpells(loadFp)

    with open(args.original, 'r', encoding="utf-8") as loadFp:
        updateNew(all_spells, readOriginals(loadFp))
    
    shutil.rmtree(args.out)
    os.mkdir(args.out)
    os.mkdir(os.path.join(args.out,"cantrip"))
    for l in range(1, 10):
        os.mkdir(os.path.join(args.out,f"level-{l}"))

    for spell_key in sorted(all_spells.keys()):
        spell = all_spells[spell_key]
        subfolder = f"level-{spell.level}" if spell.level else "cantrip"
        filename=cmdize(spell.name)+".json"
        with open(os.path.join(args.out, subfolder, filename), 'w', encoding="utf-8") as saveFp:
            saveFp.write(json.dumps(spell.toDb(), indent=2)+"\n")
    

if __name__ == "__main__":
    main()


