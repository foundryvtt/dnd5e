import { parseInputDelta } from "../../utils.mjs";
import ContextMenu5e from "../context-menu.mjs";

/**
 * Custom element that handles displaying activities lists.
 */
export default class ActivitiesElement extends (foundry.applications.elements.AdoptableHTMLElement ?? HTMLElement) {

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The HTML tag named used by this element.
   * @type {string}
   */
  static tagName = "dnd5e-activities";

  /* -------------------------------------------- */

  /**
   * The application that contains this component.
   * @type {ApplicationV2}
   */
  get app() {
    return this.#app;
  }

  #app;

  /* -------------------------------------------- */

  /**
   * The Document containing the activities.
   * @type {Document}
   */
  get document() {
    return this.app.document;
  }

  /* -------------------------------------------- */
  /*  Lifecycle                                   */
  /* -------------------------------------------- */

  /** @override */
  connectedCallback() {
    if ( this.#app ) return;
    this.#app = foundry.applications.instances.get(this.closest(".application")?.id);

    for ( const input of this.querySelectorAll('input[inputmode="numeric"]') ) {
      input.addEventListener("change", this._onChangeInputDelta.bind(this));
    }

    for ( const control of this.querySelectorAll(".item-action[data-action]") ) {
      control.addEventListener("click", event => {
        if ( event.currentTarget.ariaDisabled === "true" ) return;
        void this._onAction(event.currentTarget, event.currentTarget.dataset.action, { event });
      });
    }

    for ( const control of this.querySelectorAll("[data-context-menu]") ) {
      control.addEventListener("click", ContextMenu5e.triggerEvent);
    }

    new ContextMenu5e(this, "[data-activity-id]", [], {
      onOpen: target => dnd5e.documents.activity.UtilityActivity.onContextMenu(this.document, target), jQuery: false
    });
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Handle activity actions.
   * @param {HTMLElement} target            The action target.
   * @param {string} action                 The action to invoke.
   * @param {object} [options]
   * @param {PointerEvent} [options.event]  The triggering event.
   * @returns {Promise}
   * @private
   */
  async _onAction(target, action, { event }={}) {
    const activitiesEvent = new CustomEvent("activities", {
      bubbles: true,
      cancelable: true,
      detail: action
    });
    target.dispatchEvent(activitiesEvent);
    if ( activitiesEvent.defaultPrevented ) return;

    const { activityId } = target.closest("[data-activity-id]")?.dataset ?? {};
    const activity = this.document.system.activities?.get(activityId);
    if ( !activity || (target.ariaDisabled === "true") ) return;

    switch ( action ) {
      case "recharge": return this._onRollRecharge(activity, { event });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs.
   * @param {Event} event  Triggering event.
   * @protected
   */
  async _onChangeInputDelta(event) {
    // If this is already handled by the parent sheet, skip.
    if ( this.#app?._onChangeInputDelta ) return;
    const input = event.target;
    const { activityId } = input.closest("[data-activity-id]")?.dataset ?? {};
    const activity = this.document.system.activities?.get(activityId);
    if ( !activity ) return;
    const result = parseInputDelta(input, activity);
    if ( (result !== undefined) && input.dataset.name ) {
      event.stopPropagation();
      // Special case handling for uses.
      if ( activity && (input.dataset.name === "uses.value") ) {
        this.document.updateActivity(activityId, { "uses.spent": activity.uses.max - result });
      }
      else this.document.updateActivity(activityId, { [input.dataset.name]: result });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle recharging an activity.
   * @param {Activity} activity             The activity being recharged.
   * @param {object} [options]
   * @param {PointerEvent} [options.event]  The triggering event.
   * @returns {Promise<Roll|void>}
   * @protected
   */
  _onRollRecharge(activity, { event }={}) {
    return activity.uses?.rollRecharge({ apply: true, event });
  }
}
