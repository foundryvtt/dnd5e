import SubclassFlow from "../../applications/advancement/subclass-flow.mjs";
import { SubclassValueData } from "../../data/advancement/subclass.mjs";
import Advancement from "./advancement.mjs";

/**
 * Advancement that allows the player to select a subclass for their class. Only allowed on class items
 * and can only be taken once.
 */
export default class SubclassAdvancement extends Advancement {

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        value: SubclassValueData
      },
      order: 70,
      icon: "icons/skills/trades/mining-pickaxe-yellow-blue.webp",
      typeIcon: "systems/dnd5e/icons/svg/subclass.svg",
      title: game.i18n.localize("DND5E.ADVANCEMENT.Subclass.Title"),
      hint: game.i18n.localize("DND5E.ADVANCEMENT.Subclass.Hint"),
      apps: {
        flow: SubclassFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  configuredForLevel(level) {
    return !foundry.utils.isEmpty(this.value);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  summaryforLevel(level, { configMode=false }={}) {
    const subclass = this.item.subclass;
    if ( configMode || !subclass ) return "";
    return subclass.toAnchor().outerHTML;
  }

  /* -------------------------------------------- */
  /*  Editing Methods                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static availableForItem(item) {
    return !item.advancement.byType.Subclass?.length;
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async apply(level, data, retainedData) {
    const useRetained = data.uuid === foundry.utils.getProperty(retainedData, "flags.dnd5e.sourceId");
    let itemData = useRetained ? retainedData : null;
    if ( !itemData ) {
      itemData = await this.createItemData(data.uuid);
      delete itemData.flags?.dnd5e?.advancementOrigin;
      delete itemData.flags?.dnd5e?.advancementRoot;
      foundry.utils.setProperty(itemData, "system.classIdentifier", this.item.identifier);
    }
    if ( itemData ) {
      this.actor.updateSource({ items: [itemData] });
      this.updateSource({ value: { document: itemData._id, uuid: data.uuid } });
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async restore(level, data) {
    if ( !data ) return;
    this.actor.updateSource({ items: [data] });
    this.updateSource({
      value: {
        document: data._id, uuid: data._stats?.compendiumSource ?? data.flags?.dnd5e?.sourceId
      }
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async reverse(level) {
    const item = this.value.document ?? this.item.subclass;
    if ( !item ) return;
    this.actor.items.delete(item.id);
    this.updateSource({ value: { document: null, uuid: null } });
    return item.toObject();
  }
}
