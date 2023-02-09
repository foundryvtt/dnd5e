
from .books import Collection, CollectionLevel
from .features import Feature, CLASS_SPECIFIC_FEATURES
from ..common_lib import id_generator, cmdize, nvl, ratoi
from ..constants import ABILITY_SCORES, NUM_LIST
from markdown import markdown
import time, re


HIT_DIE_RX = re.compile("\\**Hit Dice:\\** 1(?P<die>d[1-9][0-9]?)")
SAVE_PROFICIENCY_RX = re.compile(f"\\**Saving Throws:\\** (?P<save1>{'|'.join(ABILITY_SCORES)}), (?P<save2>{'|'.join(ABILITY_SCORES)})", re.IGNORECASE)
SKILL_PROFICIENCY_RX = re.compile(f"\\**Skills:\\** Choose (?P<num>{NUM_LIST}) from (?P<list>.*)", re.IGNORECASE)
SKILL_PROFICIENCY_2_RX = re.compile(f"\\**Skills:\\** Choose any (?P<num>{NUM_LIST})", re.IGNORECASE)
SPELL_ABILITY_RX = re.compile(f"(?P<ability>({'|'.join(ABILITY_SCORES)})) is your spellcasting ability", re.IGNORECASE)

ALL_SKILLS = ("acr", "ani", "arc", "ath", "dec", "his", "ins", "inv", "itm", "med", "nat", "per", "prc", "prf", "rel", "slt", "ste", "stw", "sur",)

def skillToCode(skill):
    skill = skill.lower()
    if skill == "acrobatics": return "acr"
    if skill == "animal handling": return "ani"
    if skill == "arcana": return "arc"
    if skill == "athletics": return "ath"
    if skill == "deception": return "dec"
    if skill == "history": return "his"
    if skill == "insight": return "ins"
    if skill == "investigation": return "inv"
    if skill == "intimidation": return "itm"
    if skill == "medicine": return "med"
    if skill == "nature": return "nat"
    if skill == "persuasion": return "per"
    if skill == "perception": return "prc"
    if skill == "performance": return "prf"
    if skill == "religion": return "rel"
    if skill == "sleight of hand": return "slt"
    if skill == "stealth": return "ste"
    if skill == "streetwise": return "stw"
    if skill == "survival": return "sur"
    return "???"


