

import re
from copy import deepcopy
from enum import IntEnum
from functools import cache, cached_property
from typing import Any, Dict, Generator, List, Tuple, Union


class CollectionLevel(IntEnum):
    DOCUMENT=0
    SECTION=1 # a group of chapters
    CHAPTER=2
    SUBCHAPTER=3
    SUBSECTION=4
    H3=5
    H4=6
    H5=7
    H6=8
    P=9
    FORMATTING_DIRECTIVE=10

    @classmethod
    def fromMarkdown(cls:type, n:int):
        if n == 1: return CollectionLevel.CHAPTER
        if n == 2: return CollectionLevel.SUBSECTION
        if n == 3: return CollectionLevel.H3
        if n == 4: return CollectionLevel.H4
        if n == 5: return CollectionLevel.H5
        if n >= 6: return CollectionLevel.H6
        return CollectionLevel.P
    
    def markdownLevel(self):
        if self == CollectionLevel.CHAPTER: return 1
        if self == CollectionLevel.SUBCHAPTER: return 1
        if self == CollectionLevel.SUBSECTION: return 2
        if self == CollectionLevel.H3: return 3
        if self == CollectionLevel.H4: return 4
        if self == CollectionLevel.H5: return 5
        if self == CollectionLevel.H6: return 6
        return 0




class Collection(object):
    """
    Collection is a collection of other collections
    """
    level:CollectionLevel
    text:str
    subcollections:List['Collection']

    def __init__(self, level:CollectionLevel, text:str):
        self.level = level
        self.text = text
        self.subcollections = []
    
    def add(self, subcollection:'Collection'):
        self.subcollections.append(subcollection)

    def children(self)->List['Collection']:
        return self.subcollections

    def _bfs(self)->Generator['Collection', None, None]:
        yield self
        lastTraversal = [self]
        while len(lastTraversal) != 0:
            lastTraversal = [child for parent in lastTraversal for child in parent.children()]
            for child in lastTraversal:
                yield child
    
    def _dfs(self)->Generator['Collection', None, None]:
        yield self
        for child in self.children():
            for child_dfs in child._dfs():
                yield child_dfs
    
    def _dfsChain(self)->Generator[List['Collection'], None, None]:
        yield [self]
        for child in self.children():
            for child_dfs in child._dfsChain():
                yield [self]+child_dfs
    
    @staticmethod
    def _traverseByLevel(traversal)->List['Collection']:
        traversal = list(traversal)
        traversalPos = {id(o):i for i,o in enumerate(traversal)}
        return sorted(traversal, key=lambda x: (x.level, traversalPos[id(x)]))
    
    def getTOC(self)->Dict[str, Tuple['Collection', dict]]:
        return {child.text:(child, child.getTOC()) for child in self.children() if child.level < CollectionLevel.P}

    def matches(self, rx:Union[re.Pattern, str])->bool:
        if isinstance(rx, str):
            rx = re.compile(re.escape(rx), flags=re.IGNORECASE)
        if rx.search(self.text) is not None:
            return True
        return False
        
    def findall(self, rx:Union[re.Pattern, str])->Generator['Collection', None, None]:
        """
        Performs a search for the string or regular expression

        Uses a mix of depth-first and semi-breadth first traversal
        (ordered by level, tiebreaker is depth-first order)
        
        rx :: if rx is a string, search for it literally. If it's a Pattern, "search" with that
        """
        if isinstance(rx, str):
            rx = re.compile(re.escape(rx), flags=re.IGNORECASE)
        for child in self._traverseByLevel(self._dfs()):
            if child.matches(rx):
                yield child
        
    def find(self, rx:Union[re.Pattern, str])->'Collection':
        """
        Performs a breadth-first search for the string or regular expression
        
        rx :: if rx is a string, search for it literally. If it's a Pattern, "search" with that
        """
        for match in self.findall(rx):
            return match
        return None

    def markdown(self, include_formatting:bool=True):
        ret = ""
        if self.level < CollectionLevel.P and self.text != "":
            ret += ("#"*(self.level.markdownLevel())+" ") + self.text
        elif self.text != "":
            ret += self.text
        for sc in self.children():
            if not include_formatting and sc.level is CollectionLevel.FORMATTING_DIRECTIVE:
                continue
            ret += "\n" + sc.markdown(include_formatting=include_formatting) + "\n"
        return ret.strip()
    
    def hierarchy(self, levels:int=-1):
        if self.level >= CollectionLevel.P or levels == 0:
            return ""
        ret = self.text
        childHs = []
        for child in self.children():
            childH = child.hierarchy(levels=levels-1)
            if childH != "":
                childHs.append("\n -> " + childH.replace("\n","\n   "))
        for i,ch in enumerate(childHs[:-1]):
            childHs[i] = ch.replace("\n ","\n|")
        if len(childHs) > 0:
            childHs[-1] = "\n`"+childHs[-1][2:]
        ret += "".join(childHs)
        return ret
    
    def linearize(self)->List['Collection']:
        lin = []
        lin.add(Collection(self.level, self.text))
        for children in self.children():
            lin.extend(children.linearize())
        return lin
    
    def __deepcopy__(self, memo:dict):
        c = Collection(self.level, self.text)
        c.subcollections = deepcopy(self.subcollections, memo)
        return c

    @classmethod
    def delinearize(cls, collections:List['Collection'], inplace:bool=True)->List['Collection']:
        if not inplace:
            collections = [deepcopy(c) for c in collections]
        # stack the collections
        rootCollections = [collections.pop(0)]
        clStack = [rootCollections[0]]
        for cl in collections:
            if min(cl.level, CollectionLevel.P) > min(clStack[-1].level, CollectionLevel.P):
                clStack[-1].add(cl)
                clStack.append(cl)
            else:
                # pop from the stack until it is
                while len(clStack) > 0 and min(cl.level, CollectionLevel.P) <= min(clStack[-1].level, CollectionLevel.P):
                    clStack.pop()
                if len(clStack) == 0:
                    rootCollections.append(cl)
                else:
                    clStack[-1].add(cl)
                clStack.append(cl)
        return rootCollections

    @classmethod
    def loadFromMarkdown(cls:type, txtmd:str)->List['Collection']:

        # remove comment blocks
        txtmd = re.sub(re.escape("<!--")+".*?"+re.escape("-->"), "", txtmd, flags=re.S).strip()

        if len(txtmd) == 0:
            raise ValueError("Cannot 'loadFromMarkdown' an all-whitespace or empty string")
        lines = [line.strip() for line in txtmd.split("\n")]
        collections = []
        while len(lines) > 0:
            if len(lines[0]) == 0:
                lines.pop(0)
            elif lines[0][0] == "#":
                lv = 1
                while lines[0][lv] == "#":
                    lv += 1
                    if len(lines[0]) <= lv:
                        raise ValueError(f"Malformed markdown: '{lines}'")
                collections.append(Collection(CollectionLevel.fromMarkdown(lv), lines.pop(0)[lv:].strip()))
            else:
                sublines = []
                while len(lines) > 0 and len(lines[0]) != 0 and lines[0][0] != "#":
                    sublines.append(lines.pop(0))
                level = CollectionLevel.P
                if len(sublines) > 0 and len(sublines[0]) > 0 and sublines[0][0] in '`<[\\':
                    level = CollectionLevel.FORMATTING_DIRECTIVE
                collections.append(Collection(level, "\n".join(sublines)))
        return cls.delinearize(collections)
        

