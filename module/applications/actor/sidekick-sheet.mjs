import DND5E from "../../config.mjs";
import ActorSheet5e from "./base-sheet.mjs";
import ActorSheet5eCharacter from "./character-sheet.mjs";

/**
 * An Actor sheet for Sidekick type actors.
 */
export default class ActorSheet5eSidekick extends ActorSheet5eCharacter {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "actor", "character", "sidekick"]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  static unsupportedItemTypes = new Set(["background", "class", "subclass"]);

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    const context = await super.getData(options);
    const classes = Object.values(DND5E.sidekickClasses);
    return foundry.utils.mergeObject(context, {
        disableExperience: true,
        classLabels: classes.join(", ")
    });
  }

  /**
   * Convert the Sidekick to a Character
   * @returns {ActorSheet5e}
   */
  convertToActor(){
    // TODO add the option to "evolve" a sidekick to a character, maybe is just enough update the type  and set a class and sublcass ???
  }

}
