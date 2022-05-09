import { _linkForUuid } from "./utils.js";

/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @returns {Promise}
 */
export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Shared Partials
    "systems/dnd5e/templates/actors/parts/active-effects.html",

    // Actor Sheet Partials
    "systems/dnd5e/templates/actors/parts/actor-traits.html",
    "systems/dnd5e/templates/actors/parts/actor-inventory.html",
    "systems/dnd5e/templates/actors/parts/actor-features.html",
    "systems/dnd5e/templates/actors/parts/actor-spellbook.html",
    "systems/dnd5e/templates/actors/parts/actor-warnings.html",

    // Item Sheet Partials
    "systems/dnd5e/templates/items/parts/item-action.html",
    "systems/dnd5e/templates/items/parts/item-activation.html",
    "systems/dnd5e/templates/items/parts/item-advancement.html",
    "systems/dnd5e/templates/items/parts/item-description.html",
    "systems/dnd5e/templates/items/parts/item-mountable.html",
    "systems/dnd5e/templates/items/parts/item-spellcasting.html",

    // Advancement Partials
    "systems/dnd5e/templates/advancement/parts/advancement-controls.html"
  ]);
};

/* -------------------------------------------- */

/**
 * Register custom Handlebars helpers used by 5e.
 */
export const registerHandlebarsHelpers = function() {
  Handlebars.registerHelper({
    getProperty: foundry.utils.getProperty,
    "dnd5e-linkForUuid": _linkForUuid
  });
};
