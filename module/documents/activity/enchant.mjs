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

  /**
   * Existing enchantment applied by this activity on this activity's item.
   * @type {ActiveEffect5e}
   */
  get existingEnchantment() {
    return this.enchant.self
      ? this.item.effects.find(e => e.isAppliedEnchantment && (e.origin === this.uuid)) : undefined;
  }

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /**
   * @typedef {ActivityUseConfiguration} EnchantUseConfiguration
   * @property {string} enchantmentProfile
   */

  /** @inheritDoc */
  _prepareUsageConfig(config) {
    config = super._prepareUsageConfig(config);
    const existingProfile = this.existingEnchantment?.flags.dnd5e?.enchantmentProfile;
    config.enchantmentProfile ??= this.item.effects.has(existingProfile) ? existingProfile
      : this.availableEnchantments[0]?._id;
    return config;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _requiresConfigurationDialog(config) {
    return super._requiresConfigurationDialog(config) || (this.availableEnchantments.length > 1);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _finalizeMessageConfig(usageConfig, messageConfig, results) {
    super._finalizeMessageConfig(usageConfig, messageConfig, results);

    // Store selected enchantment profile in message flag
    if ( usageConfig.enchantmentProfile ) foundry.utils.setProperty(
      messageConfig, "data.flags.dnd5e.use.enchantmentProfile", usageConfig.enchantmentProfile
    );

    // Don't display message if just auto-disabling existing enchantment
    if ( this.existingEnchantment?.flags.dnd5e?.enchantmentProfile === usageConfig.enchantmentProfile ) {
      messageConfig.create = false;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _triggerSubsequentActions(config, results) {
    if ( !this.enchant.self ) return;

    // If enchantment from this activity already exists, remove it
    const existingEnchantment = this.existingEnchantment;
    if ( existingEnchantment ) await existingEnchantment?.delete({ chatMessageOrigin: results.message?.id });

    // If no existing enchantment, or existing enchantment profile doesn't match provided one, create new enchantment
    if ( !existingEnchantment || (existingEnchantment.flags.dnd5e?.enchantmentProfile !== config.enchantmentProfile) ) {
      const concentration = results.effects.find(e => e.statuses.has(CONFIG.specialStatusEffects.CONCENTRATING));
      this.applyEnchantment(config.enchantmentProfile, this.item, {
        chatMessage: results.message, concentration, strict: false
      });
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Apply an enchantment to the provided item.
   * @param {string} profile                  ID of the enchantment profile to apply.
   * @param {Item5e} item                     Item to which to apply the enchantment.
   * @param {object} [options={}]
   * @param {ChatMessage5e} [options.chatMessage]     Chat message used to make the enchantment, if applicable.
   * @param {ActiveEffect5e} [options.concentration]  Concentration active effect to associate with this enchantment.
   * @param {boolean} [options.strict]        Display UI errors and prevent creation if enchantment isn't allowed.
   * @returns {Promise<ActiveEffect5e|null>}  Created enchantment effect if the process was successful.
   */
  async applyEnchantment(profile, item, { chatMessage, concentration, strict=true }={}) {
    const effect = this.item.effects.get(profile);
    if ( !effect ) return null;

    // Validate against the enchantment's restraints on the origin item
    if ( strict ) {
      const errors = this.canEnchant(item);
      if ( errors?.length ) {
        errors.forEach(err => ui.notifications.error(err.message, { console: false }));
        return null;
      }
    }

    // If concentration is required, ensure it is still being maintained & GM is present
    if ( !game.user.isGM && concentration && !concentration.isOwner ) {
      if ( strict ) {
        ui.notifications.error("DND5E.EffectApplyWarningConcentration", { console: false, localize: true });
        return null;
      } else {
        concentration = null;
      }
    }

    const applied = await ActiveEffect.create(
      effect.clone({
        origin: this.uuid, "flags.dnd5e.enchantmentProfile": profile
      }).toObject(),
      { parent: item, keepOrigin: true, chatMessageOrigin: chatMessage?.id }
    );
    if ( concentration ) await concentration.addDependent(applied);
  }

  /* -------------------------------------------- */

  /**
   * Determine whether the provided item can be enchanted based on this enchantment's restrictions.
   * @param {Item5e} item  Item that might be enchanted.
   * @returns {true|EnchantmentError[]}
   */
  canEnchant(item) {
    const errors = [];

    if ( !this.restrictions.allowMagical && item.system.properties?.has("mgc")
      && ("quantity" in item.system) ) {
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
