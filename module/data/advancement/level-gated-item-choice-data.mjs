import { ItemChoiceConfigurationData } from "./item-choice-data.mjs";
import {
  cleanPoolId,
  cleanSectionTitle,
  MAX_LEVEL_GATED_CHOICE_LEVEL,
  normalizePoolRole
} from "../../documents/advancement/level-gated-item-choice-helpers.mjs";

const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Configuration data for Level-Gated Item Choice advancement.
 * @extends {ItemChoiceConfigurationData}
 */
export class LevelGatedItemChoiceConfigurationData extends ItemChoiceConfigurationData {

  /** @override */
  static LOCALIZATION_PREFIXES = [
    "DND5E.ADVANCEMENT.LevelGatedItemChoice",
    ...ItemChoiceConfigurationData.LOCALIZATION_PREFIXES
  ];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    const schema = super.defineSchema();

    schema.pool = new ArrayField(new SchemaField({
      uuid: new StringField({ required: true, nullable: false, blank: false }),
      minLevel: new NumberField({
        required: false,
        integer: true,
        min: 0,
        nullable: true,
        initial: null,
        label: "DND5E.ADVANCEMENT.LevelGatedItemChoice.FIELDS.pool.FIELDS.minLevel.label"
      })
    }));

    schema.poolRole = new StringField({
      required: false,
      nullable: false,
      blank: false,
      initial: "standalone",
      label: "DND5E.ADVANCEMENT.LevelGatedItemChoice.FIELDS.poolRole.label"
    });

    schema.poolId = new StringField({
      required: false,
      nullable: false,
      blank: true,
      initial: "",
      label: "DND5E.ADVANCEMENT.LevelGatedItemChoice.FIELDS.poolId.label"
    });

    schema.parentPoolId = new StringField({
      required: false,
      nullable: false,
      blank: true,
      initial: "",
      label: "DND5E.ADVANCEMENT.LevelGatedItemChoice.FIELDS.parentPoolId.label"
    });

    schema.sectionTitles = new SchemaField(Object.fromEntries(
      Array.from({ length: MAX_LEVEL_GATED_CHOICE_LEVEL }, (_, index) => {
        const level = index + 1;
        return [level, new StringField({
          required: false,
          nullable: false,
          blank: true,
          initial: "",
          label: "DND5E.ADVANCEMENT.LevelGatedItemChoice.FIELDS.sectionTitles.label"
        })];
      })
    ), {
      required: false,
      nullable: false,
      label: "DND5E.ADVANCEMENT.LevelGatedItemChoice.FIELDS.sectionTitles.label"
    });

    return schema;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    super.migrateData(source);
    if ( !source ) return source;

    const pool = Array.isArray(source.pool) ? source.pool : Object.values(source.pool ?? {});
    if ( pool.length ) {
      let lastMin = 1;
      source.pool = pool.map(entry => {
        if ( foundry.utils.getType(entry) === "string" ) return { uuid: entry, minLevel: lastMin };

        const rawMin = entry.minLevel;
        const min = [undefined, null, ""].includes(rawMin) ? lastMin : Number(rawMin);
        const minLevel = Number.isFinite(min) ? min : lastMin;
        lastMin = minLevel;
        return { uuid: entry.uuid, minLevel };
      });
    }

    source.poolRole = normalizePoolRole(source.poolRole);
    source.poolId = cleanPoolId(source.poolId);
    source.parentPoolId = cleanPoolId(source.parentPoolId);
    source.sectionTitles = Object.fromEntries(Array.from({ length: MAX_LEVEL_GATED_CHOICE_LEVEL }, (_, index) => {
      const level = index + 1;
      return [level, cleanSectionTitle(source.sectionTitles?.[level])];
    }));

    return source;
  }
}
