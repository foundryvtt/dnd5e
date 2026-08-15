import ItemMessageData from "./item-message-data.mjs";
import { ActorDeltasField } from "./fields/deltas-field.mjs";
import SourceReferenceField from "./fields/source-reference-field.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, HTMLField, NumberField, ObjectField, SchemaField, StringField
} = foundry.data.fields;

/**
 * @import { ActivityUsageChatButton } from "../../documents/activity/_types.mjs";
 * @import { UsageMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a usage chat message.
 * @extends {ItemMessageData<UsageMessageSystemData>}
 * @mixes UsageMessageSystemData
 */
export default class UsageMessageData extends ItemMessageData {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      activity: new SourceReferenceField({
        chatFlavor: new HTMLField(),
        uuid: new StringField({ blank: false, nullable: true, required: true })
      }),
      buttons: new ArrayField(new SchemaField({
        action: new StringField({ blank: false, required: true }),
        canGroup: new BooleanField(),
        dataset: new ObjectField(),
        icon: new StringField(),
        label: new SchemaField({
          hidden: new StringField(),
          value: new StringField()
        }),
        visibility: new StringField({ choices: ["all", "creator", "gm"], initial: "creator", required: true })
      })),
      cause: new StringField(), // TODO: Replace with DocumentUUIDField with `relative: true` in DnD5e 6.0
      concentration: new DocumentIdField({ required: false }),
      deltas: new ActorDeltasField({}, { initial: null, nullable: true }),
      effects: new ArrayField(new StringField({ blank: false })),
      scaling: new NumberField({ integer: true, min: 0, initial: 0 })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/usage-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The actor for the chat message.
   * @type {Actor5e}
   */
  get actor() {
    return this.parent.getAssociatedActor();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get showIdentity() {
    return !!this.activity.name;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  _getButtonGroupContextOptions() {
    const { forwardAction } = ui.context.target.dataset;
    const activity = this.parent.getAssociatedActivity();
    if ( typeof activity?.onChatAction !== "function" ) return [];
    return this._prepareButtons()
      .filter(b => b.canGroup && !b.hidden && (b.action === forwardAction))
      .map(({ icon, index, label }) => ({
        icon, label,
        onClick: (event, group) => {
          group.dataset.index = index;
          return activity.onChatAction(event, group, this.parent);
        }
      }));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    let context;
    if ( this.parent.content ) context = {
      content: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.parent.content, {
        rollData: this.parent.getRollData()
      })
    };
    else {
      context = await super._prepareContext(options);
      context.activity = this.activity;
      context.buttons = this._prepareButtons();
      this._prepareButtonGroups(context);
      if ( this.activity.name ) context.subtitle = this.activity.name;
    }

    const item = this.parent.getAssociatedItem();
    const activity = await fromUuid(this.activity.uuid);
    const allowPlayerApplication = this.targets?.some(t => fromUuidSync(t.token).isOwner)
      || ((this.parent.author?.id === game.user.id) && (activity.target.affects.type === "self"));
    context.effects = (await Promise.all(this.effects.map(uuid => fromUuid(uuid, { relative: item }))))
      .filter(e => e && ( game.user.isGM || dnd5e.settings.allowPlayerEffectsTray && allowPlayerApplication));
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Render context for the buttons offered by the activity, with their visibility resolved for the viewing user.
   * @returns {object[]}
   * @protected
   */
  _prepareButtons() {
    const activity = this.parent.getAssociatedActivity();
    const isCreator = game.user.isGM || this.actor?.isOwner || this.parent.isAuthor;
    return this.buttons.map((button, index) => {
      const { action, visibility } = button;
      let hidden = visibility !== "all";
      if ( hidden ) {
        hidden = (visibility === "gm") && !game.user.isGM;
        hidden ||= !isCreator || activity?.shouldHideChatButton(button, this.parent);
      }
      const label = this.parent.shouldDisplayChallenge
        ? button.label.value
        : (button.label.hidden || button.label.value);
      return { ...button, hidden, index, label, dataset: { ...button.dataset, /** @deprecated */ action } };
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare render context for button groups.
   * @param {object} context  Render context.
   * @protected
   */
  _prepareButtonGroups(context) {
    context.buttonGroups = context.buttons.reduce((obj, button) => {
      const { action, canGroup, hidden, icon, label } = button;
      if ( hidden ) return obj;
      obj[action] ??= { icon, entries: [] };
      if ( canGroup ) {
        context.rows[action] ??= { icon, entries: [], label: `DND5E.CHATMESSAGE.Row.${action}` };
        context.rows[action].entries.push(label);
        if ( obj[action].entries.length ) {
          obj[action].entries[0].singleton = false;
          return obj;
        }
        obj[action].entries.push({ ...button, label: `DND5E.CHATMESSAGE.Button.${action}`, singleton: true });
      } else {
        obj[action].entries.push(button);
      }
      return obj;
    }, {});
    if ( foundry.utils.isEmpty(context.buttonGroups) ) delete context.buttonGroups;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(element) {
    super._onRender(element);
    if ( this.parent.shouldDisplayChallenge ) element.dataset.displayChallenge = "";
    const activity = this.parent.getAssociatedActivity();
    activity?.onRenderChatCard(this.parent, element);
    activity?._activateLegacyChatListeners(this.parent, element);
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onClickAction(event, target) {
    if ( event.button !== 0 ) return;
    this.parent.getAssociatedActivity()?.onChatAction(event, target, this.parent);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve the descriptor for the button that was clicked.
   * @param {HTMLElement} target  Button that was clicked.
   * @returns {ActivityUsageChatButton|void}
   */
  getButton(target) {
    return this.buttons[Number(target.dataset.index)];
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    super.migrateData(source);
    if ( "spellLevel" in source ) {
      source.level = source.spellLevel;
      delete source.spellLevel;
    }
    return source;
  }

  /* -------------------------------------------- */
  /*  Deprecations                                */
  /* -------------------------------------------- */

  /**
   * @ignore
   * @deprecated
   * @since 6.0.0
   */
  get spellLevel() {
    foundry.utils.logCompatibilityWarning("UsageMessageData#spellLevel is deprecated. "
      + "Please use the 'level' property instead.", { since: "DnD5e 6.0", until: "DnD5e 6.2" });
    return this.level;
  }
}
