import ActorSheet5e from "./base.js";

export default class ActorSheet5eVehicle extends ActorSheet5e {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "vehicle"],
      width: 600,
      height: 680
    });
  }

  get template() {
    if (!game.user.isGM && this.actor.limited) {
      return 'systems/dnd5e/templates/actors/limited-sheet.html';
    }

    return 'systems/dnd5e/templates/actors/vehicle-sheet.html';
  }

  _prepareItems(data) {

  }
};
