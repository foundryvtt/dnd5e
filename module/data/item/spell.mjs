import { getRulesVersion } from "../../enrichers.mjs";
import { filteredKeys, formatNumber } from "../../utils.mjs";
import ItemDataModel from "../abstract/item-data-model.mjs";
import ActivationField from "../shared/activation-field.mjs";
import DurationField from "../shared/duration-field.mjs";
import RangeField from "../shared/range-field.mjs";
import TargetField from "../shared/target-field.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

const { BooleanField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { SpellItemSystemData } from "./_types.mjs";
 * @import { ActivitiesTemplateData ItemDescriptionTemplateData } from "./templates/_types.mjs";
 */

/**
 * Data definition for Spell items.
 * @extends {ItemDataModel<ActivitiesTemplate & ItemDescriptionTemplate & SpellItemSystemData>}
 * @mixes ActivitiesTemplateData
 * @mixes ItemDescriptionTemplateData
 * @mixes SpellItemSystemData
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
      method: new StringField({ required: true, initial: "", label: "DND5E.SpellPreparation.Method" }),
      prepared: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
      properties: new SetField(new StringField(), { label: "DND5E.SpellComponents" }),
      range: new RangeField(),
      school: new StringField({ required: true, label: "DND5E.SpellSchool" }),
      sourceClass: new StringField({ label: "DND5E.SpellSourceClass" }),
      target: new TargetField()
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    enchantable: true,
    hasEffects: true
  }, { inplace: false }));

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
          for ( const [k, v] of Object.entries(value ?? {}) ) {
            const list = dnd5e.registry.spellLists.forType(k);
            if ( !list || (v === 0) ) continue;
            if ( v === 1 ) include = include.union(list.identifiers);
            else if ( v === -1 ) exclude = exclude.union(list.identifiers);
          }
          if ( include.size ) filters.push({ k: "system.identifier", o: "in", v: include });
          if ( exclude.size ) filters.push({ o: "NOT", v: { k: "system.identifier", o: "in", v: exclude } });
        },
        config: {
          choices: dnd5e.registry.spellLists.options.reduce((obj, entry) => {
            const [type, identifier] = entry.value.split(":");
            const list = dnd5e.registry.spellLists.forType(type, identifier);
            if ( list?.identifiers.size ) obj[entry.value] = {
              label: entry.label, group: CONFIG.DND5E.spellListTypes[type]
            };
            return obj;
          }, {}),
          collapseGroup: group => group !== CONFIG.DND5E.spellListTypes.class
        }
      }],
      ["properties", this.compendiumBrowserPropertiesFilter("spell")]
    ]);
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

  /** @override */
  get canConfigureScaling() {
    return this.level > 0;
  }

  /* -------------------------------------------- */

  /**
   * Whether the spell can be prepared.
   * @type {boolean}
   */
  get canPrepare() {
    return !!CONFIG.DND5E.spellcasting[this.method]?.prepares;
  }

  /* -------------------------------------------- */

  /** @override */
  get canScale() {
    return (this.level > 0) && !!CONFIG.DND5E.spellcasting[this.method]?.slots;
  }

  /* -------------------------------------------- */

  /** @override */
  get canScaleDamage() {
    return true;
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
      ...this.parent.labels.components.tags,
      this.parent.labels.duration
    ];
  }

  /* -------------------------------------------- */

  /**
   * Whether this spell counts towards a class' number of prepared spells.
   * @type {boolean}
   */
  get countsPrepared() {
    return !!CONFIG.DND5E.spellcasting[this.method]?.prepares
      && (this.level > 0)
      && (this.prepared === CONFIG.DND5E.spellPreparationStates.prepared.value);
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

  /** @override */
  get tooltipSubtitle() {
    return [this.parent.labels.level, CONFIG.DND5E.spellSchools[this.school]?.label];
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /**
   * @deprecated since 5.1
   * @ignore
   */
  get preparation() {
    foundry.utils.logCompatibilityWarning("SpellData#preparation is deprecated. Please use SpellData#method in "
      + "place of preparation.mode and SpellData#prepared in place of preparation.prepared.",
    { since: "DnD5e 5.1", until: "DnD5e 5.4" });
    if ( this.prepared === 2 ) return { mode: "always", prepared: 1 };
    if ( this.method === "spell" ) return { mode: "prepared", prepared: Boolean(this.prepared) };
    return { mode: this.method, prepared: Boolean(this.prepared) };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    ActivitiesTemplate.migrateActivities(source);
    SpellData.#migrateActivation(source);
    SpellData.#migrateTarget(source);
    SpellData.#migratePreparation(source);
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

  /**
   * Migrate preparation data.
   * @since 5.1.0
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migratePreparation(source) {
    if ( source.preparation === undefined ) return;
    if ( source.preparation.mode === "always" ) {
      if ( !("method" in source) ) source.method = "spell";
      if ( !("prepared" in source) ) source.prepared = 2;
    } else {
      if ( !("method" in source) ) {
        if ( source.preparation.mode === "prepared" ) source.method = "spell";
        else if ( source.preparation.mode ) source.method = source.preparation.mode;
      }
      if ( (typeof source.preparation.prepared === "boolean") && !("prepared" in source) ) {
        source.prepared = Number(source.preparation.prepared);
      }
    }
    delete source.preparation;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.prepareDescriptionData();
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
      // Only add properties to display arrays if they have displayable content
      if ( config.isTag ) {
        // Tag properties: add to tags if has label
        if ( label ) obj.tags.push(label);
        if ( abbr || icon ) obj.all.push({ abbr, icon, tag: true });
      } else if ( abbr ) {
        // VSM properties: only add if has abbreviation
        obj.vsm.push(abbr);
        obj.all.push({ abbr, icon, tag: false });
      }
      // Properties with neither abbreviation nor isTag are silently ignored for display
      return obj;
    }, { all: [], vsm: [], tags: [] });
    labels.components.vsm = game.i18n.getListFormatter({ style: "narrow" }).format(labels.components.vsm);
    labels.components.full = labels.materials ? game.i18n.format("DND5E.SpellComponentsMaterial", {
      components: labels.components.vsm, materials: labels.materials
    }) : labels.components.vsm;

    const uuid = this.parent._stats.compendiumSource ?? this.parent.uuid;
    Object.defineProperty(labels, "classes", {
      get() {
        return Array.from(dnd5e.registry.spellLists.forSpell(uuid))
          .filter(list => list.metadata.type === "class")
          .map(list => list.name)
          .sort((lhs, rhs) => lhs.localeCompare(rhs, game.i18n.lang));
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
    if ( this.parent.isOwned && this.sourceClass && this.countsPrepared ) {
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
    context.properties.active = [...(this.parent.labels?.components?.tags ?? []), ...(context.labels.classes ?? [])];
    context.subtitles = [
      { label: context.labels.level },
      { label: context.labels.school },
      { label: CONFIG.DND5E.spellcasting[this.method]?.label }
    ];

    context.parts = ["dnd5e.details-spell", "dnd5e.field-uses"];

    // Default Ability & Spellcasting Classes
    if ( this.parent.actor ) {
      const ability = CONFIG.DND5E.abilities[
        this.parent.actor.spellcastingClasses[this.sourceClass]?.spellcasting.ability
          ?? this.parent.actor.system.attributes?.spellcasting
      ]?.label?.toLowerCase();
      if ( ability ) context.defaultAbility = game.i18n.format("DND5E.DefaultSpecific", { default: ability });
      else context.defaultAbility = game.i18n.localize("DND5E.Default");
      context.spellcastingClasses = Object.entries(this.parent.actor.spellcastingClasses ?? {})
        .map(([value, cls]) => ({ value, label: cls.name }));
    }

    // Activation
    context.activationTypes = [
      ...Object.entries(CONFIG.DND5E.activityActivationTypes).map(([value, { label, group }]) => {
        return { value, label, group };
      }),
      { value: "", label: "DND5E.NoneActionLabel" }
    ];

    // Duration
    context.durationUnits = [
      ...Object.entries(CONFIG.DND5E.specialTimePeriods).map(([value, label]) => ({ value, label })),
      ...Object.entries(CONFIG.DND5E.scalarTimePeriods).map(([value, label]) => {
        return { value, label, group: "DND5E.DurationTime" };
      }),
      ...Object.entries(CONFIG.DND5E.permanentTimePeriods).map(([value, label]) => {
        return { value, label, group: "DND5E.DurationPermanent" };
      })
    ];

    // Targets
    context.targetTypes = [
      ...Object.entries(CONFIG.DND5E.individualTargetTypes).map(([value, { label }]) => {
        return { value, label, group: "DND5E.TargetTypeIndividual" };
      }),
      ...Object.entries(CONFIG.DND5E.areaTargetTypes).map(([value, { label }]) => {
        return { value, label, group: "DND5E.TargetTypeArea" };
      })
    ];
    context.scalarTarget = this.target.affects.type
      && (CONFIG.DND5E.individualTargetTypes[this.target.affects.type]?.scalar !== false);
    context.affectsPlaceholder = game.i18n.localize(`DND5E.TARGET.Count.${
      this.target?.template?.type ? "Every" : "Any"}`);
    context.dimensions = this.target.template.dimensions;
    // TODO: Ensure this behaves properly with enchantments, will probably need source target data

    // Range
    context.rangeTypes = [
      ...Object.entries(CONFIG.DND5E.rangeTypes).map(([value, label]) => ({ value, label })),
      ...Object.entries(CONFIG.DND5E.movementUnits).map(([value, { label }]) => {
        return { value, label, group: "DND5E.RangeDistance" };
      })
    ];

    // Spellcasting
    context.canPrepare = this.canPrepare;
    context.spellcastingMethods = Object.values(CONFIG.DND5E.spellcasting).map(({ key, label }) => {
      return { label, value: key };
    });
    if ( this.method && !(this.method in CONFIG.DND5E.spellcasting) ) {
      context.spellcastingMethods.push({ label: this.method, value: this.method });
    }
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @override */
  static onDropCreate(event, actor, itemData) {
    if ( !["npc", "character"].includes(actor.type) ) return;

    // Determine the section it is dropped on, if any.
    let header = event.target.closest(".items-header"); // Dropped directly on the header.
    if ( !header ) {
      const list = event.target.closest(".item-list"); // Dropped inside an existing list.
      header = list?.previousElementSibling;
    }
    const { method } = header?.closest("[data-level]")?.dataset ?? {};

    // Determine the actor's spell slot progressions, if any.
    const spellcastKeys = Object.keys(CONFIG.DND5E.spellcasting);
    const progs = Object.values(actor.classes).reduce((acc, cls) => {
      const type = cls.spellcasting?.type;
      if ( spellcastKeys.includes(type) ) acc.add(type);
      return acc;
    }, new Set());

    const { system } = itemData;
    const methods = CONFIG.DND5E.spellcasting;
    if ( methods[method] ) system.method = method;
    else if ( progs.size ) system.method = progs.first();
    else if ( actor.system.attributes.spell?.level ) system.method = "spell";
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

  /** @override */
  async toEmbed(config, options={}) {
    const description = await super.toEmbed(config, options);
    config.details ??= config.values.includes("details");
    if ( !config.details ) return description;

    const details = document.createElement("div");
    details.classList.add("item-entry-details");
    const labels = this.parent.labels;
    const rulesVersion = getRulesVersion(config, { ...options, relativeTo: this.parent });

    const tag = document.createElement("p");
    tag.classList.add("item-entry-tag");
    const classes = labels.classes;
    tag.innerText = game.i18n.format(
      `DND5E.SPELL.Embed.Tag.${!this.level ? "Cantrip" : "Leveled"}${rulesVersion === "2014" ? "Legacy" : ""}`,
      {
        level: formatNumber(this.level),
        levelOrdinal: formatNumber(this.level, { ordinal: true }),
        school: CONFIG.DND5E.spellSchools[this.school]?.label ?? ""
      }
    );
    if ( (rulesVersion === "2014") && this.properties.has("ritual") ) {
      tag.innerText = game.i18n.format("DND5E.SPELL.Embed.Tag.Ritual", { levelSchool: tag.innerText });
    } else if ( (rulesVersion === "2024") && classes?.length ) {
      tag.innerText = game.i18n.format("DND5E.SPELL.Embed.Tag.Classes", {
        classes: game.i18n.getListFormatter({ type: "unit" }).format(classes),
        levelSchool: tag.innerText
      });
    }
    details.append(tag);

    let castingTime = rulesVersion === "2014" ? labels.legacyActivation : labels.ritualActivation;
    if ( (this.activation.type === "reaction") && this.activation.condition ) castingTime = game.i18n.format(
      "DND5E.SPELL.Embed.CastingTimeTrigger", { castingTime, trigger: this.activation.condition }
    );
    const specifics = [
      ["DND5E.SpellCastTime", castingTime],
      ["DND5E.SpellHeader.Range", labels.description.range || labels.range],
      ["DND5E.Components", labels.components.full],
      ["DND5E.Duration", labels.concentrationDuration]
    ];
    const dl = document.createElement("dl");
    dl.classList.add("item-entry-specifics");
    for ( const [label, description] of specifics ) {
      const div = document.createElement("div");
      const dt = document.createElement("dt");
      dt.innerText = game.i18n.localize(label);
      const dd = document.createElement("dd");
      dd.innerText = description;
      div.append(dt, dd);
      dl.append(div);
    }
    details.append(dl);

    const template = document.createElement("template");
    template.append(details, ...description);

    /**
     * A hook event that fires after an embedded spell with details is rendered.
     * @function dnd5e.renderEmbeddedSpell
     * @memberof hookEvents
     * @param {Item5e} item                     Spell being embedded.
     * @param {HTMLTemplateElement} template    Template whose children will be embedded.
     * @param {DocumentHTMLEmbedConfig} config  Configuration for embedding behavior.
     * @param {EnrichmentOptions} options       Original enrichment options.
     */
    Hooks.call("dnd5e.renderEmbeddedSpell", this.parent, template, config, options);

    return template.children;
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;
    if ( !this.parent.isEmbedded ) return;
    const system = data.system ?? {};

    // Set as prepared for NPCs, and not prepared for PCs
    if ( ["character", "npc"].includes(this.parent.actor.type) && !("prepared" in system) ) {
      this.updateSource({ prepared: Number(this.parent.actor.type === "npc" || (this.level < 1)) });
    }

    if ( ["atwill", "innate"].includes(system.method) || this.sourceClass ) return;
    const classes = new Set(Object.keys(this.parent.actor.spellcastingClasses));
    if ( !classes.size ) return;

    // Set the source class, and ensure the preparation mode matches if adding a prepared spell to an alt class
    const setClass = cls => {
      this.updateSource({ sourceClass: cls, method: this.parent.actor.classes[cls].spellcasting.type });
    };

    // If preparation mode matches an alt spellcasting type and matching class exists, set as that class
    if ( (system.method !== "spell") && (system.method in CONFIG.DND5E.spellcasting) ) {
      const altClasses = classes.filter(i => this.parent.actor.classes[i].spellcasting.type === system.method);
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
}
