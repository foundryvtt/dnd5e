/**
 * @typedef _AdvancementManagerOptions
 * @property {boolean} [automaticApplication=false]  Apply advancement steps automatically if no user input is required.
 * @property {boolean} [showVisualizer=false]        Display the step debugging application.
 */

/**
 * Internal type used to manage each step within the advancement process.
 *
 * @typedef AdvancementStep
 * @property {string} type                Step type from "forward", "reverse", "restore", or "delete".
 * @property {AdvancementFlow} [flow]     Flow object for the advancement being applied by this step. In the case of
 *                                        "delete" steps, this flow indicates the advancement flow that originally
 *                                        deleted the item.
 * @property {Item5e} [item]              For "delete" steps only, the item to be removed.
 * @property {object} [class]             Contains data on class if step was triggered by class level change.
 * @property {Item5e} [class.item]        Class item that caused this advancement step.
 * @property {number} [class.level]       Level the class should be during this step.
 * @property {number} [level]             Character level at this step, if different than flow's level.
 * @property {boolean} [automatic=false]  Should the manager attempt to apply this step without user interaction?
 * @property {boolean} [synthetic=false]  Was this step created as a result of an item introduced or deleted?
 */
