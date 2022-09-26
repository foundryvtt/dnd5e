import * as creature from "./creature.mjs";

/**
 * Data definition for Non-Player Characters.
 *
 * @property {NPCAttributeData} attributes  NPC's HP formula & default HP value.
 * @property {NPCDetailsData} details       NPC type, environment, CR, and other extended details.
 * @property {NPCResourcesData} resources   NPC's legendary and lair resources.
 */
export class NPCData extends creature.CreatureData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      attributes: new foundry.data.fields.EmbeddedDataField(NPCAttributeData, {label: "DND5E.Attributes"}),
      details: new foundry.data.fields.EmbeddedDataField(NPCDetailsData, {label: "DND5E.Details"}),
      resources: new foundry.data.fields.EmbeddedDataField(NPCResourcesData, {label: "DND5E.Resources"})
    };
  }
}

/**
 * An embedded data structure for extra attribute data used by NPCs.
 * @see NPCData
 *
 * @property {object} hp                    NPC's hit point data.
 * @property {string} hp.formula            Formula used to determine hit points.
 */
export class NPCAttributeData extends creature.CreatureAttributeData {
  static defineSchema() {
    const schema = super.defineSchema();
    const hpFields = foundry.utils.deepClone(schema.hp.fields);
    Object.values(hpFields).forEach(v => v.parent = undefined);
    return {
      ...schema,
      hp: new foundry.data.fields.SchemaField({
        ...hpFields,
        formula: new foundry.data.fields.StringField({required: true, label: ""})
      }, schema.hp.options)
    };
  }
}

/**
 * An embedded data structure for extra details data used by NPCs.
 * @see NPCData
 *
 * @property {TypeData} type        Creature type of this NPC.
 * @property {string} type.value    NPC's type as defined in the system configuration.
 * @property {string} type.subtype  NPC's subtype usually displayed in parenthesis after main type.
 * @property {string} type.swarm    Size of the individual creatures in a swarm or blank if NPC isn't a swarm.
 * @property {string} type.custom   Custom type beyond what is available in the configuration.
 * @property {string} environment   Common environments in which this NPC is found.
 * @property {number} cr            NPC's challenge rating.
 * @property {number} spellLevel    Spellcasting level of this NPC.
 * @property {string} source        What book or adventure is this NPC from?
 */
export class NPCDetailsData extends creature.CreatureDetailsData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      type: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.StringField({required: true, blank: true, label: "DND5E.CreatureType"}),
        subtype: new foundry.data.fields.StringField({required: true, label: "DND5E.CreatureTypeSelectorSubtype"}),
        swarm: new foundry.data.fields.StringField({required: true, blank: true, label: "DND5E.CreatureSwarmSize"}),
        custom: new foundry.data.fields.StringField({required: true, label: "DND5E.CreatureTypeSelectorCustom"})
      }, {label: "DND5E.CreatureType"}),
      environment: new foundry.data.fields.StringField({required: true, label: "DND5E.Environment"}),
      cr: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 1, label: "DND5E.ChallengeRating"
      }),
      spellLevel: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SpellcasterLevel"
      }),
      source: new foundry.data.fields.StringField({required: true, label: "DND5E.Source"})
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static migrateData(source) {
    this.migrateTypeData(source);
    return super.migrateData(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the actor type string to type object.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateTypeData(source) {
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

/**
 * An embedded data structure for NPC resources.
 * @see NPCData
 *
 * @property {object} legact           NPC's legendary actions.
 * @property {number} legact.value     Currently available legendary actions.
 * @property {number} legact.max       Maximum number of legendary actions.
 * @property {object} legres           NPC's legendary resistances.
 * @property {number} legres.value     Currently available legendary resistances.
 * @property {number} legres.max       Maximum number of legendary resistances.
 * @property {object} lair             NPC's lair actions.
 * @property {boolean} lair.value      Does this NPC use lair actions.
 * @property {number} lair.initiative  Initiative count when lair actions are triggered.
 */
export class NPCResourcesData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
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
    };
  }
}
