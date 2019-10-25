
const DND5E_TEMPLATE_METADATA = {
  "actor": {
    "data": {
      "abilities": {
        "str": {
          "type": "Number",
          "label": "Strength"
        },
        "dex": {
          "type": "Number",
          "label": "Dexterity"
        },
        "con": {
          "type": "Number",
          "label": "Constitution"
        },
        "int": {
          "type": "Number",
          "label": "Intelligence"
        },
        "wis": {
          "type": "Number",
          "label": "Wisdom"
        },
        "cha": {
          "type": "Number",
          "label": "Charisma"
        }
      },
      "attributes": {
        "ac": {
          "type": "Number",
          "label": "Armor Class"
        },
        "hp": {
          "type": "Number",
          "label": "Hit Points",
        },
        "init": {
          "type": "Number",
          "label": "Initiative Modifier"
        },
        "prof": {
          "type": "Number",
          "label": "Proficiency"
        },
        "speed": {
          "type": "String",
          "label": "Movement Speed"
        },
        "spellcasting": {
          "type": "String",
          "label": "Spellcasting Ability"
        },
        "spelldc": {
          "type": "Number",
          "label": "Spell DC"
        }
      },
      "details": {
        "alignment": {
          "type": "String",
          "label": "Alignment"
        },
        "biography": {
          "type": "String",
          "label": "Biography"
        },
        "race": {
          "type": "String",
          "label": "Race"
        }
      },
      "skills": {
        "acr": {
          "type": "Number",
          "label": "Acrobatics",
          "value": 0,
          "ability": "dex"
        },
        "ani": {
          "type": "Number",
          "label": "Animal Handling",
          "value": 0,
          "ability": "wis"
        },
        "arc": {
          "type": "Number",
          "label": "Arcana"
        },
        "ath": {
          "type": "Number",
          "label": "Athletics"
        },
        "dec": {
          "type": "Number",
          "label": "Deception"
        },
        "his": {
          "type": "Number",
          "label": "History"
        },
        "ins": {
          "type": "Number",
          "label": "Insight"
        },
        "itm": {
          "type": "Number",
          "label": "Intimidation"
        },
        "inv": {
          "type": "Number",
          "label": "Investigation"
        },
        "med": {
          "type": "Number",
          "label": "Medicine"
        },
        "nat": {
          "type": "Number",
          "label": "Nature"
        },
        "prc": {
          "type": "Number",
          "label": "Perception"
        },
        "prf": {
          "type": "Number",
          "label": "Performance"
        },
        "per": {
          "type": "Number",
          "label": "Persuasion"
        },
        "rel": {
          "type": "Number",
          "label": "Religion"
        },
        "slt": {
          "type": "Number",
          "label": "Sleight of Hand"
        },
        "ste": {
          "type": "Number",
          "label": "Stealth"
        },
        "sur": {
          "type": "Number",
          "label": "Survival"
        }
      },
      "traits": {
        "size": {
          "type": "String",
          "label": "Size"
        },
        "senses": {
          "type": "String",
          "label": "Senses"
        },
        "perception": {
          "type": "Number",
          "label": "Passive Perception"
        },
        "languages": {
          "type": "String",
          "label": "Known Languages"
        },
        "di": {
          "type": "Array",
          "label": "Damage Immunities"
        },
        "dr": {
          "type": "Array",
          "label": "Damage Resistances"
        },
        "dv": {
          "type": "Array",
          "label": "Damage Vulnerabilities"
        },
        "ci": {
          "type": "Array",
          "label": "Condition Immunities"
        }
      },
      "currency": {
        "pp": {
          "type": "Number",
          "label": "Platinum"
        },
        "gp": {
          "type": "Number",
          "label": "Gold"
        },
        "ep": {
          "type": "Number",
          "label": "Electrum"
        },
        "sp": {
          "type": "Number",
          "label": "Silver"
        },
        "cp": {
          "type": "Number",
          "label": "Copper"
        }
      },
      "spells": {
        "spell0": {
          "type": "Number",
          "label": "Cantrip"
        },
        "spell1": {
          "type": "Number",
          "label": "1st Level"
        },
        "spell2": {
          "type": "Number",
          "label": "2nd Level"
        },
        "spell3": {
          "type": "Number",
          "label": "3rd Level"
        },
        "spell4": {
          "type": "Number",
          "label": "4th Level"
        },
        "spell5": {
          "type": "Number",
          "label": "5th Level"
        },
        "spell6": {
          "type": "Number",
          "label": "6th Level"
        },
        "spell7": {
          "type": "Number",
          "label": "7th Level"
        },
        "spell8": {
          "type": "Number",
          "label": "8th Level"
        },
        "spell9": {
          "type": "Number",
          "label": "9th Level"
        }
      }
    },
    "character": {
      "attributes": {
        "hd": {
          "type": "Number",
          "label": "Hit Dice"
        },
        "death": {
          "type": "Number",
          "label": "Death Saves"
        },
        "exhaustion": {
          "type": "Number",
          "label": "Exhaustion Level"
        },
        "inspiration": {
          "type": "Number",
          "label": "Inspiration"
        }
      },
      "details": {
        "background": {
          "type": "String",
          "label": "Background"
        },
        "level": {
          "type": "Number",
          "label": "Character Level"
        },
        "xp": {
          "type": "Number",
          "label": "Experience Points"
        },
        "trait": {
          "type": "String",
          "label": "Trait"
        },
        "ideal": {
          "type": "String",
          "label": "Ideal"
        },
        "bond": {
          "type": "String",
          "label": "Bond"
        },
        "flaw": {
          "type": "String",
          "label": "Flaw"
        }
      },
      "resources": {
        "primary": {
          "type": "String",
          "label": "Primary Resource"
        },
        "secondary": {
          "type": "String",
          "label": "Secondary Resource"
        }
      }
    },
    "npc": {
      "details": {
        "type": {
          "type": "String",
          "label": "Creature Type"
        },
        "environment": {
          "type": "String",
          "label": "Environment"
        },
        "cr": {
          "type": "Number",
          "label": "Challenge Rating"
        },
        "xp": {
          "type": "Number",
          "label": "Kill Experience"
        },
        "source": {
          "type": "Source",
          "label": "Source Location"
        }
      },
      "resources": {
        "legact": {
          "type": "Number",
          "label": "Legendary Actions"
        },
        "legres": {
          "type": "Number",
          "label": "Legendary Resistance"
        },
        "lair": {
          "type": "Boolean",
          "label": "Lair Action"
        }
      }
    }
  },
  "item": {
    "data": {
      "description": {
        "type": "String",
        "label": "Description"
      },
      "source": {
        "type": "String",
        "label": "Source"
      }
    },
    "weapon": {
      "quantity": {
        "type": "Number",
        "label": "Quantity"
      },
      "weight": {
        "type": "Number",
        "label": "Weight"
      },
      "price": {
        "type": "String",
        "label": "Price"
      },
      "weaponType": {
        "type": "String",
        "label": "Weapon Type"
      },
      "bonus": {
        "type": "String",
        "label": "Weapon Bonus"
      },
      "damage": {
        "type": "String",
        "label": "Damage Formula"
      },
      "damageType": {
        "type": "String",
        "label": "Damage Type"
      },
      "damage2": {
        "type": "String",
        "label": "Alternate Damage"
      },
      "damage2Type": {
        "type": "String",
        "label": "Alternate Type"
      },
      "range": {
        "type": "String",
        "label": "Weapon Range"
      },
      "properties": {
        "type": "String",
        "label": "Weapon Properties"
      },
      "proficient": {
        "type": "Boolean",
        "label": "Proficient"
      },
      "ability": {
        "type": "String",
        "label": "Offensive Ability"
      },
      "attuned": {
        "type": "Boolean",
        "label": "Attuned"
      },
      "equipped": {
        "type": "Boolean",
        "label": "Equipped"
      },
      "rarity": {
        "type": "String",
        "label": "Rarity"
      }
    },
    "equipment": {
      "quantity": {
        "type": "Number",
        "label": "Quantity"
      },
      "weight": {
        "type": "Number",
        "label": "Weight"
      },
      "price": {
        "type": "String",
        "label": "Price"
      },
      "armor": {
        "type": "Number",
        "label": "Armor Value"
      },
      "armorType": {
        "type": "String",
        "label": "Armor Type"
      },
      "strength": {
        "type": "Number",
        "label": "Required Strength"
      },
      "stealth": {
        "type": "Boolean",
        "label": "Stealth Disadvantage"
      },
      "proficient": {
        "type": "Boolean",
        "label": "Proficient"
      },
      "attuned": {
        "type": "Boolean",
        "label": "Attuned"
      },
      "equipped": {
        "type": "Boolean",
        "label": "Equipped"
      },
      "rarity": {
        "type": "String",
        "label": "Rarity"
      }
    },
    "consumable": {
      "quantity": {
        "type": "Number",
        "label": "Quantity"
      },
      "weight": {
        "type": "Number",
        "label": "Weight"
      },
      "price": {
        "type": "String",
        "label": "Price"
      },
      "consumableType": {
        "type": "String",
        "label": "Consumable Type"
      },
      "charges": {
        "type": "Number",
        "label": "Charges"
      },
      "consume": {
        "type": "String",
        "label": "Roll on Consume"
      },
      "autoUse": {
        "type": "Boolean",
        "label": "Consume on Use"
      },
      "autoDestroy": {
        "type": "Boolean",
        "label": "Destroy on Empty"
      },
      "attuned": {
        "type": "Boolean",
        "label": "Attuned"
      },
      "equipped": {
        "type": "Boolean",
        "label": "Equipped"
      },
      "rarity": {
        "type": "String",
        "label": "Rarity"
      }
    },
    "tool": {
      "quantity": {
        "type": "Number",
        "label": "Quantity"
      },
      "weight": {
        "type": "Number",
        "label": "Weight"
      },
      "price": {
        "type": "String",
        "label": "Price"
      },
      "ability": {
        "type": "String",
        "label": "Default Ability"
      },
      "proficient": {
        "type": "Number",
        "label": "Proficiency"
      }
    },
    "backpack": {
      "quantity": {
        "type": "Number",
        "label": "Quantity"
      },
      "weight": {
        "type": "Number",
        "label": "Weight"
      },
      "price": {
        "type": "String",
        "label": "Price"
      },
      "attuned": {
        "type": "Boolean",
        "label": "Attuned"
      },
      "equipped": {
        "type": "Boolean",
        "label": "Equipped"
      },
      "rarity": {
        "type": "String",
        "label": "Rarity"
      }
    },
    "class": {
      "levels": {
        "type": "String",
        "label": "Class Levels"
      },
      "subclass": {
        "type": "String",
        "label": "Subclass"
      }
    },
    "spell": {
      "spellType": {
        "type": "String",
        "label": "Spell Type"
      },
      "level": {
        "type": "Number",
        "label": "Spell Level"
      },
      "school": {
        "type": "String",
        "label": "Spell School"
      },
      "components": {
        "type": "String",
        "label": "Spell Components"
      },
      "materials": {
        "type": "String",
        "label": "Materials"
      },
      "target": {
        "type": "String",
        "label": "Target"
      },
      "range": {
        "type": "String",
        "label": "Range"
      },
      "time": {
        "type": "String",
        "label": "Casting Time"
      },
      "duration": {
        "type": "String",
        "label": "Duration"
      },
      "damage": {
        "type": "String",
        "label": "Spell Damage"
      },
      "damageType": {
        "type": "String",
        "label": "Damage Type"
      },
      "save": {
        "type": "String",
        "label": "Saving Throw"
      },
      "ability": {
        "type": "String",
        "label": "Spellcasting Ability"
      },
      "concentration": {
        "type": "Boolean",
        "label": "Requires Concentration"
      },
      "ritual": {
        "type": "Boolean",
        "label": "Cast as Ritual"
      },
      "prepared": {
        "type": "Boolean",
        "label": "Prepared Spell"
      }
    },
    "feat": {
      "featType": {
        "type": "String",
        "label": "Feat Type"
      },
      "requirements": {
        "type": "String",
        "label": "Requirements"
      },
      "ability": {
        "type": "String",
        "label": "Ability Modifier"
      },
      "target": {
        "type": "String",
        "label": "Target"
      },
      "range": {
        "type": "String",
        "label": "Range"
      },
      "time": {
        "type": "String",
        "label": "Casting Time"
      },
      "duration": {
        "type": "String",
        "label": "Duration"
      },
      "damage": {
        "type": "String",
        "label": "Ability Damage"
      },
      "damageType": {
        "type": "String",
        "label": "Damage Type"
      },
      "save": {
        "type": "String",
        "label": "Saving Throw"
      },
      "uses": {
        "type": "Number",
        "label": "Limited Uses"
      }
    }
  }
};