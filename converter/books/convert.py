
from .books import Book, Collection, CollectionLevel
from .features import Feature
from .classes import RpgClass
from ..common_lib import cmdize, naturalSort, equalsWithout, nvl
from copy import deepcopy
import argparse, json, os, shutil, re

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

def _promoteIfLonger(obj, dictionary, key):
    if len(nvl(getattr(obj,key),tuple())) <= len(nvl(dictionary[key],tuple())):
        setattr(obj, key, dictionary[key])

def updateNewClassFeatures(all_features, featureMap):
    for feature in all_features.values():
        originalFeature = featureMap[cmdize(feature.name)] if cmdize(feature.name) in featureMap else None
        if originalFeature is not None:
            feature.originalId = originalFeature["_id"]
            feature.img = originalFeature["img"]
            _promoteIfLonger(feature, originalFeature, "effects")
            feature.createdTime = originalFeature["_stats"]["createdTime"]

            if len(nvl(feature.fRange,tuple())) <= len(nvl(originalFeature["system"]["range"],tuple())):
                feature.fRange = originalFeature["system"]["range"]
            
            _promoteIfLonger(feature, originalFeature["system"], "actionType")
            _promoteIfLonger(feature, originalFeature["system"], "chatFlavor")
            _promoteIfLonger(feature, originalFeature["system"], "activation")
            _promoteIfLonger(feature, originalFeature["system"], "duration")
            _promoteIfLonger(feature, originalFeature["system"], "target")
            _promoteIfLonger(feature, originalFeature["system"], "uses")
            _promoteIfLonger(feature, originalFeature["system"], "consume")
            _promoteIfLonger(feature, originalFeature["system"], "ability")
            _promoteIfLonger(feature, originalFeature["system"], "critical")
            _promoteIfLonger(feature, originalFeature["system"], "damage")
            _promoteIfLonger(feature, originalFeature["system"], "formula")
            _promoteIfLonger(feature, originalFeature["system"], "save")
            _promoteIfLonger(feature, originalFeature["system"], "requirements")
            _promoteIfLonger(feature, originalFeature["system"], "recharge")

def updateNewClasses(all_classes, classesMap):
    for classes in all_classes.values():
        originalClasses = classesMap[cmdize(classes.name)] if cmdize(classes.name) in classesMap else None
        if originalClasses is not None:
            classes.originalId = originalClasses["_id"]
            classes.img = originalClasses["img"]
            classes.createdTime = originalClasses["_stats"]["createdTime"]
            classes.advancement = originalClasses["system"]["advancement"]


def updateNewSubclasses(all_subclasses, subclassesMap):
    updateNewClasses(all_subclasses, subclassesMap)


DRAG_AND_DROP_NOTE = "\n\n<section class=\"secret foundry-note\">\n<p><strong>Foundry Note</strong></p>\n<p>You can drag your choices from the above onto your character sheet and it will automatically update.</p>\n</section>"

INLINE_OPTION_RX = re.compile("(?P<enc>\\*\\*\\*?)(?P<title>[^\\*]+)\\.(?P=enc) ", re.IGNORECASE)

def collectOptionsFromHeading(canonical_features, original_features, originalCollection, featureSubType, requirements, name_to):
    featureOptions = []
    for featureOption in originalCollection.children()[1:]:
        if featureOption.level >= CollectionLevel.P:
            continue
        feature = Feature(featureOption)
        if name_to != "" and ": " not in feature.name:
            feature.name = f"{name_to}: {feature.name}"
        feature.featureSubType = featureSubType
        if requirements is not None:
            feature.requirements = requirements
        if cmdize(feature.name) in canonical_features:
            if canonical_features[cmdize(feature.name)].descriptionHTML != feature.descriptionHTML:
                print(f"duplicate non-identical feature {feature.name}")
            feature = canonical_features[cmdize(feature.name)]
        canonical_features[cmdize(feature.name)] = feature
        featureOptions.append(feature)
    updateNewClassFeatures({cmdize(f.name):f for f in featureOptions}, original_features)
    return featureOptions

