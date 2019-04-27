

class ActorSheet5eCharacter extends ActorSheet5e {
	static get defaultOptions() {
	  const options = super.defaultOptions;
	  mergeObject(options, {
	    template: "public/systems/dnd5e/templates/actors/actor-sheet.html",
      classes: options.classes.concat(["dnd5e", "actor", "character-sheet"]),
      width: 650,
      height: 720,
      showUnpreparedSpells: true
    });
	  return options;
  }

  /* -------------------------------------------- */

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    const sheetData = super.getData();

    // Temporary HP
    let hp = sheetData.data.attributes.hp;
    if (hp.temp === 0) delete hp.temp;
    if (hp.tempmax === 0) delete hp.tempmax;

    // Resources
    let res = sheetData.data.resources;
    if (res.primary && res.primary.value === 0) delete res.primary.value;
    if (res.primary && res.primary.max === 0) delete res.primary.max;
    if (res.secondary && res.secondary.value === 0) delete res.secondary.value;
    if (res.secondary && res.secondary.max === 0) delete res.secondary.max;

    // Return data for rendering
    return sheetData;
  }

  /* -------------------------------------------- */

  /**
   * Organize and classify Items for Character sheets
   * @private
   */
  _prepareItems(actorData) {

    // Inventory
    const inventory = {
      weapon: { label: "Weapons", items: [] },
      equipment: { label: "Equipment", items: [] },
      consumable: { label: "Consumables", items: [] },
      tool: { label: "Tools", items: [] },
      backpack: { label: "Backpack", items: [] },
    };

    // Spellbook
    const spellbook = {};

    // Feats
    const feats = [];

    // Classes
    const classes = [];

    // Iterate through items, allocating to containers
    let totalWeight = 0;
    for ( let i of actorData.items ) {
      i.img = i.img || DEFAULT_TOKEN;

      // Inventory
      if ( Object.keys(inventory).includes(i.type) ) {
        i.data.quantity.value = i.data.quantity.value || 1;
        i.data.weight.value = i.data.weight.value || 0;
        i.totalWeight = Math.round(i.data.quantity.value * i.data.weight.value * 10) / 10;
        i.hasCharges = (i.type === "consumable") && i.data.charges.max > 0;
        inventory[i.type].items.push(i);
        totalWeight += i.totalWeight;
      }

      // Spells
      else if ( i.type === "spell" ) this._prepareSpell(actorData, spellbook, i);

      // Classes
      else if ( i.type === "class" ) {
        classes.push(i);
        classes.sort((a, b) => b.levels > a.levels);
      }

      // Feats
      else if ( i.type === "feat" ) feats.push(i);
    }

    // Assign and return
    actorData.inventory = inventory;
    actorData.spellbook = spellbook;
    actorData.feats = feats;
    actorData.classes = classes;

    // Currency weight
    if ( game.settings.get("dnd5e", "currencyWeight") ) {
      totalWeight += this._computeCurrencyWeight(actorData.data.currency);
    }

    // Inventory encumbrance
    let enc = {
      max: actorData.data.abilities.str.value * 15,
      value: Math.round(totalWeight * 10) / 10,
    };
    enc.pct = Math.min(enc.value * 100 / enc.max, 99);
    actorData.data.attributes.encumbrance = enc;
  }

  /* -------------------------------------------- */

  /**
   * Compute the weight of carried currency across all denominations by applying the standard rule from the
   * PHB pg. 143
   *
   * @param {Object} currency   An object describing the amount of currency carried by denomination
   * @return {Number}           The total weight of carried currency
   * @private
   */
  _computeCurrencyWeight(currency) {
    const numCoins = Object.values(currency).reduce((val, denom) => val += denom.value, 0);
    return numCoins / 50;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers
  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html);
    if ( !this.options.editable ) return;


    /* Short Rest */
    html.find('.short-rest').click(ev => this._onShortRest(ev));

    // Long Rest
    html.find('.long-rest').click(ev => this._onLongRest(ev));
  }

  /* -------------------------------------------- */

  /**
   * Take a short rest, calling the relevant function on the Actor instance
   * @private
   */
  _onShortRest(event) {
    event.preventDefault();
    let hd0 = this.actor.data.data.attributes.hd.value,
        hp0 = this.actor.data.data.attributes.hp.value;
    renderTemplate("public/systems/dnd5e/templates/chat/short-rest.html").then(html => {
      new ShortRestDialog(this.actor, {
        title: "Short Rest",
        content: html,
        buttons: {
          rest: {
            icon: '<i class="fas fa-bed"></i>',
            label: "Rest",
            callback: dlg => {
              this.actor.shortRest();
              let dhd = hd0 - this.actor.data.data.attributes.hd.value,
                  dhp = this.actor.data.data.attributes.hp.value - hp0;
              let msg = `${this.actor.name} takes a short rest spending ${dhd} Hit Dice to recover ${dhp} Hit Points.`;
              ChatMessage.create({
                user: game.user._id,
                alias: this.actor.name,
                content: msg
              });
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
          },
        },
        default: 'rest'
      }).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Take a long rest, calling the relevant function on the Actor instance
   * @private
   */
  _onLongRest(event) {
    event.preventDefault();
    new Dialog({
      title: "Long Rest",
      content: '<p>Take a long rest?</p><p>On a long rest you will recover hit points, half your maximum hit dice, ' +
        'primary or secondary resources, and spell slots per day.</p>',
      buttons: {
        rest: {
          icon: '<i class="fas fa-bed"></i>',
          label: "Rest",
          callback: dlg => {
            let update = this.actor.longRest();
            let msg = `${this.actor.name} takes a long rest and recovers ${update.dhp} Hit Points and ${update.dhd} Hit Dice.`;
            ChatMessage.create({
              user: game.user._id,
              alias: this.actor.name,
              content: msg
            });
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        },
      },
      default: 'rest'
    }).render(true);
  }
}

// Register Character Sheet
Actors.registerSheet("dnd5e", ActorSheet5eCharacter, "character");


