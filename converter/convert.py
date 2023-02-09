import argparse, os
from .spells.convert import loadSpells, writeSpells
from .books.convert import loadClasses, writeClasses, writeFeatures


def main():
    parser = argparse.ArgumentParser(description="Update everything that can be updated")
    parser.add_argument(
        "spell_filepath",
        type=str,
        default=os.path.join("..","dm-helper-data","dnd-5e","spells.xml"),
        nargs="?",
        help="the spell XML file to use"
        )
    parser.add_argument(
        "phb_filepath",
        type=str,
        default=os.path.join("..","dnd5e-phb"),
        nargs="?",
        help="the source phb folder to use"
        )
    
    args = parser.parse_args()

    all_spells = loadSpells(args.spell_filepath)
    writeSpells(all_spells)
    
    classes, _, features = loadClasses(args.phb_filepath, all_spells)
    writeClasses(classes)
    writeFeatures(features)
    

if __name__ == "__main__":
    main()
