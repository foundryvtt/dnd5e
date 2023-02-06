#!/usr/bin/env python3

import re, time
import xml.etree.ElementTree as ET
from markdown import markdown
from typing import Any, Dict, Set, Tuple, Union

from .common_lib import cmdize, nvl, id_generator, likeIntersection
from .xml_lib import getAttr

from .constants import *

# Table Data
spellData = {}

def makeParagraphs(lst):
    par = '\n\n'
    inList = False
    for p in lst:
        if len(p)>0 and (p[0] == '-' or p[0] == '|' or p[0] == '>'):
            par = par + p + '\n'
            inList = True
        elif inList:
            par = par + "\n" +p + '\n\n'
            inList = False
        else:
            par = par + p + '\n\n'
    par = par.strip()
    # replace instances of "chapter X" with a link to that chapter
    def bold(match) -> str:
        return "**" + match.group(0) + "**"
    par = re.sub("(melee|ranged) (weapon|spell) attack", bold, par)
    par = re.sub("(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw", bold, par)
    par = re.sub("[0-9]+d[0-9]+ (acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder) damage", bold, par)
    return par

def school(code):
    if code=='A':
        return 'abj'
    elif code=='C':
        return 'con'
    elif code=='D':
        return 'div'
    elif code=='EN':
        return 'enc'
    elif code=='EV':
        return 'evo'
    elif code=='I':
        return 'ill'
    elif code=='N':
        return 'nec'
    elif code=='T':
        return 'trs'
    else:
        return 'evo'

def unitize(unit:str)->str:
    if unit.lower() in ("ft", "feet", "foot"):
        return "ft"
    elif unit.lower() in ("mi", "miles", "mile"):
        return "mi"
    return "any"

def ratoi(rstr:str)->int:
    try:
        return int(rstr)
    except: pass
    try:
        if rstr.lower() in ("a","the"):
            return 1
        return ["zero","one","two","three","four","five","six","seven","eight","nine"].index(rstr.lower())
    except:
        return 0

DURATION_RE = re.compile("(?P<val>[0-9]+) (?P<unit>(action|bonus action|reaction|minute|hour|day))(, )?(?P<condition>.*)", re.IGNORECASE)
RANGE_RE = re.compile("(?P<val>[0-9]+) (?P<unit>(ft|feet|foot|mi|mile|miles))", re.IGNORECASE)