class RpgClass(object):
    originalId     = None
    name           = ""
    createdTime    = None
    img            = ""

    hitDie         = "d4"
    saves          = []
    skillNumbers   = 0
    skillChoices   = []
    _spellcasting  = ""
    _spellAbility  = ""

    _description   = ""
    features       = None
    subclasses     = None
    _advancement   = []

    def __init__(self, collection:Collection):
        self.originalId = id_generator()
        self.name = collection.text
        self.features = []
        self.subclasses = {}
        self._description = f"As a {self.name.lower()}, you gain the following class features."

        for featureC in collection.find("Class Features").children():
            if featureC.level >= CollectionLevel.P:
                continue
            if featureC.text not in ("Hit Points", "Proficiencies", "Equipment"):
                feature = Feature(featureC.promoteHeadings(1))
                shouldAddClassName = feature.name == "Ability Score Improvement" and self.name in ("Fighter","Rogue","Bard")
                shouldAddClassName = shouldAddClassName or (feature.name == "Extra Attack" and self.name in ("Fighter","Monk"))
                shouldAddClassName = shouldAddClassName or feature.name in CLASS_SPECIFIC_FEATURES
                if shouldAddClassName:
                    feature.name = f"{feature.name} ({self.name})"
                self.features.append(feature)
            elif featureC.text == "Hit Points":
                self._description += "\n\n" + featureC.markdown(include_formatting=False)
                match = HIT_DIE_RX.search(featureC.markdown())
                if match:
                    self.hitDie = match.group("die")
            elif featureC.text == "Proficiencies":
                self._description += "\n\n" + featureC.markdown(include_formatting=False)
                match = SAVE_PROFICIENCY_RX.search(featureC.markdown())
                if match:
                    self.saves = [match.group("save1")[:3].lower(), match.group("save2")[:3].lower()]
                match = SKILL_PROFICIENCY_RX.search(featureC.markdown())
                if match:
                    self.skillNumbers = ratoi(match.group("num"))
                    self.skillChoices = [skillToCode(s.replace(" and ","").strip()) for s in match.group("list").split(",")]
                else:
                    match = SKILL_PROFICIENCY_2_RX.search(featureC.markdown())
                    if match:
                        self.skillNumbers = ratoi(match.group("num"))
                        self.skillChoices = sorted(ALL_SKILLS)
            elif featureC.text == "Equipment":
                self._description += "\n\n" + featureC.markdown(include_formatting=False)

        self._description = self._description.strip()
        
        # get subclasses
        subclassC = None
        foundCF = False
        for c in collection.children():
            if c.text == "Class Features":
                foundCF = True
            elif foundCF and c.level < CollectionLevel.P:
                subclassC = c
                break
        
        if subclassC:
            for sc in subclassC.children():
                if sc.level >= CollectionLevel.P:
                    continue
                subclass = RpgSubClass(self, sc)
                self.subclasses[cmdize(subclass.name)] = subclass
    
    @property
    def advancement(self)->list:
        groupByLevel = {l:[] for l in range(1,21)}
        currentLevel = 0
        for f in self.features:
            fsl = f.startingLevel
            if fsl < currentLevel:
                print("going backwards:", f.name)
            currentLevel = fsl
            if f.name.startswith("Ability Score Improvement"):
                continue
            groupByLevel[currentLevel].append(f)
        
        advancementList = []
        
        # add hit points
        if type(self) == RpgClass:
            advId = id_generator()
            for oldAdv in self._advancement:
                if oldAdv["type"] == "HitPoints":
                    advId = oldAdv["_id"]
                    break
            advancementList.append({
                "_id": advId,
                "type": "HitPoints",
                "configuration": {},
                "value": {},
                "title": ""
            })

        # add class features
        for l in range(1,21):
            if not groupByLevel[l]:
                continue
            advId = id_generator()
            for oldAdv in self._advancement:
                if oldAdv["type"] == "ItemGrant" and oldAdv["level"] == l:
                    advId = oldAdv["_id"]
                    break
            advancementList.append({
                "_id": advId,
                "type": "ItemGrant",
                "configuration": {
                "items": [f"Compendium.dnd5e.classfeatures.{f.originalId}" for f in groupByLevel[l]],
                "optional": False,
                "spell": {
                    "ability": "",
                    "preparation": "",
                    "uses": {
                        "max": "",
                        "per": ""
                    }
                }
                },
                "value": {},
                "level": l,
                "title": "Features"
            })
        
        for oldAdv in self._advancement:
            if oldAdv["type"] not in ("HitPoints","ItemGrant"):
                advancementList.append({**oldAdv})

        return advancementList
    
    @advancement.setter
    def advancement(self, value):
        self._advancement = value
    
    @property
    def description(self)->str:
        return markdown(self._description, extensions=['markdown.extensions.extra'])
    
    @property
    def spellcasting(self):
        if self._spellcasting:
            return self._spellcasting
        if self.name == "Artificer":
            return "artificer"
        try:
            sc = next(f for f in self.features if f.name.startswith("Spellcasting"))
            if sc.startingLevel == 1:
                return "full"
            if sc.startingLevel == 2:
                return "half"
            if sc.startingLevel == 3:
                return "third"
        except: pass
        try:
            next(f for f in self.features if f.name.startswith("Pact Magic"))
            return "pact"
        except: pass
        return "none"
    
    @spellcasting.setter
    def spellcasting(self, value):
        self._spellcasting = value
    
    @property
    def spellAbility(self):
        if self._spellAbility:
            return self._spellAbility
        try:
            sc = next(f for f in self.features if f.name.startswith("Spellcasting") or f.name.startswith("Pact Magic"))
            rematch = SPELL_ABILITY_RX.search(sc.paragraphs)
            if rematch:
                return rematch.group("ability")[:3].lower()
        except: pass
        return ""
    
    @spellAbility.setter
    def spellAbility(self, value):
        self._spellAbility = value

    def toDb(self)->dict:
        now = int(time.time()*1000)
        return {
            "_id": self.originalId,
            "name": self.name,
            "type": "class",
            "img": self.img,
            "system": {
                "description": {
                    "value": self.description,
                    "chat": "",
                    "unidentified": ""
                },
                "source": "SRD 5.1",
                "identifier": cmdize(self.name),
                "levels": 1,
                "hitDice": self.hitDie,
                "hitDiceUsed": 0,
                "advancement": self.advancement,
                "saves": self.saves,
                "skills": {
                    "number": self.skillNumbers,
                    "choices": self.skillChoices,
                    "value": []
                },
                "spellcasting": {
                    "progression": self.spellcasting,
                    "ability": self.spellAbility
                }
            },
            "effects": [],
            "folder": None,
            "sort": 0,
            "ownership": {
                "default": 0
            },
            "flags": {},
            "_stats": {
                "systemId": "dnd5e",
                "systemVersion": "2.1.0",
                "coreVersion": "10.291",
                "createdTime": nvl(self.createdTime, now),
                "modifiedTime": now,
                "lastModifiedBy": "RightHandOfVecna"
            }
        }

        


class RpgSubClass(RpgClass):
    parent:RpgClass = None
    def __init__(self, parent:RpgClass, collection:Collection):
        self.parent = parent
        self.originalId = id_generator()
        self.name = collection.text
        self.features = []
        self._description = collection.immediateMarkdown()

        for featureC in collection.children():
            if featureC.level >= CollectionLevel.P:
                continue
            feature = Feature(featureC.promoteHeadings(2))
            shouldAddClassName = feature.name in CLASS_SPECIFIC_FEATURES
            shouldAddClassName = shouldAddClassName or (feature.name == "Extra Attack" and self.name in ("College of Valor", "Bladesinger"))
            if shouldAddClassName:
                feature.name = f"{feature.name} ({self.name})"
            self.features.append(feature)
    
    def toDb(self)->dict:
        now = int(time.time()*1000)
        return {
            "_id": self.originalId,
            "name": self.name,
            "type": "subclass",
            "img": self.img,
            "system": {
                "description": {
                    "value": self.description,
                    "chat": "",
                    "unidentified": ""
                },
                "source": "SRD 5.1",
                "identifier": cmdize(self.name),
                "classIdentifier": cmdize(self.parent.name),
                "advancement": self.advancement,
                "spellcasting": {
                    "progression": self.spellcasting,
                    "ability": self.spellAbility
                }
            },
            "effects": [],
            "folder": None,
            "sort": 0,
            "ownership": {
                "default": 0
            },
            "flags": {},
            "_stats": {
                "systemId": "dnd5e",
                "systemVersion": "2.1.0",
                "coreVersion": "10.291",
                "createdTime": nvl(self.createdTime, now),
                "modifiedTime": now,
                "lastModifiedBy": "RightHandOfVecna"
            }
        }
