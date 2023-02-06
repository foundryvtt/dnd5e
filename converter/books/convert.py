
from .books import Book, Collection, CollectionLevel
from .features import Feature
from .classes import RpgClass
from ..common_lib import cmdize, naturalSort, equalsWithoutUpdate
import argparse, json, os, shutil

def load_5e_phb(
        root:str,
        fileBlacklist:set=set((
            "1-Cover.md",
            "2-TableOfContents.md",
            "05-Gnomes.md",
            "06-Orcs.md",
            "2-LegendaryClasses.md",
            "3-Alien.md",
            "3-Divine.md",
            "3-Mage.md",
            "3-Mystic.md",
            "3-Noble.md",
            "3-Warrior.md"
            ))
        )->Book:
    phb5e = Collection(CollectionLevel.DOCUMENT, "5e Player's Handbook")
    semilinearized = [phb5e]
    
    def processFiles(dirpath:str):
        ol = []
        (_, _, filenames) = next(os.walk(dirpath))
        for filename in sorted(filenames, key=naturalSort):
            if not filename.endswith(".md") or filename in fileBlacklist:
                continue
            with open(os.path.join(dirpath, filename), "r", encoding="utf-8") as mdf:
                try:
                    ol.extend(Collection.loadFromMarkdown(mdf.read()))
                except Exception as e:
                    print(f"Failure in file {os.path.join(dirpath,filename)}: {str(e)}")
        return ol

    (_, dirnames, _) = next(os.walk(root))
    for dirname in sorted(dirnames, key=naturalSort):
        if not dirname.startswith("Chapter"):
            continue
        processed = processFiles(os.path.join(root, dirname))
        if dirname == "Chapter3_Classes":
            for cc in processed[1:]:
                if cc.level == CollectionLevel.CHAPTER:
                    cc.level = CollectionLevel.SUBCHAPTER
        semilinearized.extend(processed)

    
    semilinearized = Collection.delinearize(semilinearized)
    if len(semilinearized) > 1:
        print("Stuff not loaded to phb5e:")
        for sl in semilinearized[1:]:
            print(sl.hierarchy(1))
    return Book(phb5e)


def readOriginals(idFp):
    featureMap = {}
    for line in idFp:
        feature = json.loads(line)
        featureMap[cmdize(feature["name"])] = feature
    return featureMap

def updateNewClassFeatures(all_features, featureMap):
    for feature in all_features.values():
        originalFeature = featureMap[cmdize(feature.name)] if cmdize(feature.name) in featureMap else None
        if originalFeature is not None:
            feature.originalId = originalFeature["_id"]
            feature.img = originalFeature["img"]
            feature.effects = originalFeature["effects"]
            feature.createdTime = originalFeature["_stats"]["createdTime"]

            feature.actionType = originalFeature["system"]["actionType"]
            feature.chatFlavor = originalFeature["system"]["chatFlavor"]
            feature.activation = originalFeature["system"]["activation"]
            feature.duration = originalFeature["system"]["duration"]
            feature.target = originalFeature["system"]["target"]
            feature.fRange = originalFeature["system"]["range"]
            feature.uses = originalFeature["system"]["uses"]
            feature.consume = originalFeature["system"]["consume"]
            feature.ability = originalFeature["system"]["ability"]
            feature.critical = originalFeature["system"]["critical"]
            feature.damage = originalFeature["system"]["damage"]
            feature.formula = originalFeature["system"]["formula"]
            feature.save = originalFeature["system"]["save"]
            feature.requirements = originalFeature["system"]["requirements"]
            feature.recharge = originalFeature["system"]["recharge"]


def main():
    parser = argparse.ArgumentParser(description="Update the spell lists and descriptions")
    parser.add_argument(
        "filepath",
        type=str,
        default=os.path.join("..","dnd5e-phb"),
        nargs="?",
        help="the source phb folder to use"
        )
    
    args = parser.parse_args()

    phb = load_5e_phb(args.filepath)
    classes = {}

    for cc in phb.fromPath("Chapter 3: Classes").children():
        if cc.text == "Classes" or cc.level >= CollectionLevel.P:
            continue
        rpgClass = RpgClass(cc)
        classes[cmdize(rpgClass.name)] = rpgClass
    
    # combine identical features
    canonical_features = {}
    for cl in classes.values():
        for f in cl.features:
            key = cmdize(f.name)
            if key in canonical_features:
                print(f"duplicate feature '{key}' from {cl.name}")
                continue
            canonical_features[key] = f
    
    # update classes to reflect squished canonical features
    for cl in classes.values():
        cl.features = [canonical_features[cmdize(f.name)] for f in cl.features]
    
    # update canonical features to reflect old Ids and other fields
    with open(os.path.join("packs","classfeatures.db"), 'r', encoding="utf-8") as loadFp:
        originalFeatures = readOriginals(loadFp)
        updateNewClassFeatures(canonical_features, originalFeatures)

    # write out the canonical features
    classFeaturesDir = os.path.join("packs","src","classfeatures")
    shutil.rmtree(classFeaturesDir)
    os.mkdir(classFeaturesDir)

    for feature_key in sorted(canonical_features.keys()):
        feature = canonical_features[feature_key]
        featureJson = feature.toDb()
        if feature_key in originalFeatures and equalsWithoutUpdate(featureJson, originalFeatures[feature_key]):
            featureJson = originalFeatures[feature_key]
        with open(os.path.join(classFeaturesDir, f"{feature_key}.json"), 'w', encoding="utf-8") as saveFp:
            saveFp.write(json.dumps(featureJson, indent=2)+"\n")
    

    print(", ".join(f.name for f in classes["fighter"].features))
    # print(phb.fromPath("Chapter 3: Classes").text)
    # print(phb.fromPath("Chapter 3: Classes", "Artificer", "Class Features", "Ability Score Improvement").markdown())
    # print(RpgClass(phb.fromPath("Chapter 3: Classes", "Artificer")).features[4].descriptionHTML)
    
    

if __name__ == "__main__":
    main()

