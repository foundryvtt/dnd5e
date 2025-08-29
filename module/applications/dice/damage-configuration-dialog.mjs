import RollConfigurationDialog from "./roll-configuration-dialog.mjs";

/**
 * Dialog for configuring damage rolls.
 *
 * @param {DamageRollProcessConfiguration} [config={}]        Initial roll configuration.
 * @param {BasicRollMessageConfiguration} [message={}]        Message configuration.
 * @param {BasicRollConfigurationDialogOptions} [options={}]  Dialog rendering options.
 */
export default class DamageRollConfigurationDialog extends RollConfigurationDialog {

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    formulas: {
      template: "systems/dnd5e/templates/dice/damage-formulas.hbs"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static get rollType() {
    return CONFIG.Dice.DamageRoll;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareButtonsContext(context, options) {
    const allowCritical = this.config.critical?.allow !== false;
    const defaultCritical = allowCritical && (this.options.defaultButton === "critical");
    context.buttons = {
      critical: {
        default: defaultCritical,
        icon: '<i class="fa-solid fa-bomb" inert></i>',
        label: game.i18n.localize("DND5E.CriticalHit")
      },
      normal: {
        default: !defaultCritical,
        icon: '<i class="fa-solid fa-dice" inert></i>',
        label: game.i18n.localize(allowCritical ? "DND5E.Normal" : "DND5E.Roll")
      }
    };
    if ( !allowCritical ) delete context.buttons.critical;
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareFormulasContext(context, options) {
    context = await super._prepareFormulasContext(context, options);
    const allTypes = foundry.utils.mergeObject(CONFIG.DND5E.damageTypes, CONFIG.DND5E.healingTypes, { inplace: false });
    context.rolls = context.rolls.map(({ roll }) => ({
      roll,
      damageConfig: allTypes[roll.options.type] ?? allTypes[roll.options.types?.[0]],
      damageTypes: roll.options.types?.length > 1 ? Object.entries(allTypes).map(([key, config]) => {
        if ( !roll.options.types?.includes(key) ) return null;
        return { value: key, label: config.label };
      }).filter(_ => _) : null
    }));
    return context;
  }

  /* -------------------------------------------- */
  /*  Roll Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _buildConfig(config, formData, index) {
    config = super._buildConfig(config, formData, index);
    const damageType = formData?.get(`roll.${index}.damageType`);
    if ( damageType ) config.options.type = damageType;
    return config;
  }

  /* -------------------------------------------- */

  /** @override */
  _finalizeRolls(action) {
    this.config.isCritical = action === "critical";
    return this.rolls.map(roll => {
      roll.options.isCritical = this.config.isCritical;
      roll.configureDamage({ critical: this.config.critical });
      return roll;
    });
  }
}
