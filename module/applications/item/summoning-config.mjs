/**
 * Application for configuring summoning information for an item.
 */
export default class SummoningConfig extends DocumentSheet {
  constructor() {
    throw new Error(
      "SummongConfig has been deprecated. Configuring summoning should now be performed through the Summon activity."
    );
  }
}