class Spell(object):
    originalId  = None
    name        = ''
    brandedname = None
    new         = False
    level       = ''
    school      = ''
    ritual      = False
    castingtime = ''
    range       = ''
    components  = ''
    consumed    = False
    costly      = False
    duration    = ''
    classes     = []
    text        = []
    scaling     = []
    statblocks  = []
    _icon       = None

    
    def __init__(self,spell_element):
        self.name   = ''
        self.brandedname = None
        self.new         = False
        self.level       = ''
        self.school      = ''
        self.ritual      = False
        self.castingtime = ''
        self.range       = ''
        self.components  = ''
        self.consumed    = False
        self.costly      = False
        self.duration    = ''
        self.classes     = []
        self.text        = []
        self.scaling     = []
        self.statblocks  = []

        if self.originalId is None:
            self.originalId = id_generator()

        self.deleted = getAttr(spell_element, "deleted", "false") == "true"
        self.new = getAttr(spell_element, "new", "false") == "true"

        atHigherLevelsFlag = False

        for elem in spell_element:
            if elem.tag=='name':
                self.name = elem.text
            elif elem.tag=='brandedname':
                self.brandedname = elem.text
            elif elem.tag=='level':
                self.level = int(elem.text)
            elif elem.tag=='school':
                self.school = school(elem.text)
            elif elem.tag == 'ritual':
                if elem.text == 'YES':
                    self.ritual = True
            elif elem.tag == 'time':
                self.castingtime = elem.text
            elif elem.tag == 'range':
                self.range = elem.text
            elif elem.tag == 'components':
                if 'which the spell consume' in elem.text:
                    self.consumed = True
                if ' gp' in elem.text:
                    self.costly = True
                self.components = elem.text
            elif elem.tag == 'duration':
                self.duration = elem.text
            elif elem.tag == 'classes':
                for c in [x.strip() for x in elem.text.split(',')]:
                    if c not in self.classes:
                        self.classes.append(c)
            elif elem.tag == 'text':
                if atHigherLevelsFlag:
                    self.scaling.append(elem.text)
                elif elem.text[0:23] == '***At Higher Levels:***':
                    self.scaling.append(elem.text)
                    atHigherLevelsFlag = True
                else:
                    self.text.append(elem.text)
            elif elem.tag == 'statblock':
                for sbe in elem:
                    if sbe.tag == 'text':
                        self.statblocks.append(sbe.text)
    
    @property
    def _components(self)->tuple:
        return tuple(x.strip() for x in self.components.split("(")[0].split(","))

    @property
    def isVerbal(self)->bool:
        return "V" in self._components

    @property
    def isSomatic(self)->bool:
        return "S" in self._components

    @property
    def isMaterial(self)->bool:
        return "M" in self._components

    @property
    def componentText(self)->Union[str,None]:
        match = re.search("\(.*\)", self.components)
        if match:
            return match.group(0)[1:-1]
        return None

    @property
    def isConcentration(self)->bool:
        return self.duration.strip().startswith("Concentration")

    @property
    def parsedCastingTime(self)->Tuple[int, str, str]:
        match = DURATION_RE.match(self.castingtime)
        if match is not None:
            val = int(match.group("val"))
            unit = match.group("unit").lower()
            condition = match.group("condition")

            if unit == "bonus action":
                unit = "bonus"

            return (val, unit, condition)
        return (0, "", "")

    @property
    def parsedRange(self)->Tuple[int, str]:
        match = RANGE_RE.match(self.range)
        if match is not None:
            val = int(match.group("val"))
            unit = unitize(match.group("unit").lower())
            return (val, unit)
        if self.range.lower() == "touch":
            return (None, "touch")
        if self.range.lower().startswith("self"):
            return (None, "self")
        return (None, "any")

    @property
    def paragraphs(self)->str:
        md = makeParagraphs(self.text)
        if len(self.scaling) > 0:
            md += "\n\n" + makeParagraphs(self.scaling)
        return md.strip()
    
    @property
    def cost(self)->int:
        total = 0
        for match in re.findall("[0-9][0-9,]* gp", nvl(self.componentText,"")):
            total += int(match.replace(",","").replace(" gp",""))
        return total
    
    @property
    def parsedTargets(self)->dict:
        result = {
            "value":None,
            "width":None,
            "units":"",
            "type": "unset"
            }
        UNITS = "(ft|feet|foot|mi|mile|miles|in|inch|inches)"
        WALL_RE = re.compile(f"(?P<value>[0-9]+) (?P<units>{UNITS}) long, [0-9]+ {UNITS} high, and [0-9]+ {UNITS} thick")
        match = WALL_RE.search(self.paragraphs)
        if match:
            result["value"] = int(match.group("value"))
            result["units"] = unitize(match.group("units"))
            result["type"]  = "wall"
            return result
        
        LINE_RE = re.compile("[0-9]+-(foot|mile)[- ]wide, (?P<value>[0-9]+)-(?P<units>foot|mile)[- ]long line", re.IGNORECASE)
        match = LINE_RE.search(self.paragraphs)
        if match:
            result["value"] = int(match.group("value"))
            result["units"] = unitize(match.group("units"))
            result["type"]  = "line"
            return result
        
        LINE_2_RE = re.compile(f"line (?P<value>[0-9]+)[- ](?P<units>{UNITS})[- ]long and [0-9]+[- ]{UNITS}[- ]wide", re.IGNORECASE)
        match = LINE_2_RE.search(self.paragraphs)
        if match:
            result["value"] = int(match.group("value"))
            result["units"] = unitize(match.group("units"))
            result["type"]  = "line"
            return result
        
        CYLINDER_RE = re.compile("(?P<value>[0-9]+)-(?P<units>foot|mile)-radius, [0-9]+-(foot|mile)-high cylinder", re.IGNORECASE)
        match = CYLINDER_RE.search(self.paragraphs)
        if match:
            result["value"] = int(match.group("value"))
            result["units"] = unitize(match.group("units"))
            result["type"]  = "cylinder"
            return result
        
        SPHERE_RE = re.compile("(?P<value>[0-9]+)-(?P<units>foot|mile)-radius sphere", re.IGNORECASE)
        match = SPHERE_RE.search(self.paragraphs)
        if match:
            result["value"] = int(match.group("value"))
            result["units"] = unitize(match.group("units"))
            result["type"]  = "sphere"
            return result
        
        RADIUS_RE = re.compile("(?P<value>[0-9]+)-(?P<units>foot|mile) radius", re.IGNORECASE)
        match = RADIUS_RE.search(self.paragraphs)
        if match:
            result["value"] = int(match.group("value"))
            result["units"] = unitize(match.group("units"))
            result["type"]  = "radius"
            return result
        
        WITHIN_RE = re.compile("within (?P<value>[0-9]+) (?P<units>ft|foot|feet|mi|mile|miles)", re.IGNORECASE)
        match = WITHIN_RE.search(self.paragraphs)
        if match:
            result["value"] = int(match.group("value"))
            result["units"] = unitize(match.group("units"))
            result["type"]  = "radius"
            return result
        
        OTHER_AREA_RE = re.compile("(?P<value>[0-9]+)-(?P<units>foot|mile) (?P<shape>cone|square|cube)", re.IGNORECASE)
        match = OTHER_AREA_RE.search(self.paragraphs)
        if match:
            result["value"] = int(match.group("value"))
            result["units"] = unitize(match.group("units"))
            result["type"]  = match.group("shape")
            return result
        
        if self.range.lower() == "self":
            result["type"] = "self"
            return result
        
        CREATURE_LIST = "(creature|beast|aberration|celestial|elemental)"
        NUM_LIST = "([0-9]+|a|the|one|two|three|four|five|six|seven|eight|nine)"
        CREATURE_TARGET_RE = re.compile(f"(?P<you>you and )?up to (?P<num>{NUM_LIST}) (?P<willing>willing )?{CREATURE_LIST}s?", re.IGNORECASE)
        match = CREATURE_TARGET_RE.search(self.paragraphs)
        if match:
            result["value"] = ratoi(match.group("num").lower())
            if match.group("you"):
                result["value"] += 1
            if match.group("willing"):
                result["type"]  = "ally"
            else:
                result["type"]  = "creature"
            return result
        
        CREATURE_TARGET_2_RE = re.compile(f"(?P<num>{NUM_LIST}) ((tiny|small|medium|large|huge|gargantuan) (or smaller )?)?(?P<willing>willing )?{CREATURE_LIST}s?", re.IGNORECASE)
        match = CREATURE_TARGET_2_RE.search(self.paragraphs)
        if match:
            val = ratoi(match.group("num").lower())
            if val > 0:
                result["value"] = val
                if match.group("willing"):
                    result["type"]  = "ally"
                else:
                    result["type"]  = "creature"
                return result
        
        OBJECT_TARGET_RE = re.compile(f"object|weapon|corpse|pebble", re.IGNORECASE)
        match = OBJECT_TARGET_RE.search(self.paragraphs)
        if match:
            result["value"] = 1
            result["type"] = "object"
            return result
        
        AREA_TARGET_RE = re.compile(f"Each {CREATURE_LIST} that (starts|ends) (its|their) turn", re.IGNORECASE)
        match = AREA_TARGET_RE.search(self.paragraphs)
        if match:
            result["units"] = "any"
            result["type"] = "space"
            return result
        
        if "within range" in self.paragraphs:
            result["units"] = "any"
            result["type"] = "space"
            return result
        
        if "floor space" in self.paragraphs:
            result["units"] = "any"
            result["type"] = "space"
            return result
        
        return result

    @property
    def saveType(self)->Union[str,None]:
        SAVE_RE = re.compile(f"(?P<stat>Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw", re.IGNORECASE)
        match = SAVE_RE.search(self.paragraphs)
        if match:
            return match.group("stat")[:3].lower()
        return ""
    
    @property
    def actionType(self)->str:
        if self.saveType:
            return "save"
        if "melee spell attack" in self.paragraphs:
            return "msak"
        if "ranged spell attack" in self.paragraphs:
            return "rsak"
        if "melee weapon attack" in self.paragraphs:
            return "mwak"
        if "ranged weapon attack" in self.paragraphs:
            return "rwak"
        if "melee attack" in self.paragraphs:
            return "mwak"
        if "ranged attack" in self.paragraphs:
            return "rwak"
        return "util"
    
    @property
    def keywords(self):
        kw = set([self.school.lower()])

        classes = set(c.lower() for c in self.classes)
        kw.update(classes)

        if "warlock" in classes and len(classes) == 1:
            kw.add("occult")
        if "bard" in classes and len(classes) == 1:
            kw.add("music")
        if len(classes & set(("druid", "ranger",))) > 1 and len(classes - set(("druid", "ranger",))) == 0:
            kw.add("nature")
        if len(classes & set(("druid", "cleric", "paladin"))) > 1 and len(classes - set(("druid", "cleric", "paladin",))) == 0:
            kw.add("holy")

        if self.isVerbal:
            kw.add("verbal")
        if self.isSomatic:
            kw.add("somatic")
        if self.isMaterial:
            kw.add("material")
        
        if self.new:
            kw.add("custom")

        # get keywords from the spell
        skw = ABILITY_SCORES + CONDITIONS + [f"{d} damage" for d in DAMAGE_TYPES]
        
        for skwi in skw:
            for t in self.text:
                if skwi in t.lower():
                    kw.add(skwi)
                    break
        
        # check for teleportation
        for t in self.text:
            if "teleport" in t.lower() or "transportation" in t.lower():
                kw.add("teleport")
                break
        
        # check for healing magic
        for t in self.text:
            if "healing" in t.lower() or "regains a number of hit points" in t.lower() or "regains hit points" in t.lower():
                kw.add("healing")
                break
        
        # check for resurrection magic
        for t in self.text:
            if "returns to life" in t.lower() or "reincarnated" in t.lower():
                kw.add("resurrection")
                break
        return list(kw)
    
    @property
    def icon(self):
        if self._icon:
            return self._icon
        if "healing" in self.keywords:
            return "icons/magic/life/heart-cross-green.webp"
        if "resurrection" in self.keywords:
            return "icons/magic/life/heart-cross-strong-purple-orange.webp"
        if "teleport" in self.keywords:
            return "icons/magic/symbols/runes-star-pentagon-magenta.webp"
        
        # class classes
        if "occult" in self.keywords:
            return "icons/magic/symbols/runes-carved-stone-red.webp"
        if "music" in self.keywords:
            return "icons/tools/instruments/harp-yellow-teal.webp"
        if "nature" in self.keywords:
            return "icons/magic/nature/leaf-drip-light-green.webp"
        if "holy" in self.keywords:
            return "icons/magic/holy/prayer-hands-glowing-yellow-green.webp"

        # schools
        if "abj" in self.keywords:
            return "icons/magic/light/explosion-star-large-pink.webp"
        if "con" in self.keywords:
            return "icons/magic/nature/wolf-paw-glow-large-orange.webp"
        if "div" in self.keywords:
            return "icons/magic/perception/orb-crystal-ball-scrying-blue.webp"
        if "enc" in self.keywords:
            return "icons/magic/air/fog-gas-smoke-swirling-pink.webp"
        if "evo" in self.keywords:
            return "icons/magic/fire/blast-jet-stream-embers-yellow.webp"
        if "ill" in self.keywords:
            return "icons/magic/control/hypnosis-mesmerism-eye.webp"
        if "nec" in self.keywords:
            return "icons/magic/death/skeleton-bird-skull-gray.webp"
        if "trs" in self.keywords:
            return "icons/magic/water/pseudopod-swirl-blue.webp"
        return "icons/magic/symbols/runes-star-blue.webp"

    @icon.setter
    def icon(self, value):
        self._icon = value

    def descriptionHTML(self):
        html = markdown(self.paragraphs, extensions=['markdown.extensions.extra'])
        spellToken = re.compile("\[(?P<plus>\+?)SPELL +spell=(?P<quot>[\"'])(?P<spell>(.*))(?P=quot)(?P=plus)\]")
        html = spellToken.sub(lambda m: "<em>"+m.group("spell")+"</em>", html)
        return html.replace("\n","")

    def toDb(self):
        dbSpell = {
            "_id": self.originalId,
            "name": self.name,
            "ownership":{"default":0},
            "type":"spell",
            "system": {
                "description": {
                    "value": self.descriptionHTML(),
                    "chat": "",
                    "unidentified": ""
                },
                "source": "SRD 5.1",
                "activation": {
                    "type": self.parsedCastingTime[1],
                    "cost": self.parsedCastingTime[0],
                    "condition": self.parsedCastingTime[2]
                },
                "duration": {
                    "value": "1",
                    "units": "hour"
                },
                "cover": None,
                "target": self.parsedTargets,
                "range": {
                    "value": self.parsedRange[0],
                    "long": None,
                    "units": self.parsedRange[1]
                },
                "uses": {
                    "value": None,
                    "max": "",
                    "per": None,
                    "recovery": ""
                },
                "consume": {
                    "type": "",
                    "target": None,
                    "amount": None
                },
                "ability": "",
                "actionType": self.actionType,
                "attackBonus": "",
                "chatFlavor": "",
                "critical": {
                    "threshold": None,
                    "damage": ""
                },
                "damage": {
                    "parts": [],
                    "versatile": ""
                },
                "formula": "",
                "save": {
                    "ability": self.saveType,
                    "dc": None,
                    "scaling": "spell"
                },
                "level": self.level,
                "school": self.school,
                "components": {
                    "vocal": self.isVerbal,
                    "somatic": self.isSomatic,
                    "material": self.isMaterial,
                    "ritual": self.ritual,
                    "concentration": self.isConcentration
                },
                "materials": {
                    "value": self.componentText,
                    "consumed": self.consumed,
                    "cost": self.cost,
                    "supply": 0
                },
                "preparation": {
                    "mode": "prepared",
                    "prepared": False
                },
                "scaling": {
                    "mode": "none",
                    "formula": ""
                }
            },
            "sort": 0,
            "flags": {},
            "img": self.icon,
            "effects": [],
            "folder": None,
            "_stats": {
                "systemId": "dnd5e",
                "systemVersion": "2.1.0",
                "coreVersion": "10.291",
                "createdTime": 1661787234052,
                "modifiedTime": int(time.time()),
                "lastModifiedBy": "RightHandOfVecna"
            }
        }

        return dbSpell



def loadSpells(xml: str):
    tree = ET.parse(xml)
    root = tree.getroot()
    for child in root:
        if child.tag.lower() == 'spell':
            name=child.find('name').text
            accessor=cmdize(name)
            spellData[accessor] = Spell(child)
    return spellData






# eof
