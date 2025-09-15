const { ActiveEffectTypeDataModel } = foundry.data;
const { TypeDataModel } = foundry.abstract;

/**
 * Abstract base class to add some shared functionality to all of the system's custom active effect types.
 * @abstract
 */
export default class ActiveEffectDataModel extends (ActiveEffectTypeDataModel ?? TypeDataModel) {
  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Actor within which this effect is embedded.
   * @type {Actor5e|void}
   */
  get actor() {
    return this.item ? this.item.actor : this.parent.parent instanceof Actor ? this.parent.parent : undefined;
  }

  /* -------------------------------------------- */

  /**
   * Document type to which this active effect should apply its changes.
   * @type {string}
   */
  get applicableType() {
    return "Actor";
  }

  /* -------------------------------------------- */

  /**
   * Should this status effect be hidden from the current user? Concealed effects are still applied, but won't be
   * visible on the actor's token or in the effects list on sheets.
   * @type {boolean}
   */
  get isConcealed() {
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Item within which this effect is contained, if any.
   * @type {Item5e|void}
   */
  get item() {
    return this.parent.parent instanceof Item ? this.parent.parent : undefined;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Add modifications to the core ActiveEffect config.
   * @param {ActiveEffectConfig} app            The ActiveEffect config.
   * @param {HTMLElement} html                  The ActiveEffect config element.
   * @param {ApplicationRenderContext} context  The app's rendering context.
   */
  onRenderActiveEffectConfig(app, html, context) {}
}
