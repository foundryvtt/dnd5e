import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";
import { createRollLabel, roll } from "../../enrichers.mjs";

const { ArrayField, BooleanField, NumberField, StringField, TypedSchemaField } = foundry.data.fields;

/**
 * @import { PromptMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a chat message prompting a player to roll or take an action.
 * @extends {ChatMessageDataModel<PromptMessageSystemData>}
 * @mixes PromptMessageSystemData
 */
export default class PromptMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      broadcast: new BooleanField({ initial: true }),
      buttons: new ArrayField(new TypedSchemaField({
        check: PromptMessageData.#d20TestFields(),
        concentration: PromptMessageData.#d20TestFields(),
        endConcentration: PromptMessageData.#sharedFields(),
        save: PromptMessageData.#d20TestFields(),
        skill: {
          ...PromptMessageData.#d20TestFields(),
          skill: new StringField({ blank: false, required: false }),
          usingTool: new StringField({ blank: false, required: false })
        },
        tool: {
          ...PromptMessageData.#d20TestFields(),
          tool: new StringField({ blank: false, required: false })
        }
      }))
    };
  }

  /* -------------------------------------------- */

  /**
   * Fields shared by the button types that trigger a d20 test.
   * @returns {Record<string, DataField>}
   */
  static #d20TestFields() {
    return {
      ...PromptMessageData.#sharedFields(),
      ability: new StringField({ blank: false, required: false }),
      dc: new NumberField({ integer: true, nullable: true, required: false }),
      format: new StringField({ choices: ["long", "short"], initial: "short", required: true })
    };
  }

  /* -------------------------------------------- */

  /**
   * Fields shared by every button type.
   * @returns {Record<string, DataField>}
   */
  static #sharedFields() {
    return {
      visibility: new StringField({ choices: ["all", "creator", "gm"], initial: "all", required: true })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    actions: {
      endConcentration: PromptMessageData.#endConcentration,
      roll: PromptMessageData.#roll
    },
    template: "systems/dnd5e/templates/chat/prompt-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const isCreator = game.user.isGM || this.parent.getAssociatedActor()?.isOwner || this.parent.isAuthor;
    return {
      buttons: this.buttons.map((button, index) => ({
        index,
        action: button.type === "endConcentration" ? "endConcentration" : "roll",
        hidden: ((button.visibility === "gm") && !game.user.isGM)
          || ((button.visibility === "creator") && !isCreator),
        label: {
          hidden: createRollLabel({ ...button, hideDC: true, icon: true }),
          value: createRollLabel({ ...button, icon: true })
        }
      }))
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(element) {
    super._onRender(element);
    if ( this.parent.shouldDisplayChallenge ) element.dataset.displayChallenge = "";
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * End concentration for the actor associated with this message.
   * @this {PromptMessageData}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #endConcentration(event, target) {
    target.disabled = true;
    try {
      await this.parent.getAssociatedActor()?.endConcentration();
    } finally {
      target.disabled = false;
    }
  }

  /* -------------------------------------------- */

  /**
   * Perform the roll described by the clicked button.
   * @this {PromptMessageData}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #roll(event, target) {
    const button = this.#getButton(target);
    if ( !button ) return;
    target.disabled = true;
    try {
      await roll({ ...button, actor: this.broadcast ? null : this.parent.getAssociatedActor() }, event);
    } finally {
      target.disabled = false;
    }
  }

  /* -------------------------------------------- */

  /**
   * Retrieve the configuration for the button that was clicked.
   * @param {HTMLElement} target  Button that was clicked.
   * @returns {object|void}
   */
  #getButton(target) {
    return this.buttons[Number(target.dataset.index)];
  }
}
