![Up to date as of 2.0.3](https://img.shields.io/static/v1?label=dnd5e&message=2.0.3&color=informational)

This Advancement Type also contains the following options:
* **Scale Type**: This determines the values accepted on the Level sections on the right hand side
* Anything - Allows an arbitrary input including text and numbers

![Scale Value: Anything](https://github.com/foundryvtt/dnd5e/assets/86370342/3d20ec17-a88d-4398-b60a-bc7dda5a9fc0)

* Dice - Allows a configuration of number of die and die size (options include d2, d3, d4, d6, d8, d10, d12, and d20). It is recommended for features that can use a variable number of these dice to leave the count blank, and define the number used in the feature, (e.g. `1@scale.monk.martial-arts`, `2@scale.monk.martial-arts`) this will ensure accurate values if used in the damage field and critical damage is rolled. Values that are a consistent number of die can have the value column populated (e.g. Sneak Attack)

![Scale Value: Dice](https://github.com/foundryvtt/dnd5e/assets/86370342/80e49db5-8128-4edc-b2a9-3277ad7d8144)

* Numeric - Allows a configuration of a number value in the level options

![Scale Value: Numeric](https://github.com/foundryvtt/dnd5e/assets/86370342/f687de1a-c92e-4834-ac00-3170451b7129)

* Distance - Allows for numerical values in the level options, you can choose the units of Feet, Miles, Meters, and Kilometers

![Scale Value: Distance](https://github.com/foundryvtt/dnd5e/assets/86370342/496109c8-caa7-4185-97f4-bb84ab3a12eb)

* **Identifier**: Defines the identifier to be used in a formula.
* **1-20**: Used to define the scale value at a given level
