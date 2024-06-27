/**
 * A filter description.
 *
 * @typedef {object} FilterDescription
 * @property {string} k - Key on the data object to check.
 * @property {*} v - Value to compare.
 * @property {string} [o=_] - Operator or comparison function to use.
 */

/**
 * Check some data against a filter to determine if it matches.
 * @param {object} data                 Data to check.
 * @param {FilterDescription[]} filter  Filter to compare against.
 * @returns {boolean}
 * @throws
 */
export function performCheck(data, filter=[]) {
  return AND(data, filter);
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Determine the unique keys referenced by a set of filters.
 * @param {FilterDescription[]} filter  Filter to examine.
 * @returns {Set<string>}
 */
export function uniqueKeys(filter=[]) {
  const keys = new Set();
  const _uniqueKeys = filters => {
    for ( const f of filters ) {
      const operator = f.o in OPERATOR_FUNCTIONS;
      if ( operator && (foundry.utils.getType(f.v) === "Array") ) _uniqueKeys(f.v);
      else if ( f.o === "NOT" ) _uniqueKeys([f.v]);
      else if ( !operator ) keys.add(f.k);
    }
  };
  _uniqueKeys(filter);
  return keys;
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Internal check implementation.
 * @param {object} data             Data to check.
 * @param {string} [keyPath]        Path to individual piece within data to check.
 * @param {*} value                 Value to compare against or additional filters.
 * @param {string} [operation="_"]  Checking function to use.
 * @returns {boolean}
 * @internal
 * @throws
 */
function _check(data, keyPath, value, operation="_") {
  const operator = OPERATOR_FUNCTIONS[operation];
  if ( operator ) return operator(data, value);

  const comparison = COMPARISON_FUNCTIONS[operation];
  if ( !comparison ) throw new Error(`Comparison function "${operation}" could not be found.`);
  return comparison(foundry.utils.getProperty(data, keyPath), value);
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */
/*                   Operator Functions                  */
/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Operator functions.
 * @enum {Function}
 */
export const OPERATOR_FUNCTIONS = {
  AND, NAND, OR, NOR, XOR, NOT
};

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Perform an AND check against all filters.
 * @param {object} data                 Data to check.
 * @param {FilterDescription[]} filter  Filter to compare against.
 * @returns {boolean}
 */
export function AND(data, filter) {
  return filter.every(({k, v, o}) => _check(data, k, v, o));
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Perform an NAND check against all filters.
 * @param {object} data                 Data to check.
 * @param {FilterDescription[]} filter  Filter to compare against.
 * @returns {boolean}
 */
export function NAND(data, filter) {
  return !filter.every(({k, v, o}) => _check(data, k, v, o));
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Perform an OR check against all filters.
 * @param {object} data                 Data to check.
 * @param {FilterDescription[]} filter  Filter to compare against.
 * @returns {boolean}
 */
export function OR(data, filter) {
  return filter.some(({k, v, o}) => _check(data, k, v, o));
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Perform an NOR check against all filters.
 * @param {object} data                 Data to check.
 * @param {FilterDescription[]} filter  Filter to compare against.
 * @returns {boolean}
 */
export function NOR(data, filter) {
  return !filter.some(({k, v, o}) => _check(data, k, v, o));
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Perform an XOR check against all filters.
 * @param {object} data                 Data to check.
 * @param {FilterDescription[]} filter  Filter to compare against.
 * @returns {boolean}
 */
export function XOR(data, filter) {
  let currentResult = false;
  for ( const { k, v, o } of filter ) {
    if ( _check(data, k, v, o) ) {
      if ( !currentResult ) currentResult = true;
      else return false;
    }
  }
  return currentResult;
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Invert the result of a nested check,
 * @param {object} data               Data to check.
 * @param {FilterDescription} filter  Filter to compare against.
 * @returns {boolean}
 */
export function NOT(data, filter) {
  const { k, v, o } = filter;
  return !_check(data, k, v, o);
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */
/*                  Comparison Functions                 */
/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Currently supported comparison functions.
 * @enum {Function}
 */
export const COMPARISON_FUNCTIONS = {
  _: exact, exact, iexact, contains, icontains,
  startswith, istartswith, endswith, iendswith,
  has, hasAny, hasAll, in: in_, gt, gte, lt, lte
};

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Check for an exact match. The default comparison mode if none is provided.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function exact(data, value) {
  return data === value;
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Case-insensitive exact match.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function iexact(data, value) {
  return exact(String(data).toLowerCase(), String(value).toLowerCase());
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Check that data contains value.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function contains(data, value) {
  return String(data).includes(String(value));
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Case-insensitive check that data contains value.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function icontains(data, value) {
  return contains(String(data).toLowerCase(), String(value).toLowerCase());
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Check that data starts with value.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function startswith(data, value) {
  return String(data).startsWith(String(value));
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Case-insensitive check that data starts with value.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function istartswith(data, value) {
  return startswith(String(data).toLowerCase(), String(value).toLowerCase());
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Check that data ends with value.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function endswith(data, value) {
  return String(data).endsWith(String(value));
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Case-insensitive check that data ends with value.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function iendswith(data, value) {
  return endswith(String(data).toLowerCase(), String(value).toLowerCase());
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Check that the data collection has the provided value.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function has(data, value) {
  return in_(value, data);
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Check that the data collection has any of the provided values.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function hasAny(data, value) {
  return Array.from(value).some(v => has(data, v));
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Check that the data collection has all of the provided values.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function hasAll(data, value) {
  return Array.from(value).every(v => has(data, v));
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Check that data matches one of the provided values.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function in_(data, value) {
  switch ( foundry.utils.getType(value) ) {
    case "Array": return value.includes(data);
    case "Set": return value.has(data);
    default: return false;
  }
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Check that value is greater than data.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function gt(data, value) {
  return Number(data) > Number(value);
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Check that value is greater than or equal to data.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function gte(data, value) {
  return Number(data) >= Number(value);
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Check that value is less than data.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function lt(data, value) {
  return Number(data) < Number(value);
}

/* <><><><> <><><><> <><><><> <><><><> <><><><> <><><><> */

/**
 * Check that value is less than or equal to data.
 * @param {*} data
 * @param {*} value
 * @returns {boolean}
 */
export function lte(data, value) {
  return Number(data) <= Number(value);
}