def writeOptionsToFeature(parentFeature, options:list):
    parentFeature.paragraphs += "\n\n"+"\n\n".join("@UUID[Compendium.dnd5e.classfeatures."+featureOption.originalId+"]{"+featureOption.name.split(": ")[-1]+"}" for featureOption in options)
    parentFeature.paragraphs += DRAG_AND_DROP_NOTE

def splitOptionsWithHeading(canonical_features, original_features, sourceFeature, featureSubType, requirements, name_to=None):
    if name_to is None:
        name_to = sourceFeature
    parentFeature = canonical_features[cmdize(sourceFeature)]
    parentFeature.paragraphs = parentFeature.originalCollection.immediateMarkdown()
    featureOptions = collectOptionsFromHeading(
        canonical_features,
        original_features,
        parentFeature.originalCollection,
        featureSubType,
        requirements,
        name_to=name_to
    )
    writeOptionsToFeature(parentFeature, featureOptions)

    return featureOptions

def splitOptionsWithoutHeading(canonical_features, original_features, sourceFeature, featureSubType, requirements, name_to=None):
    if name_to is None:
        name_to = sourceFeature
    parentFeature = canonical_features[cmdize(sourceFeature)]
    firstOptionIdx = 0
    parentFeature.paragraphs = ""
    for para in parentFeature.originalCollection.children():
        if INLINE_OPTION_RX.match(para.markdown()):
            break
        parentFeature.paragraphs += "\n\n" + para.markdown()
        firstOptionIdx += 1

    featureCollections = []
    featureCollection = None
    for para in parentFeature.originalCollection.children()[firstOptionIdx:]:
        para = deepcopy(para)
        match = INLINE_OPTION_RX.match(para.text)
        if match:
            if featureCollection is not None:
                featureCollections.append(featureCollection)
            para.text = para.text[len(match.group(0)):]
            featureCollection = Collection(CollectionLevel.H3, match.group("title")).add(para)
        elif featureCollection is not None:
            featureCollection.add(para)
        else:
            raise Exception("The first option doesn't match the inline options regex")
    featureCollections.append(featureCollection)
    
    # convert from Collection to Feature
    featureOptions = []
    for featureOption in featureCollections:
        feature = Feature(featureOption)
        if ": " not in feature.name:
            feature.name = f"{name_to}: {feature.name}"
        feature.featureSubType = featureSubType
        if requirements is not None:
            feature.requirements = requirements
        if cmdize(feature.name) in canonical_features:
            if canonical_features[cmdize(feature.name)].descriptionHTML != feature.descriptionHTML:
                print(f"duplicate non-identical feature {feature.name}")
            feature = canonical_features[cmdize(feature.name)]
        canonical_features[cmdize(feature.name)] = feature
        featureOptions.append(feature)
    updateNewClassFeatures({cmdize(f.name):f for f in featureOptions}, original_features)
    writeOptionsToFeature(parentFeature, featureOptions)

    return featureOptions

