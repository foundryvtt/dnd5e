import { staticID } from "../../../utils.mjs";

/**
 * Mixin used to add support for active effect riders.
 * @template {foundry.data.ActiveEffectTypeDataModel} T
 * @param {typeof T} Base  The base data model class to wrap.
 * @returns {typeof RiderProviderMixin}
 * @mixin
 */
export default function RiderProviderMixin(Base) {
  class RiderProvider extends Base {
    /**
     * Handle creating rider documents when this active effect is created.
     * @param {DatabaseOperation} options            Options passed to the create or update operation.
     * @returns {Promise<DatabaseWriteOperation[]>}  Batch entries suitable for `foundry.documents.modifyBatch`.
     */
    async collectRiders(options) {
      if ( !this.parent.actor ) return [];

      const riders = new Set(this.rider?.statuses ?? []);

      for ( const status of this.parent.statuses ) {
        const r = CONFIG.statusEffects[status]?.riders ?? [];
        for ( const p of r ) riders.add(p);
      }

      if ( !riders.size ) return [];

      const createRider = async id => {
        if ( this.parent.actor.effects.has(staticID(`dnd5e${id}`)) ) return;
        const effect = await ActiveEffect.implementation.fromStatusEffect(id);
        return effect.toObject();
      };

      const data = (await Promise.all(Array.from(riders).map(createRider))).filter(_ => _);
      if ( !data.length ) return [];
      return [{ action: "create", documentName: "ActiveEffect", data, parent: this.parent.actor, keepId: true }];
    }
  }
  return RiderProvider;
}
