import { filteredKeys } from "../../utils.mjs";
import AdvancementConfig from "./advancement-config.mjs";

/**
 * Configuration application for size advancement.
 */
export default class SizeConfig extends AdvancementConfig {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "size"],
      dragDrop: [{ dropSelector: ".drop-target" }],
      dropKeyPath: "items",
      template: "systems/dnd5e/templates/advancement/size-config.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), {
      showLevelSelector: false,
      sizes: Object.entries(CONFIG.DND5E.actorSizes).reduce((obj, [key, label]) => {
        obj[key] = { label, chosen: this.advancement.configuration.sizes.has(key) };
        return obj;
      }, {})
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async prepareConfigurationUpdate(configuration) {
    configuration.sizes = filteredKeys(configuration.sizes ?? {});
    return configuration;
  }
}
