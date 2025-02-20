import BastionSettingsConfig from "./applications/settings/bastion-settings.mjs";
import CombatSettingsConfig from "./applications/settings/combat-settings.mjs";
import CompendiumBrowserSettingsConfig from "./applications/settings/compendium-browser-settings.mjs";
import ModuleArtSettingsConfig from "./applications/settings/module-art-settings.mjs";
import VariantRulesSettingsConfig from "./applications/settings/variant-rules-settings.mjs";
import VisibilitySettingsConfig from "./applications/settings/visibility-settings.mjs";
import BastionSetting from "./data/settings/bastion-setting.mjs";
import PrimaryPartySetting from "./data/settings/primary-party-setting.mjs";
import TransformationSetting from "./data/settings/transformation-setting.mjs";

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

  game.keybindings.register("dnd5e", "dragCopy", {
    name: "KEYBINDINGS.DND5E.DragCopy",
    editable: [{ key: "ControlLeft" }, { key: "ControlRight" }, { key: "AltLeft" }, { key: "AltRight" }]
  });

  game.keybindings.register("dnd5e", "dragMove", {
    name: "KEYBINDINGS.DND5E.DragMove",
    editable: [{ key: "ShiftLeft" }, { key: "ShiftRight" }, { key: "OsLeft" }, { key: "OsRight" }]
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

  // Polymorph Settings
  game.settings.register("dnd5e", "transformationSettings", {
    scope: "client",
    config: false,
    type: TransformationSetting
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

  // Allow rotating square templates
  game.settings.register("dnd5e", "gridAlignedSquareTemplates", {
    name: "SETTINGS.5eGridAlignedSquareTemplatesN",
    hint: "SETTINGS.5eGridAlignedSquareTemplatesL",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  // Loyalty
  game.settings.register("dnd5e", "loyaltyScore", {
    name: "SETTINGS.DND5E.LOYALTY.Name",
    hint: "SETTINGS.DND5E.LOYALTY.Hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
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

  // Allow Summoning
  game.settings.register("dnd5e", "allowSummoning", {
    name: "SETTINGS.DND5E.ALLOWSUMMONING.Name",
    hint: "SETTINGS.DND5E.ALLOWSUMMONING.Hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  // Metric Length Weights
  game.settings.register("dnd5e", "metricLengthUnits", {
    name: "SETTINGS.DND5E.METRIC.LengthUnits.Name",
    hint: "SETTINGS.DND5E.METRIC.LengthUnits.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Metric Volume Weights
  game.settings.register("dnd5e", "metricVolumeUnits", {
    name: "SETTINGS.DND5E.METRIC.VolumeUnits.Name",
    hint: "SETTINGS.DND5E.METRIC.VolumeUnits.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Metric Unit Weights
  game.settings.register("dnd5e", "metricWeightUnits", {
    name: "SETTINGS.DND5E.METRIC.WeightUnits.Name",
    hint: "SETTINGS.DND5E.METRIC.WeightUnits.Hint",
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
    type: ModuleArtSettingsConfig,
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
    type: CompendiumBrowserSettingsConfig,
    restricted: true
  });

  game.settings.register("dnd5e", "packSourceConfiguration", {
    name: "Pack Source Configuration",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  // Bastions
  game.settings.registerMenu("dnd5e", "bastionConfiguration", {
    name: "DND5E.Bastion.Configuration.Name",
    label: "DND5E.Bastion.Configuration.Label",
    hint: "DND5E.Bastion.Configuration.Hint",
    icon: "fas fa-chess-rook",
    type: BastionSettingsConfig,
    restricted: true
  });

  game.settings.register("dnd5e", "bastionConfiguration", {
    name: "Bastion Configuration",
    scope: "world",
    config: false,
    type: BastionSetting,
    default: {
      button: false,
      enabled: false,
      duration: 7
    },
    onChange: () => game.dnd5e.bastion.initializeUI()
  });

  // Combat Settings
  game.settings.registerMenu("dnd5e", "combatConfiguration", {
    name: "SETTINGS.DND5E.COMBAT.Name",
    label: "SETTINGS.DND5E.COMBAT.Label",
    hint: "SETTINGS.DND5E.COMBAT.Hint",
    icon: "fas fa-explosion",
    type: CombatSettingsConfig,
    restricted: true
  });

  game.settings.register("dnd5e", "autoRecharge", {
    name: "SETTINGS.DND5E.NPCS.AutoRecharge.Name",
    hint: "SETTINGS.DND5E.NPCS.AutoRecharge.Hint",
    scope: "world",
    config: false,
    default: "no",
    type: String,
    choices: {
      no: "SETTINGS.DND5E.NPCS.AutoRecharge.No",
      silent: "SETTINGS.DND5E.NPCS.AutoRecharge.Silent",
      yes: "SETTINGS.DND5E.NPCS.AutoRecharge.Yes"
    }
  });

  game.settings.register("dnd5e", "autoRollNPCHP", {
    name: "SETTINGS.DND5E.NPCS.AutoRollNPCHP.Name",
    hint: "SETTINGS.DND5E.NPCS.AutoRollNPCHP.Hint",
    scope: "world",
    config: false,
    default: "no",
    type: String,
    choices: {
      no: "SETTINGS.DND5E.NPCS.AutoRollNPCHP.No",
      silent: "SETTINGS.DND5E.NPCS.AutoRollNPCHP.Silent",
      yes: "SETTINGS.DND5E.NPCS.AutoRollNPCHP.Yes"
    }
  });

  game.settings.register("dnd5e", "criticalDamageModifiers", {
    name: "SETTINGS.DND5E.CRITICAL.MultiplyModifiers.Name",
    hint: "SETTINGS.DND5E.CRITICAL.MultiplyModifiers.Hint",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register("dnd5e", "criticalDamageMaxDice", {
    name: "SETTINGS.DND5E.CRITICAL.MaxDice.Name",
    hint: "SETTINGS.DND5E.CRITICAL.MaxDice.Hint",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register("dnd5e", "initiativeDexTiebreaker", {
    name: "SETTINGS.DND5E.COMBAT.DexTiebreaker.Name",
    hint: "SETTINGS.DND5E.COMBAT.DexTiebreaker.Hint",
    scope: "world",
    config: false,
    default: false,
    type: Boolean
  });

  game.settings.register("dnd5e", "initiativeScore", {
    name: "SETTINGS.DND5E.COMBAT.InitiativeScore.Name",
    hint: "SETTINGS.DND5E.COMBAT.InitiativeScore.Hint",
    scope: "world",
    config: false,
    default: "none",
    type: String,
    choices: {
      none: "SETTINGS.DND5E.COMBAT.InitiativeScore.None",
      npcs: "SETTINGS.DND5E.COMBAT.InitiativeScore.NPCs",
      all: "SETTINGS.DND5E.COMBAT.InitiativeScore.All"
    }
  });

  // Variant Rules
  game.settings.registerMenu("dnd5e", "variantRulesConfiguration", {
    name: "SETTINGS.DND5E.VARIANT.Name",
    label: "SETTINGS.DND5E.VARIANT.Label",
    hint: "SETTINGS.DND5E.VARIANT.Hint",
    icon: "fas fa-list-check",
    type: VariantRulesSettingsConfig,
    restricted: true
  });

  game.settings.register("dnd5e", "allowFeats", {
    name: "SETTINGS.DND5E.VARIANT.AllowFeats.Name",
    hint: "SETTINGS.DND5E.VARIANT.AllowFeats.Hint",
    scope: "world",
    config: false,
    default: true,
    type: Boolean
  });

  game.settings.register("dnd5e", "currencyWeight", {
    name: "SETTINGS.DND5E.VARIANT.CurrencyWeight.Name",
    hint: "SETTINGS.DND5E.VARIANT.CurrencyWeight.Hint",
    scope: "world",
    config: false,
    default: true,
    type: Boolean
  });

  game.settings.register("dnd5e", "encumbrance", {
    name: "SETTINGS.DND5E.VARIANT.Encumbrance.Name",
    hint: "SETTINGS.DND5E.VARIANT.Encumbrance.Hint",
    scope: "world",
    config: false,
    default: "none",
    type: String,
    choices: {
      none: "SETTINGS.DND5E.VARIANT.Encumbrance.None",
      normal: "SETTINGS.DND5E.VARIANT.Encumbrance.Normal",
      variant: "SETTINGS.DND5E.VARIANT.Encumbrance.Variant"
    }
  });

  game.settings.register("dnd5e", "honorScore", {
    name: "SETTINGS.DND5E.VARIANT.HonorScore.Name",
    hint: "SETTINGS.DND5E.VARIANT.HonorScore.Hint",
    scope: "world",
    config: false,
    default: false,
    type: Boolean,
    requiresReload: true
  });

  game.settings.register("dnd5e", "levelingMode", {
    name: "SETTINGS.DND5E.VARIANT.LevelingMode.Name",
    hint: "SETTINGS.DND5E.VARIANT.LevelingMode.Hint",
    scope: "world",
    config: false,
    default: "xpBoons",
    type: String,
    choices: {
      noxp: "SETTINGS.DND5E.VARIANT.LevelingMode.NoXP",
      xp: "SETTINGS.DND5E.VARIANT.LevelingMode.XP",
      xpBoons: "SETTINGS.DND5E.VARIANT.LevelingMode.XPBoons"
    }
  });

  game.settings.register("dnd5e", "proficiencyModifier", {
    name: "SETTINGS.DND5E.VARIANT.ProficiencyModifier.Name",
    hint: "SETTINGS.DND5E.VARIANT.ProficiencyModifier.Hint",
    scope: "world",
    config: false,
    default: "bonus",
    type: String,
    choices: {
      bonus: "SETTINGS.DND5E.VARIANT.ProficiencyModifier.Bonus",
      dice: "SETTINGS.DND5E.VARIANT.ProficiencyModifier.Dice"
    }
  });

  game.settings.register("dnd5e", "restVariant", {
    name: "SETTINGS.DND5E.VARIANT.Rest.Name",
    hint: "SETTINGS.DND5E.VARIANT.Rest.Hint",
    scope: "world",
    config: false,
    default: "normal",
    type: String,
    choices: {
      normal: "SETTINGS.DND5E.VARIANT.Rest.Normal",
      gritty: "SETTINGS.DND5E.VARIANT.Rest.Gritty",
      epic: "SETTINGS.DND5E.VARIANT.Rest.Epic"
    }
  });

  game.settings.register("dnd5e", "sanityScore", {
    name: "SETTINGS.DND5E.VARIANT.SanityScore.Name",
    hint: "SETTINGS.DND5E.VARIANT.SanityScore.Hint",
    scope: "world",
    config: false,
    default: false,
    type: Boolean,
    requiresReload: true
  });

  // Visibility Settings
  game.settings.registerMenu("dnd5e", "visibilityConfiguration", {
    name: "SETTINGS.DND5E.VISIBILITY.Name",
    label: "SETTINGS.DND5E.VISIBILITY.Label",
    hint: "SETTINGS.DND5E.VISIBILITY.Hint",
    icon: "fas fa-eye",
    type: VisibilitySettingsConfig,
    restricted: true
  });

  game.settings.register("dnd5e", "attackRollVisibility", {
    name: "SETTINGS.DND5E.VISIBILITY.Attack.Name",
    hint: "SETTINGS.DND5E.VISIBILITY.Attack.Hint",
    scope: "world",
    config: false,
    default: "none",
    type: String,
    choices: {
      all: "SETTINGS.DND5E.VISIBILITY.Attack.All",
      hideAC: "SETTINGS.DND5E.VISIBILITY.Attack.HideAC",
      none: "SETTINGS.DND5E.VISIBILITY.Attack.None"
    }
  });

  game.settings.register("dnd5e", "bloodied", {
    name: "SETTINGS.DND5E.BLOODIED.Name",
    hint: "SETTINGS.DND5E.BLOODIED.Hint",
    scope: "world",
    config: false,
    default: "player",
    type: String,
    choices: {
      all: "SETTINGS.DND5E.BLOODIED.All",
      player: "SETTINGS.DND5E.BLOODIED.Player",
      none: "SETTINGS.DND5E.BLOODIED.None"
    }
  });

  game.settings.register("dnd5e", "challengeVisibility", {
    name: "SETTINGS.DND5E.VISIBILITY.Challenge.Name",
    hint: "SETTINGS.DND5E.VISIBILITY.Challenge.Hint",
    scope: "world",
    config: false,
    default: "player",
    type: String,
    choices: {
      all: "SETTINGS.DND5E.VISIBILITY.Challenge.All",
      player: "SETTINGS.DND5E.VISIBILITY.Challenge.Player",
      none: "SETTINGS.DND5E.VISIBILITY.Challenge.None"
    }
  });

  game.settings.register("dnd5e", "concealItemDescriptions", {
    name: "SETTINGS.DND5E.VISIBILITY.ItemDescriptions.Name",
    hint: "SETTINGS.DND5E.VISIBILITY.ItemDescriptions.Hint",
    scope: "world",
    config: false,
    default: false,
    type: Boolean
  });

  // Primary Group
  game.settings.register("dnd5e", "primaryParty", {
    name: "Primary Party",
    scope: "world",
    config: false,
    default: null,
    type: PrimaryPartySetting,
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
  const isV13 = game.release.generation >= 13;
  const settingKey = isV13 ? "uiConfig" : "colorScheme";
  const setting = game.settings.get("core", settingKey);
  const settingConfig = game.settings.settings.get(`core.${settingKey}`);
  const { onChange } = settingConfig ?? {};
  if ( onChange ) settingConfig.onChange = (s, ...args) => {
    onChange(s, ...args);
    setTheme(document.body, isV13 ? s.colorScheme : s);
  };
  setTheme(document.body, isV13 ? setting.colorScheme : setting);
}

/* -------------------------------------------- */

/**
 * Set the theme on an element, removing the previous theme class in the process.
 * @param {HTMLElement} element     Body or sheet element on which to set the theme data.
 * @param {string} [theme=""]       Theme key to set.
 * @param {Set<string>} [flags=[]]  Additional theming flags to set.
 */
export function setTheme(element, theme="", flags=new Set()) {
  if ( foundry.utils.getType(theme) === "Object" ) theme = theme.applications;
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
