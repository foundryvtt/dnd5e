import { filteredKeys } from "../../utils.mjs";
import { ItemDataModel } from "../abstract.mjs";
import ActivationField from "../shared/activation-field.mjs";
import DurationField from "../shared/duration-field.mjs";
import RangeField from "../shared/range-field.mjs";
import TargetField from "../shared/target-field.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

const { BooleanField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Data definition for Spell items.
 * @mixes ActivitiesTemplate
 * @mixes ItemDescriptionTemplate
 *
 * @property {string} ability                    Override of default spellcasting ability.
 * @property {ActivationData} activation         Casting time & conditions.
 * @property {DurationData} duration             Duration of the spell effect.
 * @property {number} level                      Base level of the spell.
 * @property {object} materials                  Details on material components required for this spell.
 * @property {string} materials.value            Description of the material components required for casting.
 * @property {boolean} materials.consumed        Are these material components consumed during casting?
 * @property {number} materials.cost             GP cost for the required components.
 * @property {number} materials.supply           Quantity of this component available.
 * @property {object} preparation                Details on how this spell is prepared.
 * @property {string} preparation.mode           Spell preparation mode as defined in `DND5E.spellPreparationModes`.
 * @property {boolean} preparation.prepared      Is the spell currently prepared?
 * @property {Set<string>} properties            General components and tags for this spell.
 * @property {RangeData} range                   Range of the spell
 * @property {string} school                     Magical school to which this spell belongs.
 * @property {string} sourceClass                Associated spellcasting class when this spell is on an actor.
 * @property {TargetData} target                 Information on area and individual targets.
 */
export default class SpellData extends ItemDataModel.mixin(ActivitiesTemplate, ItemDescriptionTemplate) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    "DND5E.ACTIVATION", "DND5E.DURATION", "DND5E.RANGE", "DND5E.SOURCE", "DND5E.TARGET"
  ];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      ability: new StringField({ label: "DND5E.SpellAbility" }),
      activation: new ActivationField(),
      duration: new DurationField(),
      level: new NumberField({ required: true, integer: true, initial: 1, min: 0, label: "DND5E.SpellLevel" }),
      materials: new SchemaField({
        value: new StringField({ required: true, label: "DND5E.SpellMaterialsDescription" }),
        consumed: new BooleanField({ required: true, label: "DND5E.SpellMaterialsConsumed" }),
        cost: new NumberField({ required: true, initial: 0, min: 0, label: "DND5E.SpellMaterialsCost" }),
        supply: new NumberField({ required: true, initial: 0, min: 0, label: "DND5E.SpellMaterialsSupply" })
      }, { label: "DND5E.SpellMaterials" }),
      preparation: new SchemaField({
        mode: new StringField({ required: true, initial: "prepared", label: "DND5E.SpellPreparation.Mode" }),
        prepared: new BooleanField({ required: true, label: "DND5E.SpellPrepared" })
      }, { label: "DND5E.SpellPreparation.Label" }),
      properties: new SetField(new StringField(), { label: "DND5E.SpellComponents" }),
      range: new RangeField(),
      school: new StringField({ required: true, label: "DND5E.SpellSchool" }),
      sourceClass: new StringField({ label: "DND5E.SpellSourceClass" }),
      target: new TargetField()
    });
  }

  /* -------------------------------------------- */

  /** @override */
  static get compendiumBrowserFilters() {
    return new Map([
      ["level", {
        label: "DND5E.Level",
        type: "range",
        config: {
          keyPath: "system.level",
          min: 0,
          max: Object.keys(CONFIG.DND5E.spellLevels).length - 1
        }
      }],
      ["school", {
        label: "DND5E.School",
        type: "set",
        config: {
          choices: CONFIG.DND5E.spellSchools,
          keyPath: "system.school"
        }
      }],
      ["spelllist", {
        label: "TYPES.JournalEntryPage.spells",
        type: "set",
        createFilter: (filters, value, def) => {
          let include = new Set();
          let exclude = new Set();
          for ( const [type, identifiers] of Object.entries(value ?? {}) ) {
            for ( const [identifier, v] of Object.entries(identifiers) ) {
              const list = dnd5e.registry.spellLists.forType(type, identifier);
              if ( !list || (v === 0) ) continue;
              if ( v === 1 ) include = include.union(list.uuids);
              else if ( v === -1 ) exclude = exclude.union(list.uuids);
            }
          }
          if ( include.size ) filters.push({ k: "uuid", o: "in", v: include });
          if ( exclude.size ) filters.push({ o: "NOT", v: { k: "uuid", o: "in", v: exclude } });
        },
        config: {
          choices: dnd5e.registry.spellLists.options.reduce((obj, entry) => {
            obj[`${entry.type}.${entry.value}`] = entry.label;
            return obj;
          }, {})
        }
      }],
      ["properties", this.compendiumBrowserPropertiesFilter("spell")]
    ]);
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    ActivitiesTemplate.migrateActivities(source);
    SpellData.#migrateActivation(source);
    SpellData.#migrateTarget(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the component object to be 'properties' instead.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static _migrateComponentData(source) {
    const components = filteredKeys(source.system?.components ?? {});
    if ( components.length ) {
      foundry.utils.setProperty(source, "flags.dnd5e.migratedProperties", components);
    }
  }

  /* -------------------------------------------- */

  /**
   * Migrate activation data.
   * Added in DnD5e 4.0.0.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateActivation(source) {
    if ( source.activation?.cost ) source.activation.value = source.activation.cost;
  }

  /* -------------------------------------------- */

  /**
   * Migrate target data.
   * Added in DnD5e 4.0.0.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateTarget(source) {
    if ( !("target" in source) ) return;
    source.target.affects ??= {};
    source.target.template ??= {};

    if ( "units" in source.target ) source.target.template.units = source.target.units;
    if ( "width" in source.target ) source.target.template.width = source.target.width;

    const type = source.target.type ?? source.target.template.type ?? source.target.affects.type;
    if ( type in CONFIG.DND5E.areaTargetTypes ) {
      if ( "type" in source.target ) source.target.template.type = type;
      if ( "value" in source.target ) source.target.template.size = source.target.value;
    } else if ( type in CONFIG.DND5E.individualTargetTypes ) {
      if ( "type" in source.target ) source.target.affects.type = type;
      if ( "value" in source.target ) source.target.affects.count = source.target.value;
    }
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    ActivitiesTemplate._applyActivityShims.call(this);
    this._applySpellShims();
    super.prepareDerivedData();
    this.prepareDescriptionData();

    this.preparation.mode ||= "prepared";
    this.properties.add("mgc");
    this.duration.concentration = this.properties.has("concentration");

    const labels = this.parent.labels ??= {};
    labels.level = CONFIG.DND5E.spellLevels[this.level];
    labels.school = CONFIG.DND5E.spellSchools[this.school]?.label;
    if ( this.properties.has("material") ) labels.materials = this.materials.value;

    labels.components = this.properties.reduce((obj, c) => {
      const config = this.validProperties.has(c) ? CONFIG.DND5E.itemProperties[c] : null;
      if ( !config ) return obj;
      const { abbreviation: abbr, label, icon } = config;
      obj.all.push({ abbr, icon, tag: config.isTag });
      if ( config.isTag ) obj.tags.push(label);
      else obj.vsm.push(abbr);
      return obj;
    }, { all: [], vsm: [], tags: [] });
    labels.components.vsm = game.i18n.getListFormatter({ style: "narrow" }).format(labels.components.vsm);

    const uuid = this.parent._stats.compendiumSource ?? this.parent.uuid;
    Object.defineProperty(labels, "classes", {
      get() {
        return game.i18n.getListFormatter({ style: "narrow" }).format(
          Array.from(dnd5e.registry.spellLists.forSpell(uuid))
            .filter(list => list.metadata.type === "class")
            .map(list => list.name)
            .sort((lhs, rhs) => lhs.localeCompare(rhs, game.i18n.lang))
        );
      },
      configurable: true
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData() {
    const rollData = this.parent.getRollData({ deterministic: true });
    const labels = this.parent.labels ??= {};
    this.prepareFinalActivityData(rollData);
    ActivationField.prepareData.call(this, rollData, labels);
    DurationField.prepareData.call(this, rollData, labels);
    RangeField.prepareData.call(this, rollData, labels);
    TargetField.prepareData.call(this, rollData, labels);

    // Count preparations.
    const { mode, prepared } = this.preparation;
    const config = CONFIG.DND5E.spellPreparationModes[mode];
    const isPrepared = config?.prepares && (mode !== "always") && (this.level > 0) && prepared;
    if ( this.parent.isOwned && this.sourceClass && isPrepared ) {
      const sourceClass = this.parent.actor.spellcastingClasses[this.sourceClass];
      const sourceSubclass = sourceClass?.subclass;
      if ( sourceClass ) sourceClass.system.spellcasting.preparation.value++;
      if ( sourceSubclass ) sourceSubclass.system.spellcasting.preparation.value++;
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getCardData(enrichmentOptions={}) {
    const context = await super.getCardData(enrichmentOptions);
    context.isSpell = true;
    context.subtitle = [this.parent.labels.level, CONFIG.DND5E.spellSchools[this.school]?.label].filterJoin(" &bull; ");
    const { activation, components, duration, range, target } = this.parent.labels;
    context.properties = [components?.vsm, activation, duration, range, target].filter(_ => _);
    if ( !this.properties.has("material") ) delete context.materials;
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getFavoriteData() {
    return foundry.utils.mergeObject(await super.getFavoriteData(), {
      subtitle: [this.parent.labels.components.vsm, this.parent.labels.activation],
      modifier: this.parent.labels.modifier,
      range: this.range,
      save: this.activities.getByType("save")[0]?.save
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    if ( this.parent.actor ) {
      const ability = CONFIG.DND5E.abilities[
        this.parent.actor.spellcastingClasses[this.sourceClass]?.spellcasting.ability
          ?? this.parent.actor.system.attributes?.spellcasting
      ]?.label?.toLowerCase();
      if ( ability ) context.defaultAbility = game.i18n.format("DND5E.DefaultSpecific", { default: ability });
      else context.defaultAbility = game.i18n.localize("DND5E.Default");
    }
    context.subtitles = [
      { label: context.labels.level },
      { label: context.labels.school },
      { label: context.itemStatus },
      { label: context.labels.classes, classes: "full-width" }
    ];
    context.properties.active = this.parent.labels?.components?.tags;
    context.parts = ["dnd5e.details-spell", "dnd5e.field-uses"];
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Attack classification of this spell.
   * @type {"spell"}
   */
  get attackClassification() {
    return "spell";
  }

  /* -------------------------------------------- */

  /** @override */
  get availableAbilities() {
    if ( this.ability ) return new Set([this.ability]);
    const spellcasting = this.parent?.actor?.spellcastingClasses[this.sourceClass]?.spellcasting.ability
      ?? this.parent?.actor?.system.attributes?.spellcasting;
    return new Set(spellcasting ? [spellcasting] : []);
  }

  /* -------------------------------------------- */

  /**
   * Properties displayed in chat.
   * @type {string[]}
   */
  get chatProperties() {
    return [
      this.parent.labels.level,
      this.parent.labels.components.vsm + (this.parent.labels.materials ? ` (${this.parent.labels.materials})` : ""),
      ...this.parent.labels.components.tags
    ];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get _typeAbilityMod() {
    return this.availableAbilities.first() ?? "int";
  }

  /* -------------------------------------------- */

  /** @override */
  get criticalThreshold() {
    return this.parent?.actor?.flags.dnd5e?.spellCriticalThreshold ?? Infinity;
  }

  /* -------------------------------------------- */

  /**
   * Retrieve a linked activity that granted this spell using the stored `cachedFor` value.
   * @returns {Activity|null}
   */
  get linkedActivity() {
    const relative = this.parent.actor;
    const uuid = this.parent.getFlag("dnd5e", "cachedFor");
    if ( !relative || !uuid ) return null;
    const data = foundry.utils.parseUuid(uuid, { relative });
    const [itemId, , activityId] = (data?.embedded ?? []).slice(-3);
    return relative.items.get(itemId)?.system.activities?.get(activityId) ?? null;
    // TODO: Swap back to fromUuidSync once https://github.com/foundryvtt/foundryvtt/issues/11214 is resolved
    // return fromUuidSync(this.parent.getFlag("dnd5e", "cachedFor"), { relative, strict: false }) ?? null;
  }

  /* -------------------------------------------- */

  /**
   * The proficiency multiplier for this item.
   * @returns {number}
   */
  get proficiencyMultiplier() {
    return 1;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get scalingIncrease() {
    if ( this.level !== 0 ) return null;
    return Math.floor(((this.parent.actor?.system.cantripLevel?.(this.parent) ?? 0) + 1) / 6);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  getRollData(...options) {
    const data = super.getRollData(...options);
    data.item.level = data.item.level + (this.parent.getFlag("dnd5e", "scaling") ?? 0);
    return data;
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;
    if ( !this.parent.isEmbedded ) return;

    // Set as prepared for NPCs, and not prepared for PCs
    if ( ["character", "npc"].includes(this.parent.actor.type)
      && !foundry.utils.hasProperty(data, "system.preparation.prepared") ) {
      this.updateSource({ "preparation.prepared": this.parent.actor.type === "npc" });
    }

    if ( ["atwill", "innate"].includes(this.preparation.mode) || this.sourceClass ) return;
    const classes = new Set(Object.keys(this.parent.actor.spellcastingClasses));
    if ( !classes.size ) return;

    // Set the source class, and ensure the preparation mode matches if adding a prepared spell to an alt class
    const setClass = cls => {
      const update = { sourceClass: cls };
      const type = this.parent.actor.classes[cls].spellcasting.type;
      if ( (type !== "leveled") && (this.preparation.mode === "prepared") && (this.level > 0)
        && (type in CONFIG.DND5E.spellPreparationModes) ) update["preparation.mode"] = type;
      this.updateSource(update);
    };

    // If preparation mode matches an alt spellcasting type and matching class exists, set as that class
    if ( this.preparation.mode in CONFIG.DND5E.spellcastingTypes ) {
      const altClasses = classes.filter(i => this.parent.actor.classes[i].spellcasting.type === this.preparation.mode);
      if ( altClasses.size === 1 ) setClass(altClasses.first());
      return;
    }

    // If only a single spellcasting class is present, use that
    if ( classes.size === 1 ) {
      setClass(classes.first());
      return;
    }

    // Create intersection of spellcasting classes and classes that offer the spell
    const spellClasses = new Set(
      dnd5e.registry.spellLists.forSpell(this.parent._stats.compendiumSource).map(l => l.metadata.identifier)
    );
    const intersection = classes.intersection(spellClasses);
    if ( intersection.size === 1 ) setClass(intersection.first());
  }

  /* -------------------------------------------- */
  /*  Shims                                       */
  /* -------------------------------------------- */

  /**
   * Add additional data shims for spells.
   */
  _applySpellShims() {
    Object.defineProperty(this.activation, "cost", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `activation.cost` property on `SpellData` has been renamed `activation.value`.",
          { since: "DnD5e 4.0", until: "DnD5e 5.0", once: true }
        );
        return this.value;
      },
      configurable: true,
      enumerable: false
    });
    Object.defineProperty(this, "scaling", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `scaling` property on `SpellData` has been deprecated and is now handled by individual damage parts.",
          { since: "DnD5e 4.0", until: "DnD5e 5.0", once: true }
        );
        return { mode: "none", formula: null };
      },
      configurable: true,
      enumerable: false
    });
    Object.defineProperty(this.target, "value", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `target.value` property on `SpellData` has been split into `target.template.size` and `target.affects.count`.",
          { since: "DnD5e 4.0", until: "DnD5e 5.0", once: true }
        );
        return this.template.size || this.affects.count;
      },
      configurable: true,
      enumerable: false
    });
    Object.defineProperty(this.target, "width", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `target.width` property on `SpellData` has been moved to `target.template.width`.",
          { since: "DnD5e 4.0", until: "DnD5e 5.0", once: true }
        );
        return this.template.width;
      },
      configurable: true,
      enumerable: false
    });
    Object.defineProperty(this.target, "units", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `target.units` property on `SpellData` has been moved to `target.template.units`.",
          { since: "DnD5e 4.0", until: "DnD5e 5.0", once: true }
        );
        return this.template.units;
      },
      configurable: true,
      enumerable: false
    });
    Object.defineProperty(this.target, "type", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `target.type` property on `SpellData` has been split into `target.template.type` and `target.affects.type`.",
          { since: "DnD5e 4.0", until: "DnD5e 5.0", once: true }
        );
        return this.template.type || this.affects.type;
      },
      configurable: true,
      enumerable: false
    });
    const firstActivity = this.activities.contents[0] ?? {};
    Object.defineProperty(this.target, "prompt", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `target.prompt` property on `SpellData` has moved into its activity.",
          { since: "DnD5e 4.0", until: "DnD5e 5.0", once: true }
        );
        return firstActivity.target?.prompt;
      },
      configurable: true,
      enumerable: false
    });
  }
}
