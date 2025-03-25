import EnchantSheet from "../../applications/activity/enchant-sheet.mjs";
import EnchantUsageDialog from "../../applications/activity/enchant-usage-dialog.mjs";
import EnchantActivityData from "../../data/activity/enchant-data.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for enchanting items.
 */
export default class EnchantActivity extends ActivityMixin(EnchantActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.ENCHANT"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "enchant",
      img: "systems/dnd5e/icons/svg/activity/enchant.svg",
      title: "DND5E.ENCHANT.Title",
      sheetClass: EnchantSheet,
      usage: {
        dialog: EnchantUsageDialog
      }
    }, { inplace: false })
  );

  /* -------------------------------------------- */

  /** @inheritDoc */
  static localize() {
    super.localize();
    if ( game.release.generation < 13 ) {
      this._localizeSchema(this.schema.fields.effects.element, ["DND5E.ENCHANT.FIELDS.effects"]);
    }
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * List of item types that are enchantable.
   * @type {Set<string>}
   */
  get enchantableTypes() {
    return Object.entries(CONFIG.Item.dataModels).reduce((set, [k, v]) => {
      if ( v.metadata?.enchantable ) set.add(k);
      return set;
    }, new Set());
  }

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /**
   * @typedef {ActivityUseConfiguration} EnchantUseConfiguration
   * @property {string} enchantmentProfile
   */

  /** @inheritDoc */
  _createDeprecatedConfigs(usageConfig, dialogConfig, messageConfig) {
    const config = super._createDeprecatedConfigs(usageConfig, dialogConfig, messageConfig);
    config.enchantmentProfile = usageConfig.enchantmentProfile ?? null;
    return config;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _applyDeprecatedConfigs(usageConfig, dialogConfig, messageConfig, config, options) {
    super._applyDeprecatedConfigs(usageConfig, dialogConfig, messageConfig, config, options);
    if ( config.enchantmentProfile ) usageConfig.enchantmentProfile = config.enchantmentProfile;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareUsageConfig(config) {
    config = super._prepareUsageConfig(config);
    config.enchantmentProfile ??= this.availableEnchantments[0]?._id;
    return config;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareUsageScaling(usageConfig, messageConfig, item) {
    await super._prepareUsageScaling(usageConfig, messageConfig, item);

    // Store selected enchantment profile in message flag
    if ( usageConfig.enchantmentProfile ) foundry.utils.setProperty(
      messageConfig, "data.flags.dnd5e.use.enchantmentProfile", usageConfig.enchantmentProfile
    );
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _requiresConfigurationDialog(config) {
    return super._requiresConfigurationDialog(config) || (this.availableEnchantments.length > 1);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Determine whether the provided item can be enchanted based on this enchantment's restrictions.
   * @param {Item5e} item  Item that might be enchanted.
   * @returns {true|EnchantmentError[]}
   */
  canEnchant(item) {
    const errors = [];

    if ( !this.restrictions.allowMagical && item.system.properties?.has("mgc") ) {
      errors.push(new EnchantmentError(game.i18n.localize("DND5E.ENCHANT.Warning.NoMagicalItems")));
    }

    if ( this.restrictions.type && (item.type !== this.restrictions.type) ) {
      errors.push(new EnchantmentError(game.i18n.format("DND5E.ENCHANT.Warning.WrongType", {
        incorrectType: game.i18n.localize(CONFIG.Item.typeLabels[item.type]),
        allowedType: game.i18n.localize(CONFIG.Item.typeLabels[this.restrictions.type])
      })));
    }

    if ( this.restrictions.categories.size && !this.restrictions.categories.has(item.system.type?.value) ) {
      const getLabel = key => {
        const config = CONFIG.Item.dataModels[this.restrictions.type]?.itemCategories[key];
        if ( !config ) return key;
        if ( foundry.utils.getType(config) === "string" ) return config;
        return config.label;
      };
      errors.push(new EnchantmentError(game.i18n.format(
        `DND5E.ENCHANT.Warning.${item.system.type?.value ? "WrongType" : "NoSubtype"}`,
        {
          allowedType: game.i18n.getListFormatter({ type: "disjunction" }).format(
            Array.from(this.restrictions.categories).map(c => getLabel(c).toLowerCase())
          ),
          incorrectType: getLabel(item.system.type?.value)
        }
      )));
    }

    if ( this.restrictions.properties.size
      && !this.restrictions.properties.intersection(item.system.properties ?? new Set()).size ) {
      errors.push(new EnchantmentError(game.i18n.format("DND5E.Enchantment.Warning.MissingProperty", {
        validProperties: game.i18n.getListFormatter({ type: "disjunction" }).format(
          Array.from(this.restrictions.properties).map(p => CONFIG.DND5E.itemProperties[p]?.label ?? p)
        )
      })));
    }

    /**
     * A hook event that fires while validating whether an enchantment can be applied to a specific item.
     * @function dnd5e.canEnchant
     * @memberof hookEvents
     * @param {EnchantActivity} activity   The activity performing the enchanting.
     * @param {Item5e} item                Item to which the enchantment will be applied.
     * @param {EnchantmentError[]} errors  List of errors containing failed restrictions. The item will be enchanted
     *                                     so long as no errors are listed, otherwise the provided errors will be
     *                                     displayed to the user.
     */
    Hooks.callAll("dnd5e.canEnchant", this, item, errors);

    return errors.length ? errors : true;
  }
}

/**
 * Error to throw when an item cannot be enchanted.
 */
export class EnchantmentError extends Error {
  constructor(...args) {
    super(...args);
    this.name = "EnchantmentError";
  }
}
