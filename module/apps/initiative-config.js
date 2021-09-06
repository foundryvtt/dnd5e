/**
 * A simple form to configure initiative bonuses and proficiency.
 * @extends {DocumentSheet}
 * @param {Actor} actor                   The Actor instance being displayed within the sheet.
 * @param {ApplicationOptions} options    Additional application configuration options.
 */
 export default class ActorInitiativeConfig extends DocumentSheet {
    constructor (actor, opts) {
      super(actor, opts);
    }
  
    /** @override */
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["dnd5e"],
        template: "systems/dnd5e/templates/apps/initiative-config.html",
        width: 500,
        height: "auto"
      });
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    get title() {
      return `${game.i18n.format("DND5E.InitiativeConfigureTitle")}: ${this.document.name}`;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    getData(options) {
      return {
        initiative: foundry.utils.getProperty(this.document.data._source, "data.attributes.init") || {},
        proficiencyLevels: {
          0: CONFIG.DND5E.proficiencyLevels[0],
          1: CONFIG.DND5E.proficiencyLevels[1],
          0.5: CONFIG.DND5E.proficiencyLevels[0.5]
        },
        bonusGlobalCheck: getProperty(this.object.data._source, "data.bonuses.abilities.check")
      };
    }
  }
  