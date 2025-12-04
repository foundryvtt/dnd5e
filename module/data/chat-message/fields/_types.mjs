/**
 * @typedef {Set<string>} ActivationsData
 */

/**
 * @typedef ActorDeltasData
 * @property {IndividualDeltaData[]} actor                 Changes for the actor.
 * @property {string[]} [created]                          IDs of newly created items.
 * @property {object[]} [deleted]                          Saved data for deleted items.
 * @property {Record<string, IndividualDeltaData[]>} item  Changes for each item grouped by ID.
 */

/**
 * @typedef ActorUpdatesDescription
 * @property {object} actor       Updates applied to the actor.
 * @property {object[]} [create]  Full data for Items to create (with IDs maintained).
 * @property {string[]} [delete]  IDs of items to be deleted from the actor.
 * @property {object[]} item      Updates applied to items on the actor.
 */

/**
 * @typedef IndividualDeltaData
 * @property {number} delta    The change in the specified field.
 * @property {string} keyPath  Path to the changed field on the document.
 */

/**
 * @typedef DeltaDisplayContext
 * @property {string} [delta]                        The formatted numeric change.
 * @property {Actor5e|Item5e} [document]             The document to which the delta applies.
 * @property {string} label                          The formatted label for the attribute.
 * @property {"create"|"delete"|"update"} operation  Type of update performed on the document.
 * @property {Roll[]} [rolls]                        Any rolls associated with the delta.
 * @property {string} type                           Type of document to which the delta applies.
 */
