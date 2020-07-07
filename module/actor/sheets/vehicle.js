import ActorSheet5e from "./base.js";

export default class ActorSheet5eVehicle extends ActorSheet5e {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "vehicle"],
      width: 605,
      height: 680
    });
  }

  get template() {
    if (!game.user.isGM && this.actor.limited) {
      return 'systems/dnd5e/templates/actors/limited-sheet.html';
    }

    return 'systems/dnd5e/templates/actors/vehicle-sheet.html';
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;

    if (this.actor.data.data.attributes.actions.stations) {
      html.find('.counter.actions, .counter.action-thresholds').hide();
    }
  }

  _computeEncumbrance(totalWeight, data) {
    const totalCoins = Object.values(data.data.currency).reduce((acc, denom) => acc + denom, 0);
    totalWeight += totalCoins / CONFIG.DND5E.encumbrance.currencyPerWeight;

    // Vehicle weights are in tons so we divide the total weight by 2000.
    totalWeight /= 2000;

    const enc = {
      max: data.data.attributes.capacity.cargo,
      value: Math.round(totalWeight * 10) / 10
    };

    enc.pct = Math.min(enc.value * 100 / enc.max, 99);
    return enc;
  }

  _prepareItems(data) {
    const features = {
      actions: {
        label: game.i18n.localize('DND5E.ActionPl'),
        items: [],
        dataset: {type: 'feat', 'activation.type': 'crew'}
      },
      equipment: {
        label: game.i18n.localize('DND5E.ItemTypeEquipment'),
        items: [],
        dataset: {type: 'equipment', 'armor.type': 'vehicle'}
      },
      passive: {
        label: game.i18n.localize('DND5E.Features'),
        items: [],
        dataset: {type: 'feat'}
      },
      reactions: {
        label: game.i18n.localize('DND5E.ReactionPl'),
        items: [],
        dataset: {type: 'feat', 'activation.type': 'reaction'}
      },
      weapons: {
        label: game.i18n.localize('DND5E.ItemTypeWeaponPl'),
        items: [],
        dataset: {type: 'weapon', 'weapon-type': 'siege'}
      }
    };

    const cargo = {
      cargo: {
        label: game.i18n.localize('DND5E.Cargo'),
        items: [],
        dataset: {type: 'loot'}
      }
    };

    let totalWeight = 0;
    for (const item of data.items) {
      if (item.type === 'weapon') features.weapons.items.push(item);
      else if (item.type === 'equipment') features.equipment.items.push(item);
      else if (item.type === 'loot') {
        totalWeight += item.data.weight || 0;
        cargo.cargo.items.push(item);
      }
      else if (item.type === 'feat') {
        if (!item.data.activation.type || item.data.activation.type === 'none') {
          features.passive.items.push(item);
        }
        else if (item.data.activation.type === 'reaction') features.reactions.items.push(item);
        else features.actions.items.push(item);
      }
    }

    data.features = Object.values(features);
    data.cargo = Object.values(cargo);
    data.data.attributes.encumbrance = this._computeEncumbrance(totalWeight, data);
  }
};
