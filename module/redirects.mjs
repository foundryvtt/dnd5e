/**
 * Apply legacy system SRD redirects.
 */
export function configureRedirects() {
  Object.assign(CONFIG.compendium.uuidRedirects, mappings);
}

const mappings = {
  "Compendium.dnd5e.subclasses": "Compendium.dnd5e.classes",
  "Compendium.dnd5e.classfeatures": "Compendium.dnd5e.classes"
};