class Book(object):
    """
    Represents a single book with a table of contents

    This has features which makes it easier to access individual "Collection"
    elements with better time complexity
    """
    root:'Collection'
    
    def __init__(self, root:'Collection'):
        self.root = root
    
    def find(self, rx:Union[re.Pattern, str])->'Collection':
        return self.root.find(rx)
    
    def findall(self, rx:Union[re.Pattern, str])->Generator['Collection', None, None]:
        return self.root.findall(rx)
    
    @cached_property
    def linearized(self)->List['Collection']:
        return self.root.linearize()
    
    @cached_property
    def _lin_indeces(self)->Dict[int, int]:
        return {id(o):i for i,o in enumerate(self.linearized)}

    @cache
    def markdown(self, include_formatting:bool=True):
        return self.root.markdown(include_formatting=include_formatting)
    
    @cached_property
    def toc(self)->Dict[str, Tuple['Collection', dict]]:
        return self.root.getTOC()
    
    @cached_property
    def _toc_inverse(self)->Dict[int, List[str]]:
        def _toc_inverse_help(tbl:dict, prevk:list):
            tmp = {id(o[0]):(prevk+[k]) for k,o in tbl.items()}
            for k, t in tbl.items():
                tmp = {**tmp, **_toc_inverse_help(t[1], prevk+[k])}
            return tmp
        inv_toc = _toc_inverse_help(self.toc, [])
        # add leaf-level items
        for dc in self.root._dfsChain():
            nid = id(dc[-1])
            if nid not in inv_toc:
                for ancestor in (id(a) for a in dc[:-1][::-1]):
                    if ancestor in inv_toc:
                        inv_toc[nid] = inv_toc[ancestor]
                        break
        return inv_toc

    def fromPath(self, *path)->'Collection':
        result = (self.root, self.toc)
        for p in path:
            result = result[1][p]
        return result[0]
    
    def toPath(self, col:'Collection')->List[str]:
        if id(col) not in self._toc_inverse:
            raise ValueError("This collection is not in the inverted table of contents")
        return list(self._toc_inverse[id(col)])



    
