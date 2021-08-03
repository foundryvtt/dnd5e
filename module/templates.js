/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
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
    "systems/dnd5e/templates/items/parts/item-description.html",
    "systems/dnd5e/templates/items/parts/item-mountable.html",

    // App Partials
    "systems/dnd5e/templates/apps/parts/trait-list.html"
  ]);
};


/**
 * A helper to create a set of <option> elements in a <select> block grouped together
 * in <optgroup> based on the provided categories.
 *
 * @param {object} choices
 * @return {Handlebars.SafeString}
 */
function groupedSelectOptions(choices, options) {
  const localize = options.hash["localize"] ?? false;
  let selected = options.hash["selected"] ?? null;
  let blank = options.hash["blank"] ?? null;
  let labelAttr = options.hash["labelAttr"] ?? "label";
  let childrenAttr = options.hash["childrenAttr"] ?? "children";
  selected = selected instanceof Array ? selected.map(String) : [String(selected)];

  // Create an option
  const option = (name, label) => {
    if ( localize ) label = game.i18n.localize(label);
    let isSelected = selected.includes(name);
    html += `<option value="${name}" ${isSelected ? "selected" : ""}>${label}</option>`
  };

  // Create an group
  const group = (name, category) => {
    let label = category[labelAttr];
    if ( localize ) game.i18n.localize(label);
    html += `<optgroup label="${label}">`;
    children(category[childrenAttr]);
    html += "</optgroup>"
  }

  // Add children
  const children = (children) => {
    for ( let [key, child] of Object.entries(children) ) {
      if ( child[childrenAttr] ) group(name, child);
      else option(name, child[labelAttr]);
    }
  }

  // Create the options
  let html = "";
  if ( blank !== null ) option("", blank);
  children(choices);

  return new Handlebars.SafeString(html);
}


/**
 * Register custom Handlebars helpers used by 5e.
 */
export const registerHandlebarsHelpers = function() {
  Handlebars.registerHelper({
    getProperty: foundry.utils.getProperty,
    groupedSelectOptions: groupedSelectOptions
  });
};
