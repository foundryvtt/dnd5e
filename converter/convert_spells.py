
from .spells import loadSpells
import argparse, json

def readOriginals(idFp):
    spellIdMap = {}
    spellIconMap = {}
    for line in idFp:
        spell = json.loads(line)
        spellIdMap[spell["name"]] = spell["_id"]
        spellIconMap[spell["name"]] = spell["img"]
    return spellIdMap, spellIconMap


def main():
    parser = argparse.ArgumentParser(description="Update the spell lists and descriptions")
    parser.add_argument(
        "filepath",
        type=str,
        default="../dm-helper-data/dnd-5e/spells.xml",
        nargs="?",
        help="the spell XML file to use"
        )
    parser.add_argument(
        "original",
        type=str,
        default="packs/spells.db",
        nargs="?",
        help="the original spell.db file to pull IDs from"
        )
    parser.add_argument(
        "out",
        type=str,
        default="packs/spells.new.db",
        nargs="?",
        help="the spell db file to write to"
        )
    
    args = parser.parse_args()

    with open(args.filepath, 'r', encoding="utf-8") as loadFp:
        all_spells = loadSpells(loadFp)

    with open(args.original, 'r', encoding="utf-8") as loadFp:
        spellIds, spellIcons = readOriginals(loadFp)
    
    for spell in all_spells.values():
        originalId = spellIds[spell.name] if spell.name in spellIds else None
        originalIcon = spellIcons[spell.name] if spell.name in spellIcons else None
        if originalId is None:
            originalId = spellIds[spell.brandedname] if spell.brandedname in spellIds else None
            originalIcon = spellIcons[spell.brandedname] if spell.brandedname in spellIcons else None
        if originalId is not None:
            spell.originalId = originalId
            spell.icon = originalIcon
    
    with open(args.out, 'w', encoding="utf-8") as saveFp:
        for spell_key in sorted(all_spells.keys()):
            saveFp.write(json.dumps(all_spells[spell_key].toDb())+"\n")
    

if __name__ == "__main__":
    main()


