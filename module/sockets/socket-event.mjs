/**
 * @typedef {object} EventData
 * @property {string} event         The unique event data name.
 * @property {string[]} userIds     The ids of users that should perform the operation.
 */

export default class SocketEvent {
  /**
   * The socket event name, which must be unique and is used to call the event.
   * @type {string}
   */
  static eventName;

  /* -------------------------------------------- */

  /**
   * As a user allowed to do so, perform the operation.
   * @param {EventData} data      The event data.
   * @abstract
   */
  static async finalize(data) {
    throw new Error("The 'finalize' method of a socket event must be subclassed.");
  }

  /* -------------------------------------------- */

  /**
   * Initiate the socket event. Subclasses can and should change the signature of this method.
   * @returns {EventData}
   * @abstract
   */
  static initiate() {
    throw new Error("The 'initiate' method of a socket event must be subclassed.");
  }
}
