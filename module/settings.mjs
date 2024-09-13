import { ModuleArtConfig } from "./module-art.mjs";
import CompendiumBrowserSourceConfig from "./applications/compendium-browser-source-config.mjs";

/**
 * Register all of the system's keybindings.
 */
export function registerSystemKeybindings() {
  game.keybindings.register("dnd5e", "skipDialogNormal", {
    name: "KEYBINDINGS.DND5E.SkipDialogNormal",
    editable: [{ key: "ShiftLeft" }, { key: "ShiftRight" }]
  });

  game.keybindings.register("dnd5e", "skipDialogAdvantage", {
    name: "KEYBINDINGS.DND5E.SkipDialogAdvantage",
    editable: [{ key: "AltLeft" }, { key: "AltRight" }]
  });

  game.keybindings.register("dnd5e", "skipDialogDisadvantage", {
    name: "KEYBINDINGS.DND5E.SkipDialogDisadvantage",
    editable: [{ key: "ControlLeft" }, { key: "ControlRight" }, { key: "OsLeft" }, { key: "OsRight" }]
  });
}

/* -------------------------------------------- */

/**
 * Register all of the system's settings.
 */
export function registerSystemSettings() {
  // Internal System Migration Version
  game.settings.register("dnd5e", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  // Challenge visibility
  game.settings.register("dnd5e", "challengeVisibility", {
    name: "SETTINGS.5eChallengeVisibility.Name",
    hint: "SETTINGS.5eChallengeVisibility.Hint",
    scope: "world",
    config: true,
    default: "player",
    type: String,
    choices: {
      all: "SETTINGS.5eChallengeVisibility.All",
      player: "SETTINGS.5eChallengeVisibility.Player",
      none: "SETTINGS.5eChallengeVisibility.None"
    }
  });

  game.settings.register("dnd5e", "attackRollVisibility", {
    name: "SETTINGS.5eAttackRollVisibility.Name",
    hint: "SETTINGS.5eAttackRollVisibility.Hint",
    scope: "world",
    config: true,
    default: "none",
    type: String,
    choices: {
      all: "SETTINGS.5eAttackRollVisibility.All",
      hideAC: "SETTINGS.5eAttackRollVisibility.HideAC",
      none: "SETTINGS.5eAttackRollVisibility.None"
    }
  });

  game.settings.register("dnd5e", "bloodied", {
    name: "SETTINGS.DND5E.BLOODIED.Name",
    hint: "SETTINGS.DND5E.BLOODIED.Hint",
    scope: "world",
    config: true,
    default: "player",
    type: String,
    choices: {
      all: "SETTINGS.DND5E.BLOODIED.All",
      player: "SETTINGS.DND5E.BLOODIED.Player",
      none: "SETTINGS.DND5E.BLOODIED.None"
    }
  });

  // Encumbrance tracking
  game.settings.register("dnd5e", "encumbrance", {
    name: "SETTINGS.5eEncumbrance.Name",
    hint: "SETTINGS.5eEncumbrance.Hint",
    scope: "world",
    config: true,
    default: "none",
    type: String,
    choices: {
      none: "SETTINGS.5eEncumbrance.None",
      normal: "SETTINGS.5eEncumbrance.Normal",
      variant: "SETTINGS.5eEncumbrance.Variant"
    }
  });

  // Rules version
  game.settings.register("dnd5e", "rulesVersion", {
    name: "SETTINGS.DND5E.RULESVERSION.Name",
    hint: "SETTINGS.DND5E.RULESVERSION.Hint",
    scope: "world",
    config: true,
    default: "modern",
    type: String,
    choices: {
      modern: "SETTINGS.DND5E.RULESVERSION.Modern",
      legacy: "SETTINGS.DND5E.RULESVERSION.Legacy"
    },
    requiresReload: true
  });

  // Rest Recovery Rules
  game.settings.register("dnd5e", "restVariant", {
    name: "SETTINGS.5eRestN",
    hint: "SETTINGS.5eRestL",
    scope: "world",
    config: true,
    default: "normal",
    type: String,
    choices: {
      normal: "SETTINGS.5eRestPHB",
      gritty: "SETTINGS.5eRestGritty",
      epic: "SETTINGS.5eRestEpic"
    }
  });

  // Diagonal Movement Rule
  if ( game.release.generation < 12 ) {
    game.settings.register("dnd5e", "diagonalMovement", {
      name: "SETTINGS.5eDiagN",
      hint: "SETTINGS.5eDiagL",
      scope: "world",
      config: true,
      default: "555",
      type: String,
      choices: {
        555: "SETTINGS.5eDiagPHB",
        5105: "SETTINGS.5eDiagDMG",
        EUCL: "SETTINGS.5eDiagEuclidean"
      },
      onChange: rule => canvas.grid.diagonalRule = rule
    });
  }

  // Allow rotating square templates
  game.settings.register("dnd5e", "gridAlignedSquareTemplates", {
    name: "SETTINGS.5eGridAlignedSquareTemplatesN",
    hint: "SETTINGS.5eGridAlignedSquareTemplatesL",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  // Proficiency modifier type
  game.settings.register("dnd5e", "proficiencyModifier", {
    name: "SETTINGS.5eProfN",
    hint: "SETTINGS.5eProfL",
    scope: "world",
    config: true,
    default: "bonus",
    type: String,
    choices: {
      bonus: "SETTINGS.5eProfBonus",
      dice: "SETTINGS.5eProfDice"
    }
  });

  // Allow feats during Ability Score Improvements
  game.settings.register("dnd5e", "allowFeats", {
    name: "SETTINGS.5eFeatsN",
    hint: "SETTINGS.5eFeatsL",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  // Use Honor ability score
  game.settings.register("dnd5e", "honorScore", {
    name: "SETTINGS.5eHonorN",
    hint: "SETTINGS.5eHonorL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true
  });

  // Use Sanity ability score
  game.settings.register("dnd5e", "sanityScore", {
    name: "SETTINGS.5eSanityN",
    hint: "SETTINGS.5eSanityL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true
  });

  // Apply Dexterity as Initiative Tiebreaker
  game.settings.register("dnd5e", "initiativeDexTiebreaker", {
    name: "SETTINGS.5eInitTBN",
    hint: "SETTINGS.5eInitTBL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  // Record Currency Weight
  game.settings.register("dnd5e", "currencyWeight", {
    name: "SETTINGS.5eCurWtN",
    hint: "SETTINGS.5eCurWtL",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  // Leveling Mode
  game.settings.register("dnd5e", "levelingMode", {
    name: "SETTINGS.DND5E.LEVELING.Name",
    hint: "SETTINGS.DND5E.LEVELING.Hint",
    scope: "world",
    config: true,
    default: "xpBoons",
    choices: {
      noxp: "SETTINGS.DND5E.LEVELING.NoXP",
      xp: "SETTINGS.DND5E.LEVELING.XP",
      xpBoons: "SETTINGS.DND5E.LEVELING.XPBoons"
    }
  });

  // Disable Advancements
  game.settings.register("dnd5e", "disableAdvancements", {
    name: "SETTINGS.5eNoAdvancementsN",
    hint: "SETTINGS.5eNoAdvancementsL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  // Disable Concentration Tracking
  game.settings.register("dnd5e", "disableConcentration", {
    name: "SETTINGS.5eNoConcentrationN",
    hint: "SETTINGS.5eNoConcentrationL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  // Collapse Item Cards (by default)
  game.settings.register("dnd5e", "autoCollapseItemCards", {
    name: "SETTINGS.5eAutoCollapseCardN",
    hint: "SETTINGS.5eAutoCollapseCardL",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
    onChange: s => {
      ui.chat.render();
    }
  });

  // Collapse Chat Card Trays
  game.settings.register("dnd5e", "autoCollapseChatTrays", {
    name: "SETTINGS.DND5E.COLLAPSETRAYS.Name",
    hint: "SETTINGS.DND5E.COLLAPSETRAYS.Hint",
    scope: "client",
    config: true,
    default: "older",
    type: String,
    choices: {
      never: "SETTINGS.DND5E.COLLAPSETRAYS.Never",
      older: "SETTINGS.DND5E.COLLAPSETRAYS.Older",
      always: "SETTINGS.DND5E.COLLAPSETRAYS.Always"
    }
  });

  // Allow Polymorphing
  game.settings.register("dnd5e", "allowPolymorphing", {
    name: "SETTINGS.5eAllowPolymorphingN",
    hint: "SETTINGS.5eAllowPolymorphingL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  // Polymorph Settings
  game.settings.register("dnd5e", "polymorphSettings", {
    scope: "client",
    default: {
      keepPhysical: false,
      keepMental: false,
      keepSaves: false,
      keepSkills: false,
      mergeSaves: false,
      mergeSkills: false,
      keepClass: false,
      keepFeats: false,
      keepSpells: false,
      keepItems: false,
      keepBio: false,
      keepVision: true,
      keepSelf: false,
      keepAE: false,
      keepOriginAE: true,
      keepOtherOriginAE: true,
      keepFeatAE: true,
      keepSpellAE: true,
      keepEquipmentAE: true,
      keepClassAE: true,
      keepBackgroundAE: true,
      transformTokens: true
    }
  });

  // Allow Summoning
  game.settings.register("dnd5e", "allowSummoning", {
    name: "SETTINGS.DND5E.ALLOWSUMMONING.Name",
    hint: "SETTINGS.DND5E.ALLOWSUMMONING.Hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  // Metric Unit Weights
  game.settings.register("dnd5e", "metricWeightUnits", {
    name: "SETTINGS.5eMetricN",
    hint: "SETTINGS.5eMetricL",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Critical Damage Modifiers
  game.settings.register("dnd5e", "criticalDamageModifiers", {
    name: "SETTINGS.5eCriticalModifiersN",
    hint: "SETTINGS.5eCriticalModifiersL",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Critical Damage Maximize
  game.settings.register("dnd5e", "criticalDamageMaxDice", {
    name: "SETTINGS.5eCriticalMaxDiceN",
    hint: "SETTINGS.5eCriticalMaxDiceL",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Strict validation
  game.settings.register("dnd5e", "strictValidation", {
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  // Dynamic art.
  game.settings.registerMenu("dnd5e", "moduleArtConfiguration", {
    name: "DND5E.ModuleArtConfigN",
    label: "DND5E.ModuleArtConfigL",
    hint: "DND5E.ModuleArtConfigH",
    icon: "fa-solid fa-palette",
    type: ModuleArtConfig,
    restricted: true
  });

  game.settings.register("dnd5e", "moduleArtConfiguration", {
    name: "Module Art Configuration",
    scope: "world",
    config: false,
    type: Object,
    default: {
      dnd5e: {
        portraits: true,
        tokens: true
      }
    }
  });

  // Compendium Browser source exclusion
  game.settings.registerMenu("dnd5e", "packSourceConfiguration", {
    name: "DND5E.CompendiumBrowser.Sources.Name",
    label: "DND5E.CompendiumBrowser.Sources.Label",
    hint: "DND5E.CompendiumBrowser.Sources.Hint",
    icon: "fas fa-book-open-reader",
    type: CompendiumBrowserSourceConfig,
    restricted: true
  });

  game.settings.register("dnd5e", "packSourceConfiguration", {
    name: "Pack Source Configuration",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  // Primary Group
  game.settings.register("dnd5e", "primaryParty", {
    name: "Primary Party",
    scope: "world",
    config: false,
    default: null,
    type: PrimaryPartyData,
    onChange: s => ui.actors.render()
  });

  // Control hints
  game.settings.register("dnd5e", "controlHints", {
    name: "DND5E.Controls.Name",
    hint: "DND5E.Controls.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  // NPC sheet default skills
  game.settings.register("dnd5e", "defaultSkills", {
    name: "SETTINGS.DND5E.DEFAULTSKILLS.Name",
    hint: "SETTINGS.DND5E.DEFAULTSKILLS.Hint",
    type: new foundry.data.fields.SetField(
      new foundry.data.fields.StringField({
        choices: () => CONFIG.DND5E.skills
      })
    ),
    default: [],
    config: true
  });
}

/**
 * Data model for tracking information on the primary party.
 *
 * @property {Actor5e} actor  Group actor representing the primary party.
 */
class PrimaryPartyData extends foundry.abstract.DataModel {
  static defineSchema() {
    return { actor: new foundry.data.fields.ForeignDocumentField(foundry.documents.BaseActor) };
  }
}

/* -------------------------------------------- */

/**
 * Register additional settings after modules have had a chance to initialize to give them a chance to modify choices.
 */
export function registerDeferredSettings() {
  game.settings.register("dnd5e", "theme", {
    name: "SETTINGS.DND5E.THEME.Name",
    hint: "SETTINGS.DND5E.THEME.Hint",
    scope: "client",
    config: false,
    default: "",
    type: String,
    choices: {
      "": "SHEETS.DND5E.THEME.Automatic",
      ...CONFIG.DND5E.themes
    },
    onChange: s => setTheme(document.body, s)
  });

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    setTheme(document.body, game.settings.get("dnd5e", "theme"));
  });
  matchMedia("(prefers-contrast: more)").addEventListener("change", () => {
    setTheme(document.body, game.settings.get("dnd5e", "theme"));
  });

  // Hook into core color scheme setting.
  const setting = game.settings.settings.get("core.colorScheme");
  const { onChange } = setting ?? {};
  if ( onChange ) setting.onChange = s => {
    onChange();
    setTheme(document.body, s);
  };
  setTheme(document.body, game.settings.get("core", "colorScheme"));
}

/* -------------------------------------------- */

/**
 * Set the theme on an element, removing the previous theme class in the process.
 * @param {HTMLElement} element  Body or sheet element on which to set the theme data.
 * @param {string} [theme=""]    Theme key to set.
 * @param {string[]} [flags=[]]  Additional theming flags to set.
 */
export function setTheme(element, theme="", flags=new Set()) {
  element.className = element.className.replace(/\bdnd5e-(theme|flag)-[\w-]+\b/g, "");

  // Primary Theme
  if ( !theme && (element === document.body) ) {
    if ( matchMedia("(prefers-color-scheme: dark)").matches ) theme = "dark";
    if ( matchMedia("(prefers-color-scheme: light)").matches ) theme = "light";
  }
  if ( theme ) {
    element.classList.add(`dnd5e-theme-${theme.slugify()}`);
    element.dataset.theme = theme;
  }
  else delete element.dataset.theme;

  // Additional Flags
  if ( (element === document.body) && matchMedia("(prefers-contrast: more)").matches ) flags.add("high-contrast");
  for ( const flag of flags ) element.classList.add(`dnd5e-flag-${flag.slugify()}`);
  element.dataset.themeFlags = Array.from(flags).join(" ");
}
