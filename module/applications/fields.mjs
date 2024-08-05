/**
 * Create a text input for a StringField.
 * @param {StringField} field               The field.
 * @param {FormInputConfig<string>} config  The input configuration.
 * @returns {HTMLElement|HTMLCollection}
 */
export function createTextInput(field, config) {
  delete config.input;
  const input = field.toInput(config);
  if ( "classes" in config ) input.className = config.classes;
  return input;
}
