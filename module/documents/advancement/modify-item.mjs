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
      title: game.i18n.localize("DND5E.ADVANCEMENT.ModifyItem.Title"),
      hint: game.i18n.localize("DND5E.ADVANCEMENT.ModifyItem.Hint"),
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
      const effect = this.item.effects.get(change._id);
      if ( !effect ) continue;
      const itemsToChange = change.identifiers
        .values()
        .flatMap(i => this.actor.identifiedItems.get(i) ?? new Set())
        .filter(i => !alreadyModified.has(`${change._id}.${i._id}`))
        .toArray();
      for ( const item of itemsToChange ) {
        const clone = effect.clone({
          _id: foundry.utils.randomID(),
          "flags.dnd5e.sourceId": effect.uuid,
          "flags.dnd5e.advancementOrigin": `${this.item.id}.${this.id}`
        }, { keepId: true }).toObject();
        item.updateSource({ effects: [clone] });
        modified.push({ change: change._id, effect: clone._id, item: item._id });

        // TODO: Add support for riders once https://github.com/foundryvtt/dnd5e/issues/6357 is resolved
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
  restore(level, data, options={}) {
    this.apply(level, data, options);
  }

  /* -------------------------------------------- */

  /** @override */
  reverse(level, options={}) {
    for ( const change of this.value.modified ) {
      const item = this.actor.items.get(change.item);
      if ( !item?.effects.has(change.effect) ) continue;
      item.effects.delete(change.effect);
    }

    const modified = this.value.toObject().modified;
    this.updateSource({ "value.modified": [] });
    return { modified };
  }
}
