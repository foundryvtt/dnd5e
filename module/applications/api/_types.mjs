/**
 * @typedef ApplicationContainerParts
 * @property {object} [container]
 * @property {string} [container.id]         ID of the container. Containers with the same ID will be grouped together.
 * @property {string[]} [container.classes]  Classes to add to the container.
 */

/**
 * @typedef SheetTabDescriptor5e
 * @property {string} tab                       The tab key.
 * @property {string} label                     The tab label's localization key.
 * @property {string} [icon]                    A font-awesome icon.
 * @property {string} [svg]                     An SVG icon.
 * @property {SheetTabCondition5e} [condition]  A predicate to check before rendering the tab.
 */

/**
 * @callback SheetTabCondition5e
 * @param {Document} doc  The Document instance.
 * @returns {boolean}     Whether to render the tab.
 */
