/**
 * Create a checkbox input for a BooleanField.
 * @param {BooleanField} field               The field.
 * @param {FormInputConfig<boolean>} config  The input configuration.
 * @returns {HTMLElement}
 */
export function createCheckboxInput(field, config) {
  const input = document.createElement("dnd5e-checkbox");
  input.name = config.name;
  if ( config.value ) input.checked = true;
  foundry.applications.fields.setInputAttributes(input, config);
  if ( "ariaLabel" in config ) input.ariaLabel = config.ariaLabel;
  if ( "classes" in config ) input.className = config.classes;
  return input;
}

/* -------------------------------------------- */

/**
 * Create a grid of checkboxes.
 * @param {DataField} field         The field.
 * @param {FormInputConfig} config  The input configuration.
 * @returns {HTMLCollection}
 */
export function createMultiCheckboxInput(field, config) {
  const template = document.createElement("template");
  for ( const option of config.options || [] ) {
    const { label, value, selected } = option;
    const element = document.createElement("label");
    element.classList.add("checkbox");
    element.innerHTML = `
      <dnd5e-checkbox name="${config.name}.${value}" ${selected ? "checked" : ""}></dnd5e-checkbox>
      <span>${label}</span>
    `;
    template.content.append(element);
  }
  return template.content.children;
}

/* -------------------------------------------- */

/**
 * Create a number input for a NumberField.
 * @param {NumberField} field               The field.
 * @param {FormInputConfig<number>} config  The input configuration.
 * @returns {HTMLElement|HTMLCollection}
 */
export function createNumberInput(field, config) {
  delete config.input;
  const input = field.toInput(config);
  if ( "ariaLabel" in config ) input.ariaLabel = config.ariaLabel;
  if ( "classes" in config ) input.className = config.classes;
  return input;
}

/* -------------------------------------------- */

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
