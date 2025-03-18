/**
 * Custom CombatantGroup implementation.
 */
export default class CombatantGroup5e extends (foundry.documents.CombatantGroup ?? class {}) {
  /**
   * Nominate a Combatant that will perform operations on behalf of the group.
   * @returns {Combatant5e|null}
   */
  get activeCombatant() {
    if ( !this.members.size ) return null;
    let nominated;
    for ( const candidate of this.members ) {
      if ( !nominated || (nominated.id.compare(candidate.id) > 0) ) nominated = candidate;
    }
    return nominated;
  }
}
