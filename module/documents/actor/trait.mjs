import SelectChoices from "./select-choices.mjs";

/**
 * Cached version of the base items compendia indices with the needed subtype fields.
 * @type {object}
 * @private
 */
const _cachedIndices = {};

/* -------------------------------------------- */
/*  Application                                 */
/* -------------------------------------------- */

/**
 * Get the key path to the specified trait on an actor.
 * @param {string} trait  Trait as defined in `CONFIG.DND5E.traits`.
 * @returns {string}      Key path to this trait's object within an actor's system data.
 */
export function actorKeyPath(trait) {
  const traitConfig = CONFIG.DND5E.traits[trait];
  if ( traitConfig.actorKeyPath ) return traitConfig.actorKeyPath;
  return `system.traits.${trait}`;
}

/* -------------------------------------------- */

/**
 * Get the current trait values for the provided actor.
 * @param {BlackFlagActor} actor  Actor from which to retrieve the values.
 * @param {string} trait          Trait as defined in `CONFIG.DND5E.traits`.
 * @returns {Object<number>}
 */
export function actorValues(actor, trait) {
  const keyPath = actorKeyPath(trait);
  const data = foundry.utils.getProperty(actor, keyPath);
  if ( !data ) return {};
  const values = {};

  if ( ["skills", "tool"].includes(trait) ) {
    Object.entries(data).forEach(([k, d]) => values[`${trait}:${k}`] = d.value);
  } else if ( trait === "saves" ) {
    Object.entries(data).forEach(([k, d]) => values[`${trait}:${k}`] = d.proficient);
  } else {
    data.value.forEach(v => values[`${trait}:${v}`] = 1);
  }

  return values;
}

/* -------------------------------------------- */

/**
 * Calculate the change key path for a provided trait key.
 * @param {string} key      Key for a trait to set.
 * @param {string} [trait]  Trait as defined in `CONFIG.BlackFlag.traits`, only needed if key isn't prefixed.
 * @returns {string|void}
 */
export function changeKeyPath(key, trait) {
  const split = key.split(":");
  if ( !trait ) trait = split.shift();

  const traitConfig = CONFIG.DND5E.traits[trait];
  if ( !traitConfig ) return;

  let keyPath = actorKeyPath(trait);

  if ( trait === "saves" ) {
    return `${keyPath}.${split.pop()}.proficient`;
  } else if ( ["skills", "tools"].includes(trait) ) {
    return `${keyPath}.${split.pop()}.value`;
  } else {
    return `${keyPath}.value`;
  }
}

/* -------------------------------------------- */
/*  Trait Lists                                 */
/* -------------------------------------------- */

/**
 * Build up a trait structure containing all of the children gathered from config & base items.
 * @param {string} trait  Trait as defined in `CONFIG.DND5E.traits`.
 * @returns {object}      Object with trait categories and children.
 * @private
 */
