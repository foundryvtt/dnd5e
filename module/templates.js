/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function() {

  // Define template paths to load
  const templatePaths = [

    // Actor Sheet Partials
    "public/systems/dnd5e/templates/actors/actor-attributes.html",
    "public/systems/dnd5e/templates/actors/actor-abilities.html",
    "public/systems/dnd5e/templates/actors/actor-biography.html",
    "public/systems/dnd5e/templates/actors/actor-skills.html",
    "public/systems/dnd5e/templates/actors/actor-traits.html",
    "public/systems/dnd5e/templates/actors/actor-classes.html",

    // Item Sheet Partials
    "public/systems/dnd5e/templates/items/backpack-sidebar.html",
    "public/systems/dnd5e/templates/items/class-sidebar.html",
    "public/systems/dnd5e/templates/items/consumable-details.html",
    "public/systems/dnd5e/templates/items/consumable-sidebar.html",
    "public/systems/dnd5e/templates/items/equipment-details.html",
    "public/systems/dnd5e/templates/items/equipment-sidebar.html",
    "public/systems/dnd5e/templates/items/feat-details.html",
    "public/systems/dnd5e/templates/items/feat-sidebar.html",
    "public/systems/dnd5e/templates/items/spell-details.html",
    "public/systems/dnd5e/templates/items/spell-sidebar.html",
    "public/systems/dnd5e/templates/items/tool-sidebar.html",
    "public/systems/dnd5e/templates/items/weapon-details.html",
    "public/systems/dnd5e/templates/items/weapon-sidebar.html"
  ];

  // Load the template parts
  return loadTemplates(templatePaths);
};
