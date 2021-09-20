/**
 * Extended version of the base roll type with 5e specific changes.
 * @extends {Roll}
 */
export default class Roll5e extends Roll {
  /**
   * Replace referenced data attributes in the roll formula with values from the provided data.
   * Data references in the formula use the @attr syntax and would reference the corresponding attr key.
   *
   * @param {string} formula             The original formula within which to replace.
   * @param {object} data                The data object which provides replacements.
   * @param {object} [options]
   * @param {string} [options.missing]   The value that should be assigned to any unmatched keys.
   *                                     If null, the unmatched key is left as-is.
   * @param {boolean} [options.warn]     Display a warning notification when encountering an un-matched key.
   * @param {boolean} [options.recurse]  Should this method be called recursively on data before replacement.
   * @static
   */
  static replaceFormulaData(formula, data, {missing, warn=false, recurse=true}={}) {
    let dataRgx = new RegExp(/@([a-z.0-9_\-]+)/gi);
    return formula.replace(dataRgx, (match, term) => {
      let value = foundry.utils.getProperty(data, term);
      if ( value == null ) {
        if ( warn && ui.notifications ) ui.notifications.warn(game.i18n.format("DICE.WarnMissingData", {match}));
        return (missing !== undefined) ? String(missing) : match;
      } else if ( recurse && (typeof value === "string") ) {
        value = Roll5e.replaceFormulaData(value, data, { missing, warn, recurse: false });
      }
      return String(value).trim();
    });
  }
}