def renameOptionGroups(canonical_features, original_features, to_rename:list, optionParent, newOptionParent, name_from=None, name_to=None, consumers:list=[]):
    if name_from is None:
        name_from = optionParent
    if name_to is None:
        name_to = newOptionParent
    for f in to_rename:
        del canonical_features[cmdize(f.name)]
        f.name = f.name.replace(f"{name_from}:",f"{name_to}:")
        if cmdize(f.name) in canonical_features:
            if canonical_features[cmdize(f.name)].descriptionHTML != f.descriptionHTML:
                raise Exception(f"duplicate non-identical feature {f.name}")
            raise Exception(f"duplicate identical feature on rename {f.name}")        
        canonical_features[cmdize(f.name)] = f
    featureOptionsParent = canonical_features[cmdize(optionParent)]
    featureParent = canonical_features[cmdize(newOptionParent)]
    featureParent.paragraphs += "\n\n" + featureOptionsParent.paragraphs
    for c in consumers:
        c.remove(featureOptionsParent)
    del canonical_features[cmdize(optionParent)]
    
    updateNewClassFeatures({cmdize(f.name):f for f in to_rename}, original_features)

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

    # split out Eldritch Cannon options
    splitOptionsWithHeading(
        canonical_features,
        original_features,
        "Eldritch Cannon",
        "eldritchCannon",
        "Artillerist 3"
    )

    # split out Totem Spirit/Aspect/Attunement options
    splitOptionsWithoutHeading(
        canonical_features,
        original_features,
        "Totem Spirit",
        "totem",
        "Barbarian 3"
    )
    splitOptionsWithoutHeading(
        canonical_features,
        original_features,
        "Aspect of the Beast",
        "totem",
        "Path of the Totem Warrior 6"
    )
    splitOptionsWithoutHeading(
        canonical_features,
        original_features,
        "Totemic Attunement",
        "totem",
        "Path of the Totem Warrior 14"
    )

    # split out Cleric Channel Divinities
    splitOptionsWithHeading(
        canonical_features,
        original_features,
        "Channel Divinity (Cleric)",
        "channelDivinity",
        "Cleric 2"
    )

    # TODO: Cleric Subclass Channel Divinities

    # split out Archdruid options
    splitOptionsWithHeading(
        canonical_features,
        original_features,
        "Archdruid",
        "archdruid",
        "Druid 20"
    )
    
    # split out Arcane Shot Options
    shots = splitOptionsWithHeading(
        canonical_features,
        original_features,
        "Arcane Shot Options",
        "arcaneShot",
        "Arcane Archer 3"
    )
    renameOptionGroups(
        canonical_features,
        original_features,
        shots,
        "Arcane Shot Options",
        "Arcane Shot",
        consumers=[classes[cmdize("Fighter")].subclasses[cmdize("Arcane Archer")].features]
    )

    # split out Battle Master Maneuvers
    maneuvers = splitOptionsWithHeading(
        canonical_features,
        original_features,
        "Maneuvers",
        "maneuver",
        None # TODO: set these manually
    )
    renameOptionGroups(
        canonical_features,
        original_features,
        maneuvers,
        "Maneuvers",
        "Combat Superiority",
        name_to="Maneuver",
        consumers=[classes[cmdize("Fighter")].subclasses[cmdize("Battle Master")].features]
    )
    
    # split out Fighter: Psi Knight psi powers
    splitOptionsWithoutHeading(
        canonical_features,
        original_features,
        "Psionic Power",
        "psionicPower",
        "Psi Knight 3",
        name_to="Psionic Power"
    )
    splitOptionsWithoutHeading(
        canonical_features,
        original_features,
        "Telekinetic Adept",
        "psionicPower",
        "Psi Knight 7",
        name_to="Psionic Power"
    )

    # split out Rune Knight: Runes
    runes = splitOptionsWithHeading(
        canonical_features,
        original_features,
        "Runes",
        "rune",
        "Rune Knight 3"
    )
    renameOptionGroups(
        canonical_features,
        original_features,
        runes,
        "Runes",
        "Rune Carver",
        name_to="Rune",
        consumers=[classes[cmdize("Fighter")].subclasses[cmdize("Rune Knight")].features]
    )

    # split out Monk: Ki options
    runes = splitOptionsWithHeading(
        canonical_features,
        original_features,
        "Ki",
        "ki",
        "Monk 2"
    )

    # split out Monk: Elemental Disciplines
    elementalDisciplines = splitOptionsWithHeading(
        canonical_features,
        original_features,
        "Elemental Disciplines",
        "elementalDiscipline",
        None # TODO: set these manually
    )
    renameOptionGroups(
        canonical_features,
        original_features,
        elementalDisciplines,
        "Elemental Disciplines",
        "Disciple of the Elements",
        name_to="Elemental Discipline",
        consumers=[classes[cmdize("Monk")].subclasses[cmdize("Way of the Four Elements")].features]
    )

    # split out Paladin: subclass Channel Divinity
    for sc in classes[cmdize("Paladin")].subclasses.values():
        divinities = splitOptionsWithoutHeading(
            canonical_features,
            original_features,
            f"Channel Divinity ({sc.name})",
            "channelDivinity",
            f"{sc.name} 3",
            name_to="Channel Divinity"
        )
        for d in divinities:
            if not d.img:
                d.img = "icons/magic/fire/projectile-wave-arrow.webp"
    
    # split out Ranger: Hunter Conclave: Hunter's Prey
    splitOptionsWithoutHeading(
        canonical_features,
        original_features,
        "Hunter's Prey",
        "huntersPrey",
        "Hunter Conclave 3"
    )
    
    # split out Ranger: Hunter Conclave: Defensive Tactics
    splitOptionsWithoutHeading(
        canonical_features,
        original_features,
        "Defensive Tactics",
        "defensiveTactic",
        "Hunter Conclave 7",
        name_to="Defensive Tactic"
    )
    
    # split out Ranger: Hunter Conclave: Multiattack
    splitOptionsWithoutHeading(
        canonical_features,
        original_features,
        "Multiattack",
        "multiattack",
        "Hunter Conclave 11"
    )
    
    # split out Ranger: Hunter Conclave: Superior Hunter's Defense
    splitOptionsWithoutHeading(
        canonical_features,
        original_features,
        "Superior Hunter's Defense",
        "superiorHuntersDefense",
        "Hunter Conclave 15"
    )
    
    # split out Rogue: Soulknife psi powers
    splitOptionsWithoutHeading(
        canonical_features,
        original_features,
        "Psychic Power",
        "psionicPower",
        "Soulknife 3",
        name_to="Psionic Power"
    )
    splitOptionsWithoutHeading(
        canonical_features,
        original_features,
        "Soul Blades",
        "psionicPower",
        "Soulknife 9",
        name_to="Psionic Power"
    )

    # split out Metamagics
    splitOptionsWithHeading(
        canonical_features,
        original_features,
        "Metamagic",
        "metamagic",
        "Sorcerer 3"
    )

    # split out Warlock: Pact Boons
    splitOptionsWithHeading(
        canonical_features,
        original_features,
        "Pact Boon",
        "pact",
        f"Warlock {canonical_features[cmdize('Pact Boon')].startingLevel}",
        name_to=""
    )


    # add Artificer Infusions
    infusionCollection = phb.fromPath("Chapter 3: Classes", "Artificer", "Artificer Infusions")
    infusions = collectOptionsFromHeading(
        canonical_features,
        original_features,
        infusionCollection,
        "artificerInfusion",
        None,
        name_to="Artificer Infusion"
    )
    writeOptionsToFeature(
        canonical_features[cmdize("Infuse Item")],
        infusions
    )
    
    # add Warlock Invocations
    invocationCollection = phb.fromPath("Chapter 3: Classes", "Warlock", "Eldritch Invocations")
    invocations = collectOptionsFromHeading(
        canonical_features,
        original_features,
        invocationCollection,
        "eldritchInvocation",
        None,
        name_to="Invocation"
    )
    writeOptionsToFeature(
        canonical_features[cmdize("Eldritch Invocations")],
        invocations
    )

    
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

    # update new subclasses to reflect old Ids and other fields
    with open(os.path.join("packs","subclasses.db"), 'r', encoding="utf-8") as loadFp:
        originalSubclasses = readOriginals(loadFp)
        subclasses = {}
        for c in classes.values():
            subclasses.update(c.subclasses)
        updateNewSubclasses(subclasses, originalSubclasses)

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
    # load original classes so they can be compared with the new ones
    with open(os.path.join("packs","classes.db"), 'r', encoding="utf-8") as loadFp:
        originalClasses = readOriginals(loadFp)
    
    # load original subclasses so they can be compared with the new ones
    with open(os.path.join("packs","subclasses.db"), 'r', encoding="utf-8") as loadFp:
        originalSubclasses = readOriginals(loadFp)

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

    # write out the new subclasses
    subclassesDir = os.path.join("packs","src","subclasses")
    shutil.rmtree(subclassesDir)
    os.mkdir(subclassesDir)

    for class_key in sorted(classes.keys()):
        cls = classes[class_key]
        for subclass_key in sorted(cls.subclasses.keys()):
            scls = cls.subclasses[subclass_key]
            sclsJson = scls.toDb()
            if subclass_key in originalSubclasses and equalsWithout(sclsJson, originalSubclasses[subclass_key]):
                sclsJson = originalSubclasses[subclass_key]
            with open(os.path.join(subclassesDir, f"{subclass_key}.json"), 'w', encoding="utf-8") as saveFp:
                saveFp.write(json.dumps(sclsJson, indent=2)+"\n")


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

