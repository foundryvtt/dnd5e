import Advancement from "./advancement.mjs";
import SizeConfig from "../../applications/advancement/size-config.mjs";
import SizeFlow from "../../applications/advancement/size-flow.mjs";
import { SizeConfigurationData, SizeValueData } from "../../data/advancement/size.mjs";

/**
 * Advancement that handles player size.
 */
export default class SizeAdvancement extends Advancement {

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        configuration: SizeConfigurationData,
        value: SizeValueData
      },
      order: 25,
      icon: "icons/environment/wilderness/tree-ash.webp",
      typeIcon: "systems/dnd5e/icons/svg/size.svg",
      title: game.i18n.localize("DND5E.AdvancementSizeTitle"),
      hint: game.i18n.localize("DND5E.AdvancementSizeHint"),
      apps: {
        config: SizeConfig,
        flow: SizeFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /**
   * Hint that will be displayed to players if none is entered.
   * @type {string}
   */
  get automaticHint() {
    if ( !this.configuration.sizes.size ) return "";
    if ( this.configuration.sizes.size === 1 ) return game.i18n.format("DND5E.AdvancementSizeFlowHintSingle", {
      size: CONFIG.DND5E.actorSizes[this.configuration.sizes.first()].label
    });

    const listFormatter = new Intl.ListFormat(game.i18n.lang, { type: "disjunction" });
    return game.i18n.format("DND5E.AdvancementSizeflowHintMultiple", {
      sizes: listFormatter.format(this.configuration.sizes.map(s => CONFIG.DND5E.actorSizes[s].label))
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get levels() {
    return [0];
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  summaryForLevel(level, { configMode=false }={}) {
    const sizes = configMode ? Array.from(this.configuration.sizes) : this.value.size ? [this.value.size] : [];
    return sizes.map(s => `<span class="tag">${CONFIG.DND5E.actorSizes[s].label}</span>`).join("");
  }

  /* -------------------------------------------- */
  /*  Editing Methods                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static availableForItem(item) {
    return !item.advancement.byType.Size?.length;
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async apply(level, data) {
    this.actor.updateSource({"system.traits.size": data.size ?? "med"});
    this.updateSource({ value: data });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async restore(level, data) {
    this.apply(level, data);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async reverse(level) {
    this.actor.updateSource({"system.traits.size": "med"});
    this.updateSource({ "value.size": null });
  }
}
