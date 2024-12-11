import Actor5e from "../../documents/actor/actor.mjs";
import Proficiency from "../../documents/actor/proficiency.mjs";
import * as Trait from "../../documents/actor/trait.mjs";
import { formatCR, formatNumber, splitSemicolons } from "../../utils.mjs";
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
 * @property {SourceData} source                 Adventure or sourcebook where this NPC originated.
 */
export default class NPCData extends CreatureTemplate {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.SOURCE"];

  /* -------------------------------------------- */

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
          tempmax: new NumberField({
            integer: true, initial: 0, label: "DND5E.HitPointsTempMax", hint: "DND5E.HitPointsTempMaxHint"
          }),
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
        })
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
      source: new SourceField(),
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
   * Convert source string into custom object & move to top-level.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateSource(source) {
    let custom;
    if ( ("details" in source) && ("source" in source.details) ) {
      if ( foundry.utils.getType(source.details?.source) === "string" ) custom = source.details.source;
      else source.source = { ...(source.source ?? {}), ...source.details.source };
    }
    if ( custom ) {
      source.source ??= {};
      source.source.custom = custom;
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
    SourceField.shimActor.call(this);
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
    SourceField.prepareData.call(this.source, this.parent._stats?.compendiumSource ?? this.parent.uuid);
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
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preUpdate(changed, options, user) {
    if ( (await super._preUpdate(changed, options, user)) === false ) return false;
    for ( const key of ["legact", "legres"] ) {
      const max = foundry.utils.getProperty(changed, `system.resources.${key}.max`);
      if ( (max !== undefined) && !foundry.utils.hasProperty(changed, `system.resources.${key}.value`) ) {
        const delta = max - foundry.utils.getProperty(this, `resources.${key}.max`);
        const value = foundry.utils.getProperty(this, `resources.${key}.value`);
        foundry.utils.setProperty(changed, `system.resources.${key}.value`, value + delta);
      }
    }
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

  /* -------------------------------------------- */

  /** @override */
  async recoverCombatUses(periods, updates) {
    // Reset legendary actions at the start of a combat encounter or at the end of the creature's turn
    if ( this.resources.legact.max && (periods.has("encounter") || periods.has("turnEnd")) ) {
      updates.actor["system.resources.legact.value"] = this.resources.legact.max;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async toEmbed(config, options={}) {
    for ( const value of config.values ) {
      if ( value === "statblock" ) config.statblock = true;
    }
    if ( !config.statblock ) return super.toEmbed(config, options);

    const context = await this._prepareEmbedContext();
    const template = document.createElement("template");
    template.innerHTML = await renderTemplate("systems/dnd5e/templates/actors/embeds/npc-embed.hbs", context);

    /**
     * A hook event that fires after an embedded NPC stat block rendered.
     * @function dnd5e.renderNPCStatBlock
     * @memberof hookEvents
     * @param {Actor5e} actor                   NPC being embedded.
     * @param {HTMLTemplateElement} template    Template whose children will be embedded.
     * @param {DocumentHTMLEmbedConfig} config  Configuration for embedding behavior.
     * @param {EnrichmentOptions} options       Original enrichment options.
     */
    Hooks.call("dnd5e.renderNPCStatBlock", this.parent, template, config, options);

    return template.content;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context information for the embed template rendering.
   * @returns {object}
   */
  async _prepareEmbedContext() {
    const formatter = game.i18n.getListFormatter({ type: "unit" });
    const prepareMeasured = (value, units, label) => {
      value = `${formatNumber(value)} ${units}.`;
      return label ? `${label} ${value}` : value;
    };
    const prepareTrait = ({ value, custom }, trait) => formatter.format([
      ...Array.from(value).map(t => Trait.keyLabel(t, { trait })).filter(_ => _),
      ...splitSemicolons(custom ?? "")
    ].sort((lhs, rhs) => lhs.localeCompare(rhs, game.i18n.lang)));

    const context = {
      abilityTables: Array.fromRange(3).map(_ => ({ abilities: [] })),
      actionSections: {
        trait: {
          label: game.i18n.localize("DND5E.NPC.SECTIONS.Traits"),
          actions: []
        },
        action: {
          label: game.i18n.localize("DND5E.NPC.SECTIONS.Actions"),
          actions: []
        },
        bonus: {
          label: game.i18n.localize("DND5E.NPC.SECTIONS.BonusActions"),
          actions: []
        },
        reaction: {
          label: game.i18n.localize("DND5E.NPC.SECTIONS.Reactions"),
          actions: []
        },
        legendary: {
          label: game.i18n.localize("DND5E.NPC.SECTIONS.LegendaryActions"),
          // TODO: Add legendary description
          actions: []
        }
      },
      document: this.parent,
      summary: {
        // Challenge Rating (e.g. `23 (XP 50,000; PB +7`))
        // TODO: Handle increased XP in lair for 2024 creatures
        cr: `${formatCR(this.details.cr, { narrow: false })} (${game.i18n.localize("DND5E.ExperiencePointsAbbr")} ${
          formatNumber(this.details.xp.value)}; ${game.i18n.localize("DND5E.ProficiencyBonusAbbr")} ${
          formatNumber(this.attributes.prof, { signDisplay: "always" })})`,

        // Gear
        // TODO: Handle once gear is implemented by system
        gear: "",

        // Initiative (e.g. `+0 (10)`)
        initiative: `${formatNumber(this.attributes.init.mod, { signDisplay: "always" })} (${
          formatNumber(this.attributes.init.score)})`,

        // Languages (e.g. `Common, Draconic`)
        languages: prepareTrait(this.traits.languages, "languages") || game.i18n.localize("None"),

        // Senses (e.g. `Blindsight 60 ft., Darkvision 120 ft.; Passive Perception 27`)
        senses: [
          formatter.format([
            ...Object.entries(CONFIG.DND5E.senses)
              .filter(([k]) => this.attributes.senses[k])
              .map(([k, label]) => prepareMeasured(this.attributes.senses[k], this.attributes.senses.units, label)),
            ...splitSemicolons(this.attributes.senses.special)
          ].sort((lhs, rhs) => lhs.localeCompare(rhs, game.i18n.lang))),
          `${game.i18n.localize("DND5E.PassivePerception")} ${formatNumber(this.skills.prc.passive)}`
        ].filterJoin("; "),

        // Skills (e.g. `Perception +17, Stealth +7`)
        skills: formatter.format(
          Object.entries(CONFIG.DND5E.skills)
            .filter(([k]) => this.skills[k].value > 0)
            .map(([k, { label }]) => `${label} ${formatNumber(this.skills[k].total, { signDisplay: "always" })}`)
        ),

        // Speed (e.g. `40 ft., Burrow 40 ft., Fly 80 ft.`)
        speed: formatter.format([
          prepareMeasured(this.attributes.movement.walk, this.attributes.movement.units),
          ...Object.entries(CONFIG.DND5E.movementTypes)
            .filter(([k]) => this.attributes.movement[k] && (k !== "walk"))
            .map(([k, label]) => {
              let prepared = prepareMeasured(this.attributes.movement[k], this.attributes.movement.units, label);
              if ( (k === "fly") && this.attributes.movement.hover ) {
                prepared = `${prepared} (${game.i18n.localize("DND5E.MovementHover").toLowerCase()})`;
              }
              return prepared;
            })
        ]),

        // Tag (e.g. `Gargantuan Dragon, Lawful Evil`)
        tag: game.i18n.format("DND5E.CreatureTag", {
          size: CONFIG.DND5E.actorSizes[this.traits.size]?.label ?? "",
          type: Actor5e.formatCreatureType(this.details.type),
          alignment: this.details.alignment
        })
      },
      system: this
    };

    for ( const [index, [key, { abbreviation }]] of Object.entries(CONFIG.DND5E.abilities).entries() ) {
      context.abilityTables[index % 3].abilities.push({ ...this.abilities[key], label: abbreviation.capitalize() });
    }

    for ( const type of ["vulnerabilities", "resistances", "immunities"] ) {
      const entries = [];
      for ( const category of ["damage", "condition"] ) {
        if ( (category === "condition") && (type !== "immunities") ) continue;
        const trait = `${category[0]}${type[0]}`;
        const data = this.traits[trait];
        const { value, physical } = data.value.reduce((acc, t) => {
          if ( data.bypasses?.size && CONFIG.DND5E.damageTypes[t]?.isPhysical ) acc.physical.push(t);
          else acc.value.push(t);
          return acc;
        }, { value: [], physical: [] });
        const list = prepareTrait({ value, custom: data.custom }, trait);
        if ( list ) entries.push(list);
        if ( physical.length ) entries.push(game.i18n.format("DND5E.DamagePhysicalBypasses", {
          damageTypes: game.i18n.getListFormatter({ style: "long", type: "conjunction" }).format(
            physical.map(t => CONFIG.DND5E.damageTypes[t].label)
          ),
          bypassTypes: game.i18n.getListFormatter({ style: "long", type: "disjunction" }).format(
            Array.from(data.bypasses).map(t => CONFIG.DND5E.itemProperties[t]?.label).filter(_ => _)
          )
        }));
      }
      if ( entries.length ) context.summary[type] = entries.join("; ");
    }

    for ( const item of this.parent.items ) {
      if ( !["feat", "weapon"].includes(item.type) ) continue;
      const category = item.system.activities.contents[0]?.activation.type ?? "trait";
      if ( category in context.actionSections ) {
        const description = (await TextEditor.enrichHTML(item.system.description.value, {
          secrets: false, rollData: item.getRollData(), relativeTo: item
        })).replace(/^\s*<p>/g, "").replace(/<\/p>\s*$/g, "");
        // TODO: Add standard uses to item names (e.g. `Recharge 5-6`, `1/day`, etc.)
        context.actionSections[category].actions.push({ name: item.name, description });
      }
    }
    for ( const key of Object.keys(context.actionSections) ) {
      if ( !context.actionSections[key].actions.length ) delete context.actionSections[key];
    }

    return context;
  }
}
