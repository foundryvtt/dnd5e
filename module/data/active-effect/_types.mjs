/**
 * @typedef baseActiveEffectSystemData
 * @property {EffectChangeData[]} changes  Changes to apply to the actor.
 * @property {boolean} magic               Does this effect originate from a magical source?
 * @property {object} rider
 * @property {Set<string>} rider.statuses  Additional status effects that are separately applied when effect is applied.
 */

/**
 * @typedef EnchantmentActiveEffectSystemData
 * @property {EffectChangeData[]} changes  Changes to apply to the item.
 * @property {boolean} magic               Does this effect originate from a magical source?
 */
