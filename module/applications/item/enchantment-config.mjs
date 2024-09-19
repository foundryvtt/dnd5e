/**
 * Application for configuring enchantment information for an item.
 */
export default class EnchantmentConfig extends DocumentSheet {
  constructor() {
    throw new Error(
      "EnchantmentConfig has been deprecated. Configuring enchanting should now be performed through the Enchant activity."
    );
  }
}
