#!/usr/bin/python3

from functools import reduce
from random import randint as random, choice as choice
import re, string, json

from typing import List, Dict, Iterable

#
# Define common exceptions
#

class InternalStateError(Exception):
    pass


#
# Define functions
#

def nvl(*args):
    ''' Returns the first argument which is not None '''
    for a in args:
        if a is not None:
            return a
    return None

def avg(lst:List):
    ''' Returns the average of the given list '''
    if len(lst) <= 0:
        return 0
    return sum(lst)/len(lst)

def median(lst:List):
    ''' Returns the median of the given list '''
    if not lst:
        return 0
    lst = sorted(list(lst))
    if len(lst) % 2 == 0:
        return lst[len(lst)/2] + lst[len(lst)/2 + 1]
    return lst[int(len(lst)/2)]

def stdev(lst:List, sample:bool=False):
    '''
    Returns the standard deviation of the given list
    
    lst :: the given list of numbers
    sample :: whether or not to use the sample or population formula
    '''
    mean = avg(lst)
    variance = sum([(x-mean)**2 for x in lst])/(len(lst)-(1 if sample else 0))
    return variance**0.5

def escape(txt:str, toescape:list=['\'','\"'], escapechar:str="\\"):
    ret = txt
    for te in toescape:
        ret = ret.replace(te,escapechar+te)
    return ret

def replaceList(txt:str, replacelist:Iterable[str], replacewith:str=""):
    for r in replacelist:
        txt = txt.replace(r,replacewith)
    return txt

def cmdize(potentialInvoke):
    ''' Return a command-line safe(ish) version of the given name '''
    if potentialInvoke is None:
        return None
    if isinstance(potentialInvoke, str):
        return replaceList(replaceList(potentialInvoke.lower().strip(), ",\'():*", ""), " .\\/", "-")
    return [cmdize(x) for x in potentialInvoke]

def title(text:str):
    ''' Put the given text into title case (except "and", "or", "the", or "of") '''
    if len(text) >= 1:
        text = re.sub("[ \-][a-zA-Z]", lambda t: t.group(0).upper(), text)
        text = re.sub("\\b(And|Or|The|Of)\\b", lambda t: t.group(0).lower(), text)
        return text[0].upper() + text[1:]
    else:
        return text.upper()

def natJoin(lst:List[str], connector:str="and"):
    ''' Join the given list with commas, and the word "and" in a human-readable way '''
    if len(lst) == 0:   return ""
    elif len(lst) == 1: return lst[0]
    elif len(lst) == 2: return lst[0] + " and " + lst[1]
    else:               return ", ".join(lst[:-1:]) + f", {connector} " + lst[-1]

def atoi(text):
    return int(text) if text.isdigit() else text

def naturalSort(text):
    '''
    alist.sort(key=natural_keys) sorts in human order
    http://nedbatchelder.com/blog/200712/human_sorting.html
    (See Toothy's implementation in the comments)
    '''
    return [ atoi(c) for c in re.split(r'(\d+)', text) ]

def getDictFromTSV(fname: str):
    ''' Open the TSV file and convert it to a dictionary '''
    fd = {'root':[]}
    dc = 'root'
    with open(fname) as fp:
        for line in fp:
            if len(line) <= 0:
                continue
            elif line[0] == '$':
                dc = line[1:].strip()
                if dc not in fd:
                    fd[dc] = []
            else:
                rawmembers = line.strip().split('\t')
                members = []
                for m in rawmembers:
                    members.append(eval(m,{},{}))
                fd[dc].append(tuple(members))
    return fd


def longestCommon(items: List[str]) -> str:
    '''
    Return the longest string the given parameters have
    in common (starting at the beginning)
    '''
    if len(items) <= 0:
        return ""
    longest = ""
    for _ in range(len(items[0])):
        longest = items[0][0:len(longest)+1]
        for i in items:
            if not i.startswith(longest):
                return longest[:-1]
    return longest

def choose(choices: list, clustering:int=1):
    '''
    Choose at random from the given list

    choices :: the list of choices
    clustering :: the number of times to choose (taking the lowest result)
    '''
    if len(choices) > 0:
        return choices[min([random(0, len(choices)-1) for p in range(0, clustering)]+[len(choices)-1])]
    return None

def prepend(text:str, prefix:str):
    ''' Prepend a prefix to the start of every line of the given text '''
    return prefix + text.replace("\n","\n"+prefix)

def likeIntersection(like:List[str],values:List[str]) -> int:
    ''' Counts the number of items in "values" for which an item in "like" appears '''
    nm = 0
    lk = re.compile(".*("+"|".join([re.escape(l) for l in like])+").*", re.IGNORECASE)
    for val in values:
        if lk.match(val) is not None:
            nm += 1
    return nm

def th(number:int):
    ''' Make an ordinal number human-readable (eg. 1st, 2nd, 3rd, etc) '''
    if number is None:
        return 'NONE'
    elif number % 100 >= 10 and number % 100 <= 20:
        return f"{number}th"
    
    b10 = number % 10
    if b10 == 1:
        return f"{number}st"
    elif b10 == 2:
        return f"{number}nd"
    elif b10 == 3:
        return f"{number}rd"
    return f"{number}th"

def niceRound(number:int):
    ''' Round a number to a nice multiple '''
    roundTo = 1000
    if   (number < 1000):
        roundTo = 25
    elif (number < 10000):
        roundTo = 100
    return round(number / roundTo) * roundTo

