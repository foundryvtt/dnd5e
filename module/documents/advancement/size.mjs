import Advancement from "./advancement.mjs";
import SizeConfig from "../../applications/advancement/size-config.mjs";
import SizeFlow from "../../applications/advancement/size-flow.mjs";
import { SizeConfigurationData, SizeValueData } from "../../data/advancement/size.mjs";

/**
 * Advancement that handles player size.
 */
export default class SizeAdvancement extends Advancement {

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        configuration: SizeConfigurationData,
        value: SizeValueData
      },
      order: 5,
      icon: "systems/dnd5e/icons/svg/size.svg",
      title: game.i18n.localize("DND5E.AdvancementSizeTitle"),
      hint: game.i18n.localize("DND5E.AdvancementSizeHint"),
      validItemTypes: new Set(["race"]),
      apps: {
        config: SizeConfig,
        flow: SizeFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return [0];
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  summaryForLevel(level, { configMode=false }={}) {
    const sizes = configMode ? Array.from(this.configuration.sizes) : this.value.size ? [this.value.size] : [];
    return sizes.map(s => `<span class="tag">${CONFIG.DND5E.actorSizes[s]}</span>`).join("");
  }

  /* -------------------------------------------- */
  /*  Editing Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static availableForItem(item) {
    return !item.advancement.byType.Race?.length;
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async apply(level, data) {
    this.actor.updateSource({"system.traits.size": data.size ?? "med"});
    this.updateSource({ value: data });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async restore(level, data) {
    this.apply(level, data);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async reverse(level) {
    this.actor.updateSource({"system.traits.size": "med"});
    this.updateSource({ "value.-=size": null });
  }
}
