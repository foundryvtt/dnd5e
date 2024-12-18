import configs from "./_module.mjs";

export default class Sockets5e {
  constructor() {
    game.socket.on("system.dnd5e", this.#handleSocket.bind(this));
    for (const config of configs) this.#register(config);
  }

  /* -------------------------------------------- */

  /**
   * Store event configurations.
   * @type {Map<string, SocketEvent>}
   */
  #events = new Map();

  /* -------------------------------------------- */

  /**
   * Register a socket event config.
   * @param {SocketEvent} config
   */
  #register(config) {
    this.#events.set(config.eventName, config);
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
      return;
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
