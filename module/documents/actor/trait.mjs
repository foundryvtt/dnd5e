import SelectChoices from "./select-choices.mjs";

/**
 * Cached version of the base items compendia indices with the needed subtype fields.
 * @type {object}
 * @private
 */
const _cachedIndices = {};

/**
 * Determine the appropriate label to use for a trait category.
 * @param {object|string} data  Category for which to fetch the label.
 * @param {object} config       Trait configuration data.
 * @returns {string}
 * @private
 */
function _innerLabel(data, config) {
  return foundry.utils.getType(data) === "Object"
    ? foundry.utils.getProperty(data, config.labelKeyPath ?? "label") : data;
}

/* -------------------------------------------- */
/*  Application                                 */
/* -------------------------------------------- */

/**
 * Get the schema fields for this trait on the actor.
 * @param {Actor5e} actor  Actor for which to get the fields.
 * @param {string} trait   Trait as defined in `CONFIG.DND5E.traits`.
 * @returns {object|void}
 */
export function actorFields(actor, trait) {
  const keyPath = actorKeyPath(trait);
  return (keyPath.startsWith("system.")
    ? actor.system.schema.getField(keyPath.slice(7))
    : actor.schema.getField(keyPath))?.fields;
}

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
 * @param {Actor5e} actor  Actor from which to retrieve the values.
 * @param {string} trait   Trait as defined in `CONFIG.DND5E.traits`.
 * @returns {Object<number>}
 */
export async function actorValues(actor, trait) {
  const keyPath = actorKeyPath(trait);
  const data = foundry.utils.getProperty(actor._source, keyPath);
  if ( !data ) return {};
  const values = {};
  const traitChoices = await choices(trait, {prefixed: true});

  const setValue = (k, v) => {
    const result = traitChoices.find(k);
    if ( result ) values[result[0]] = v;
  };

  if ( ["skills", "tool"].includes(trait) ) {
    Object.entries(data).forEach(([k, d]) => setValue(k, d.value));
  } else if ( trait === "saves" ) {
    Object.entries(data).forEach(([k, d]) => setValue(k, d.proficient));
  } else if ( trait === "dm" ) {
    Object.entries(data.amount).forEach(([k, d]) => setValue(k, d));
  } else {
    data.value?.forEach(v => setValue(v, 1));
  }

  if ( trait === "weapon" ) data.mastery?.value?.forEach(v => setValue(v, 2));

  return values;
}

/* -------------------------------------------- */

/**
 * Calculate the change key path for a provided trait key.
 * @param {string} key      Key for a trait to set.
 * @param {string} [trait]  Trait as defined in `CONFIG.DND5E.traits`, only needed if key isn't prefixed.
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
  } else if ( ["skills", "tool"].includes(trait) ) {
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
 * @param {string} trait       Trait as defined in `CONFIG.DND5E.traits`.
 * @returns {Promise<object>}  Object with trait categories and children.
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
    const map = CONFIG.DND5E[`${trait}ProficienciesMap`];

    // Merge all ID lists together
    const ids = traitConfig.subtypes.ids.reduce((obj, key) => {
      foundry.utils.mergeObject(obj, CONFIG.DND5E[key] ?? {});
      return obj;
    }, {});

    // Fetch base items for all IDs
    const baseItems = await Promise.all(Object.entries(ids).map(async ([key, id]) => {
      if ( foundry.utils.getType(id) === "Object" ) id = id.id;
      const index = await getBaseItem(id);
      return [key, index];
    }));

    // Sort base items as children of categories based on subtypes
    for ( const [key, index] of baseItems ) {
      if ( !index ) continue;

      // Get the proper subtype, using proficiency map if needed
      let type = index.system.type.value;
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
 * @returns {Promise<SelectChoices>}          Object mapping proficiency ids to choice objects.
 */
