import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";
import ActivationField from "../shared/activation-field.mjs";
import DurationField from "../shared/duration-field.mjs";
import PropertyField from "../shared/property-field.mjs";
import RangeField from "../shared/range-field.mjs";
import TargetField from "../shared/target-field.mjs";
import SourceReferenceField from "./fields/source-reference-field.mjs";
import TargetsField from "./fields/targets-field.mjs";

const {
  ArrayField, BooleanField, DocumentUUIDField, HTMLField, NumberField, SetField, StringField
} = foundry.data.fields;

/**
 * @import { ItemMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a chat message displaying an item at the moment of its use.
 * @extends {ChatMessageDataModel<ItemMessageSystemData>}
 * @mixes ItemMessageSystemData
 */
export default class ItemMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      activation: new ActivationField({}, { initial: null, nullable: true }),
      concealed: new BooleanField(),
      description: new HTMLField(),
      duration: new DurationField({
        concentration: new BooleanField(),
        value: new NumberField({ min: 0 })
      }, { initial: null, nullable: true }),
      identified: new BooleanField({ initial: null, nullable: true }),
      item: new SourceReferenceField({
        compendiumSource: new DocumentUUIDField(),
        properties: new SetField(new StringField())
      }),
      level: new NumberField({ integer: true, nullable: true }),
      mastery: new StringField(),
      materials: new StringField(),
      properties: new ArrayField(new PropertyField()),
      range: new RangeField({
        long: new NumberField({ min: 0 }),
        reach: new NumberField({ min: 0 }),
        value: new NumberField({ min: 0 })
      }, { initial: null, nullable: true }),
      school: new StringField(),
      subtitle: new ArrayField(new StringField()),
      target: new TargetField({}, { initial: null, nullable: true }),
      targets: new TargetsField()
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/item-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Whether the properties that identify the item are displayed as pills, rather than in the card's subtitle.
   * @type {boolean}
   */
  get showIdentity() {
    return false;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const { concealed, description, item, showIdentity, subtitle } = this;
    return {
      concealed, description, item,
      rows: {
        properties: {
          entries: PropertyField.getLabels(showIdentity ? this.properties : this.properties.filter(p => !p.identity), {
            ...this, properties: item.properties
          }),
          icon: "fa-solid fa-tag",
          label: "DND5E.CHATMESSAGE.Row.Properties"
        }
      },
      subtitle: subtitle.filterJoin(" • "),
      supplements: this._prepareSupplements()
    };
  }

  /* -------------------------------------------- */

  /** @override */
  _getEnrichmentOptions() {
    return { avatar: false };
  }

  /* -------------------------------------------- */

  /**
   * Render context for supplements.
   * @returns {{ detail: string, label: string }[]}
   * @protected
   */
  _prepareSupplements() {
    const supplements = [];
    if ( this.activation?.condition ) {
      supplements.push({ detail: this.activation.condition, label: "DND5E.Trigger" });
    }
    if ( this.materials ) supplements.push({ detail: this.materials, label: "DND5E.Materials" });
    return supplements;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(element) {
    super._onRender(element);
    element.classList.add("compact");
    if ( game.settings.get("dnd5e", "autoCollapseItemCards") ) {
      element.querySelectorAll(".card-header, .card-description").forEach(el => el.classList.add("collapsed"));
    }
  }
}
