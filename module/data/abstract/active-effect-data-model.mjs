import { getHumanReadableAttributeLabel } from "../../utils.mjs";
import FiltersField from "../fields/filters-field.mjs";

const { DocumentIdField } = foundry.data.fields;

/**
 * Abstract base class to add some shared functionality to all of the system's custom active effect types.
 * @abstract
 */
export default class ActiveEffectDataModel extends foundry.data.ActiveEffectTypeDataModel {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    const schema = super.defineSchema();
    schema.changes.element.extendFields({
      _id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
      conditions: new FiltersField()
    });
    return schema;
  }

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
   * Is there some system logic that makes this Active Effect ineligible for application?
   * @type {boolean}
   */
  get isSuppressed() {
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

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Prepare the context for individual changes to display on actor, item, or active effect sheets.
   * @param {object} change  Change to prepare.
   * @returns {object}       An object of chat data to render.
   */
  async getSheetChangeContext(change) {
    return {
      name: getHumanReadableAttributeLabel(change.key, { actor: this.actor, prefixItemName: false })
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare type-specific data for the Active Effect config sheet.
   * @param {ApplicationRenderContext} context  Sheet context data.
   * @returns {Promise<void>}
   */
  async getSheetData(context) {}
}
