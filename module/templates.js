/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function() {

  // Define template paths to load
  const templatePaths = [

    // Actor Sheet Partials
    "public/systems/dnd5e/templates/actors/parts/actor-traits.html",

    // Actor Partials - OLD
    "public/systems/dnd5e/templates/actors/actor-attributes.html",
    "public/systems/dnd5e/templates/actors/actor-abilities.html",
    "public/systems/dnd5e/templates/actors/actor-biography.html",
    "public/systems/dnd5e/templates/actors/actor-skills.html",
    "public/systems/dnd5e/templates/actors/actor-traits.html",
    "public/systems/dnd5e/templates/actors/actor-classes.html",

    // Item Sheet Partials
    "public/systems/dnd5e/templates/items/parts/item-action.html",
    "public/systems/dnd5e/templates/items/parts/item-activation.html",
    "public/systems/dnd5e/templates/items/parts/item-description.html"
  ];

  // Load the template parts
  return loadTemplates(templatePaths);
};
