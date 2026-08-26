/**
 * @typedef BaseActiveEffectSystemData
 * @property {EffectChangeData[]} changes  Changes to apply to the actor.
 * @property {boolean} magical             Does this effect originate from a magical source?
 * @property {object} rider
 * @property {Set<string>} rider.statuses  Additional status effects that are separately applied when effect is applied.
 */

/**
 * @typedef EnchantmentActiveEffectSystemData
 * @property {EffectChangeData[]} changes    Changes to apply to the item.
 * @property {boolean} magical               Does this effect originate from a magical source?
 * @property {object} rider
 * @property {Set<string>} rider.activities  Additional activities to add when enchantment is applied.
 * @property {Set<string>} rider.effects     Additional effects to add when enchantment is applied.
 * @property {Set<string>} rider.items       Additional items to add when enchantment is applied to item on actor.
 */
