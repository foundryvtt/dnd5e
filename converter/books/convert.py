
from .books import Book, Collection, CollectionLevel
from .features import Feature
from .classes import RpgClass
from ..common_lib import cmdize, naturalSort, equalsWithout
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

def updateNewClasses(all_classes, classesMap):
    for classes in all_classes.values():
        originalClasses = classesMap[cmdize(classes.name)] if cmdize(classes.name) in classesMap else None
        if originalClasses is not None:
            classes.originalId = originalClasses["_id"]
            classes.img = originalClasses["img"]
            classes.createdTime = originalClasses["_stats"]["createdTime"]
            classes.advancement = originalClasses["system"]["advancement"]


def loadClasses(filepath:str, all_spells:dict={}):
    """
    Returns (class_map, subclass_map, feature_map)
    """
    phb = load_5e_phb(filepath)
    classes = {}

    for cc in phb.fromPath("Chapter 3: Classes").children():
        if cc.text == "Classes" or cc.level >= CollectionLevel.P:
            continue
        rpgClass = RpgClass(cc)
        classes[cmdize(rpgClass.name)] = rpgClass
    
    # combine identical features
    canonical_features = {}
    for cl in list(classes.values()):
        for f in cl.features:
            key = cmdize(f.name)
            if key in canonical_features:
                if canonical_features[key].descriptionHTML != f.descriptionHTML:
                    print(f"duplicate non-identical feature '{key}' from {cl.name}")
                continue
            canonical_features[key] = f
        
        for scl in list(cl.subclasses.values()):
            for f in scl.features:
                key = cmdize(f.name)
                if key in canonical_features:
                    if canonical_features[key].descriptionHTML != f.descriptionHTML:
                        print(f"duplicate non-identical feature '{key}' from {cl.name}: {scl.name}")
                    continue
                canonical_features[key] = f
    
    # load original features for purposes of consistency with IDs
    with open(os.path.join("packs","classfeatures.db"), 'r', encoding="utf-8") as loadFp:
        original_features = readOriginals(loadFp)
    
    # split out fighting styles
    for feature_key in list(canonical_features.keys()):
        if not feature_key.startswith(cmdize("Fighting Style")):
            continue
        feature = canonical_features[feature_key]
        feature.paragraphs = feature.originalCollection.children()[0].markdown()
        allowedStyles = []
        for styles in feature.originalCollection.children()[1:]:
            style_name = f"Fighting Style: {styles.text}"
            style_key = cmdize(style_name)
            if style_key in canonical_features:
                allowedStyles.append(canonical_features[style_key])
                continue
            fightingStyle = Feature(styles)
            fightingStyle.name = style_name
            fightingStyle.featureSubType = "fightingStyle"
            canonical_features[style_key] = fightingStyle
            allowedStyles.append(fightingStyle)
        updateNewClassFeatures({cmdize(f.name):f for f in allowedStyles}, original_features)
        feature.paragraphs += "\n\n"+"\n\n".join("@Compendium[dnd5e.classfeatures."+style.originalId+"]{"+style.name[16:]+"}" for style in allowedStyles)

    # split out Pact Boons
    parentPactBoon = canonical_features[cmdize("Pact Boon")]
    parentPactBoon.paragraphs = parentPactBoon.originalCollection.children()[0].markdown()
    pacts = []
    for pact in parentPactBoon.originalCollection.children()[1:]:
        pactBoon = Feature(pact)
        pactBoon.featureSubType = "pact"
        pactBoon.requirements = f"Warlock {parentPactBoon.startingLevel}"
        canonical_features[cmdize(pact.text)] = pactBoon
        pacts.append(pactBoon)
    updateNewClassFeatures({cmdize(f.name):f for f in pacts}, original_features)
    parentPactBoon.paragraphs += "\n\n"+"\n\n".join("@UUID[Compendium.dnd5e.classfeatures."+pact.originalId+"]{"+pact.name+"}" for pact in pacts)
    parentPactBoon.paragraphs += "\n\nYou can drag your choice from the above onto your character sheet and it will automatically update."

    
    # add Warlock Invocations
    # invocationCollection = phb.fromPath("Chapter 3: Classes", "Warlock", "Eldritch Invocations")

    
    # update classes to reflect squished canonical features
    for cl in classes.values():
        cl.features = [canonical_features[cmdize(f.name)] for f in cl.features]
        for scl in cl.subclasses.values():
            scl.features = [canonical_features[cmdize(f.name)] for f in scl.features]
    
    # update canonical features to reflect old Ids and other fields
    updateNewClassFeatures(canonical_features, original_features)

    # update new classes to reflect old Ids and other fields
    with open(os.path.join("packs","classes.db"), 'r', encoding="utf-8") as loadFp:
        originalClasses = readOriginals(loadFp)
        updateNewClasses(classes, originalClasses)

    return classes, None, canonical_features


def writeFeatures(canonical_features):
    # load original features for purposes of consistency with IDs
    with open(os.path.join("packs","classfeatures.db"), 'r', encoding="utf-8") as loadFp:
        original_features = readOriginals(loadFp)

    # write out the canonical features
    classFeaturesDir = os.path.join("packs","src","classfeatures")
    shutil.rmtree(classFeaturesDir)
    os.mkdir(classFeaturesDir)

    for feature_key in sorted(canonical_features.keys()):
        feature = canonical_features[feature_key]
        featureJson = feature.toDb()
        if feature_key in original_features and equalsWithout(featureJson, original_features[feature_key]):
            featureJson = original_features[feature_key]
        with open(os.path.join(classFeaturesDir, f"{feature_key}.json"), 'w', encoding="utf-8") as saveFp:
            saveFp.write(json.dumps(featureJson, indent=2)+"\n")


def writeClasses(classes):
    # update new classes to reflect old Ids and other fields
    with open(os.path.join("packs","classes.db"), 'r', encoding="utf-8") as loadFp:
        originalClasses = readOriginals(loadFp)

    # write out the new classes
    classesDir = os.path.join("packs","src","classes")
    shutil.rmtree(classesDir)
    os.mkdir(classesDir)

    for class_key in sorted(classes.keys()):
        cls = classes[class_key]
        clsJson = cls.toDb()
        if class_key in originalClasses and equalsWithout(clsJson, originalClasses[class_key]):
            clsJson = originalClasses[class_key]
        with open(os.path.join(classesDir, f"{class_key}.json"), 'w', encoding="utf-8") as saveFp:
            saveFp.write(json.dumps(clsJson, indent=2)+"\n")


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

    classes, _, features = loadClasses(args.filepath)

    writeClasses(classes)
    writeFeatures(features)
    
    # print(classes["bard"].name, ":--:", ", ".join(f.name for f in classes["bard"].subclasses.values()))
    # print(phb.fromPath("Chapter 3: Classes", "Warlock", "Class Features", "Eldritch Invocations").markdown())
    # print(phb.fromPath("Chapter 3: Classes", "Artificer", "Class Features", "Ability Score Improvement").markdown())
    # print(RpgClass(phb.fromPath("Chapter 3: Classes", "Artificer")).features[4].descriptionHTML)
    # print(json.dumps(classes["wizard"].toDb(), indent=2))
    
    

if __name__ == "__main__":
    main()

