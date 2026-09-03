export default class CompatibilityStringField extends foundry.data.fields.StringField {
  /** @inheritDoc */
  _toInput(config) {
    const select = super._toInput(config);
    if ( !config.value || (select.tagName !== "SELECT") ) return select;

    if ( !select.querySelector(`OPTION[value="${config.value}"]`) ) {
      select.insertAdjacentHTML("beforeend", `<option value="${config.value}" selected>${config.value}</option>`);
    }

    return select;
  }
}