export async function choices(trait, { chosen=new Set(), prefixed=false, any=false }={}) {
  const traitConfig = CONFIG.DND5E.traits[trait];
  if ( !traitConfig ) return new SelectChoices();
  if ( foundry.utils.getType(chosen) === "Array" ) chosen = new Set(chosen);
  const categoryData = await categories(trait);

  let result = {};

  if ( traitConfig.labels?.all && !any ) {
    const key = prefixed ? `${trait}:ALL` : "ALL";
    result[key] = { label: traitConfig.labels.all, chosen: chosen.has(key), sorting: false };
  }

  if ( prefixed && any ) {
    const key = `${trait}:*`;
    result[key] = {
      label: keyLabel(key).titleCase(),
      chosen: chosen.has(key), sorting: false, wildcard: true
    };
  }

  const prepareCategory = (key, data, result, prefix, topLevel=false) => {
    let label = _innerLabel(data, traitConfig);
    if ( !label ) label = key;
    if ( prefixed ) key = `${prefix}:${key}`;
    result[key] = {
      label,
      chosen: data.selectable !== false ? chosen.has(key) : false,
      selectable: data.selectable !== false,
      sorting: topLevel ? traitConfig.sortCategories === true : true
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

  Object.entries(categoryData).forEach(([k, v]) => prepareCategory(k, v, result, trait, true));

  return new SelectChoices(result).sort();
}

/* -------------------------------------------- */

/**
 * Prepare an object with all possible choices from a set of keys. These choices will be grouped by
 * trait type if more than one type is present.
 * @param {Set<string>} keys  Prefixed trait keys.
 * @returns {Promise<SelectChoices>}
 */
export async function mixedChoices(keys) {
  if ( !keys.size ) return new SelectChoices();
  const types = {};
  for ( const key of keys ) {
    const split = key.split(":");
    const trait = split.shift();
    const selectChoices = (await choices(trait, { prefixed: true })).filter(new Set([key]));
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
  const uuid = getBaseItemUUID(identifier);
  const { collection, documentId: id } = foundry.utils.parseUuid(uuid);
  const pack = collection?.metadata.id;

  // Full Item5e document required, always async.
  if ( fullItem && !indexOnly ) return collection?.getDocument(id);

  const cache = _cachedIndices[pack];
  const loading = cache instanceof Promise;

  // Return extended index if cached, otherwise normal index, guaranteed to never be async.
  if ( indexOnly ) {
    const index = collection?.index.get(id);
    return loading ? index : cache?.[id] ?? index;
  }

  // Returned cached version of extended index if available.
  if ( loading ) return cache.then(() => _cachedIndices[pack][id]);
  else if ( cache ) return cache[id];
  if ( !collection ) return;

  // Build the extended index and return a promise for the data
  const fields = traitIndexFields();
  const promise = collection.getIndex({ fields }).then(index => {
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
 * Construct a proper UUID for the provided base item ID.
 * @param {string} identifier  Simple ID, compendium name and ID separated by a dot, or proper UUID.
 * @returns {string}
 */
export function getBaseItemUUID(identifier) {
  if ( identifier.startsWith("Compendium.") ) return identifier;
  let pack = CONFIG.DND5E.sourcePacks.ITEMS;
  let [scope, collection, id] = identifier.split(".");
  if ( scope && collection ) pack = `${scope}.${collection}`;
  if ( !id ) id = identifier;
  return `Compendium.${pack}.Item.${id}`;
}

/* -------------------------------------------- */

/**
 * List of fields on items that should be indexed for retrieving subtypes.
 * @returns {string[]}  Index list to pass to `Compendium#getIndex`.
 * @protected
 */
export function traitIndexFields() {
  const fields = ["system.type.value"];
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
 *
 * @example
 * // Returns "Tool Proficiency"
 * keyLabel("tool");
 *
 * @example
 * // Returns "Artisan's Tools"
 * keyLabel("tool:art");
 *
 * @example
 * // Returns "any Artisan's Tools"
 * keyLabel("tool:art:*");
 *
 * @example
 * // Returns "any 2 Artisan's Tools"
 * keyLabel("tool:art:*", { count: 2 });
 *
 * @example
 * // Returns "2 other Artisan's Tools"
 * keyLabel("tool:art:*", { count: 2, final: true });
 *
 * @example
 * // Returns "Gaming Sets"
 * keyLabel("tool:game");
 *
 * @example
 * // Returns "Land Vehicle"
 * keyLabel("tool:vehicle:land");
 *
 * @example
 * // Returns "Shortsword"
 * keyLabel("weapon:shortsword");
 * keyLabel("weapon:simple:shortsword");
 * keyLabel("shortsword", { trait: "weapon" });
 */
export function keyLabel(key, config={}) {
  let { count, trait, final } = config;

  let parts = key.split(":");
  const pluralRules = new Intl.PluralRules(game.i18n.lang);

  if ( !trait ) trait = parts.shift();
  const traitConfig = CONFIG.DND5E.traits[trait];
  if ( !traitConfig ) return key;
  const traitData = CONFIG.DND5E[traitConfig.configKey ?? trait] ?? {};
  let categoryLabel = game.i18n.localize(`${traitConfig.labels.localization}.${
    pluralRules.select(count ?? 1)}`);

  // Trait (e.g. "Tool Proficiency")
  const lastKey = parts.pop();
  if ( !lastKey ) return categoryLabel;

  // All (e.g. "All Languages")
  if ( lastKey === "ALL" ) return traitConfig.labels?.all ?? key;

  // Wildcards (e.g. "Artisan's Tools", "any Artisan's Tools", "any 2 Artisan's Tools", or "2 other Artisan's Tools")
  else if ( lastKey === "*" ) {
    let type;
    if ( parts.length ) {
      let category = traitData;
      do {
        category = (category.children ?? category)[parts.shift()];
        if ( !category ) return key;
      } while ( parts.length );
      type = _innerLabel(category, traitConfig);
    } else type = categoryLabel.toLowerCase();
    const localization = `DND5E.TraitConfigChoose${final ? "Other" : `Any${count ? "Counted" : "Uncounted"}`}`;
    return game.i18n.format(localization, { count: count ?? 1, type });
  }

  else {
    // Category (e.g. "Gaming Sets")
    const category = traitData[lastKey];
    if ( category ) return _innerLabel(category, traitConfig);

    // Child (e.g. "Land Vehicle")
    for ( const childrenKey of Object.values(traitConfig.children ?? {}) ) {
      const childLabel = CONFIG.DND5E[childrenKey]?.[lastKey];
      if ( childLabel ) return childLabel;
    }

    // Base item (e.g. "Shortsword")
    for ( const idsKey of traitConfig.subtypes?.ids ?? [] ) {
      let baseItemId = CONFIG.DND5E[idsKey]?.[lastKey];
      if ( !baseItemId ) continue;
      if ( foundry.utils.getType(baseItemId) === "Object" ) baseItemId = baseItemId.id;
      const index = getBaseItem(baseItemId, { indexOnly: true });
      if ( index ) return index.name;
      break;
    }

    // Explicit categories (e.g. languages)
    const searchCategory = (data, key) => {
      for ( const [k, v] of Object.entries(data) ) {
        if ( k === key ) return v;
        if ( v.children ) {
          const result = searchCategory(v.children, key);
          if ( result ) return result;
        }
      }
    };
    const config = searchCategory(traitData, lastKey);
    return config ? _innerLabel(config, traitConfig) : key;
  }
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
 *
 * @example
 * // Returns "any three skill proficiencies"
 * choiceLabel({ count: 3, pool: new Set(["skills:*"]) });
 *
 * @example
 * // Returns "three other skill proficiencies"
 * choiceLabel({ count: 3, pool: new Set(["skills:*"]) }, { final: true });
 *
 * @example
 * // Returns "any skill proficiency"
 * choiceLabel({ count: 1, pool: new Set(["skills:*"]) }, { only: true });
 *
 * @example
 * // Returns "Thieves Tools or any skill"
 * choiceLabel({ count: 1, pool: new Set(["tool:thief", "skills:*"]) }, { only: true });
 *
 * @example
 * // Returns "Thieves' Tools or any artisan tool"
 * choiceLabel({ count: 1, pool: new Set(["tool:thief", "tool:art:*"]) }, { only: true });
 *
 * @example
 * // Returns "2 from Thieves' Tools or any skill proficiency"
 * choiceLabel({ count: 2, pool: new Set(["tool:thief", "skills:*"]) });
 *
 */
export function choiceLabel(choice, { only=false, final=false }={}) {
  if ( !choice.pool.size ) return "";

  // Single entry in pool (e.g. "any three skill proficiencies" or "three other skill proficiencies")
  if ( choice.pool.size === 1 ) {
    return keyLabel(choice.pool.first(), {
      count: (choice.count > 1 || !only) ? choice.count : null, final: final && !only
    });
  }

  const listFormatter = new Intl.ListFormat(game.i18n.lang, { type: "disjunction" });

  // Singular count (e.g. "any skill", "Thieves Tools or any skill", or "Thieves' Tools or any artisan tool")
  if ( (choice.count === 1) && only ) {
    return listFormatter.format(Array.from(choice.pool).map(key => keyLabel(key)).filter(_ => _));
  }

  // Select from a list of options (e.g. "2 from Thieves' Tools or any skill proficiency")
  const choices = Array.from(choice.pool).map(key => keyLabel(key)).filter(_ => _);
  return game.i18n.format("DND5E.TraitConfigChooseList", {
    count: choice.count,
    list: listFormatter.format(choices)
  });
}

/* -------------------------------------------- */

/**
 * Create a human readable description of trait grants & choices.
 * @param {object} config
 * @param {Set<string>} [config.grants]        Guaranteed trait grants.
 * @param {TraitChoice[]} [config.choices=[]]  Trait choices.
 * @returns {string}
 *
 * @example
 * // Returns "Acrobatics and Athletics"
 * localizedList({ grants: new Set(["skills:acr", "skills:ath"]) });
 *
 * @example
 * // Returns "Acrobatics and one other skill proficiency"
 * localizedList({ grants: new Set(["skills:acr"]), choices: [{ count: 1, pool: new Set(["skills:*"])}] });
 *
 * @example
 * // Returns "Choose any skill proficiency"
 * localizedList({ choices: [{ count: 1, pool: new Set(["skills:*"])}] });
 */
export function localizedList({ grants=new Set(), choices=[] }) {
  const sections = Array.from(grants).map(g => keyLabel(g));

  for ( const [index, choice] of choices.entries() ) {
    const final = index === choices.length - 1;
    sections.push(choiceLabel(choice, { final, only: !grants.size && choices.length === 1 }));
  }

  const listFormatter = new Intl.ListFormat(game.i18n.lang, { style: "long", type: "conjunction" });
  if ( !sections.length || grants.size ) return listFormatter.format(sections.filter(_ => _));
  return game.i18n.format("DND5E.TraitConfigChooseWrapper", {
    choices: listFormatter.format(sections)
  });
}
