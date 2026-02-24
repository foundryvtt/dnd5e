const PATH = Symbol("path");
const SCHEMA = Symbol("schema");

/**
 * Base data model used to create activity area of effect behaviors.
 */
export default class BaseActivityBehavior extends foundry.abstract.DataModel {

  /**
   * Perform the pre-localization of this data model.
   */
  static localize() {
    foundry.helpers.Localization.localizeDataModel(this);
  }

  /* -------------------------------------------- */

  /**
   * Metadata for creation dialog.
   * @type {{ label: string }}
   */
  static metadata = Object.freeze({
    label: "DND5E.BEHAVIOR.Label"
  });

  get metadata() {
    return this.constructor.metadata;
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Create region behavior data to use to create a behavior for a template region when using an activity.
   * Returning `false` will prevent any behavior from being created.
   * @param {Activity} activity  The activity that was activated.
   * @param {object} [options={}]
   * @returns {object|false}
   */
  createBehaviorData(activity, options={}) {
    return false;
  }

  /* -------------------------------------------- */
  /*  Importing and Exporting                     */
  /* -------------------------------------------- */

  /**
   * Prepare the data needed for the creation dialog.
   * @param {string} type    Specific type of the Activity Behavior to prepare.
   * @param {Item5e} parent  Parent document within which this Activity Behavior will be created.
   * @returns {{ type: string, label: string, icon: string, [hint]: string, [disabled]: boolean }}
   * @protected
   */
  static _createDialogData(type, parent) {
    const config = CONFIG.DND5E.activityBehaviorTypes[type] ?? {};
    return { type, label: config?.label ?? type, icon: config?.icon };
  }

  /* -------------------------------------------- */

  /**
   * Prepare default list of types if none are specified.
   * @param {Activity} parent  Parent activity into which this behavior will be created.
   * @returns {string[]}
   * @protected
   */
  static _createDialogTypes(parent) {
    return Object.keys(CONFIG.DND5E.activityBehaviorTypes);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Perform customization on field before it is displayed in the form.
   * @param {DataField} field  Data field being added to the form.
   * @param {object} data      Data passed to template to render the field in the form.
   * @returns {false|void}     Return `false` to prevent field from rendering.
   */
  customizeField(field, data) {}

  /* -------------------------------------------- */

  /**
   * Recursively build up fields for behavior data models.
   * @param {object} source               Source data for the activity behavior.
   * @param {object} [options={}]
   * @param {string} [options.prefix=""]  Prefix added before each field's name.
   * @yields object
   */
  *generateFields(source, { prefix="", ...options }={}) {
    for ( const field of Object.values(options[SCHEMA] ?? this.constructor.schema.fields) ) {
      const path = `${options[PATH] ?? ""}${field.name}`;
      if ( field.constructor.hasFormSupport ) {
        const data = { field, name: `${prefix}${path}`, value: foundry.utils.getProperty(source, path) };
        if ( field instanceof foundry.data.fields.BooleanField ) data.input = createCheckboxInput;
        if ( this.customizeField(field, data) !== false ) yield data;
      } else if ( field instanceof foundry.data.fields.SchemaField ) {
        yield* this.generateFields(source, { prefix, [PATH]: `${path}.`, [SCHEMA]: field.fields });
      }
    }
  }
}
