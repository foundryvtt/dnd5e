import ActorSheet5e from "./deprecated/base-sheet.mjs";

/**
 * An Actor sheet for Vehicle type actors.
 */
export default class ActorSheet5eVehicle extends ActorSheet5e {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "vehicle"]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  static unsupportedItemTypes = new Set(["background", "class", "race", "subclass"]);

  /* -------------------------------------------- */

  /**
   * Creates a new cargo entry for a vehicle Actor.
   * @type {object}
   */
  static get newCargo() {
    return {name: "", quantity: 1};
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @override */
  _getMovementSpeed(actorData, largestPrimary=true) {
    return super._getMovementSpeed(actorData, largestPrimary);
  }

  /* -------------------------------------------- */

  /**
   * Prepare items that are mounted to a vehicle and require one or more crew to operate.
   * @param {object} item     Copy of the item data being prepared for display.
   * @param {object} context  Display context for the item.
   * @protected
   */
  _prepareCrewedItem(item, context) {

    // Determine crewed status
    const isCrewed = item.system.crewed;
    context.toggleClass = isCrewed ? "active" : "";
    context.toggleTitle = game.i18n.localize(`DND5E.${isCrewed ? "Crewed" : "Uncrewed"}`);

    // Handle crew actions
    const hasCrewedActivation = item.system.activities?.contents[0]?.activation.type === "crew";
    if ( (item.type === "feat") && hasCrewedActivation ) {
      if ( item.system.cover === 1 ) context.cover = game.i18n.localize("DND5E.CoverTotal");
      else if ( item.system.cover === .5 ) context.cover = "½";
      else if ( item.system.cover === .75 ) context.cover = "¾";
      else context.cover = "—";
    }

    // Prepare vehicle weapons
    if ( (item.type === "equipment") || (item.type === "weapon") ) {
      context.threshold = item.system.hp?.dt ? item.system.hp.dt : "—";
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareItems(context) {
    const cargoColumns = [{
      label: game.i18n.localize("DND5E.Quantity"),
      css: "item-qty",
      property: "quantity",
      editable: "Number"
    }];

    const equipmentColumns = [{
      label: game.i18n.localize("DND5E.Quantity"),
      css: "item-qty",
      property: "system.quantity",
      editable: "Number"
    }, {
      label: game.i18n.localize("DND5E.AC"),
      css: "item-ac",
      property: "system.armor.value"
    }, {
      label: game.i18n.localize("DND5E.HP"),
      css: "item-hp",
      property: "system.hp.value",
      maxProperty: "system.hp.max",
      editable: "Number"
    }, {
      label: game.i18n.localize("DND5E.Threshold"),
      css: "item-threshold",
      property: "threshold"
    }];

    const features = {
      actions: {
        label: game.i18n.localize("DND5E.ActionPl"),
        items: [],
        hasActions: true,
        crewable: true,
        dataset: {type: "feat", "activation.type": "crew"},
        columns: [{
          label: game.i18n.localize("DND5E.Cover"),
          css: "item-cover",
          property: "cover"
        }]
      },
      equipment: {
        label: game.i18n.localize(CONFIG.Item.typeLabels.equipment),
        items: [],
        crewable: true,
        dataset: {type: "equipment", "type.value": "vehicle"},
        columns: equipmentColumns
      },
      passive: {
        label: game.i18n.localize("DND5E.Features"),
        items: [],
        dataset: {type: "feat"}
      },
      reactions: {
        label: game.i18n.localize("DND5E.ReactionPl"),
        items: [],
        dataset: {type: "feat", "activation.type": "reaction"}
      },
      weapons: {
        label: game.i18n.localize(`${CONFIG.Item.typeLabels.weapon}Pl`),
        items: [],
        crewable: true,
        dataset: {type: "weapon", "weapon-type": "siege"},
        columns: equipmentColumns
      }
    };

    context.items.forEach(item => {
      const {uses} = item.system;
      const ctx = context.itemContext[item.id] ??= {};
      ctx.canToggle = false;
      ctx.isExpanded = this._expanded.has(item.id);
      ctx.hasUses = uses && (uses.max > 0);
    });

    const cargo = {
      crew: {
        label: game.i18n.localize("DND5E.VehicleCrew"),
        items: context.actor.system.cargo.crew,
        css: "cargo-row crew",
        editableName: true,
        dataset: {type: "crew"},
        columns: cargoColumns
      },
      passengers: {
        label: game.i18n.localize("DND5E.VehiclePassengers"),
        items: context.actor.system.cargo.passengers,
        css: "cargo-row passengers",
        editableName: true,
        dataset: {type: "passengers"},
        columns: cargoColumns
      },
      cargo: {
        label: game.i18n.localize("DND5E.VehicleCargo"),
        items: [],
        dataset: {type: "loot"},
        columns: [{
          label: game.i18n.localize("DND5E.Quantity"),
          css: "item-qty",
          property: "system.quantity",
          editable: "Number"
        }, {
          label: game.i18n.localize("DND5E.Price"),
          css: "item-price",
          property: "system.price.value",
          editable: "Number"
        }, {
          label: game.i18n.localize("DND5E.Weight"),
          css: "item-weight",
          property: "system.weight.value",
          editable: "Number"
        }]
      }
    };

    // Classify items owned by the vehicle and compute total cargo weight
    for ( const item of context.items ) {
      const ctx = context.itemContext[item.id] ??= {};
      this._prepareCrewedItem(item, ctx);

      // Handle cargo explicitly
      const isCargo = item.flags.dnd5e?.vehicleCargo === true;
      if ( isCargo ) {
        cargo.cargo.items.push(item);
        continue;
      }

      // Handle non-cargo item types
      switch ( item.type ) {
        case "weapon":
          features.weapons.items.push(item);
          break;
        case "equipment":
          features.equipment.items.push(item);
          break;
        case "feat":
          const act = item.system.activities?.contents[0] ?? {};
          if ( !act.activation?.type || (act.activation?.type === "none") ) features.passive.items.push(item);
          else if (act.activation?.type === "reaction") features.reactions.items.push(item);
          else features.actions.items.push(item);
          ctx.hasRecharge = item.system.uses?.recovery?.find(r => r.period === "recharge")
            || act.uses?.recovery?.find(r => r.period === "recharge");
          break;
        case "spell":
          break;
        default:
          cargo.cargo.items.push(item);
      }
    }

    // Update the rendering context data
    context.inventoryFilters = false;
    context.features = Object.values(features);
    context.cargo = Object.values(cargo);
    context.encumbrance = context.system.attributes.encumbrance;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if ( !this.isEditable ) return;

    html[0].querySelector('[data-tab="cargo"] dnd5e-inventory')
      .addEventListener("inventory", this._onInventoryEvent.bind(this));

    html.find(".cargo-row input")
      .click(evt => evt.target.select())
      .change(this._onCargoRowChange.bind(this));

    if (this.actor.system.attributes.actions.stations) {
      html.find(".counter.actions, .counter.action-thresholds").hide();
    }

    html[0].addEventListener("inventory", event => {
      if ( event.detail !== "crew" ) return;
      event.preventDefault();
      const item = this.actor.items.get(event.target.closest("[data-item-id]")?.dataset?.itemId);
      item?.update({ "system.crewed": !item.system.crewed });
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle saving a cargo row (i.e. crew or passenger) in-sheet.
   * @param {Event} event              Triggering event.
   * @returns {Promise<Actor5e>|null}  Actor after update if any changes were made.
   * @private
   */
  _onCargoRowChange(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const row = target.closest(".item");
    const idx = Number(row.dataset.itemIndex);
    const property = row.classList.contains("crew") ? "crew" : "passengers";

    // Get the cargo entry
    const cargo = foundry.utils.deepClone(this.actor.system.cargo[property]);
    const entry = cargo[idx];
    if ( !entry ) return null;

    // Update the cargo value
    const key = target.dataset.name ?? "name";
    const type = target.dataset.dtype;
    let value = target.value;
    if (type === "Number") value = Number(value);
    entry[key] = value;

    // Perform the Actor update
    return this.actor.update({[`system.cargo.${property}`]: cargo});
  }

  /* -------------------------------------------- */

  /**
   * Handle creating and deleting crew and passenger rows.
   * @param {CustomEvent} event   Triggering inventory event.
   * @returns {Promise}
   */
  async _onInventoryEvent(event) {
    if ( event.detail === "create" ) {
      const type = event.target.dataset.type;
      if ( !["crew", "passengers"].includes(type) ) return;
      event.preventDefault();
      const cargoCollection = foundry.utils.deepClone(this.actor.system.cargo[type]);
      cargoCollection.push(this.constructor.newCargo);
      return this.actor.update({[`system.cargo.${type}`]: cargoCollection});
    }

    else if ( event.detail === "delete" ) {
      const row = event.target.closest(".item");
      if ( !row.classList.contains("cargo-row") ) return;
      event.preventDefault();
      const idx = Number(row.dataset.itemIndex);
      const type = row.classList.contains("crew") ? "crew" : "passengers";
      const cargoCollection = foundry.utils.deepClone(this.actor.system.cargo[type]).filter((_, i) => i !== idx);
      return this.actor.update({[`system.cargo.${type}`]: cargoCollection});
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropSingleItem(itemData, event) {
    const cargoTypes = ["weapon", "equipment", "consumable", "tool", "loot", "container"];
    const isCargo = cargoTypes.includes(itemData.type) && (this._tabs[0].active === "cargo");
    foundry.utils.setProperty(itemData, "flags.dnd5e.vehicleCargo", isCargo);
    return super._onDropSingleItem(itemData, event);
  }
}
