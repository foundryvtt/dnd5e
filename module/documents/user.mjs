import UserSystemFlags from "../data/user/user-system-flags.mjs";

/**
 * Extend the basic User implementation.
 * @extends {User}
 */
export default class User5e extends User {
  /** @inheritDoc */
  prepareData() {
    super.prepareData();
    if ( "dnd5e" in this.flags ) this.flags.dnd5e = new UserSystemFlags(this._source.flags.dnd5e, { parent: this });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async setFlag(scope, key, value) {
    if ( scope === "dnd5e" ) {
      let diff;
      const changes = foundry.utils.expandObject({ [key]: value });
      if ( this.flags.dnd5e ) diff = this.flags.dnd5e.updateSource(changes, { dryRun: true });
      else diff = new UserSystemFlags(changes, { parent: this }).toObject();
      return this.update({ flags: { dnd5e: diff } });
    }
    return super.setFlag(scope, key, value);
  }
}
