import BaseActivityData from "./base-activity.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { BooleanField, DocumentUUIDField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { CastActivityData } from "./_types.mjs";
 */

/**
 * Data model for a Cast activity.
 * @extends {BaseActivityData<CastActivityData>}
 * @mixes CastActivityData
 */
export default class BaseCastActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    const schema = super.defineSchema();
    delete schema.effects;
    return {
      ...schema,
      spell: new SchemaField({
        ability: new StringField(),
        challenge: new SchemaField({
          attack: new FormulaField({ deterministic: true }),
          save: new FormulaField({ deterministic: true }),
          override: new BooleanField()
        }),
        level: new NumberField(),
        properties: new SetField(new StringField(), { initial: ["vocal", "somatic", "material"] }),
        spellbook: new BooleanField({ initial: true }),
        uuid: new DocumentUUIDField({
          type: "Item",
          validate: uuid => {
            const item = fromUuidSync(uuid, { strict: false });
            return !item || (item.type === "spell");
          },
          validationError: "must be a spell item"
        })
      })
    };
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData(rollData) {
    const spell = fromUuidSync(this.spell.uuid) ?? this.cachedSpell;
    if ( spell ) {
      this.name = this._source.name || spell.name || this.name;
      this.img = this._source.img || spell.img || this.img;
    }

    this.visibility.requireMagic = true;
    super.prepareFinalData(rollData);

    for ( const field of ["activation", "duration", "range", "target"] ) {
      Object.defineProperty(this[field], "canOverride", {
        value: true,
        configurable: true,
        enumerable: false
      });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareSheetContext() {
    const context = super.prepareSheetContext();
    const cachedSpell = this.cachedSpell;
    if ( cachedSpell ) {
      const spellLabels = { ...(cachedSpell.labels ?? {}) };
      delete spellLabels.recovery;
      context.labels = foundry.utils.mergeObject(context.labels, spellLabels, { inplace: false });
      context.save = { ...cachedSpell.system.activities?.getByType("save")[0]?.save };
    }
    return context;
  }
}
