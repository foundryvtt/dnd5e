/**
 * Scan module manifests for any data that should be integrated into the system configuration.
 */
export default function registerModuleData() {
  console.groupCollapsed("D&D 5e | Registering Module Data");
  for ( const module of game.modules ) {
    if ( !module.active ) continue;
    try {
      const complete = methods.map(m => m(module)).filter(r => r);
      if ( complete.length ) {
        console.log(`D&D 5e | Registered ${module.title} data: ${complete.join(", ")}`);
      }
    } catch(err) {
      console.error(`D&D 5e | Error registering ${module.title}\n`, err.message);
    }
  }
  console.groupEnd();
}

const methods = [registerSourceBooks];

/* -------------------------------------------- */

/**
 * Register module source books from `flags.sourceBooks`.
 * @param {Module} module  Module from which to register data.
 * @returns {string|void}  Description of the data registered.
 */
function registerSourceBooks(module) {
  if ( !module.flags.dnd5e?.sourceBooks ) return;
  Object.assign(CONFIG.DND5E.sourceBooks, module.flags.sourceBooks);
  return "source book";
}
