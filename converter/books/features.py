
from .books import Collection
from ..common_lib import id_generator, nvl
from markdown import markdown
import time

CLASS_SPECIFIC_FEATURES = (
    "Fighting Style",
    "Bonus Cantrip",
    "Bonus Proficiency",
    "Bonus Proficiencies",
    "Channel Divinity",
    "Unarmored Defense",
    "Spellcasting"
)

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

    def __init__(self, collection:Collection):
        self.originalId = id_generator()
        self.name = collection.text
        self.paragraphs = "\n\n".join(c.markdown(include_formatting=False) for c in collection.children()).strip()
    
    @property
    def descriptionHTML(self)->str:
        return markdown(self.paragraphs, extensions=['markdown.extensions.extra']).replace("\n","")

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
