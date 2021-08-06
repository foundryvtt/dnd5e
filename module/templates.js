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
    "systems/dnd5e/templates/items/parts/item-selectable-trait.html",

    // App Partials
    "systems/dnd5e/templates/apps/parts/trait-list.html"
  ]);
};

/**
 * For inputs, if the value is true, add the "disabled" property, otherwise add nothing.
 * @param {boolean} value  To disable, or not to disable?
 * @return {string}
 */
function disabled(value) {
  return Boolean(value) ? "disabled" : "";
}


/**
 * Object representing a nested set of choices to be displayed in a grouped select list or a trait selector.
 *
 * @typedef {object} SelectChoices
 * @property {string} label
 * @property {boolean} [chosen]
 * @property {SelectChoices[]} [children]
 */

/**
 * A helper to create a set of <option> elements in a <select> block grouped together
 * in <optgroup> based on the provided categories.
 *
 * @param {SelectChoices} choices
 * @param {boolean} [option.localize]     Should the label be localized?
 * @param {string} [option.blank]         Name for the empty option. If nothing provided, no empty option is displayed.
 * @param {string} [option.labelAttr]     Attribute pointing to label string.
 * @param {string} [option.chosenAttr]    Attribute pointing to chosen boolean.
 * @param {string} [option.childrenAttr]  Attribute pointing to array of children.
 * @return {Handlebars.SafeString}
 */
function groupedSelectOptions(choices, options) {
  const localize = options.hash["localize"] ?? false;
  let blank = options.hash["blank"] ?? null;
  let labelAttr = options.hash["labelAttr"] ?? "label";
  let chosenAttr = options.hash["chosenAttr"] ?? "chosen";
  let childrenAttr = options.hash["childrenAttr"] ?? "children";

  // Create an option
  const option = (name, label, chosen) => {
    if ( localize ) label = game.i18n.localize(label);
    html += `<option value="${name}" ${chosen ? "selected" : ""}>${label}</option>`
  };

  // Create an group
  const group = (category) => {
    let label = category[labelAttr];
    if ( localize ) game.i18n.localize(label);
    html += `<optgroup label="${label}">`;
    children(category[childrenAttr]);
    html += "</optgroup>"
  }

  // Add children
  const children = (children) => {
    for ( let [name, child] of Object.entries(children) ) {
      if ( child[childrenAttr] ) group(child);
      else option(name, child[labelAttr], child[chosenAttr] ?? false);
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
    disabled: disabled,
    getProperty: foundry.utils.getProperty,
    groupedSelectOptions: groupedSelectOptions
  });
};
