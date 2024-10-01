/**
 * Construct roll parts and populate its data object.
 * @param {object} parts   Information on the parts to be constructed.
 * @param {object} [data]  Roll data to use and populate while constructing the parts.
 * @returns {{ parts: string[], data: object }}
 */
export default function buildRoll(parts, data={}) {
  const finalParts = [];
  for ( const [key, value] of Object.entries(parts) ) {
    if ( !value && (value !== 0) ) continue;
    finalParts.push(`@${key}`);
    foundry.utils.setProperty(
      data, key, foundry.utils.getType(value) === "string" ? Roll.replaceFormulaData(value, data) : value
    );
  }
  return { parts: finalParts, data };
}
