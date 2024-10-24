import RollConfigurationDialog from "./roll-configuration-dialog.mjs";

/**
 * Dialog for configuring d20 rolls.
 *
 * @param {D20RollProcessConfiguration} [config={}]           Initial roll configuration.
 * @param {BasicRollMessageConfiguration} [message={}]        Message configuration.
 * @param {BasicRollConfigurationDialogOptions} [options={}]  Dialog rendering options.
 */
export default class D20RollConfigurationDialog extends RollConfigurationDialog {

  /** @override */
  static get rollType() {
    return CONFIG.Dice.D20Roll;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareButtonsContext(context, options) {
    context.buttons = {
      advantage: {
        default: this.options.defaultButton === "advantage",
        label: game.i18n.localize("DND5E.Advantage")
      },
      normal: {
        default: !["advantage", "disadvantage"].includes(this.options.defaultButton),
        label: game.i18n.localize("DND5E.Normal")
      },
      disadvantage: {
        default: this.options.defaultButton === "disadvantage",
        label: game.i18n.localize("DND5E.Disadvantage")
      }
    };
    return context;
  }

  /* -------------------------------------------- */
  /*  Roll Handling                               */
  /* -------------------------------------------- */

  /** @override */
  _finalizeRolls(action) {
    let advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.NORMAL;
    if ( action === "advantage" ) advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE;
    else if ( action === "disadvantage" ) advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE;
    return this.rolls.map(roll => {
      roll.options.advantageMode = advantageMode;
      roll.configureModifiers();
      return roll;
    });
  }
}
