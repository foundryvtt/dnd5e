const { NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Field for storing activation data.
 *
 * @property {string} type            Activation type (e.g. action, legendary action, minutes).
 * @property {number} value           Scalar value associated with the activation.
 * @property {string} condition       Condition required to activate this activity.
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
    this.activation.scalar = CONFIG.DND5E.activityActivationTypes[this.activation.type]?.scalar ?? false;
    if ( !this.activation.scalar ) this.activation.value = null;

    if ( labels && this.activation.type ) {
      labels.activation = [
        this.activation.value, CONFIG.DND5E.activityActivationTypes[this.activation.type]?.label
      ].filterJoin(" ");
      const formatter = game.i18n.getListFormatter({ type: "disjunction" });
      labels.ritualActivation = this.properties?.has?.("ritual")
        ? formatter.format([labels.activation, game.i18n.localize("DND5E.Ritual")]) : labels.activation;
    }
  }
}
