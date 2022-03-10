import { DND5E } from "./config.js";

/**
 * Some Conditions that are missing from the Foundry Core token status effects but are useful for playing 5e.
 */
const conditionStatusEffects = [
  { id: "charmed",
    icon: "systems/dnd5e/icons/svg/charmed.svg",
    label: DND5E.conditionTypes.charmed
  },
  { id: "concentrating",
    icon: "systems/dnd5e/icons/svg/concentrating.svg",
    label: "DND5E.Concentrating"
  },
  { id: "grappled",
    icon: "systems/dnd5e/icons/svg/grappled.svg",
    label: DND5E.conditionTypes.grappled
  },
  { id: "incapacitated",
    icon: "systems/dnd5e/icons/svg/incapacitated.svg",
    label: DND5E.conditionTypes.incapacitated
  },
  { id: "invisible",
    icon: "systems/dnd5e/icons/svg/invisible.svg",
    label: DND5E.conditionTypes.invisible
  },
  { id: "petrified",
    icon: "systems/dnd5e/icons/svg/petrified.svg",
    label: DND5E.conditionTypes.petrified
  }
];

/**
 * Adds custom status effects and sorts the statusEffect array before mutating `CONFIG.statusEffects`
 */
export function configureStatusEffects() {
  const newStatusEffects = [
    ...CONFIG.statusEffects,
    ...conditionStatusEffects
  ];

  newStatusEffects.sort((a, b) => a.label.localeCompare(b.label));

  CONFIG.statusEffects = newStatusEffects;
}
