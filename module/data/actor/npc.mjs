import Proficiency from "../../documents/actor/proficiency.mjs";
import FormulaField from "../fields/formula-field.mjs";
import CreatureTypeField from "../shared/creature-type-field.mjs";
import RollConfigField from "../shared/roll-config-field.mjs";
import SourceField from "../shared/source-field.mjs";
import AttributesFields from "./templates/attributes.mjs";
import CreatureTemplate from "./templates/creature.mjs";
import DetailsFields from "./templates/details.mjs";
import TraitsFields from "./templates/traits.mjs";

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * System data definition for NPCs.
 *
 * @property {object} attributes
 * @property {object} attributes.ac
 * @property {number} attributes.ac.flat         Flat value used for flat or natural armor calculation.
 * @property {string} attributes.ac.calc         Name of one of the built-in formulas to use.
 * @property {string} attributes.ac.formula      Custom formula to use.
 * @property {object} attributes.hd
 * @property {number} attributes.hd.spent        Number of hit dice spent.
 * @property {object} attributes.hp
 * @property {number} attributes.hp.value        Current hit points.
 * @property {number} attributes.hp.max          Maximum allowed HP value.
 * @property {number} attributes.hp.temp         Temporary HP applied on top of value.
 * @property {number} attributes.hp.tempmax      Temporary change to the maximum HP.
 * @property {string} attributes.hp.formula      Formula used to determine hit points.
 * @property {object} attributes.death
 * @property {number} attributes.death.success   Number of successful death saves.
 * @property {number} attributes.death.failure   Number of failed death saves.
 * @property {object} details
 * @property {TypeData} details.type             Creature type of this NPC.
 * @property {string} details.type.value         NPC's type as defined in the system configuration.
 * @property {string} details.type.subtype       NPC's subtype usually displayed in parenthesis after main type.
 * @property {string} details.type.swarm         Size of the individual creatures in a swarm, if a swarm.
 * @property {string} details.type.custom        Custom type beyond what is available in the configuration.
 * @property {string} details.environment        Common environments in which this NPC is found.
 * @property {number} details.cr                 NPC's challenge rating.
 * @property {number} details.spellLevel         Spellcasting level of this NPC.
 * @property {SourceData} details.source         Adventure or sourcebook where this NPC originated.
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

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    supportsAdvancement: true
  }, {inplace: false}));

  /* -------------------------------------------- */

  /** @inheritDoc */
  static _systemType = "npc";

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      attributes: new SchemaField({
        ...AttributesFields.common,
        ...AttributesFields.creature,
        ac: new SchemaField({
          flat: new NumberField({integer: true, min: 0, label: "DND5E.ArmorClassFlat"}),
          calc: new StringField({initial: "default", label: "DND5E.ArmorClassCalculation"}),
          formula: new FormulaField({deterministic: true, label: "DND5E.ArmorClassFormula"})
        }, {label: "DND5E.ArmorClass"}),
        hd: new SchemaField({
          spent: new NumberField({integer: true, min: 0, initial: 0})
        }, {label: "DND5E.HitDice"}),
        hp: new SchemaField({
          value: new NumberField({
            nullable: false, integer: true, min: 0, initial: 10, label: "DND5E.HitPointsCurrent"
          }),
          max: new NumberField({
            nullable: false, integer: true, min: 0, initial: 10, label: "DND5E.HitPointsMax"
          }),
          temp: new NumberField({integer: true, initial: 0, min: 0, label: "DND5E.HitPointsTemp"}),
          tempmax: new NumberField({integer: true, initial: 0, label: "DND5E.HitPointsTempMax"}),
          formula: new FormulaField({required: true, label: "DND5E.HPFormula"})
        }, {label: "DND5E.HitPoints"}),
        death: new RollConfigField({
          success: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.DeathSaveSuccesses"
          }),
          failure: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.DeathSaveFailures"
          })
        }, {label: "DND5E.DeathSave"})
      }, {label: "DND5E.Attributes"}),
      details: new SchemaField({
        ...DetailsFields.common,
        ...DetailsFields.creature,
        type: new CreatureTypeField(),
        environment: new StringField({required: true, label: "DND5E.Environment"}),
        cr: new NumberField({
          required: true, nullable: true, min: 0, initial: 1, label: "DND5E.ChallengeRating"
        }),
        spellLevel: new NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SpellcasterLevel"
        }),
        source: new SourceField()
      }, {label: "DND5E.Details"}),
      resources: new SchemaField({
        legact: new SchemaField({
          value: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.LegActRemaining"
          }),
          max: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.LegActMax"
          })
        }, {label: "DND5E.LegAct"}),
        legres: new SchemaField({
          value: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.LegResRemaining"
          }),
          max: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.LegResMax"
          })
        }, {label: "DND5E.LegRes"}),
        lair: new SchemaField({
          value: new BooleanField({required: true, label: "DND5E.LairAct"}),
          initiative: new NumberField({
            required: true, integer: true, label: "DND5E.LairActionInitiative"
          })
        }, {label: "DND5E.LairActionLabel"})
      }, {label: "DND5E.Resources"}),
      traits: new SchemaField({
        ...TraitsFields.common,
        ...TraitsFields.creature
      }, {label: "DND5E.Traits"})
    });
  }

  /* -------------------------------------------- */

  /** @override */
  static get compendiumBrowserFilters() {
    return new Map([
      ["size", {
        label: "DND5E.Size",
        type: "set",
        config: {
          choices: CONFIG.DND5E.actorSizes,
          keyPath: "system.traits.size"
        }
      }],
      ["type", {
        label: "DND5E.CreatureType",
        type: "set",
        config: {
          choices: CONFIG.DND5E.creatureTypes,
          keyPath: "system.details.type.value"
        }
      }],
      ["cr", {
        label: "DND5E.ChallengeRating",
        type: "range",
        config: {
          keyPath: "system.details.cr",
          min: 0,
          max: 30
        }
      }],
      ["movement", {
        label: "DND5E.Movement",
        type: "set",
        config: {
          choices: CONFIG.DND5E.movementTypes
        },
        createFilter: (filters, value, def) => {
          for ( const [k, v] of Object.entries(value ?? {}) ) {
            if ( v === 1 ) filters.push({ k: `system.attributes.movement.${k}`, o: "gt", v: 0 });
            if ( v === -1 ) filters.push({ k: `system.attributes.movement.${k}`, v: 0 });
          }
        }
      }]
    ]);
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
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
          || (typeLc === game.i18n.localize(v.label).toLowerCase())
          || (typeLc === game.i18n.localize(`${v.label}Pl`).toLowerCase());
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
          return (sizeLc === k) || (sizeLc === game.i18n.localize(v.label).toLowerCase());
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

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareBaseData() {
    this.details.level = 0;
    this.attributes.attunement.value = 0;

    // Determine hit dice denomination & max from hit points formula
    const [, max, denomination] = this.attributes.hp.formula?.match(/(\d*)d(\d+)/i) ?? [];
    this.attributes.hd.max = Number(max ?? 0);
    this.attributes.hd.denomination = Number(denomination ?? CONFIG.DND5E.actorSizes[this.traits.size]?.hitDie ?? 4);

    for ( const item of this.parent.items ) {
      // Class levels & hit dice
      if ( item.type === "class" ) {
        const classLevels = parseInt(item.system.levels) ?? 1;
        this.details.level += classLevels;
        this.attributes.hd.max += classLevels;
      }

      // Attuned items
      else if ( item.system.attuned ) this.attributes.attunement.value += 1;
    }

    // Kill Experience
    this.details.xp ??= {};
    this.details.xp.value = this.parent.getCRExp(this.details.cr);

    // Proficiency
    if ( this.details.cr === null ) this.attributes.prof = null;
    else this.attributes.prof = Proficiency.calculateMod(Math.max(this.details.cr, this.details.level, 1));

    // Spellcaster Level
    if ( this.attributes.spellcasting && !Number.isNumeric(this.details.spellLevel) ) {
      this.details.spellLevel = Math.max(this.details.cr, 1);
    }

    AttributesFields.prepareBaseArmorClass.call(this);
    AttributesFields.prepareBaseEncumbrance.call(this);
  }

  /* -------------------------------------------- */

  /**
   * Prepare movement & senses values derived from race item.
   */
  prepareEmbeddedData() {
    if ( this.details.race instanceof Item ) {
      AttributesFields.prepareRace.call(this, this.details.race, { force: true });
      this.details.type = this.details.race.system.type;
    }
    for ( const key of Object.keys(CONFIG.DND5E.movementTypes) ) this.attributes.movement[key] ??= 0;
    for ( const key of Object.keys(CONFIG.DND5E.senses) ) this.attributes.senses[key] ??= 0;
    this.attributes.movement.units ??= Object.keys(CONFIG.DND5E.movementUnits)[0];
    this.attributes.senses.units ??= Object.keys(CONFIG.DND5E.movementUnits)[0];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    const rollData = this.parent.getRollData({ deterministic: true });
    const { originalSaves } = this.parent.getOriginalStats();

    this.prepareAbilities({ rollData, originalSaves });
    AttributesFields.prepareEncumbrance.call(this, rollData);
    AttributesFields.prepareExhaustionLevel.call(this);
    AttributesFields.prepareMovement.call(this);
    AttributesFields.prepareConcentration.call(this, rollData);
    SourceField.prepareData.call(this.details.source, this.parent._stats?.compendiumSource ?? this.parent.uuid);
    TraitsFields.prepareResistImmune.call(this);

    // Hit Dice
    const { hd } = this.attributes;
    hd.value = Math.max(0, hd.max - hd.spent);
    hd.pct = Math.clamp(hd.max ? (hd.value / hd.max) * 100 : 0, 0, 100);

    // Hit Points
    const hpOptions = {
      advancement: Object.values(this.parent.classes).map(c => c.advancement.byType.HitPoints?.[0]).filter(a => a),
      mod: this.abilities[CONFIG.DND5E.defaultAbilities.hitPoints ?? "con"]?.mod ?? 0
    };
    AttributesFields.prepareHitPoints.call(this, this.attributes.hp, hpOptions);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Level used to determine cantrip scaling.
   * @param {Item5e} spell  Spell for which to fetch the cantrip level.
   * @returns {number}
   */
  cantripLevel(spell) {
    if ( spell.system.preparation.mode === "innate" ) return this.details.cr;
    return this.details.level ? this.details.level : this.details.spellLevel;
  }
}
