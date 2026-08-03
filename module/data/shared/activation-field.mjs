import { formatNumber, formatTime, getPluralRules } from "../../utils.mjs";

const { NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { ActivityRollData, ItemRollData } from "../../documents/_types.mjs";
 * @import { ActivationData, ActivationLabels } from "./_types.mjs";
 */

/**
 * Field for storing activation data.
 */
export default class ActivationField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      type: new StringField({ initial: "action" }),
      value: new NumberField({ min: 0, integer: true }),
      condition: new StringField(),
      ...fields
    };
    super(fields, options);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Build the display labels for activation data.
   * @param {object} data                     Data from which to build the labels.
   * @param {ActivationData} data.activation  Resolved activation data.
   * @param {Set<string>} [data.properties]   Item properties.
   * @returns {Partial<ActivationLabels>}
   */
  static getLabels({ activation, properties }) {
    if ( !activation?.type ) return {};
    const config = CONFIG.DND5E.activityActivationTypes[activation.type];
    const isScalar = config?.scalar ?? false;
    const value = isScalar ? activation.value : null;

    let scalar;
    if ( activation.type in CONFIG.DND5E.timeUnits ) scalar = formatTime(value ?? 1, activation.type);
    else if ( config?.counted ) scalar = _loc(
      `${config.counted}.${getPluralRules().select(value ?? 1)}`,
      { number: formatNumber(value ?? 1) }
    );
    else scalar = `${formatNumber(value ?? 1)} ${config?.label ?? ""}`;

    const labels = {};
    labels.simple = isScalar && value ? scalar : config?.label ?? "";
    labels.legacy = scalar.toLowerCase();
    const formatter = game.i18n.getListFormatter({ type: "disjunction" });
    labels.ritual = properties?.has?.("ritual")
      ? formatter.format([labels.simple, _loc("DND5E.Ritual")])
      : labels.simple;
    return labels;
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for this field. Should be called during the `prepareFinalData` stage.
   * @this {ItemDataModel|BaseActivityData}
   * @param {ItemRollData|ActivityRollData} rollData  Roll data used for formula replacements.
   * @param {object} [labels]                         Object in which to insert generated labels.
   */
  static prepareData(rollData, labels) {
    const config = CONFIG.DND5E.activityActivationTypes[this.activation.type];
    this.activation.scalar = config?.scalar ?? false;
    if ( !this.activation.scalar ) this.activation.value = null;

    this.activation.labels ??= {};
    Object.assign(this.activation.labels, ActivationField.getLabels(this));

    if ( labels ) {
      labels.activation ||= this.activation.labels.simple;
      labels.legacyActivation ||= this.activation.labels.legacy;
      labels.ritualActivation ||= this.activation.labels.ritual;
    }
  }
}
