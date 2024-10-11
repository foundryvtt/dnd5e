import BaseActivityData from "./base-activity.mjs";

const { BooleanField, DocumentUUIDField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Data model for a Cast activity.
 *
 * @property {object} spell
 * @property {object} spell.challenge
 * @property {number} spell.challenge.attack     Flat to hit bonus in place of the spell's normal attack bonus.
 * @property {number} spell.challenge.save       Flat DC to use in place of the spell's normal save DC.
 * @property {boolean} spell.challenge.override  Use custom attack bonus & DC rather than creature's.
 * @property {number} spell.level                Base level at which to cast the spell.
 * @property {Set<string>} spell.properties      Spell components & tags to ignore while casting.
 * @property {string} spell.uuid                 UUID of the spell to cast.
 */
export default class CastActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    const schema = super.defineSchema();
    delete schema.effects;
    return {
      ...schema,
      spell: new SchemaField({
        challenge: new SchemaField({
          attack: new NumberField(),
          save: new NumberField(),
          override: new BooleanField()
        }),
        level: new NumberField(),
        properties: new SetField(new StringField()),
        uuid: new DocumentUUIDField()
      })
    };
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareData() {
    const spell = fromUuidSync(this.spell.uuid);
    if ( spell ) {
      this.name = this.name || spell.name;
      this.img = this.img || spell.img;
    }
    super.prepareData();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData(rollData) {
    super.prepareFinalData(rollData);

    for ( const field of ["activation", "duration", "range", "target"] ) {
      Object.defineProperty(this[field], "canOverride", {
        value: true,
        configurable: true,
        enumerable: false
      });
    }
  }
}
