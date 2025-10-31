import D20RollConfigurationDialog from "./d20-configuration-dialog.mjs";

/**
 * @import { AttackRollConfigurationDialogOptions } from "./_types.mjs";
 */

/**
 * Extended roll configuration dialog that allows selecting attack mode, ammunition, and weapon mastery.
 * @extends D20RollConfigurationDialog<AttackRollConfigurationDialogOptions>
 */
export default class AttackRollConfigurationDialog extends D20RollConfigurationDialog {
  /** @override */
  static DEFAULT_OPTIONS = {
    ammunitionOptions: [],
    attackModeOptions: [],
    masteryOptions: []
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareConfigurationContext(context, options) {
    context = await super._prepareConfigurationContext(context, options);
    const optionsFields = [
      { key: "attackMode", label: "DND5E.ATTACK.Mode.Label", options: this.options.attackModeOptions },
      { key: "ammunition", label: "DND5E.CONSUMABLE.Type.Ammunition.Label", options: this.options.ammunitionOptions },
      { key: "mastery", label: "DND5E.WEAPON.Mastery.Label", options: this.options.masteryOptions }
    ];
    context.fields = [
      ...optionsFields.map(({ key, label, options }) => options.length ? {
        field: new foundry.data.fields.StringField({ label: game.i18n.localize(label), blank: false, required: true }),
        name: key,
        options,
        value: this.config[key]
      } : null).filter(_ => _),
      ...context.fields
    ];
    return context;
  }
}
