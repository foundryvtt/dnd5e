import { FormulaField } from "../fields.mjs";
import SourceField from "../shared/source-field.mjs";
import AttributesFields from "./templates/attributes.mjs";
import CreatureTemplate from "./templates/creature.mjs";
import DetailsFields from "./templates/details.mjs";
import TraitsFields from "./templates/traits.mjs";

/**
 * System data definition for NPCs.
 *
 * @property {object} attributes
 * @property {object} attributes.ac
 * @property {number} attributes.ac.flat         Flat value used for flat or natural armor calculation.
 * @property {string} attributes.ac.calc         Name of one of the built-in formulas to use.
 * @property {string} attributes.ac.formula      Custom formula to use.
 * @property {object} attributes.hp
 * @property {number} attributes.hp.value        Current hit points.
 * @property {number} attributes.hp.max          Maximum allowed HP value.
 * @property {number} attributes.hp.temp         Temporary HP applied on top of value.
 * @property {number} attributes.hp.tempmax      Temporary change to the maximum HP.
 * @property {string} attributes.hp.formula      Formula used to determine hit points.
 * @property {object} details
 * @property {TypeData} details.type             Creature type of this NPC.
 * @property {string} details.type.value         NPC's type as defined in the system configuration.
 * @property {string} details.type.subtype       NPC's subtype usually displayed in parenthesis after main type.
 * @property {string} details.type.swarm         Size of the individual creatures in a swarm, if a swarm.
 * @property {string} details.type.custom        Custom type beyond what is available in the configuration.
 * @property {string} details.environment        Common environments in which this NPC is found.
 * @property {number} details.cr                 NPC's challenge rating.
 * @property {number} details.spellLevel         Spellcasting level of this NPC.
 * @property {SourceField} details.source        Adventure or sourcebook where this NPC originated.
 * @property {object} resources
 * @property {object} resources.legact           NPC's legendary actions.
 * @property {number} resources.legact.value     Currently available legendary actions.
 * @property {number} resources.legact.max       Maximum number of legendary actions.
 * @property {object} resources.legres           NPC's legendary resistances.
 * @property {number} resources.legres.value     Currently available legendary resistances.
 * @property {number} resources.legres.max       Maximum number of legendary resistances.
 * @property {object} resources.lair             NPC's lair actions.
 * @property {boolean} resources.lair.value      Does this NPC use lair actions.
 * @property {number} resources.lair.initiative  Initiative count when lair actions are triggered.
 */
export default class NPCData extends CreatureTemplate {

