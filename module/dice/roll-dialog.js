import D20Roll from "./d20-roll.js";

/**
 * @deprecated since 1.3.0
 * @ignore
 */
async function d20Dialog(data, options) {
  console.warn("You are calling the d20Dialog helper method which has been replaced by the D20Roll.createDialog static method.");
  return D20Roll.createDialog(data, options);
}

/**
 * Shows the roll dialog for a damage roll and returns the associated formData from the dialog when closed (or null if the user cancels the dialog)
 * @param {object} options
 * @param {string} [options.title]             The title of the shown dialog window
 * @param {string} [options.formula]           The roll formula shown in the dialog window
 * @param {number} [options.defaultRollMode]   The roll mode that the roll mode select element should default to
 * @param {string} [options.template]          The path to the dialog handlebars template
 * @param {object} dialogOptions               Extra options to send to the dialog
 * @returns {Promise<object>}
 */
async function damageDialog({ title, formula, defaultRollMode, template }, dialogOptions) {
  return rollDialog(...arguments, generateDamageButtons);
}

/**
 * Shows the roll dialog for d20 or damage roll and returns the associated formData from the dialog when closed (or null if the user cancels the dialog)
 * @param {object} options
 * @param {string} [options.title]               The title of the shown dialog window
 * @param {string} [options.formula]             The roll formula shown in the dialog window
 * @param {number} [options.defaultRollMode]     The roll mode that the roll mode select element should default to
 * @param {string} [options.defaultAbility]      For tool rolls, the default ability modifier to use for the roll
 * @param {string} [options.template]            The path to the dialog handlebars template
 * @param {object} dialogOptions                 Extra options to send to the dialog
 * @param {function} buttonGenerator             A function that returns object of buttons that should be shown in the dialog
 * @returns {Promise<object>}
 */
async function rollDialog({ title, formula, defaultRollMode, defaultAbility, template }, dialogOptions, buttonGenerator) {
  template = template ?? "systems/dnd5e/templates/chat/roll-dialog.html";
  const templateData = {
    formula,
    defaultRollMode,
    rollModes: CONFIG.Dice.rollModes,
    // used for tool checks
    defaultAbility,
    abilities: CONFIG.DND5E.abilities
  }
  const content = await renderTemplate(template, templateData);

  return new Promise(resolve => {
    new Dialog({
      title,
      content,
      buttons: buttonGenerator(resolve),
      default: "normal",
      close: () => resolve(null)
    }, dialogOptions).render(true);
  });
}


/**
 * Creates an object containing the appropriate buttons for a damage roll: Critical or Normal
 * @param {function} callback      A callback to call with the final results of the button pressed in the dialog
 * @param {boolean} allowCritical  Whether or not the critical button should show as an option in the dialog
 * @returns {function}
 */
function generateDamageButtons(callback, allowCritical) {
  return {
    critical: {
      condition: allowCritical,
      label: game.i18n.localize("DND5E.CriticalHit"),
      callback: html => callback(getFormData(html, true))
    },
    normal: {
      label: game.i18n.localize(allowCritical ? "DND5E.Normal" : "DND5E.Roll"),
      callback: html => callback(getFormData(html, false))
    },
  }
}

/**
 * Given the dialog html element, creates an object creating the results of the form along with the button selected by the user
 * @param {jQuery} html          The dialog html element
 * @param {any} buttonSelection  The button the user selected
 * @returns {object}
 */
function getFormData(html, buttonSelection) {
  const formData = new FormDataExtended(html[0].querySelector("form")).toObject();
  formData.buttonSelection = buttonSelection;
  return formData;
}

export const RollDialog = {
  d20Dialog,
  damageDialog,
}
