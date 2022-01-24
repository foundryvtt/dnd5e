import SelectChoices from "./select-choices.mjs";

/**
 * Cached version of the base items compendia indices with the needed subtype fields.
 * @type {object}
 * @private
 */
const _cachedIndices = {};

/* -------------------------------------------- */
/*  Trait Lists                                 */
/* -------------------------------------------- */

/**
 * Get the key path to the specified trait on an actor.
 * @param {string} trait  Trait as defined in `CONFIG.DND5E.traits`.
 * @returns {string}      Key path to this trait's object within an actor's system data.
 */
export function actorKeyPath(trait) {
  const traitConfig = CONFIG.DND5E.traits[trait];
  if ( traitConfig.actorKeyPath ) return traitConfig.actorKeyPath;
  return `traits.${trait}`;
}

/* -------------------------------------------- */

/**
 * Fetch the categories object for the specified trait.
 * @param {string} trait  Trait as defined in `CONFIG.DND5E.traits`.
 * @returns {object}      Trait categories defined within `CONFIG.DND5E`.
 */
export function categories(trait) {
  const traitConfig = CONFIG.DND5E.traits[trait];
  return CONFIG.DND5E[traitConfig.configKey ?? trait];
}

/* -------------------------------------------- */

/**
 * Get a list of choices for a specific trait.
 * @param {string} trait             Trait as defined in `CONFIG.DND5E.traits`.
 * @param {Set<string>} [chosen=[]]  Optional list of keys to be marked as chosen.
 * @returns {SelectChoices}          Object mapping proficiency ids to choice objects.
 */
export async function choices(trait, chosen=new Set()) {
  const traitConfig = CONFIG.DND5E.traits[trait];
  if ( foundry.utils.getType(chosen) === "Array" ) chosen = new Set(chosen);

  let data = Object.entries(categories(trait)).reduce((obj, [key, data]) => {
    const label = traitConfig.labelKey ? foundry.utils.getProperty(data, traitConfig.labelKey) : data;
    obj[key] = { label, chosen: chosen.has(key) };
    return obj;
  }, {});

  if ( traitConfig.children ) {
    for ( const [categoryKey, childrenKey] of Object.entries(traitConfig.children) ) {
      const children = CONFIG.DND5E[childrenKey];
      if ( !children || !data[categoryKey] ) continue;
      data[categoryKey].children = Object.entries(children).reduce((obj, [key, label]) => {
        obj[key] = { label, chosen: chosen.has(key) };
        return obj;
      }, {});
    }
  }

  if ( traitConfig.subtypes ) {
    const keyPath = `system.${traitConfig.subtypes.keyPath}`;
    const map = CONFIG.DND5E[`${trait}ProficienciesMap`];

    // Merge all IDs lists together
    const ids = traitConfig.subtypes.ids.reduce((obj, key) => {
      if ( CONFIG.DND5E[key] ) Object.assign(obj, CONFIG.DND5E[key]);
      return obj;
    }, {});

    // Fetch base items for all IDs
    const baseItems = await Promise.all(Object.entries(ids).map(async ([key, id]) => {
      const index = await getBaseItem(id);
      return [key, index];
    }));

    // Sort base items as children of categories based on subtypes
    for ( const [key, index] of baseItems ) {
      if ( !index ) continue;

      // Get the proper subtype, using proficiency map if needed
      let type = foundry.utils.getProperty(index, keyPath);
      if ( map?.[type] ) type = map[type];

      const entry = { label: index.name, chosen: chosen.has(key) };

      // No category for this type, add at top level
      if ( !data[type] ) data[key] = entry;

      // Add as child to appropriate category
      else {
        data[type].children ??= {};
        data[type].children[key] = entry;
      }
    }
  }

  // Sort Categories
  if ( traitConfig.sortCategories ) data = dnd5e.utils.sortObjectEntries(data, "label");

  // Sort Children
  for ( const category of Object.values(data) ) {
    if ( !category.children ) continue;
    category.children = dnd5e.utils.sortObjectEntries(category.children, "label");
  }

  return new SelectChoices(data);
}

/* -------------------------------------------- */

/**
 * Fetch an item for the provided ID. If the provided ID contains a compendium pack name
 * it will be fetched from that pack, otherwise it will be fetched from the compendium defined
 * in `DND5E.sourcePacks.ITEMS`.
 * @param {string} identifier            Simple ID or compendium name and ID separated by a dot.
 * @param {object} [options]
 * @param {boolean} [options.indexOnly]  If set to true, only the index data will be fetched (will never return
 *                                       Promise).
 * @param {boolean} [options.fullItem]   If set to true, the full item will be returned as long as `indexOnly` is
 *                                       false.
 * @returns {Promise<Item5e>|object}     Promise for a `Document` if `indexOnly` is false & `fullItem` is true,
 *                                       otherwise else a simple object containing the minimal index data.
 */
