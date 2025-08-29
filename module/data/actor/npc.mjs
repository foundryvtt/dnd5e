import Actor5e from "../../documents/actor/actor.mjs";
import Proficiency from "../../documents/actor/proficiency.mjs";
import * as Trait from "../../documents/actor/trait.mjs";
import { getRulesVersion } from "../../enrichers.mjs";
import { defaultUnits, formatCR, formatLength, formatNumber, getPluralRules, splitSemicolons } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";
import CreatureTypeField from "../shared/creature-type-field.mjs";
import RollConfigField from "../shared/roll-config-field.mjs";
import SourceField from "../shared/source-field.mjs";
import AttributesFields from "./templates/attributes.mjs";
import CreatureTemplate from "./templates/creature.mjs";
import DetailsFields from "./templates/details.mjs";
import TraitsFields from "./templates/traits.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;
const { ArrayField, BooleanField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @typedef NPCHabitatData
 * @property {string} type       The habitat category.
 * @property {string} [subtype]  An optional discriminator for the main category.
 */

/**
 * System data definition for NPCs.
 *
 * @property {object} attributes
 * @property {object} attributes.hd
 * @property {number} attributes.hd.spent        Number of hit dice spent.
 * @property {object} attributes.hp
 * @property {number} attributes.hp.value        Current hit points.
 * @property {number} attributes.hp.max          Maximum allowed HP value.
 * @property {number} attributes.hp.temp         Temporary HP applied on top of value.
 * @property {number} attributes.hp.tempmax      Temporary change to the maximum HP.
 * @property {string} attributes.hp.formula      Formula used to determine hit points.
 * @property {object} attributes.death
 * @property {object} attributes.death.bonuses
 * @property {string} attributes.death.bonuses.save   Numeric or dice bonus to death saving throws.
 * @property {number} attributes.death.success        Number of successful death saves.
 * @property {number} attributes.death.failure        Number of failed death saves.
 * @property {object} attributes.spell
 * @property {number} attributes.spell.level     Spellcasting level of this NPC.
 * @property {object} details
 * @property {TypeData} details.type             Creature type of this NPC.
 * @property {string} details.type.value         NPC's type as defined in the system configuration.
 * @property {string} details.type.subtype       NPC's subtype usually displayed in parenthesis after main type.
 * @property {string} details.type.swarm         Size of the individual creatures in a swarm, if a swarm.
 * @property {string} details.type.custom        Custom type beyond what is available in the configuration.
 * @property {object} details.habitat
 * @property {NPCHabitatData[]} details.habitat.value  Common habitats in which this NPC is found.
 * @property {string} details.habitat.custom     Custom habitats.
 * @property {object} details.treasure
 * @property {Set<string>} details.treasure.value  Random treasure generation categories for this NPC.
 * @property {number} details.cr                 NPC's challenge rating.
 * @property {object} resources
 * @property {object} resources.legact           NPC's legendary actions.
 * @property {number} resources.legact.max       Maximum number of legendary actions.
 * @property {number} resources.legact.spent     Spent legendary actions.
 * @property {object} resources.legres           NPC's legendary resistances.
 * @property {number} resources.legres.max       Maximum number of legendary resistances.
 * @property {number} resources.legres.spent     Spent legendary resistances.
 * @property {object} resources.lair             NPC's lair actions.
 * @property {boolean} resources.lair.value      This creature can possess a lair (2024) or take lair actions (2014).
 * @property {number} resources.lair.initiative  Initiative count when lair actions are triggered.
 * @property {boolean} resources.lair.inside     This actor is currently inside its lair.
 * @property {SourceData} source                 Adventure or sourcebook where this NPC originated.
 */
export default class NPCData extends CreatureTemplate {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.NPC", "DND5E.BONUSES", "DND5E.SOURCE"];

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
          ability: false,
          success: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.DeathSaveSuccesses"
          }),
          failure: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.DeathSaveFailures"
          }),
          bonuses: new SchemaField({
            save: new FormulaField({ required: true, label: "DND5E.DeathSaveBonus" })
          })
        }, {label: "DND5E.DeathSave"}),
        spell: new SchemaField({
          level: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SpellcasterLevel"
          })
        })
      }, {label: "DND5E.Attributes"}),
      details: new SchemaField({
        ...DetailsFields.common,
        ...DetailsFields.creature,
        type: new CreatureTypeField(),
        habitat: new SchemaField({
          value: new ArrayField(new SchemaField({
            type: new StringField({ required: true }),
            subtype: new StringField()
          })),
          custom: new StringField({ required: true })
        }),
        cr: new NumberField({
          required: true, nullable: true, min: 0, initial: 1, label: "DND5E.ChallengeRating"
        }),
        treasure: new SchemaField({
          value: new SetField(new StringField())
        })
      }, {label: "DND5E.Details"}),
      resources: new SchemaField({
        legact: new SchemaField({
          max: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.LegendaryAction.Max"
          }),
          spent: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.LegendaryAction.Spent"
          })
        }, {label: "DND5E.LegendaryAction.Label"}),
        legres: new SchemaField({
          max: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.LegendaryResistance.Max"
          }),
          spent: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.LegendaryResistance.Spent"
          })
        }, {label: "DND5E.LegendaryResistance.Label"}),
        lair: new SchemaField({
          value: new BooleanField({required: true, label: "DND5E.LAIR.Action.Uses"}),
          initiative: new NumberField({
            required: true, integer: true, label: "DND5E.LAIR.Action.Initiative"
          }),
          inside: new BooleanField({ label: "DND5E.LAIR.Inside" })
        }, {label: "DND5E.LAIR.Action.Label"})
      }, {label: "DND5E.Resources"}),
      source: new SourceField(),
      traits: new SchemaField({
        ...TraitsFields.common,
        ...TraitsFields.creature,
        important: new BooleanField()
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
      ["habitat", {
        label: "DND5E.Habitat.Configuration.Label",
        type: "set",
        config: {
          choices: CONFIG.DND5E.habitats
        },
        createFilter: (filters, value, def) => {
          const { include, exclude } = Object.entries(value).reduce((d, [key, value]) => {
            if ( value === 1 ) d.include.push(key);
            else if ( value === -1 ) d.exclude.push(key);
            return d;
          }, { include: [], exclude: [] });
          if ( include.length ) filters.push({
            k: "system.details.habitat.value", o: "has", v: { k: "type", o: "in", v: include }
          });
          if ( exclude.length ) filters.push({
            o: "NOT", v: { k: "system.details.habitat.value", o: "has", v: { k: "type", o: "in", v: exclude } }
          });
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
            if ( v === -1 ) filters.push({ o: "NOT", v: { k: `system.attributes.movement.${k}`, o: "gt", v: 0 } });
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
    NPCData.#migrateEnvironment(source);
    NPCData.#migrateLegendaries(source, "legact");
    NPCData.#migrateLegendaries(source, "legres");
    NPCData.#migrateSource(source);
    NPCData.#migrateSpellLevel(source);
    NPCData.#migrateTypeData(source);
    AttributesFields._migrateInitiative(source.attributes);
  }

  /* -------------------------------------------- */

  /**
   * Convert the plain string environment to a custom habitat.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateEnvironment(source) {
    const custom = source.details?.environment;
    if ( (typeof custom === "string") && !("habitat" in source.details) ) source.details.habitat = { custom };
  }

  /* -------------------------------------------- */

  /**
   * Convert legendary action & resistance `value` to `spent`.
   * @param {object} source  The candidate source data from which the model will be constructed.
   * @param {string} prop    The property to migrate.
   * @since 5.1.0
   */
  static #migrateLegendaries(source, prop) {
    const resource = source.resources?.[prop];
    if ( !resource || !("max" in resource) || !("value" in resource) || ("spent" in resource) ) return;
    source.resources[prop].spent = resource.max - resource.value;
    delete resource.value;
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
   * Move spell level from `details.spellLevel` to `attributes.spell.level`.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateSpellLevel(source) {
    if ( source.details?.spellLevel !== undefined ) {
      source.attributes ??= {};
      source.attributes.spell ??= {};
      source.attributes.spell.level ??= source.details.spellLevel;
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
    }

    const lairAdjustment = Number(this.resources.lair.value && this.resources.lair.inside);

    // Kill Experience
    this.details.xp ??= {};
    this.details.xp.value = this.parent.getCRExp(this.details.cr === null ? null : this.details.cr + lairAdjustment);

    // Legendary Resistances/Actions
    this.resources.legact.lr = true;
    this.resources.legres.lr = true;
    if ( this.resources.legact.max ) this.resources.legact.max += lairAdjustment;
    if ( this.resources.legres.max ) this.resources.legres.max += lairAdjustment;

    // Proficiency
    if ( this.details.cr === null ) this.attributes.prof = null;
    else this.attributes.prof = Proficiency.calculateMod(Math.max(this.details.cr, this.details.level, 1));

    // Spellcaster Level
    if ( this.attributes.spellcasting && !Number.isNumeric(this.attributes.spell.level) ) {
      this.attributes.spell.level = Math.max(this.details.cr, 1);
    }

    AttributesFields.prepareBaseArmorClass.call(this);
    AttributesFields.prepareBaseEncumbrance.call(this);
  }

  /* -------------------------------------------- */

  /**
   * Prepare movement & senses values derived from race item.
   */
  prepareEmbeddedData() {
    super.prepareEmbeddedData();
    if ( this.details.race instanceof Item ) {
      AttributesFields.prepareRace.call(this, this.details.race, { force: true });
      this.details.type = this.details.race.system.type;
    }
    for ( const key of Object.keys(CONFIG.DND5E.movementTypes) ) this.attributes.movement[key] ??= 0;
    for ( const key of Object.keys(CONFIG.DND5E.senses) ) this.attributes.senses[key] ??= 0;
    this.attributes.movement.units ??= defaultUnits("length");
    this.attributes.senses.units ??= defaultUnits("length");
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    const rollData = this.parent.getRollData({ deterministic: true });
    const { originalSaves, originalSkills } = this.parent.getOriginalStats();

    this.prepareAbilities({ rollData, originalSaves });
    this.prepareSkills({ rollData, originalSkills });
    this.prepareTools({ rollData });
    AttributesFields.prepareArmorClass.call(this, rollData);
    AttributesFields.prepareConcentration.call(this, rollData);
    AttributesFields.prepareEncumbrance.call(this, rollData);
    AttributesFields.prepareExhaustionLevel.call(this);
    AttributesFields.prepareInitiative.call(this, rollData);
    AttributesFields.prepareMovement.call(this);
    AttributesFields.prepareSpellcastingAbility.call(this);
    SourceField.prepareData.call(this.source, this.parent._stats?.compendiumSource ?? this.parent.uuid);
    TraitsFields.prepareLanguages.call(this);
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

    // Legendary Actions & Resistances
    const { legact, legres } = this.resources;
    legact.value = Math.clamp(legact.max - legact.spent, 0, legact.max);
    legres.value = Math.clamp(legres.max - legres.spent, 0, legres.max);
    this.resources.legact.label = this.getLegendaryActionsDescription();
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preUpdate(changes, options, user) {
    if ( (await super._preUpdate(changes, options, user)) === false ) return false;
    for ( const k of ["legact", "legres"] ) {
      if ( !foundry.utils.hasProperty(changes, `system.resources.${k}.value`) ) continue;
      const spent = this.resources[k].max - changes.system.resources[k].value;
      foundry.utils.setProperty(changes, `system.resources.${k}.spent`, spent);
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
    if ( spell.system.method === "innate" ) return this.details.cr;
    return this.details.level ? this.details.level : this.attributes.spell.level;
  }

  /* -------------------------------------------- */

  /**
   * Auto-generate a description for the legendary actions block on the NPC stat block.
   * @param {string} name  Name of the actor to use in the text.
   * @returns {string}
   */
  getLegendaryActionsDescription(name=this.parent.name) {
    const max = this._source.resources.legact.max;
    if ( !max ) return "";
    const pr = getPluralRules().select(max);
    const rulesVersion = this.source?.rules
      || (game.settings.get("dnd5e", "rulesVersion") === "modern" ? "2024" : "2014");
    return game.i18n.format(`DND5E.LegendaryAction.Description${rulesVersion === "2014" ? "Legacy" : ""}`, {
      name: name.toLowerCase(),
      uses: this.resources.lair.value ? game.i18n.format("DND5E.LegendaryAction.LairUses", {
        normal: formatNumber(max), lair: formatNumber(max + 1)
      }) : formatNumber(max),
      usesNamed: game.i18n.format(`DND5E.ACTIVATION.Type.Legendary.Counted.${pr}`, { number: formatNumber(max) })
    });
  }

  /* -------------------------------------------- */

  /**
   * Create a list of gear that can be collected from this NPC.
   * @type {Item5e[]}
   */
  getGear() {
    return this.parent.items
      .filter(i => i.system.quantity && (i.system.type?.value !== "natural"))
      .sort((lhs, rhs) => lhs.sort - rhs.sort);
  }

  /* -------------------------------------------- */

  /** @override */
  async recoverCombatUses(periods, results) {
    // Reset legendary actions at the start of a combat encounter or at the end of the creature's turn
    if ( this.resources.legact.max && (periods.includes("encounter") || periods.includes("turnEnd")) ) {
      results.actor["system.resources.legact.spent"] = 0;
    }
  }

  /* -------------------------------------------- */

  /**
   * Spend a legendary resistance to change a failed saving throw into a success.
   * @param {ChatMessage5e} message  The chat message containing the failed save.
   */
  async resistSave(message) {
    if ( this.resources.legres.value === 0 ) throw new Error("No legendary resistances remaining.");
    if ( message.flags.dnd5e?.roll?.type !== "save" ) throw new Error("Chat message must contain a save roll.");
    if ( message.flags.dnd5e?.roll?.forceSuccess ) throw new Error("Save has already been resisted.");
    await this.parent.update({ "system.resources.legres.spent": this.resources.legres.spent + 1 });
    await message.setFlag("dnd5e", "roll.forceSuccess", true);
  }

  /* -------------------------------------------- */

  /** @override */
  async toEmbed(config, options={}) {
    for ( const value of config.values ) {
      if ( value === "statblock" ) config.statblock = true;
    }
    if ( !config.statblock ) return super.toEmbed(config, options);

    const rulesVersion = getRulesVersion(config, { ...options, relativeTo: this.parent });
    const context = await this._prepareEmbedContext(rulesVersion);
    context.name = config.label || this.parent.name;
    if ( config.cite && !config.inline ) {
      config.cite = false;
      context.anchor = this.parent.toAnchor({ name: context.name }).outerHTML;
    }
    const template = document.createElement("template");
    template.innerHTML = await foundry.applications.handlebars.renderTemplate(
      "systems/dnd5e/templates/actors/embeds/npc-embed.hbs", context
    );

    /**
     * A hook event that fires after an embedded NPC stat block is rendered.
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
   * @param {"2014"|"2024"} rulesVersion  Version of the stat block styling to use.
   * @returns {object}
   */
  async _prepareEmbedContext(rulesVersion) {
    const formatter = game.i18n.getListFormatter({ type: "unit" });
    const prepareMeasured = (value, units, label) => label ? `${label} ${formatLength(value, units)}`
      : formatLength(value, units);
    const prepareTrait = ({ value, custom }, trait) => formatter.format([
      ...Array.from(value).map(t => Trait.keyLabel(t, { trait })).filter(_ => _),
      ...splitSemicolons(custom ?? "")
    ].sort((lhs, rhs) => lhs.localeCompare(rhs, game.i18n.lang)));

    const prepareSpeed = () => {
      const standard = formatter.format([
        prepareMeasured(this.attributes.movement.walk, this.attributes.movement.units),
        ...Object.entries(CONFIG.DND5E.movementTypes)
          .filter(([k]) => this.attributes.movement[k] && (k !== "walk"))
          .map(([k, { label }]) => {
            let prepared = prepareMeasured(this.attributes.movement[k], this.attributes.movement.units, label);
            if ( (k === "fly") && this.attributes.movement.hover ) {
              prepared = `${prepared} (${game.i18n.localize("DND5E.MovementHover").toLowerCase()})`;
            }
            return prepared;
          })
      ]);
      const custom = formatter.format(splitSemicolons(this.attributes.movement.special));
      return custom ? `${standard} (${custom})` : standard;
    };

    const xp = rulesVersion === "2024"
      ? `${game.i18n.format(`DND5E.ExperiencePoints.StatBlock.${
        (this.resources.lair.value) && (this.details.cr !== null) ? "Lair" : "Standard"}`, {
        value: formatNumber(this.parent.getCRExp(this.details.cr)),
        lair: formatNumber(this.parent.getCRExp(this.details.cr + 1))
      })}; ${game.i18n.localize("DND5E.ProficiencyBonusAbbr")} ${
        formatNumber(this.attributes.prof, { signDisplay: "always" })}`
      : game.i18n.format("DND5E.ExperiencePoints.Format", {
        value: formatNumber(this.parent.getCRExp(this.details.cr))
      });

    const context = {
      abilityTables: rulesVersion === "2024" ? Array.fromRange(3).map(_ => ({ abilities: [] })) : null,
      actionSections: {
        trait: {
          label: game.i18n.localize("DND5E.NPC.SECTIONS.Traits"),
          hideLabel: rulesVersion === "2014",
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
          description: "",
          actions: []
        }
      },
      CONFIG: CONFIG.DND5E,
      definitions: {
        lower: [],
        upper: []
      },
      document: this.parent,
      rulesVersion,
      summary: {
        // Condition Immunities
        conditionImmunities: prepareTrait(this.traits.ci, "ci"),

        // Challenge Rating (e.g. `23 (XP 50,000; PB +7`))
        cr: `${formatCR(this.details.cr, { narrow: false })} (${xp})`,

        // Gear
        gear: formatter.format(
          this.getGear().map(i => i.system.quantity > 1 ? `${i.name} (${formatNumber(i.system.quantity)})` : i.name)
        ),

        // Initiative (e.g. `+0 (10)`)
        initiative: `${formatNumber(this.attributes.init.total, { signDisplay: "always" })} (${
          formatNumber(this.attributes.init.score)})`,

        // Languages (e.g. `Common, Draconic`)
        languages: [
          formatter.format(this.traits.languages.labels.languages),
          formatter.format(this.traits.languages.labels.ranged)
        ].filterJoin("; ") || (rulesVersion === "2024" ? game.i18n.localize("None") : "—"),

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
        speed: prepareSpeed(),

        // Tag (e.g. `Gargantuan Dragon, Lawful Evil`)
        tag: game.i18n.format("DND5E.CreatureTag", {
          size: CONFIG.DND5E.actorSizes[this.traits.size]?.label ?? "",
          type: Actor5e.formatCreatureType(this.details.type),
          alignment: this.details.alignment
        }).replace(/, $/, "")
      },
      system: this
    };

    for ( const type of ["vulnerabilities", "resistances", "immunities"] ) {
      const entries = [];
      for ( const category of rulesVersion === "2024" ? ["damage", "condition"] : ["damage"] ) {
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

    const { summary, system } = context;
    if ( rulesVersion === "2024" ) {
      for ( const [index, [key, { abbreviation }]] of Object.entries(CONFIG.DND5E.abilities).entries() ) {
        context.abilityTables[index % 3].abilities.push({ ...this.abilities[key], label: abbreviation.capitalize() });
      }

      context.definitions.upper = [
        { label: "DND5E.AC", classes: "half-width", definitions: [system.attributes.ac.value] },
        { label: "DND5E.Initiative", classes: "half-width", definitions: [summary.initiative] },
        { label: "DND5E.HP", definitions: system.attributes.hp.formula ? [
          system.attributes.hp.max, `(${system.attributes.hp.formula})`
        ] : [system.attributes.hp.max] },
        { label: "DND5E.Speed", definitions: [summary.speed] }
      ];
      context.definitions.lower = [
        summary.skills ? { label: "DND5E.Skills", definitions: [summary.skills] } : null,
        summary.gear ? { label: "DND5E.Gear", definitions: [summary.gear] } : null,
        summary.vulnerabilities ? { label: "DND5E.Vulnerabilities", definitions: [summary.vulnerabilities] } : null,
        summary.resistances ? { label: "DND5E.Resistances", definitions: [summary.resistances] } : null,
        summary.immunities ? { label: "DND5E.Immunities", definitions: [summary.immunities] } : null,
        { label: "DND5E.Senses", definitions: [summary.senses] },
        { label: "DND5E.Languages", definitions: [summary.languages] },
        { label: "DND5E.AbbreviationCR", definitions: [summary.cr] }
      ].filter(_ => _);
    }

    else {
      const toLowerCase = def => {
        def.definitions = def.definitions.map(d => String(d).toLowerCase());
        return def;
      };
      context.definitions.upper = [
        { label: "DND5E.ArmorClass", definitions: system.attributes.ac.label ? [
          system.attributes.ac.value, `(${system.attributes.ac.label})`
        ] : [system.attributes.ac.value] },
        { label: "DND5E.HitPoints", definitions: system.attributes.hp.formula ? [
          system.attributes.hp.max, `(${system.attributes.hp.formula})`
        ] : [system.attributes.hp.max] },
        { label: "DND5E.Speed", definitions: [summary.speed] }
      ].map(d => toLowerCase(d));
      context.definitions.lower = [
        summary.saves ? { label: "DND5E.ClassSaves", definitions: [summary.saves] } : null,
        summary.skills ? { label: "DND5E.Skills", definitions: [summary.skills] } : null,
        summary.vulnerabilities ? { label: "DND5E.DamVuln", definitions: [summary.vulnerabilities] } : null,
        summary.resistances ? { label: "DND5E.DamRes", definitions: [summary.resistances] } : null,
        summary.immunities ? { label: "DND5E.DamImm", definitions: [summary.immunities] } : null,
        summary.conditionImmunities
          ? { label: "DND5E.TraitCIPlural.other", definitions: [summary.conditionImmunities] } : null,
        { label: "DND5E.Senses", definitions: [summary.senses] },
        { label: "DND5E.Languages", definitions: [summary.languages] },
        { label: "DND5E.Challenge", classes: "half-width", definitions: [summary.cr] },
        { label: "DND5E.ProficiencyBonus", classes: "half-width", definitions: [
          formatNumber(this.attributes.prof, { signDisplay: "always" })
        ] }
      ].filter(_ => _).map(d => toLowerCase(d));
    }

    for ( const item of this.parent.items ) {
      if ( !["feat", "weapon"].includes(item.type) ) continue;
      const category = item.system.properties.has("trait") ? "trait"
        : (item.system.activities?.contents[0]?.activation?.type ?? "trait");
      if ( category in context.actionSections ) {
        let description = (await TextEditor.enrichHTML(item.system.description.value, {
          secrets: false, rollData: item.getRollData(), relativeTo: item
        }));
        if ( item.identifier === "legendary-actions" ) {
          context.actionSections.legendary.description = description;
        } else {
          const openingTag = description.match(/^\s*(<p(?:\s[^>]+)?>)/gi)?.[0];
          if ( openingTag ) description = description.replace(openingTag, "");
          const uses = item.system.uses.label || item.system.activities?.contents[0]?.uses.label;
          context.actionSections[category].actions.push({
            description, openingTag,
            name: uses ? `${item.name} (${uses})` : item.name,
            sort: item.sort
          });
        }
      }
    }
    for ( const [key, section] of Object.entries(context.actionSections) ) {
      if ( section.actions.length ) {
        section.actions.sort((lhs, rhs) => lhs.sort - rhs.sort);
        if ( (key === "legendary") && !section.description ) {
          section.description = `<p>${this.getLegendaryActionsDescription()}</p>`;
        }
      } else delete context.actionSections[key];
    }

    return context;
  }
}
