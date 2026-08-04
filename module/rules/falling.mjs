import TargetsField from "../data/chat-message/fields/targets-field.mjs";
import { convertLength, formatLength } from "../utils.mjs";

/**
 * @import Actor5e from "../documents/actor/actor.mjs";
 * @import Token5e from "../canvas/token.mjs";
 * @import DamageRoll from "../dice/damage-roll.mjs";
 * @import TokenDocument5e from "../documents/token.mjs";
 */

/* -------------------------------------------- */
/*  Public API                                  */
/* -------------------------------------------- */

/**
 * Determine the fall damage formula for a given distance.
 * @param {number} distance  The distance fallen.
 * @param {string} units     The units `distance` is expressed in.
 * @returns {string|null}    The damage formula, or `null` if the fall is too short to deal damage.
 */
export function getFallDamageFormula(distance, units) {
  const { damageDie, distancePerDie, maximumDice } = CONFIG.DND5E.falling;
  const feet = convertLength(distance, units, "ft", { strict: false });
  const dice = Math.min(maximumDice, Math.floor(feet / distancePerDie));
  return dice ? `${dice}${damageDie}` : null;
}

/* -------------------------------------------- */

/**
 * Post a fall damage chat card with the damage tray targets pre-filled. Falls too short to deal damage post no card.
 * @param {Iterable<Token5e|TokenDocument5e>} targets  The tokens that fell.
 * @param {number} distance                            The distance fallen, in scene grid units.
 * @returns {Promise<DamageRoll[]|void>}               The resulting rolls, if any damage was rolled.
 */
export async function postFallDamage(targets, distance) {
  const units = canvas.grid.units;
  if ( !(units in CONFIG.DND5E.movementUnits) ) {
    console.warn(`Cannot post fall damage as the scene units "${units}" are not a known distance unit.`);
    return;
  }

  const formula = getFallDamageFormula(distance, units);
  if ( !formula ) return;

  const { damageType } = CONFIG.DND5E.falling;
  const rolls = await CONFIG.Dice.DamageRoll.build({
    hookNames: ["damage"],
    rolls: [{ parts: [formula], options: { type: damageType, types: [damageType] } }]
  }, { configure: false }, {
    create: true,
    data: {
      flags: {
        dnd5e: {
          context: { fall: true }
        }
      },
      flavor: _loc("DND5E.FALLING.DamageFlavor", {
        distance: formatLength(Math.round(distance), units)
      }),
      speaker: ChatMessage.implementation.getSpeaker(),
      system: { targets: TargetsField.getDescriptors(targets) },
      type: "damage"
    }
  });
  if ( !rolls?.length ) return;
  Hooks.callAll("dnd5e.rollDamage", rolls);
  Hooks.callAll("dnd5e.rollDamageV2", rolls);
  return rolls;
}

/* -------------------------------------------- */

/**
 * Knock an actor prone when it takes damage from a fall.
 * @param {Actor5e} actor                        The actor whose hit points changed.
 * @param {DocumentModificationContext} options  The update options.
 * @returns {Promise<ActiveEffect|boolean|void>|void}
 */
export function applyFallProne(actor, options) {
  if ( options.dnd5e?.fall ) return actor.toggleStatusEffect("prone", { active: true });
}
