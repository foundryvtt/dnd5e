
from .books import Collection, CollectionLevel
from ..common_lib import id_generator, nvl
from markdown import markdown
import time, re
from typing import Union

CLASS_SPECIFIC_FEATURES = (
    "Fighting Style",
    "Bonus Cantrip",
    "Bonus Proficiency",
    "Bonus Proficiencies",
    "Channel Divinity",
    "Unarmored Defense",
    "Spellcasting",
    "Expertise",
    "Evasion",
    "Expanded Spell List",
    "Bloodline Spells",
    "Oath Spells",
    "Circle Spells",
    "Divine Strike",
    "Potent Spellcasting",
    "Tool Proficiency",
    "Improved Abjuration",
    "Timeless Body"
)

LEVEL_RE = re.compile("((by|at|reach) (?P<lv1>[1-9][0-9]?).. level)|((by|at|reach) level (?P<lv2>[1-9][0-9]?))", re.IGNORECASE)
PREREQUISITE_RE = re.compile("\\*?Prerequisites?[:\\.] (?P<prereqs>.+)", re.IGNORECASE)
LEVEL_PREREQ_RE = re.compile("(?P<lv>[1-9][0-9]?).. level (?P<class>.+)", re.IGNORECASE)

class Feature(object):
    originalId     = None
    name           = ""
    createdTime    = None
    img            = ""
    actionType     = ""
    chatFlavor     = ""
    activation     = {"type": "", "cost": None, "condition": ""}
    duration       = {"value": "", "units": ""}
    target         = {"value": None, "width": None, "units": "", "type": ""}
    fRange         = {"value": None, "long": None, "units": ""}
    uses           = {"value": None, "max": "", "per": None, "recovery": ""}
    consume        = {"type": "", "target": None, "amount": None}
    ability        = None
    critical       = {"threshold": None, "damage": ""}
    damage         = {"parts": [], "versatile": ""}
    formula        = ""
    save           = {"ability": "", "dc": None, "scaling": "spell"}
    requirements   = ""
    recharge       = {"value": None, "charged": False}
    effects        = []
    featureType    = "class"
    featureSubType = ""

    originalCollection = None

    def __init__(self, collection:Collection):
        self.originalId = id_generator()
        self.name = collection.text
        self.paragraphs = "\n\n".join(c.markdown() for c in collection.children() if c.level <= CollectionLevel.P).strip()
        # check if there's a prerequisite
        match = PREREQUISITE_RE.match(collection.children()[0].text)
        if match:
            prereqs = [p.replace("*","").strip() for p in match.group("prereqs").split(",")]
            for i in range(len(prereqs)):
                if LEVEL_PREREQ_RE.match(prereqs[i]):
                    m = LEVEL_PREREQ_RE.match(prereqs[i])
                    prereqs[i] = f"{m.group('class').title()} {m.group('lv')}"
            self.requirements = ", ".join(prereqs)
            self.paragraphs = self.paragraphs[len(match.group(0))+1+collection.children()[0].level.markdownLevel():].strip()

        self.originalCollection = collection
    
    @property
    def descriptionHTML(self)->str:
        return markdown(self.paragraphs, extensions=['markdown.extensions.extra'])

    @property
    def startingLevel(self)->int:
        match = LEVEL_RE.search(self.paragraphs[:100])
        if match and match.group("lv1"):
            return int(match.group("lv1"))
        if match and match.group("lv2"):
            return int(match.group("lv2"))
        return 1

    def toDb(self)->dict:
        now = int(time.time()*1000)
        return {
            "_id": self.originalId,
            "name": self.name,
            "ownership": {
                "default": 0
            },
            "type": "feat",
            "system": {
                "description": {
                    "value": self.descriptionHTML,
                    "chat": "",
                    "unidentified": ""
                },
                "source": "SRD 5.1",
                "activation": self.activation,
                "duration": self.duration,
                "cover": None,
                "target": self.target,
                "range": self.fRange,
                "uses": self.uses,
                "consume": self.consume,
                "ability": self.ability,
                "actionType": self.actionType,
                "attackBonus": "",
                "chatFlavor": self.chatFlavor,
                "critical": self.critical,
                "damage": self.damage,
                "formula": self.formula,
                "save": self.save,
                "type": {
                    "value": self.featureType,
                    "subtype": self.featureSubType
                },
                "requirements": self.requirements,
                "recharge": self.recharge
            },
            "flags": {},
            "img": self.img,
            "effects": self.effects,
            "folder": None,
            "sort": 0,
            "_stats": {
                "systemId": "dnd5e",
                "systemVersion": "2.1.0",
                "coreVersion": "10.291",
                "createdTime": nvl(self.createdTime, now),
                "modifiedTime": now,
                "lastModifiedBy": "RightHandOfVecna"
            }
        }
