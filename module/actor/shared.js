/**
 * Format a type object into a string.
 * @param {object} typeData          The type data to convert to a string.
 * @returns {string}
 */
export function formCreatureType(typeData) {
  let localizedType;
  if ( typeData.value === "custom" ) {
    localizedType = typeData.custom;
  } else {
    let code = CONFIG.DND5E.creatureTypes[typeData.value];
    localizedType = game.i18n.localize(typeData.swarm.isSwarm ? `${code}Pl` : code);
  }

  let type = localizedType;
  if (typeData.swarm.isSwarm) {
    type = game.i18n.format('DND5E.CreatureSwarmPhrase', {
      size: game.i18n.localize(CONFIG.DND5E.actorSizes[typeData.swarm.size]),
      type: localizedType
    });
  }

  if (typeData.subtype) type = `${type} (${typeData.subtype})`;

  return type;
}
