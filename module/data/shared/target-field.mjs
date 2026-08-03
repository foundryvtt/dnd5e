import { defaultUnits, formatLength, formatNumber, getPluralRules, prepareFormulaValue } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { BooleanField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { ActivityRollData, ItemRollData } from "../../documents/_types.mjs";
 * @import { TargetData, TargetLabels } from "./_types.mjs";
 */

/**
 * Field for storing target data.
 */
export default class TargetField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      template: new SchemaField({
        count: new FormulaField({ deterministic: true }),
        contiguous: new BooleanField(),
        stationary: new BooleanField(),
        type: new StringField(),
        size: new FormulaField({ deterministic: true }),
        width: new FormulaField({ deterministic: true }),
        height: new FormulaField({ deterministic: true }),
        units: new StringField({ required: true, blank: false, initial: () => defaultUnits("length") })
      }),
      affects: new SchemaField({
        count: new FormulaField({ deterministic: true }),
        type: new StringField(),
        choice: new BooleanField(),
        special: new StringField()
      }),
      ...fields
    };
    super(fields, options);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Build the display labels for target data.
   * @param {object} data                               Data from which to build the labels.
   * @param {Record<string, string>} [data.dimensions]  Template dimensions, derived from the type when omitted.
   * @param {TargetData} data.target                    Resolved target data.
   * @returns {TargetLabels}
   */
  static getLabels({ dimensions, target }) {
    const pr = getPluralRules();

    // Generate the template labels
    const template = {};
    const templateConfig = CONFIG.DND5E.areaTargetTypes[target.template.type];
    if ( templateConfig ) {
      dimensions ??= TargetField.templateDimensions(target.template.type);
      const parts = [];
      if ( target.template.count > 1 ) parts.push(`${target.template.count} ×`);
      if ( target.template.units in CONFIG.DND5E.movementUnits ) {
        parts.push(formatLength(target.template.size, target.template.units));
      }
      template.statblock = _loc(`${templateConfig.counted}.${pr.select(target.template.count || 1)}`, {
        number: parts.filterJoin(" ")
      }).trim().capitalize();

      const sizeUnit = CONFIG.DND5E.movementUnits[target.template.units]?.template ?? "";
      if ( Object.keys(dimensions).length === 1 ) template.size = _loc("DND5E.AreaOfEffect.Description.SizeSimple",{
        number: formatNumber(target.template.size), unit: sizeUnit
      });
      else template.size = game.i18n.getListFormatter({ type: "unit" })
        .format(Object.entries(dimensions).map(([k, l]) =>
          _loc("DND5E.AreaOfEffect.Description.SizeType", {
            number: formatNumber(target.template[k]), unit: sizeUnit,
            type: _loc(l.replace("DND5E.AreaOfEffect.Size.", "DND5E.AreaOfEffect.Description."))
          })
        ));

      template.description = _loc(`${templateConfig.counted}.${pr.select(target.template.count || 1)}Sized`, {
        number: formatNumber(target.template.count, { words: true }),
        sizes: template.size
      });

      template.type = templateConfig.label;
    }

    // Generate the affects labels
    const affectsConfig = CONFIG.DND5E.individualTargetTypes[target.affects.type];
    const affects = {
      description: _loc(
        `${target.affects.special ? "DND5E.TARGET.Type.Special.Counted"
          : affectsConfig?.counted ?? "DND5E.TARGET.Type.Target.Counted"}.${target.affects.count
          ? pr.select(target.affects.count) : target.template.type ? "each" : "any"}`, {
          number: formatNumber(target.affects.count, { words: true }),
          special: target.affects.special
        }),
      sheet: affectsConfig?.counted ? _loc(
        `${affectsConfig.counted}.${target.affects.count ? pr.select(target.affects.count) : "other"}`, {
          number: target.affects.count ? formatNumber(target.affects.count)
            : _loc(`DND5E.TARGET.Count.${target.template.type ? "Every" : "Any"}`)
        }).trim().capitalize() : (affectsConfig?.label ?? ""),
      statblock: _loc(
        `${affectsConfig?.counted ?? "DND5E.TARGET.Type.Target.Counted"}.${pr.select(target.affects.count || 1)}`,
        { number: formatNumber(target.affects.count || 1, { words: true }) }
      )
    };

    return { affects, template };
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for this field. Should be called during the `prepareFinalData` stage.
   * @this {ItemDataModel|BaseActivityData}
   * @param {ItemRollData|ActivityRollData} rollData  Roll data used for formula replacements.
   * @param {object} [labels]                         Object in which to insert generated labels.
   */
  static prepareData(rollData, labels) {
    this.target.affects.scalar = this.target.affects.type
      && (CONFIG.DND5E.individualTargetTypes[this.target.affects.type]?.scalar !== false);
    if ( this.target.affects.scalar ) {
      prepareFormulaValue(this, "target.affects.count", "DND5E.TARGET.FIELDS.target.affects.count.label", rollData);
    } else this.target.affects.count = null;

    const dimensions = this.target.template.dimensions = TargetField.templateDimensions(this.target.template.type);

    if ( this.target.template.type ) {
      this.target.template.count ||= "1";
      if ( dimensions.width ) this.target.template.width ||= "5";
      if ( dimensions.height ) this.target.template.height ||= "5";
      prepareFormulaValue(this, "target.template.count", "DND5E.TARGET.FIELDS.target.template.count.label", rollData);
      prepareFormulaValue(this, "target.template.size", "DND5E.TARGET.FIELDS.target.template.size.label", rollData);
      prepareFormulaValue(this, "target.template.width", "DND5E.TARGET.FIELDS.target.template.width.label", rollData);
      prepareFormulaValue(this, "target.template.height", "DND5E.TARGET.FIELDS.target.template.height.label", rollData);
    } else {
      this.target.template.count = null;
      this.target.template.size = null;
      this.target.template.width = null;
      this.target.template.height = null;
    }

    const { affects, template } = TargetField.getLabels({ dimensions, target: this.target });
    this.target.template.labels = template;
    this.target.template.label = template.statblock ?? "";
    this.target.affects.labels = affects;

    if ( labels ) {
      labels.description ??= {};
      labels.description.affects ||= this.target.affects.labels.description;
      labels.description.template ||= this.target.template.labels.description;
      labels.description.templateSize ||= this.target.template.labels.size;
      labels.description.templateType ||= this.target.template.labels.type;
      labels.target = this.target.template.label || this.target.affects.labels.sheet;
    }
  }

  /* -------------------------------------------- */

  /**
   * Create the template dimensions labels for a template type.
   * @param {string} type  Area of effect type.
   * @returns {{ size: string, [width]: string, [height]: string }}
   */
  static templateDimensions(type) {
    const sizes = CONFIG.DND5E.areaTargetTypes[type]?.sizes;
    const dimensions = { size: "DND5E.AreaOfEffect.Size.Label" };
    if ( sizes ) {
      if ( sizes.includes("radius") ) dimensions.size = "DND5E.AreaOfEffect.Size.Radius";
      else if ( sizes.includes("length") ) dimensions.size = "DND5E.AreaOfEffect.Size.Length";
      else if ( sizes.includes("width") ) dimensions.size = "DND5E.AreaOfEffect.Size.Width";
      const hasWidth = sizes.includes("width") && (sizes.includes("length") || sizes.includes("radius"));
      if ( sizes.includes("thickness") ) dimensions.width = "DND5E.AreaOfEffect.Size.Thickness";
      else if ( hasWidth ) dimensions.width = "DND5E.AreaOfEffect.Size.Width";
      if ( sizes.includes("height") ) dimensions.height = "DND5E.AreaOfEffect.Size.Height";
    }
    return dimensions;
  }
}
