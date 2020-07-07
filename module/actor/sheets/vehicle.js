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

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;

    html.find('.item-toggle').click(this._onToggleItem.bind(this));
    html.find('.item-hp input')
      .click(evt => evt.target.select())
      .change(this._onHPChange.bind(this));

    if (this.actor.data.data.attributes.actions.stations) {
      html.find('.counter.actions, .counter.action-thresholds').hide();
    }
  }

  _onHPChange(event) {
    event.preventDefault();
    const itemID = event.currentTarget.closest('.item').dataset.itemId;
    const item = this.actor.items.get(itemID);
    const hp = Math.clamped(0, parseInt(event.currentTarget.value), item.data.data.hp.max);
    event.currentTarget.value = hp;
    return item.update({'data.hp.value': hp});
  }

  _onToggleItem(event) {
    event.preventDefault();
    const itemID = event.currentTarget.closest('.item').dataset.itemId;
    const item = this.actor.items.get(itemID);
    const crewed = !!item.data.data.crewed;
    return item.update({'data.crewed': !crewed});
  }

  _prepareCrewedItem(item) {
    const isCrewed = item.data.crewed;
    item.toggleClass = isCrewed ? 'active' : '';
    item.toggleTitle = game.i18n.localize(`DND5E.${isCrewed ? 'Crewed' : 'Uncrewed'}`);

    if (item.type === 'feat' && item.data.activation.type === 'crew') {
      item.crew = item.data.activation.cost;
      item.cover = game.i18n.localize(`DND5E.${item.data.cover ? 'CoverTotal' : 'None'}`);
      if (item.data.cover === .5) item.cover = '½';
      else if (item.data.cover === .75) item.cover = '¾';
      else if (item.data.cover === null) item.cover = '—';
      if (item.crew < 1 || item.crew === null) item.crew = '—';
    }

    if (item.type === 'equipment' || item.type === 'weapon') {
      item.threshold = item.data.hp.dt ? item.data.hp.dt : '—';
    }
  }

  _prepareItems(data) {
    const equipmentColumns = [{
      label: game.i18n.localize('DND5E.Quantity'),
      css: 'item-qty',
      property: 'data.quantity'
    }, {
      label: game.i18n.localize('DND5E.AC'),
      css: 'item-ac',
      property: 'data.armor.value'
    }, {
      label: game.i18n.localize('DND5E.HP'),
      css: 'item-hp',
      property: 'data.hp.value',
      editable: 'Number'
    }, {
      label: game.i18n.localize('DND5E.Threshold'),
      css: 'item-threshold',
      property: 'threshold'
    }];

    const features = {
      actions: {
        label: game.i18n.localize('DND5E.ActionPl'),
        items: [],
        crewable: true,
        dataset: {type: 'feat', 'activation.type': 'crew'},
        columns: [{
          label: game.i18n.localize('DND5E.Crew'),
          css: 'item-crew',
          property: 'crew'
        }, {
          label: game.i18n.localize('DND5E.Cover'),
          css: 'item-cover',
          property: 'cover'
        }]
      },
      equipment: {
        label: game.i18n.localize('DND5E.ItemTypeEquipment'),
        items: [],
        crewable: true,
        dataset: {type: 'equipment', 'armor.type': 'vehicle'},
        columns: equipmentColumns
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
        crewable: true,
        dataset: {type: 'weapon', 'weapon-type': 'siege'},
        columns: equipmentColumns
      }
    };

    for (const item of data.items) {
      this._prepareCrewedItem(item);
      if (item.type === 'weapon') features.weapons.items.push(item);
      else if (item.type === 'equipment') features.equipment.items.push(item);
      else if (item.type === 'feat') {
        if (!item.data.activation.type || item.data.activation.type === 'none') {
          features.passive.items.push(item);
        } else if (item.data.activation.type === 'reaction') features.reactions.items.push(item);
        else features.actions.items.push(item);
      }
    }

    data.features = Object.values(features);
  }
};