  /** @inheritdoc */
  static _systemType = "npc";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      attributes: new foundry.data.fields.SchemaField({
        ...AttributesFields.common,
        ...AttributesFields.creature,
        ac: new foundry.data.fields.SchemaField({
          flat: new foundry.data.fields.NumberField({integer: true, min: 0, label: "DND5E.ArmorClassFlat"}),
          calc: new foundry.data.fields.StringField({initial: "default", label: "DND5E.ArmorClassCalculation"}),
          formula: new FormulaField({deterministic: true, label: "DND5E.ArmorClassFormula"})
        }, {label: "DND5E.ArmorClass"}),
        hp: new foundry.data.fields.SchemaField({
          value: new foundry.data.fields.NumberField({
            nullable: false, integer: true, min: 0, initial: 10, label: "DND5E.HitPointsCurrent"
          }),
          max: new foundry.data.fields.NumberField({
            nullable: false, integer: true, min: 0, initial: 10, label: "DND5E.HitPointsMax"
          }),
          temp: new foundry.data.fields.NumberField({integer: true, initial: 0, min: 0, label: "DND5E.HitPointsTemp"}),
          tempmax: new foundry.data.fields.NumberField({integer: true, initial: 0, label: "DND5E.HitPointsTempMax"}),
          formula: new FormulaField({required: true, label: "DND5E.HPFormula"})
        }, {label: "DND5E.HitPoints"})
      }, {label: "DND5E.Attributes"}),
      details: new foundry.data.fields.SchemaField({
        ...DetailsFields.common,
        ...DetailsFields.creature,
        type: new foundry.data.fields.SchemaField({
          value: new foundry.data.fields.StringField({required: true, blank: true, label: "DND5E.CreatureType"}),
          subtype: new foundry.data.fields.StringField({required: true, label: "DND5E.CreatureTypeSelectorSubtype"}),
          swarm: new foundry.data.fields.StringField({required: true, blank: true, label: "DND5E.CreatureSwarmSize"}),
          custom: new foundry.data.fields.StringField({required: true, label: "DND5E.CreatureTypeSelectorCustom"})
        }, {label: "DND5E.CreatureType"}),
        environment: new foundry.data.fields.StringField({required: true, label: "DND5E.Environment"}),
        cr: new foundry.data.fields.NumberField({
          required: true, nullable: false, min: 0, initial: 1, label: "DND5E.ChallengeRating"
        }),
        spellLevel: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SpellcasterLevel"
        }),
        source: new SourceField()
      }, {label: "DND5E.Details"}),
      resources: new foundry.data.fields.SchemaField({
        legact: new foundry.data.fields.SchemaField({
          value: new foundry.data.fields.NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.LegActRemaining"
          }),
          max: new foundry.data.fields.NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.LegActMax"
          })
        }, {label: "DND5E.LegAct"}),
        legres: new foundry.data.fields.SchemaField({
          value: new foundry.data.fields.NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.LegResRemaining"
          }),
          max: new foundry.data.fields.NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.LegResMax"
          })
        }, {label: "DND5E.LegRes"}),
        lair: new foundry.data.fields.SchemaField({
          value: new foundry.data.fields.BooleanField({required: true, label: "DND5E.LairAct"}),
          initiative: new foundry.data.fields.NumberField({
            required: true, integer: true, label: "DND5E.LairActionInitiative"
          })
        }, {label: "DND5E.LairActionLabel"})
      }, {label: "DND5E.Resources"}),
      traits: new foundry.data.fields.SchemaField({
        ...TraitsFields.common,
        ...TraitsFields.creature
      }, {label: "DND5E.Traits"})
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    NPCData.#migrateSource(source);
    NPCData.#migrateTypeData(source);
    AttributesFields._migrateInitiative(source.attributes);
  }

  /* -------------------------------------------- */

  /**
   * Convert source string into custom object.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateSource(source) {
    if ( source.details?.source && (foundry.utils.getType(source.details.source) !== "Object") ) {
      source.details.source = { custom: source.details.source };
    }
  }

  /* -------------------------------------------- */

  /**
   * Migrate the actor type string to type object.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateTypeData(source) {
    const original = source.type;
    if ( typeof original !== "string" ) return;

    source.type = {
      value: "",
      subtype: "",
      swarm: "",
      custom: ""
    };

    // Match the existing string
    const pattern = /^(?:swarm of (?<size>[\w-]+) )?(?<type>[^(]+?)(?:\((?<subtype>[^)]+)\))?$/i;
    const match = original.trim().match(pattern);
    if ( match ) {

      // Match a known creature type
      const typeLc = match.groups.type.trim().toLowerCase();
      const typeMatch = Object.entries(CONFIG.DND5E.creatureTypes).find(([k, v]) => {
        return (typeLc === k)
          || (typeLc === game.i18n.localize(v).toLowerCase())
          || (typeLc === game.i18n.localize(`${v}Pl`).toLowerCase());
      });
      if ( typeMatch ) source.type.value = typeMatch[0];
      else {
        source.type.value = "custom";
        source.type.custom = match.groups.type.trim().titleCase();
      }
      source.type.subtype = match.groups.subtype?.trim().titleCase() ?? "";

      // Match a swarm
      if ( match.groups.size ) {
        const sizeLc = match.groups.size ? match.groups.size.trim().toLowerCase() : "tiny";
        const sizeMatch = Object.entries(CONFIG.DND5E.actorSizes).find(([k, v]) => {
          return (sizeLc === k) || (sizeLc === game.i18n.localize(v).toLowerCase());
        });
        source.type.swarm = sizeMatch ? sizeMatch[0] : "tiny";
      }
      else source.type.swarm = "";
    }

    // No match found
    else {
      source.type.value = "custom";
      source.type.custom = original;
    }
  }
}
