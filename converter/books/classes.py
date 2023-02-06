
from .books import Collection, CollectionLevel
from .features import Feature, CLASS_SPECIFIC_FEATURES
from ..common_lib import id_generator
from markdown import markdown
import time


class RpgClass(object):
    originalId  = None
    name        = ""
    features    = None

    def __init__(self, collection:Collection):
        self.originalId = id_generator()
        self.name = collection.text
        self.features = []

        for featureC in collection.find("Class Features").children():
            if featureC.level >= CollectionLevel.P:
                continue
            if featureC.text not in ("Hit Points", "Proficiencies", "Equipment"):
                feature = Feature(featureC)
                shouldAddClassName = feature.name == "Ability Score Improvement" and self.name in ("Fighter","Rogue")
                shouldAddClassName = shouldAddClassName or (feature.name == "Extra Attack" and self.name == "Fighter")
                shouldAddClassName = shouldAddClassName or feature.name in CLASS_SPECIFIC_FEATURES
                if shouldAddClassName:
                    feature.name = f"{feature.name} ({self.name})"
                self.features.append(feature)

