import sockets from "./sockets/_module.mjs";

/**
 * @typedef {object} SocketEventConfig
 * @property {string} event           The unique socket event name.
 * @property {Function} initiate      A function used to initiate the socket event.
 * @property {Function} finalize      A function that finalizes the socket event as the valid user(s).
 */

export default class Sockets5e {
  constructor() {
    game.socket.on("system.dnd5e", this.#handleSocket.bind(this));
    for (const config of sockets) this.#register(config);
  }

  /* -------------------------------------------- */

  /**
   * Store event configurations.
   * @type {Map<string, SocketEventConfig>}
   */
  #events = new Map();

  /* -------------------------------------------- */

  /**
   * Register a sovket event config.
   * @param {SocketEventConfig} config
   */
  #register(config) {
    this.#events.set(config.event, config);
  }

  /* -------------------------------------------- */

  /**
   * Handle the socket event for the correct user(s).
   * @param {object} data              Socket data.
   * @param {boolean} [data._emit]     Internally used parameter for whether this was initiated or emitted.
   * @returns {*}
   */
  #handleSocket({ _emit, ...data }) {
    if ( !data.userIds.includes(game.user.id) ) {
      if (!_emit) game.socket.emit("system.dnd5e", { ...data, _emit: true });
      else return;
    }

    const config = this.#events.get(data.event);
    if ( config ) return config.finalize(data);

    throw new Error(`'${data.event}' is not a valid socket event action!`);
  }

  /* -------------------------------------------- */

  /**
   * Initiate a given event, which may or may not be emitted.
   * @param {string} event      The event name.
   * @param {any[]} args        Function parameters for the handler.
   */
  initiate(event, ...args) {
    const config = this.#events.get(event);
    if ( !config ) return;
    const data = config.initiate(...args);
    this.#handleSocket(data);
  }
}
