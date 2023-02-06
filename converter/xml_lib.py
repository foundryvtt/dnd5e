#!/usr/bin/python3

from typing import Union
import xml.etree.ElementTree as ET

from .common_lib    import nvl

import os

def getText(element, tag:str, default=None):
    try:
        return nvl(element.find(tag).text,default)
    except Exception:
        return default

def getCommaSep(element, tag:str)->list:
    val = getText(element, tag)
    if val is None:
        return []
    return val.split(", ")

def getAttr(element, attr:str, default=None):
    try:
        return element.attrib[attr]
    except Exception:
        return default

def getAttrConvert(el,attr,default="",convert=int):
    if attr in el.attrib.keys():
        try:
            return convert(el.attrib[attr])
        except Exception as e:
            print(e)
            return default                
    return default

def getFilePath(el)->str:
    for pp in el.findall("path"):
        if pp.attrib["os"] == os.name:
            return pp.text
    raise Exception(f"No path for {os.name} found")

def getBoolAttr(el,attr,default=False):
    return getAttrConvert(el,attr,default=default,convert=lambda e: e in ('true','t','y'))

def getTextConvert(el,tag,default="",convert=int):
    if el is None:
        return default
    gte = el
    if tag is not None:
        gte = el.find(tag)
        if gte is None:
            return default
    try:
        return convert(gte.text)
    except Exception as e:
        print(e)
        return default

def combineText(element):
    par = '\n\n'
    inList = False
    inTable = False
    inBlock = False
    inCodeBlock = False

    textlist = []
    if isinstance(element, ET.Element):
        textlist = [n.text for n in element.findall("text")]
    elif isinstance(element, list):
        textlist = element

    for p in textlist:
        if p == '```':
            inCodeBlock = not inCodeBlock
            par += "\n"
        if not inCodeBlock:
            if p is None:
                par += "\n\n"
                continue
            if len(p)>0:
                if inList and not p[0] == '-':
                    par += "\n"
                    inList = False
                if inTable and not p[0] == '|':
                    par += "\n"
                    inTable = False
                if inBlock and not p[0] == '>':
                    par += "\n"
                    inBlock = False
                
                if p[0] == '-':
                    par += p + '\n'
                    inList = True
                elif p[0] == '|':
                    par += p + '\n'
                    inTable = True
                elif p[0] == '>':
                    par += p + '\n'
                    inBlock = True
                else:
                    par += p + '\n\n'
        else:
            if p is None:
                par = par + "\n"
            else:
                par = par + p + "\n"
    return par.strip()


def createXMLHeader():
    mappings={
        "nbsp":"160",
        "mdash":"8212",
        "ndash":"8211",
        "rarr":"8594"
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE wrapper [' + ''.join([f'\n\t<!ENTITY {k} "&#{mappings[k]};">' for k in mappings]) + '\n]>'

def dictToXML(d:dict, indent:int=0):
    ind = "\t"*(indent+1)
    ret = ""
    if not indent:
        ret = createXMLHeader() + f"\n<root type='dict'>\n"
    for k,v in ((k,d[k]) for k in sorted(d.keys())):
        if isinstance(v, (str,float,int,bool)):
            ret += f"{ind}<de code='{k}' type='{type(v).__name__}'>{v}</de>\n"
        elif isinstance(v, list):
            ret += f"{ind}<de code='{k}' type='list'>\n"
            ret += listToXML(v, indent=indent+1)
            ret += f"{ind}</de>\n"
        elif isinstance(v, dict):
            ret += f"{ind}<de code='{k}' type='dict'>\n"
            ret += dictToXML(v, indent=indent+1)
            ret += f"{ind}</de>\n"
        else:
            raise ValueError(f"Value of {type(v)} not permitted")
    if not indent:
        ret += f"</root>"
    return ret

def listToXML(l:list, indent:int=0):
    ind = "\t"*(indent+1)
    ret = ""
    if not indent:
        ret = createXMLHeader() + f"\n<root type='list'>\n"
    for v in l:
        if isinstance(v, (str,float,int,bool)):
            ret += f"{ind}<le type='{type(v).__name__}'>{v}</le>\n"
        elif isinstance(v, list):
            ret += f"{ind}<le type='list'>\n"
            ret += listToXML(v, indent=indent+1)
            ret += f"{ind}</le>\n"
        elif isinstance(v, dict):
            ret += f"{ind}<le type='dict'>\n"
            ret += dictToXML(v, indent=indent+1)
            ret += f"{ind}</le>\n"
        else:
            raise ValueError(f"Value of {type(v)} not permitted")
    if not indent:
        ret += f"</root>"
    return ret

def collectionToXML(c:Union[dict,list], indent:int=0):
    if isinstance(c, dict):
        return dictToXML(c, indent)
    if isinstance(c, list):
        return listToXML(c, indent)
    raise TypeError(f"xml_lib.collectionToXML: value must be of type dict or list (is {type(c).__name__})")

def _elToJson(el)->Union[str,float,int,bool,dict,list]:
    elType = getAttr(el, "type", "str")
    if elType   == "str": elType = str
    elif elType == "float": elType = float
    elif elType == "int": elType = int
    elif elType == "bool": elType = bool
    elif elType == "list": elType = list
    elif elType == "dict": elType = dict

    if elType in (str,float,int):
        return elType(el.text)
    elif elType == bool:
        return el.text[0].lower() in "yt"
    elif elType == list:
        return [_elToJson(cel) for cel in el]
    elif elType == dict:
        return {getAttr(cel, "code", cel.tag):_elToJson(cel) for cel in el}
    raise Exception("Nonstandard type found")

def xmlToJson(path:str, default:type=dict)->Union[str,float,int,bool,dict,list]:
    with open(path, "r", encoding="utf-8") as fp:
        tree = ET.parse(fp)
    ret = _elToJson(tree.getroot())
    if not isinstance(ret, str) or ret.strip():
        return ret
    return default()


# eof