export function getBaseItem(identifier, { indexOnly=false, fullItem=false }={}) {
  let pack = CONFIG.DND5E.sourcePacks.ITEMS;
  let [scope, collection, id] = identifier.split(".");
  if ( scope && collection ) pack = `${scope}.${collection}`;
  if ( !id ) id = identifier;

  const packObject = game.packs.get(pack);

  // Full Item5e document required, always async.
  if ( fullItem && !indexOnly ) return packObject?.getDocument(id);

  const cache = _cachedIndices[pack];
  const loading = cache instanceof Promise;

  // Return extended index if cached, otherwise normal index, guaranteed to never be async.
  if ( indexOnly ) {
    const index = packObject?.index.get(id);
    return loading ? index : cache?.[id] ?? index;
  }

  // Returned cached version of extended index if available.
  if ( loading ) return cache.then(() => _cachedIndices[pack][id]);
  else if ( cache ) return cache[id];
  if ( !packObject ) return;

  // Build the extended index and return a promise for the data
  const promise = packObject.getIndex({ fields: traitIndexFields() }).then(index => {
    const store = index.reduce((obj, entry) => {
      obj[entry._id] = entry;
      return obj;
    }, {});
    _cachedIndices[pack] = store;
    return store[id];
  });
  _cachedIndices[pack] = promise;
  return promise;
}

/* -------------------------------------------- */

/**
 * List of fields on items that should be indexed for retrieving subtypes.
 * @returns {string[]}  Index list to pass to `Compendium#getIndex`.
 * @protected
 */
export function traitIndexFields() {
  const fields = [];
  for ( const traitConfig of Object.values(CONFIG.DND5E.traits) ) {
    if ( !traitConfig.subtypes ) continue;
    fields.push(`system.${traitConfig.subtypes.keyPath}`);
  }
  return fields;
}

/* -------------------------------------------- */
/*  Localized Formatting Methods                */
/* -------------------------------------------- */

/**
 * Get the localized label for a specific trait type.
 * @param {string} trait    Trait as defined in `CONFIG.DND5E.traits`.
 * @param {number} [count]  Count used to determine pluralization. If no count is provided, will default to
 *                          the 'other' pluralization.
 * @returns {string}        Localized label.
 */
export function traitLabel(trait, count) {
  let typeCap;
  if ( trait.length === 2 ) typeCap = trait.toUpperCase();
  else typeCap = trait.capitalize();

  const pluralRule = ( count !== undefined ) ? new Intl.PluralRules(game.i18n.lang).select(count) : "other";
  return game.i18n.localize(`DND5E.Trait${typeCap}Plural.${pluralRule}`);
}

/* -------------------------------------------- */

/**
 * Retrieve the proper display label for the provided key.
 * @param {string} trait  Trait as defined in `CONFIG.DND5E.traits`.
 * @param {string} key    Key for which to generate the label.
 * @returns {string}      Retrieved label.
 */
export function keyLabel(trait, key) {
  const traitConfig = CONFIG.DND5E.traits[trait];
  if ( categories(trait)[key] ) {
    const category = categories(trait)[key];
    if ( !traitConfig.labelKey ) return category;
    return foundry.utils.getProperty(category, traitConfig.labelKey);
  }

  for ( const childrenKey of Object.values(traitConfig.children ?? {}) ) {
    if ( CONFIG.DND5E[childrenKey]?.[key] ) return CONFIG.DND5E[childrenKey]?.[key];
  }

  for ( const idsKey of traitConfig.subtypes?.ids ?? [] ) {
    if ( !CONFIG.DND5E[idsKey]?.[key] ) continue;
    const index = getBaseItem(CONFIG.DND5E[idsKey][key], { indexOnly: true });
    if ( index ) return index.name;
    else break;
  }

  return key;
}

/* -------------------------------------------- */

/**
 * Create a human readable description of the provided choice.
 * @param {string} trait        Trait as defined in `CONFIG.DND5E.traits`.
 * @param {TraitChoice} choice  Data for a specific choice.
 * @returns {string}
 */
export function choiceLabel(trait, choice) {
  // Select from any trait values
  if ( !choice.pool?.size ) {
    return game.i18n.format("DND5E.TraitConfigChooseAny", {
      count: choice.count,
      type: traitLabel(trait, choice.count).toLowerCase()
    });
  }

  // Select from a list of options
  const choices = choice.pool.map(key => keyLabel(trait, key));
  const listFormatter = new Intl.ListFormat(game.i18n.lang, { type: "disjunction" });
  return game.i18n.format("DND5E.TraitConfigChooseList", {
    count: choice.count,
    list: listFormatter.format(choices)
  });
}
