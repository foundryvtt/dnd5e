export class ActorSheetBonuses extends BaseEntitySheet {
    static get defaultOptions() {
      const options = super.defaultOptions;
      return mergeObject(options, {
        id: "actor-bonuses",
          classes: ["dnd5e"],
        template: "systems/dnd5e/templates/apps/actor-bonuses.html",
        width: 500,
        closeOnSubmit: true
      });
    }
  
    /* -------------------------------------------- */
  
    /**
     * Configure the title of the bonuses window to include the Actor name
     * @type {String}
     */
    get title() {
      return `${game.i18n.localize('DND5E.BonusTitle')}: ${this.object.name}`;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Prepare data used to render the combat bonuses selection UI
     * @return {Object}
     */
    getData() {
      const data = super.getData();
      data.bonuses = this._getBonuses(this.object.data)
      return data;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Prepare an object of bonuss data
     * Add some additional data for rendering
     * @return {Object}
     */
    _getBonuses(actorData) {
      const bonuses = {};
      for ( let [k, v] of Object.entries(CONFIG.DND5E.ActorBonusTypes) ) {
          bonuses[k] = {"label": v, "value": duplicate(getProperty(actorData.data, `bonuses.${k}`)||"")};
      }
      return bonuses;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Update the Actor using the configured bonuses
     */
    _updateObject(event, formData) {
      const actor = this.object;
  
      // Set the new bonuses in bulk
     actor.update({'data.bonuses': formData});
    }
  }
  