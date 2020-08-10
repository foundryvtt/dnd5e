export const registerSystemSettings = function() {

  /**
   * Track the system version upon which point a migration was last applied
   */
  game.settings.register("dnd5e", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  /**
   * Register resting variants
   */
  game.settings.register("dnd5e", "restVariant", {
    name: "SETTINGS.5eRestN",
    hint: "SETTINGS.5eRestL",
    scope: "world",
    config: true,
    default: "normal",
    type: String,
    choices: {
      "normal": "SETTINGS.5eRestPHB",
      "gritty": "SETTINGS.5eRestGritty",
      "epic": "SETTINGS.5eRestEpic",
    }
  });

  /**
   * Register diagonal movement rule setting
   */
  game.settings.register("dnd5e", "diagonalMovement", {
    name: "SETTINGS.5eDiagN",
    hint: "SETTINGS.5eDiagL",
    scope: "world",
    config: true,
    default: "555",
    type: String,
    choices: {
      "555": "SETTINGS.5eDiagPHB",
      "5105": "SETTINGS.5eDiagDMG",
      "EUCL": "SETTINGS.5eDiagEuclidean",
    },
    onChange: rule => canvas.grid.diagonalRule = rule
  });

  /**
   * Register Initiative formula setting
   */
  game.settings.register("dnd5e", "initiativeDexTiebreaker", {
    name: "SETTINGS.5eInitTBN",
    hint: "SETTINGS.5eInitTBL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  /**
   * Require Currency Carrying Weight
   */
  game.settings.register("dnd5e", "currencyWeight", {
    name: "SETTINGS.5eCurWtN",
    hint: "SETTINGS.5eCurWtL",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  /**
   * Option to disable XP bar for session-based or story-based advancement.
   */
  game.settings.register("dnd5e", "disableExperienceTracking", {
    name: "SETTINGS.5eNoExpN",
    hint: "SETTINGS.5eNoExpL",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });

  /**
   * Option to automatically create Spell Measured Template on roll
   */
  game.settings.register("dnd5e", "alwaysPlaceSpellTemplate", {
    name: "SETTINGS.5eAutoSpellTemplateN",
    hint: "SETTINGS.5eAutoSpellTemplateL",
    scope: "client",
    config: true,
    default: false,
    type: Boolean
  });

  /**
   * Option to automatically collapse Item Card descriptions
   */
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

  /**
   * Option to allow GMs to restrict polymorphing to GMs only.
   */
  game.settings.register('dnd5e', 'allowPolymorphing', {
    name: 'SETTINGS.5eAllowPolymorphingN',
    hint: 'SETTINGS.5eAllowPolymorphingL',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean
  });

  /**
   * Remember last-used polymorph settings.
   */
  game.settings.register('dnd5e', 'polymorphSettings', {
    scope: 'client',
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
      transformTokens: true
    }
  });
};
