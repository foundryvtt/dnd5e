/**
 * @typedef CalendarHUDButton
 * @property {string} [action]                    The action name triggered by clicking the button.
 * @property {Omit<CalendarHUDButton, "additional"|"position">[]} [additional]  Additional buttons that appear when
 *                                                the button is hovered.
 * @property {object} [dataset]                   Additional data to attach to the button.
 * @property {string} [icon]                      SVG icon path or font-awesome icon class for the button.
 * @property {string} [label]                     Label used for the button.
 * @property {"start"|"end"} position             Should this be displayed before or after the interface.
 * @property {string} [tooltip]                   Tooltip displayed on hover.
 * @property {(event: PointerEvent) => void|Promise<void>} [onClick]  A custom click handler function.
 * @property {boolean|(() => boolean)} [visible]  Is the control button visible for the current client.
 */
