import { formatNumber, formatTime, getPluralRules } from "../../utils.mjs";

const { NumberField, SchemaField, StringField } = foundry.data.fields;

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
   * Prepare data for this field. Should be called during the `prepareFinalData` stage.
   * @this {ItemDataModel|BaseActivityData}
   * @param {object} rollData  Roll data used for formula replacements.
   * @param {object} [labels]  Object in which to insert generated labels.
   */
  static prepareData(rollData, labels) {
    const config = CONFIG.DND5E.activityActivationTypes[this.activation.type];
    this.activation.scalar = config?.scalar ?? false;
    if ( !this.activation.scalar ) this.activation.value = null;

    this.activation.labels ??= {};
    if ( this.activation.type ) {
      let scalar;
      if ( this.activation.type in CONFIG.DND5E.timeUnits ) {
        scalar = formatTime(this.activation.value ?? 1, this.activation.type);
      }
      else if ( config?.counted ) scalar = game.i18n.format(
        `${config.counted}.${getPluralRules().select(this.activation.value ?? 1)}`,
        { number: formatNumber(this.activation.value ?? 1) }
      );
      else scalar = `${formatNumber(this.activation.value ?? 1)} ${config?.label ?? ""}`;

      this.activation.labels.simple = this.activation.scalar && this.activation.value ? scalar : config?.label ?? "";
      this.activation.labels.legacy = scalar.toLowerCase();
      const formatter = game.i18n.getListFormatter({ type: "disjunction" });
      this.activation.labels.ritual = this.properties?.has?.("ritual")
        ? formatter.format([this.activation.labels.simple, game.i18n.localize("DND5E.Ritual")])
        : this.activation.labels.simple;
    }

    if ( labels ) {
      labels.activation ||= this.activation.labels.simple;
      labels.legacyActivation ||= this.activation.labels.legacy;
      labels.ritualActivation ||= this.activation.labels.ritual;
    }
  }
}
