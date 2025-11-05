/**
 * @typedef {Set<string>} ActivationsData
 */

/**
 * @typedef ActorDeltasData
 * @property {IndividualDeltaData[]} actor                 Changes for the actor.
 * @property {Record<string, IndividualDeltaData[]>} item  Changes for each item grouped by ID.
 */

/**
 * @typedef IndividualDeltaData
 * @property {number} delta    The change in the specified field.
 * @property {string} keyPath  Path to the changed field on the document.
 */

/**
 * @typedef DeltaDisplayContext
 * @property {string} type              Type of document to which the delta applies.
 * @property {string} delta             The formatted numeric change.
 * @property {Actor5e|Item5e} document  The document to which the delta applies.
 * @property {string} label             The formatted label for the attribute.
 * @property {Roll[]} [rolls]           Any rolls associated with the delta.
 */
