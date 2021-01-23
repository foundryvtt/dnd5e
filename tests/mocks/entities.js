import {jest} from '@jest/globals';

class Actor {
  constructor(data, options) {
    // Entity
    this._data = data || {};
    this.data = this._data;
    this.options = options || {};
    this.apps = {};
    this.compendium = this.options.compendium || null;
    // Actor
    this.token = this.options.token || null;
    this.items = this.items || [];
    this.overrides = this.overrides || {};
    this._tokenImages = null;
  }

  getRollData() {
    return duplicate(this.data.data);
  }

  update = jest.fn(x => x)
}

global.Actor = Actor;

class Dialog {}

global.Dialog = Dialog;

class ChatMessage {
  static create = jest.fn();
}

global.ChatMessage = ChatMessage;