export async function categories(trait) {
  const traitConfig = CONFIG.DND5E.traits[trait];
  const config = foundry.utils.deepClone(CONFIG.DND5E[traitConfig.configKey ?? trait]);

  for ( const key of Object.keys(config) ) {
    if ( foundry.utils.getType(config[key]) !== "Object" ) config[key] = { label: config[key] };
    if ( traitConfig.children?.[key] ) {
      const children = config[key].children ??= {};
      for ( const [childKey, value] of Object.entries(CONFIG.DND5E[traitConfig.children[key]]) ) {
        if ( foundry.utils.getType(value) !== "Object" ) children[childKey] = { label: value };
        else children[childKey] = { ...value };
      }
    }
  }

  if ( traitConfig.subtypes ) {
    const keyPath = `system.${traitConfig.subtypes.keyPath}`;
    const map = CONFIG.DND5E[`${trait}ProficienciesMap`];

    // Merge all ID lists together
    const ids = traitConfig.subtypes.ids.reduce((obj, key) => {
      foundry.utils.mergeObject(obj, CONFIG.DND5E[key] ?? {});
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

      // No category for this type, add at top level
      if ( !config[type] ) config[key] = { label: index.name };

      // Add as child of appropriate category
      else {
        config[type].children ??= {};
        config[type].children[key] = { label: index.name };
      }
    }
  }

  return config;
}

/* -------------------------------------------- */

/**
 * Get a list of choices for a specific trait.
 * @param {string} trait                      Trait as defined in `CONFIG.DND5E.traits`.
 * @param {object} [options={}]
 * @param {Set<string>} [options.chosen=[]]   Optional list of keys to be marked as chosen.
 * @param {boolean} [options.prefixed=false]  Should keys be prefixed with trait type?
 * @param {boolean} [options.any=false]       Should the "Any" option be added to each category?
 * @returns {SelectChoices}                   Object mapping proficiency ids to choice objects.
 */
export async function choices(trait, { chosen=new Set(), prefixed=false, any=false }={}) {
  const traitConfig = CONFIG.DND5E.traits[trait];
  if ( !traitConfig ) return new SelectChoices();
  if ( foundry.utils.getType(chosen) === "Array" ) chosen = new Set(chosen);
  const categoryData = await categories(trait);

  let result = {};
  if ( prefixed && any ) {
    const key = `${trait}:*`;
    result[key] = {
      label: keyLabel(key).titleCase(),
      chosen: chosen.has(key), sorting: false, wildcard: true
    };
  }

  const prepareCategory = (key, data, result, prefix) => {
    let label = foundry.utils.getType(data) === "Object"
      ? foundry.utils.getProperty(data, traitConfig.labelKeyPath ?? "label") : data;
    if ( !label ) label = key;
    if ( prefixed ) key = `${prefix}:${key}`;
    result[key] = {
      label: game.i18n.localize(label),
      chosen: chosen.has(key),
      sorting: traitConfig.sortCategories === false
    };
    if ( data.children ) {
      const children = result[key].children = {};
      if ( prefixed && any ) {
        const anyKey = `${key}:*`;
        children[anyKey] = {
          label: keyLabel(anyKey).titleCase(),
          chosen: chosen.has(anyKey), sorting: false, wildcard: true
        };
      }
      Object.entries(data.children).forEach(([k, v]) => prepareCategory(k, v, children, key));
    }
  };

  Object.entries(categoryData).forEach(([k, v]) => prepareCategory(k, v, result, trait));

  return new SelectChoices(result).sorted();
}

/* -------------------------------------------- */

/**
 * Prepare an object with all possible choices from a set of keys. These choices will be grouped by
 * trait type if more than one type is present.
 * @param {Set<string>} keys  Prefixed trait keys.
 * @returns {SelectChoices}
 */
export async function mixedChoices(keys) {
  if ( !keys.size ) return new SelectChoices();
  const types = {};
  for ( const key of keys ) {
    const split = key.split(":");
    const trait = split.shift();
    const selectChoices = (await choices(trait, { prefixed: true })).filtered(new Set([key]));
    types[trait] ??= { label: traitLabel(trait), children: new SelectChoices() };
    types[trait].children.merge(selectChoices);
  }
  if ( Object.keys(types).length > 1 ) return new SelectChoices(types);
  return Object.values(types)[0].children;
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
  const traitConfig = CONFIG.DND5E.traits[trait];
  const pluralRule = (count !== undefined) ? new Intl.PluralRules(game.i18n.lang).select(count) : "other";
  if ( !traitConfig ) return game.i18n.localize(`DND5E.TraitGenericPlural.${pluralRule}`);
  return game.i18n.localize(`${traitConfig.labels.localization}.${pluralRule}`);
}

/* -------------------------------------------- */

/**
 * Retrieve the proper display label for the provided key. Will return a promise unless a categories
 * object is provided in config.
 * @param {string} key              Key for which to generate the label.
 * @param {object} [config={}]
 * @param {number} [config.count]   Number to display, only if a wildcard is used as final part of key.
 * @param {string} [config.trait]   Trait as defined in `CONFIG.DND5E.traits` if not using a prefixed key.
 * @param {boolean} [config.final]  Is this the final in a list?
 * @returns {string}                Retrieved label.
 */
export function keyLabel(key, { count, trait, final }={}) {
  let parts = key.split(":");
  const pluralRules = new Intl.PluralRules(game.i18n.lang);

  if ( !trait ) trait = parts.shift();
  const traitConfig = CONFIG.DND5E.traits[trait];
  if ( !traitConfig ) return key;
  let categoryLabel = game.i18n.localize(`${traitConfig.labels.localization}.${
    pluralRules.select(count ?? 1)}`);

  const lastKey = parts.pop();
  if ( !lastKey ) return categoryLabel;

  if ( lastKey !== "*" ) {
    // Category
    const category = CONFIG.DND5E[traitConfig.configKey ?? trait]?.[lastKey];
    if ( category ) {
      return foundry.utils.getType(category) === "Object"
        ? foundry.utils.getProperty(category, traitConfig.labelKey ?? "label") : category;
    }

    // Child
    for ( const childrenKey of Object.values(traitConfig.children ?? {}) ) {
      const childLabel = CONFIG.DND5E[childrenKey]?.[lastKey];
      if ( childLabel ) return childLabel;
    }

    // Base item
    for ( const idsKey of traitConfig.subtypes?.ids ?? [] ) {
      const baseItemId = CONFIG.DND5E[idsKey]?.[lastKey];
      if ( !baseItemId ) continue;
      const index = getBaseItem(baseItemId, { indexOnly: true });
      if ( index ) return index.name;
      else break;
    }
  }

  // Wildcards
  else {
    let type;
    if ( !parts.length ) type = categoryLabel.toLowerCase();
    else {
      const category = CONFIG.DND5E[traitConfig.configKey ?? trait]?.[parts.pop()];
      if ( !category ) return key;
      type = foundry.utils.getType(category) === "Object"
        ? foundry.utils.getProperty(category, traitConfig.labelKey ?? "label") : category;
    }
    const key = `DND5E.TraitConfigChoose${final ? "Other" : `Any${count ? "Counted" : "Uncounted"}`}`;
    return game.i18n.format(key, { count: count ?? 1, type });
  }

  return key;
}

/* -------------------------------------------- */

/**
 * Create a human readable description of the provided choice.
 * @param {TraitChoice} choice             Data for a specific choice.
 * @param {object} [options={}]
 * @param {boolean} [options.only=false]   Is this choice on its own, or part of a larger list?
 * @param {boolean} [options.final=false]  If this choice is part of a list of other grants or choices,
 *                                         is it in the final position?
 * @returns {string}
 */
export function choiceLabel(choice, { only=false, final=false }={}) {
  if ( !choice.pool.size ) return "";

  // Single entry in pool
  // { count: 3, pool: ["skills:*"] } -> any three skills
  // { count: 3, pool: ["skills:*"] } (final) -> three other skills
  if ( choice.pool.size === 1 ) {
    return keyLabel(choice.pool.first(), {
      count: (choice.count > 1 || !only) ? choice.count : null, final: final && !only
    });
  }

  const listFormatter = new Intl.ListFormat(game.i18n.lang, { type: "disjunction" });

  // Singular count
  // { count: 1, pool: ["skills:*"] } -> any skill
  // { count: 1, pool: ["thief", "skills:*"] } -> Thieves Tools or any skill
  // { count: 1, pool: ["thief", "tools:artisan:*"] } -> Thieves' Tools or any artisan tool
  if ( (choice.count === 1) && only ) {
    return listFormatter.format(choice.pool.map(key => keyLabel(key)));
  }

  // Select from a list of options
  // { count: 2, pool: ["thief", "skills:*"] } -> Choose two from thieves tools or any skill
  const choices = choice.pool.map(key => keyLabel(key));
  return game.i18n.format("DND5E.TraitConfigChooseList", {
    count: choice.count,
    list: listFormatter.format(choices)
  });
}

/* -------------------------------------------- */

/**
 * Create a human readable description of trait grants & choices.
 * @param {Set<string>} grants                       Guaranteed trait grants.
 * @param {TraitChoice[]} [choices=[]]               Trait choices.
 * @param {object} [options={}]
 * @param {string} [options.choiceMode="inclusive"]  Choice mode.
 * @returns {string}
 */
export function localizedList(grants, choices=[], { choiceMode="inclusive" }={}) {
  const choiceSections = [];

  for ( const [index, choice] of choices.entries() ) {
    const final = choiceMode === "exclusive" ? false : index === choices.length - 1;
    choiceSections.push(choiceLabel(choice, { final, only: !grants.size && choices.length === 1 }));
  }

  let sections = Array.from(grants).map(g => keyLabel(g));
  if ( choiceMode === "inclusive" ) {
    sections = sections.concat(choiceSections);
  } else {
    const choiceListFormatter = new Intl.ListFormat(game.i18n.lang, { style: "long", type: "disjunction" });
    sections.push(choiceListFormatter.format(choiceSections));
  }

  const listFormatter = new Intl.ListFormat(game.i18n.lang, { style: "long", type: "conjunction" });
  if ( !sections.length || grants.size ) return listFormatter.format(sections);
  return game.i18n.format("DND5E.TraitConfigChooseWrapper", {
    choices: listFormatter.format(sections)
  });
}
