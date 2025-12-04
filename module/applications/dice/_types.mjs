/**
 * @typedef BasicRollConfigurationDialogRenderOptions
 * @property {object} [dice]
 * @property {number} [dice.max=5]               The maximum number of dice to display in the large dice breakdown. If
 *                                               the given rolls contain more dice than this, then the large breakdown
 *                                               is not shown.
 * @property {Set<string>} [dice.denominations]  Valid die denominations to display in the large dice breakdown. If any
 *                                               of the given rolls contain an invalid denomination, then the large
 *                                               breakdown is not shown.
 */
