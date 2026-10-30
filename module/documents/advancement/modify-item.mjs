import ModifyItemConfig from "../../applications/advancement/modify-item-config.mjs";
import ModifyItemFlow from "../../applications/advancement/modify-item-flow.mjs";
import { ModifyItemConfigurationData, ModifyItemValueData } from "../../data/advancement/modify-item-data.mjs";
import Advancement from "./advancement.mjs";

/**
 * Advancement that modifies an existing item using the provided enchantment.
 */
export default class ModifyItemAdvancement extends Advancement {

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        configuration: ModifyItemConfigurationData,
        value: ModifyItemValueData
      },
      order: 55,
      icon: "icons/skills/trades/smithing-anvil-silver-red.webp",
      typeIcon: "systems/dnd5e/icons/svg/advancement/modify-item.svg",
      title: _loc("DND5E.ADVANCEMENT.ModifyItem.Title"),
      hint: _loc("DND5E.ADVANCEMENT.ModifyItem.Hint"),
      apps: {
        config: ModifyItemConfig,
        flow: ModifyItemFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /** @override */
  async apply(level, data={}, options={}) {
    const modified = this.value.toObject().modified;

    const alreadyModified = new Set(this.value.modified.map(({ change, item }) => `${change}.${item}`));
    for ( const change of this.configuration.changes ) {
      const effect = change.uuid ? await fromUuid(change.uuid) : this.item.effects.get(change._id);
      if ( !effect ) continue;
      const itemsToChange = change.identifiers
        .values()
        .flatMap(i => this.actor.identifiedItems.get(i) ?? new Set())
        .filter(i => !alreadyModified.has(`${change._id}.${i._id}`))
        .toArray();
      for ( const item of itemsToChange ) {
        const clone = effect.clone({
          _id: foundry.utils.randomID(),
          _stats: {
            [effect.inCompendium ? "compendiumSource" : "duplicateSource"]: effect.uuid,
            [effect.inCompendium ? "duplicateSource" : "compendiumSource"]: null
          },
          flags: {
            dnd5e: {
              advancementOrigin: `${this.item.id}.${this.id}`,
              sourceId: effect.uuid
            }
          },
          system: {
            origin: {
              item: this.item.uuid
            }
          },
          transfer: true
        }, { keepId: true }).toObject();
        item.updateSource({ effects: [clone] });

        const newEffect = item.effects.get(clone._id);
        const operations = await newEffect.system.collectRiders({ dnd5e: { item: effect.item } });
        const riders = [];
        if ( operations.length ) {
          newEffect.system.applyRidersSource(operations);
          for ( const operation of operations ) {
            if ( operation.action === "create" ) {
              const collectionName = getDocumentClass(operation.documentName).metadata.collection;
              riders.push(...operation.data.map(({ _id }) =>
                foundry.utils.buildRelativeUuid(operation.parent[collectionName].get(_id), this.actor)
              ));
            } else if ( operation.action === "update" ) {
              riders.push(...operation.updates.flatMap(update => {
                const activities = foundry.utils.getProperty(update, "system.activities") ?? {};
                const prefix = foundry.utils.buildRelativeUuid(operation.parent.items.get(update._id), this.actor);
                return Object.keys(activities).map(id => `${prefix}.Activity.${id}`);
              }));
            }
          }
        }

        modified.push({ change: change._id, effect: clone._id, item: item._id, riders });
      }
    }

    this.updateSource({ "value.modified": modified });
  }

  /* -------------------------------------------- */

  /** @override */
  automaticApplicationValue(level) {
    return {};
  }

  /* -------------------------------------------- */

  /** @override */
  async restore(level, data, options={}) {
    await this.apply(level, data, options);
  }

  /* -------------------------------------------- */

  /** @override */
  async reverse(level, options={}) {
    for ( const change of this.value.modified ) {
      const item = this.actor.items.get(change.item);
      if ( !item?.effects.has(change.effect) ) continue;
      item.effects.delete(change.effect);

      // Remove dependents added as riders
      for ( const uuid of change.riders ) {
        const doc = fromUuidSync(uuid, { relative: this.actor });
        if ( doc instanceof Item ) this.actor.items.delete(doc.id);
        else if ( doc instanceof ActiveEffect ) item.effects.delete(doc.id);
        else item.updateSource({ [`system.activities.${doc.id}`]: _del });
      }
    }

    const modified = this.value.toObject().modified;
    this.updateSource({ "value.modified": [] });
    return { modified };
  }
}
