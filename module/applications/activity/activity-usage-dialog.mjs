import Application5e from "../api/application.mjs";

/**
 * Dialog for configuring the usage of an activity.
 */
export default class ActivityUsageDialog extends Application5e {

  // TODO: Implement activation dialog

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Display the activity usage dialog.
   * @param {Activity} activity                Activity to use.
   * @param {ActivityUseConfiguration} config  Configuration data for the usage.
   * @param {object} options                   Additional options for the application.
   * @returns {Promise<object|null>}           Form data object with results of the activation.
   */
  static async create(activity, config, options) {
    return new Promise(resolve => {
      resolve({});
    });
  }
}