def kwsearch(kwvals:Dict[object, object], criteria):
    '''
    Returns all keywords which match the given criteria
    
    kwvals :: a dictionary of objects which all have a keywords() function
    criteria :: a criteria string, which is a series of regular expressions
                separated by the & character
    '''
    criterias:List[str] = [c.strip() for c in criteria.split('&')]
    include_criteria = [cmdize(c) for c in criterias if not c.startswith(("!","-"))]
    exclude_criteria = [cmdize(c[1:]) for c in criterias if c.startswith(("!","-"))]
    def matches(item):
        keywords = kwvals[item].keywords()
        shouldInclude = all(any([re.match(f'.*{c}.*', cmdize(kw), re.IGNORECASE) is not None for kw in keywords]) for c in include_criteria)
        shouldExclude = any(any([re.match(f'.*{c}.*', cmdize(kw), re.IGNORECASE) is not None for c in exclude_criteria]) for kw in keywords)
        return shouldInclude and not shouldExclude
    return list(filter(matches, kwvals.keys()))

def array_apply(op, *arrs):
    maxlength = 0
    for arr in arrs:
        maxlength = max(maxlength,len(arr))
    ret = [False]*maxlength
    for i in range(len(ret)):
        ret[i] = reduce(op, [arr[i] if len(arr) > i else False for arr in arrs])
    return ret

def linearInterpolate(sequence, valueFunction, target)->float:
    '''
    Interpolate values of a sequence, given some valueFunction and a wanted target

    sequence :: an iterable of numbers, which are interpolated between
    valueFunction :: a function which converts the numbers in the sequence into the domain of the target
    target :: the desired (transformed) target, which is used to interpolate

    returns a number between any two sequential numbers in sequence (a,b)
      where the target is between valueFunction(a) and valueFunction(b),
      linearly interpolated between a and b
    '''
    last = None
    for i in sequence:
        if valueFunction(i) < target:
            if last is not None:
                interpolation = (last - i) * (target - valueFunction(i)) / (valueFunction(last)-valueFunction(i))
                return i + interpolation
            return i+0.0
        last = i
    return sequence[-1] + 0.0


def format_safe(fstring:str, tokens:Dict[str,object]):
    PRE_CONST:str = "<[("
    POST_CONST:str = ")]>"

    broken_tokens = set()
    for token in tokens:
        for match in re.finditer('\\{'+f'{token}'+'(?P<fmt>:[^\\}]*)?\\}', fstring):
            if match.group("fmt") is not None and type(tokens[token]) != int and "d" in match.group("fmt"):
                broken_tokens.add(match.group(0))
    for bt in broken_tokens:
        fstring = fstring.replace(bt, bt.replace("{",PRE_CONST).replace("}",POST_CONST))
    fstring = fstring.format(**tokens)
    for bt in broken_tokens:
        fstring = fstring.replace(bt.replace("{",PRE_CONST).replace("}",POST_CONST), bt)
    return fstring


def get_or_default(subscriptable, key, default):
    try:
        return subscriptable[key]
    except IndexError:
        return default


# D&D specific items

def crToXP(cr:float)->int:
    if   cr >= 30:   return 155000
    elif cr >= 29:   return 135000
    elif cr >= 28:   return 120000
    elif cr >= 27:   return 105000
    elif cr >= 26:   return  90000
    elif cr >= 25:   return  75000
    elif cr >= 24:   return  62000
    elif cr >= 23:   return  50000
    elif cr >= 22:   return  41000
    elif cr >= 21:   return  33000
    elif cr >= 20:   return  25000
    elif cr >= 19:   return  22000
    elif cr >= 18:   return  20000
    elif cr >= 17:   return  18000
    elif cr >= 16:   return  15000
    elif cr >= 15:   return  13000
    elif cr >= 14:   return  11500
    elif cr >= 13:   return  10000
    elif cr >= 12:   return   8400
    elif cr >= 11:   return   7200
    elif cr >= 10:   return   5900
    elif cr >=  9:   return   5000
    elif cr >=  8:   return   3900
    elif cr >=  7:   return   2900
    elif cr >=  6:   return   2300
    elif cr >=  5:   return   1800
    elif cr >=  4:   return   1100
    elif cr >=  3:   return    700
    elif cr >=  2:   return    450
    elif cr >=  1:   return    200
    elif cr >=  1/2: return    100
    elif cr >=  1/4: return     50
    elif cr >=  1/8: return     25
    return 0

def xpToCR(xp:int)->float:
    return linearInterpolate([f for f in range(30,0,-1)]+[1/2,1/4,1/8,0], crToXP, xp)

# def levelToTier(level:int)->str:
#     if   level >= 18:  return "legendary"
#     elif level >= 15:  return "heroic"
#     elif level >= 12:  return "champion"
#     elif level >=  9:  return "veteran"
#     elif level >=  6:  return "adventurer"
#     elif level >=  3:  return "journeyman"
#     else:              return "apprentice"

def id_generator(size=16, chars=string.ascii_letters + string.digits):
        return ''.join(choice(chars) for _ in range(size))    


def equalsWithout(a, b, without=("_stats",)):
    a = {**a}
    b = {**b}
    for x in without:
        del a[x]
        del b[x]
    return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)

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


# eof
